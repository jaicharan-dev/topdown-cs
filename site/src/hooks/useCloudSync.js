/**
 * Account state and background syncing.
 *
 * Local first, always. Signing in adds a copy that follows you between
 * devices; it is never the source of truth and signing out never touches what
 * is on this machine. Somebody who never makes an account sees no change in
 * behaviour at all.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import {
  claimUsername,
  deleteRemote,
  getClient,
  isConfigured,
  syncOnce,
  USERNAME_TAKEN,
} from '@site/src/lib/cloudSync';
import { setGuest } from '@site/src/lib/guest';
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

const CloudSyncContext = createContext(null);

/**
 * Everything a consumer sees when this build has no Supabase project. Frozen
 * at module scope so it is the same object every render and cannot send a
 * component into a loop through a dependency array.
 */
const DISABLED = Object.freeze({
  enabled: false,
  user: null,
  status: 'off',
  error: null,
  lastSyncedAt: null,
  usernameConflict: false,
  signIn: () => {},
  signOut: () => {},
  switchAccount: () => {},
  guestMode: () => {},
  leave: () => {},
  claimHandle: async () => ({ ok: true, reserved: false }),
  syncNow: () => {},
  forgetRemote: () => {},
  clearUsernameConflict: () => {},
});

/**
 * The session, shared.
 *
 * Read it with useCloudSync. The state lives here and nowhere else: the
 * navbar, the tick at the foot of a doc page and the progress page all want
 * it at once, and three copies meant three auth listeners and three debounce
 * timers racing each other's merges.
 */
export function CloudSyncProvider({ children }) {
  const value = useCloudSyncState();
  return (
    <CloudSyncContext.Provider value={value}>
      {children}
    </CloudSyncContext.Provider>
  );
}

/**
 * The shared session. Safe to call from anywhere and as often as you like.
 *
 * Falls back to the disabled shape when there is no provider above, so a
 * component rendered outside the tree, which is what a test or a swizzled
 * theme component can be, degrades to "no accounts" rather than crashing.
 */
export default function useCloudSync() {
  return useContext(CloudSyncContext) || DISABLED;
}

/** The implementation. Mounted exactly once, by the provider. */
function useCloudSyncState() {
  const isBrowser = useIsBrowser();
  const { siteConfig } = useDocusaurusContext();
  const config = siteConfig.customFields;
  const enabled = isConfigured(config);

  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(enabled ? 'loading' : 'off');
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [usernameConflict, setUsernameConflict] = useState(false);

  const clientRef = useRef(null);
  const userRef = useRef(null);
  const timerRef = useRef(null);

  /**
   * Takes the local username for this account, if there is one to take.
   *
   * Silent when it works. When the name has gone to somebody else the local
   * copy is cleared and a flag is raised, because leaving a username in the
   * profile that the database says belongs to another person would be a lie
   * the reader has no way to discover.
   */
  const reserveUsername = useCallback(async (client) => {
    const wanted = readStore()?.profile?.username;
    if (!client || !wanted) return;
    try {
      await claimUsername(client, wanted);
      setUsernameConflict(false);
    } catch (err) {
      if (err?.reason !== USERNAME_TAKEN) return;
      const current = readStore();
      writeStore({
        ...current,
        profile: { ...current.profile, username: '' },
      });
      setUsernameConflict(true);
    }
  }, []);

  /**
   * Takes a username for the signed in account.
   *
   * `reserved` says whether the database actually promised it. A guest, or a
   * build with no usernames.sql applied, gets ok with reserved false: the
   * name is theirs on this device and nowhere else, and the caller can say
   * so rather than implying a guarantee nobody made.
   */
  const claimHandle = useCallback(async (name) => {
    const client = clientRef.current;
    if (!client || !userRef.current) return { ok: true, reserved: false };
    try {
      await claimUsername(client, name);
      setUsernameConflict(false);
      return { ok: true, reserved: Boolean(name) };
    } catch (err) {
      if (err?.reason === USERNAME_TAKEN) return { ok: false, reserved: true };
      // Anything else is the feature being unavailable, not the name being
      // refused, and that must not stop somebody saving a bio.
      return { ok: true, reserved: false };
    }
  }, []);

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

        if (sessionUser) reserveUsername(client);

        const listener = client.auth.onAuthStateChange((_event, session) => {
          const nextUser = session?.user || null;
          userRef.current = nextUser;
          setUser(nextUser);
          if (nextUser) {
            runSync();
            // A guest may have chosen a username before there was an account
            // to attach it to. Take it now, quietly, unless it has gone.
            reserveUsername(client);
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

  /**
   * Ends the session. What is on this device stays on this device.
   *
   * Two attempts on purpose. The default sign out asks the server to revoke
   * the refresh token, which is worth doing and which fails whenever the
   * server cannot be reached; supabase-js reports that by returning an error
   * and leaving the local session exactly where it was. A sign out button
   * that quietly does nothing is worse than one that cannot revoke, so the
   * local scope runs either way and it is the one that decides.
   */
  const signOut = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      const { error: revokeError } = await client.auth.signOut();
      if (!revokeError) return;
    } catch (err) {
      // fall through to the local clear
    }
    try {
      await client.auth.signOut({ scope: 'local' });
    } catch (err) {
      setStatus('error');
      setError('Could not sign out. Clearing this site\'s data will do it.');
    }
  }, []);

  /**
   * @param chooser force Google to ask which account, rather than silently
   *   reusing the one already signed in to the browser. Without it somebody
   *   with two accounts has no way to reach the second.
   */
  const signIn = useCallback(async (chooser = false) => {
    const client = clientRef.current;
    if (!client) return;
    setError(null);
    const { error: authError } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/progress`,
        ...(chooser ? { queryParams: { prompt: 'select_account' } } : {}),
      },
    });
    if (authError) {
      setStatus('error');
      setError(authError.message);
    }
  }, []);

  /**
   * Out of this account and into another.
   *
   * Signing out first matters: the redirect comes back to a browser that
   * still held the old session otherwise, and Supabase would restore it over
   * the new one.
   */
  const switchAccount = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    setGuest(false);
    await signOut();
    await signIn(true);
  }, [signIn, signOut]);

  /** Out of the account, and done being asked about accounts. */
  const guestMode = useCallback(async () => {
    setGuest(true);
    await signOut();
  }, [signOut]);

  /** Out of the account, and still open to being offered one. */
  const leave = useCallback(async () => {
    setGuest(false);
    await signOut();
  }, [signOut]);

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

  // Memoised: this object is the context value, so a fresh one every render
  // would re-render every consumer on every keystroke anywhere.
  return useMemo(
    () => ({
      enabled,
      user,
      status,
      error,
      lastSyncedAt,
      usernameConflict,
      signIn,
      signOut,
      switchAccount,
      guestMode,
      leave,
      claimHandle,
      syncNow: runSync,
      forgetRemote,
      clearUsernameConflict: () => setUsernameConflict(false),
    }),
    [
      enabled,
      user,
      status,
      error,
      lastSyncedAt,
      usernameConflict,
      signIn,
      signOut,
      switchAccount,
      guestMode,
      leave,
      claimHandle,
      runSync,
      forgetRemote,
    ]
  );
}
