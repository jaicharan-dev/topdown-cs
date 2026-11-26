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

export default function useProgress() {
  const isBrowser = useIsBrowser();
  const [store, setStore] = useState(emptyStore);
  const [ready, setReady] = useState(false);

  // load after hydration, never during it
  useEffect(() => {
    if (!isBrowser) return;
    // The reader number is handed out here rather than in emptyStore, which
    // has to stay deterministic: it runs on the server too, and a random
    // number there would differ from the one the browser generated and break
    // hydration. ensureReaderNumber returns the same object when there is
    // already one, so this does not write on every load.
    const current = readStore();
    const loaded = ensureReaderNumber(current);
    // Read once, not twice: two reads are two objects and the identity check
    // below would never hold, so it would write on every single page load.
    setStore(loaded === current ? current : writeStore(loaded));
    setReady(true);
  }, [isBrowser]);

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

  const toggle = useCallback((contentId) => {
    setStore((current) => writeStore(toggleComplete(current, contentId)));
  }, []);

  const isComplete = useCallback(
    (contentId) => storeIsComplete(store, contentId),
    [store]
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
  const updateProfile = useCallback((patch) => {
    setStore(writeStore(storeSetProfile(readStore(), patch)));
  }, []);

  return {
    ready,
    store,
    toggle,
    isComplete,
    reset,
    updateProfile,
    summarise,
    activityStats,
  };
}
