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
  isComplete as storeIsComplete,
  readStore,
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
    setStore(readStore());
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

  return { ready, store, toggle, isComplete, reset, summarise, activityStats };
}
