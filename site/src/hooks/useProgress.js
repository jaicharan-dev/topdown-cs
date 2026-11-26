/**
 * React binding over the progress store.
 *
 * Two Docusaurus-specific things to know:
 *
 * 1. Pages are server-rendered at build time, so localStorage does not exist
 *    during the first pass. `useIsBrowser()` is false on the server AND on the
 *    first client render, which is what keeps hydration consistent. Anything
 *    that depends on stored state must wait for `ready`, or React will warn
 *    about a server/client mismatch and may discard the markup.
 *
 * 2. Docusaurus is a single-page app after the first load, so this hook can
 *    stay mounted across navigations. It keys off the id it is given rather
 *    than caching per page.
 */

import { useCallback, useEffect, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import useSession from '@site/src/hooks/useSession';
import {
  activityStats,
  emptyStore,
  ensureReaderNumber,
  isComplete as storeIsComplete,
  readStore,
  setProfile as storeSetProfile,
  subscribe,
  summarise,
  toggleComplete,
  writeStore,
  __internal,
} from '@site/src/lib/progressStore';

/** One frozen instance, so it cannot cause a render loop as a dependency. */
const EMPTY = emptyStore();

export default function useProgress() {
  const isBrowser = useIsBrowser();
  const { canSave } = useSession();
  const [store, setStore] = useState(emptyStore);
  const [ready, setReady] = useState(false);

  // load after hydration, never during it
  useEffect(() => {
    if (!isBrowser) return;
    const current = readStore();
    // The reader number is handed out here rather than in emptyStore, which
    // has to stay deterministic: it runs on the server too, and a random
    // number there would differ from the one the browser generated and break
    // hydration. Only for somebody who can save, because it is part of a
    // profile and there are no profiles without an account.
    //
    // Read once, not twice: two reads are two objects, so the identity check
    // would never hold and this would write on every single page load.
    const loaded = canSave ? ensureReaderNumber(current) : current;
    setStore(loaded === current ? current : writeStore(loaded));
    setReady(true);
  }, [isBrowser, canSave]);

  // another tab ticked something: keep this one honest
  useEffect(() => {
    if (!isBrowser) return undefined;
    const onStorage = (event) => {
      if (event.key && event.key !== __internal.STORAGE_KEY) return;
      setStore(readStore());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isBrowser]);

  // something in THIS tab wrote, most often the time tracker flushing. The
  // storage event does not fire in the tab that caused the write, so without
  // this an open dashboard would sit there showing stale minutes.
  useEffect(() => subscribe(setStore), []);

  /**
   * Marks a page done, or undoes it.
   *
   * Returns false when there is no account to record it against, so the
   * caller can offer one. It deliberately does not write anything in that
   * case: a tick that is kept in this browser and nowhere else is a promise
   * the site is no longer making.
   */
  const toggle = useCallback(
    (contentId) => {
      if (!canSave) return false;
      setStore((current) => writeStore(toggleComplete(current, contentId)));
      return true;
    },
    [canSave]
  );

  /**
   * Whether this page is done, as far as the current session is concerned.
   *
   * Always false without an account, even when the blob on disk says
   * otherwise. The data is left alone and comes back on the next sign in;
   * what is wrong is showing somebody a tick and the words "saved to your
   * account" at a moment when they have no account. Signed out means no
   * progress anywhere, and the tick is part of anywhere.
   */
  const isComplete = useCallback(
    (contentId) => canSave && storeIsComplete(store, contentId),
    [store, canSave]
  );

  /**
   * Wipes everything. The caller is responsible for confirming first: this is
   * the user's own data and the only copy of it, so it should never go without
   * them having said so.
   */
  const reset = useCallback(() => {
    setStore(writeStore(emptyStore()));
  }, []);

  // Read, modify, write against storage rather than the React copy: the time
  // tracker may have flushed since this component last rendered, and saving a
  // name from a stale store would throw that away.
  const updateProfile = useCallback(
    (patch) => {
      if (!canSave) return false;
      setStore(writeStore(storeSetProfile(readStore(), patch)));
      return true;
    },
    [canSave]
  );

  return {
    ready,
    /**
     * Zero for anybody without an account, whatever is on the disk.
     *
     * Gating each reader separately did not hold: the roadmap nodes and the
     * homepage tab counts read this directly and carried on showing a signed
     * out reader their old totals. Emptying it here is the only version that
     * cannot be forgotten by the next thing that reads it, and the blob
     * itself is untouched, so it all comes back on the next sign in.
     */
    store: canSave ? store : EMPTY,
    canSave,
    toggle,
    isComplete,
    reset,
    updateProfile,
    summarise,
    activityStats,
  };
}
