/**
 * Account state and background syncing.
 *
 * Local first, always. Signing in adds a copy that follows you between
 * devices; it is never the source of truth and signing out never touches what
 * is on this machine. Somebody who never makes an account sees no change in
 * behaviour at all.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import {
  deleteRemote,
  getClient,
  isConfigured,
  syncOnce,
} from '@site/src/lib/cloudSync';
import { readStore, subscribe, writeStore } from '@site/src/lib/progressStore';

/**
 * How long to wait after a local change before syncing again.
 *
 * Deliberately long. The time tracker writes every fifteen seconds while
 * somebody is reading, and syncing on each of those would mean hundreds of
 * requests an hour per reader, which is both rude and the quickest way to
 * find the edge of a free tier. Two minutes keeps devices close enough
 * together for a study site, and a page being closed flushes immediately
 * anyway.
 */
const SYNC_DEBOUNCE_MS = 120000;

/**
 * Whether this build has a Supabase project behind it.
 *
 * Side effect free, unlike useCloudSync, so it is safe to call from anywhere
 * that merely needs to word something differently. Use this rather than
 * useCloudSync when you do not need the session.
 */
export function useCloudEnabled() {
  const { siteConfig } = useDocusaurusContext();
  return isConfigured(siteConfig.customFields);
}

/**
 * Mount this ONCE per page. Each call registers its own auth listener and its
 * own debounce timer, so a second copy would sync twice over.
 */
export default function useCloudSync() {
  const isBrowser = useIsBrowser();
  const { siteConfig } = useDocusaurusContext();
  const config = siteConfig.customFields;
  const enabled = isConfigured(config);

  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(enabled ? 'loading' : 'off');
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const clientRef = useRef(null);
  const userRef = useRef(null);
  const timerRef = useRef(null);

  /** One merge pass. Safe to call at any time; see mergeStores.js. */
  const runSync = useCallback(async () => {
    const client = clientRef.current;
    const current = userRef.current;
    if (!client || !current) return;

    setStatus('syncing');
    try {
      const merged = await syncOnce(client, current.id, readStore());
      writeStore(merged);
      setLastSyncedAt(new Date());
      setStatus('synced');
      setError(null);
    } catch (err) {
      // A failed sync is not a failed session. The local copy is untouched and
      // intact, so say so and try again on the next change.
      setStatus('error');
      setError(err?.message || 'Could not reach the server.');
    }
  }, []);

  // establish the session and follow it
  useEffect(() => {
    if (!isBrowser || !enabled) return undefined;

    let cancelled = false;
    let unsubscribe = null;

    getClient(config)
      .then(async (client) => {
        if (!client || cancelled) return;
        clientRef.current = client;

        const { data } = await client.auth.getSession();
        if (cancelled) return;

        const sessionUser = data?.session?.user || null;
        userRef.current = sessionUser;
        setUser(sessionUser);
        setStatus(sessionUser ? 'syncing' : 'signed-out');
        if (sessionUser) runSync();

        const listener = client.auth.onAuthStateChange((_event, session) => {
          const nextUser = session?.user || null;
          userRef.current = nextUser;
          setUser(nextUser);
          if (nextUser) {
            runSync();
          } else {
            setStatus('signed-out');
            setLastSyncedAt(null);
          }
        });
        unsubscribe = () => listener?.data?.subscription?.unsubscribe?.();
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(err?.message || 'Could not load the sign in library.');
      });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [isBrowser, enabled, config, runSync]);

  // local changes eventually make their way up
  useEffect(() => {
    if (!isBrowser || !enabled) return undefined;

    const onLocalChange = () => {
      if (!userRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(runSync, SYNC_DEBOUNCE_MS);
    };

    const onLeaving = () => {
      if (!userRef.current) return;
      clearTimeout(timerRef.current);
      // best effort: the tab may well die before this finishes
      runSync();
    };

    const unsubscribe = subscribe(onLocalChange);
    window.addEventListener('pagehide', onLeaving);

    return () => {
      clearTimeout(timerRef.current);
      unsubscribe();
      window.removeEventListener('pagehide', onLeaving);
    };
  }, [isBrowser, enabled, runSync]);

  const signIn = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    setError(null);
    const { error: authError } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/progress` },
    });
    if (authError) {
      setStatus('error');
      setError(authError.message);
    }
  }, []);

  /** Ends the session. What is on this device stays on this device. */
  const signOut = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    await client.auth.signOut();
  }, []);

  /** Removes the stored copy, leaving this device's progress alone. */
  const forgetRemote = useCallback(async () => {
    const client = clientRef.current;
    const current = userRef.current;
    if (!client || !current) return;
    try {
      await deleteRemote(client, current.id);
      setLastSyncedAt(null);
      setStatus('signed-out');
      await client.auth.signOut();
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Could not delete your stored progress.');
    }
  }, []);

  return {
    enabled,
    user,
    status,
    error,
    lastSyncedAt,
    signIn,
    signOut,
    syncNow: runSync,
    forgetRemote,
  };
}
