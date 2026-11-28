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
 *
 * A provider, for the second time in this codebase. It began as a plain
 * hook, which was fine while three or four components used it. A design
 * page now holds five checkpoints, a resume banner and the tick at the
 * foot, and with the navbar that was nine copies of the same store, nine
 * subscriptions, and nine mount effects each able to write. React caught it
 * before anybody else did: one copy's write landed in another's render and
 * it warned about a setState during render.
 *
 * The lesson is the one useCloudSync already learned. A hook that owns
 * shared mutable state is a provider; a comment asking callers to mount it
 * once is not enforcement.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import useSession from '@site/src/hooks/useSession';
import {
  activityStats,
  emptyStore,
  ensureReaderNumber,
  isCheckpointDone as storeIsCheckpointDone,
  isComplete as storeIsComplete,
  readStore,
  setProfile as storeSetProfile,
  subscribe,
  summarise,
  toggleCheckpoint as storeToggleCheckpoint,
  toggleComplete,
  writeStore,
  __internal,
} from '@site/src/lib/progressStore';

/** One frozen instance, so it cannot cause a render loop as a dependency. */
const EMPTY = emptyStore();

const ProgressContext = createContext(null);

function useProgressState() {
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
   * Ticks or unticks one checkpoint on a page.
   *
   * `total` is how many the page declares. The store needs it to know when
   * a tick is the last one, which is what marks the page itself complete.
   *
   * Returns false without an account, exactly as toggle does, so the caller
   * can offer one instead of pretending to have saved something.
   */
  const toggleCheckpoint = useCallback(
    (contentId, checkpointId, total) => {
      if (!canSave) return false;
      setStore((current) =>
        writeStore(
          storeToggleCheckpoint(current, contentId, checkpointId, { total })
        )
      );
      return true;
    },
    [canSave]
  );

  /** Same reasoning as isComplete: no account means no progress anywhere. */
  const isCheckpointDone = useCallback(
    (contentId, checkpointId) =>
      canSave && storeIsCheckpointDone(store, contentId, checkpointId),
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

  return useMemo(
    () => ({
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
      toggleCheckpoint,
      isCheckpointDone,
      reset,
      updateProfile,
      summarise,
      activityStats,
    }),
    [
      ready,
      store,
      canSave,
      toggle,
      isComplete,
      toggleCheckpoint,
      isCheckpointDone,
      reset,
      updateProfile,
    ]
  );
}

/** Mounted once, in theme/Root. */
export function ProgressProvider({ children }) {
  const value = useProgressState();
  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

/**
 * What a consumer sees with no provider above it, which on this site means
 * never: Root wraps the whole app. Frozen and defined once so it cannot
 * become a new object on every render and drive a dependency loop, and
 * inert rather than a thrown error, because losing the page over a wiring
 * mistake is worse than losing the progress on it.
 *
 * Deliberately NOT a call to useProgressState(). A fallback that ran the
 * real hook would give every consumer its own store again, which is the
 * thing the provider exists to stop.
 */
const NO_PROVIDER = Object.freeze({
  ready: false,
  store: EMPTY,
  canSave: false,
  toggle: () => false,
  isComplete: () => false,
  toggleCheckpoint: () => false,
  isCheckpointDone: () => false,
  reset: () => {},
  updateProfile: () => false,
  summarise,
  activityStats,
});

/** The store, for anything under the provider. */
export default function useProgress() {
  return useContext(ProgressContext) || NO_PROVIDER;
}
