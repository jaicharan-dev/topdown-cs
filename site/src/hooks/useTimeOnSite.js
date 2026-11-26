/**
 * Drives the time tracker for the whole site.
 *
 * Mounted once from src/theme/Root.js, which Docusaurus keeps alive across
 * client side navigation, so the timer is not torn down and restarted every
 * time somebody opens another page.
 *
 * Flushes read and write localStorage directly rather than going through React
 * state. That is deliberate: the user may mark a page complete in this same
 * tab between two flushes, and a stale React copy of the store would write
 * that completion straight back out of existence. Read, modify, write, every
 * time.
 */

import { useEffect, useRef } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { addSeconds, readStore, writeStore } from '@site/src/lib/progressStore';
import { FLUSH_MS, TICK_MS, createTimeTracker } from '@site/src/lib/timeTracker';

/**
 * Anything that suggests a person is still there. `mousemove` is included and
 * fires constantly, but the handler is a single assignment and the listeners
 * are passive, so it costs nothing worth measuring.
 */
const ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
  'mousemove',
];

/**
 * @param group the manifest group of the page being read, or '' off content.
 *   Passed through a ref rather than a dependency: changing it must not tear
 *   the timer down and restart it, which is the whole reason this lives in
 *   Root. The ref is read at flush time, so time already banked is credited
 *   to the section it was actually spent in.
 */
export default function useTimeOnSite(group = '', enabled = true) {
  const isBrowser = useIsBrowser();
  const trackerRef = useRef(null);
  const groupRef = useRef(group);
  // A ref, not a dependency: flipping it must not tear the timer down, and
  // it is read at flush time, which is the moment that matters.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Bank what the previous section earned before the ref starts pointing
  // somewhere else, or an hour on OOP gets credited to whatever was opened
  // next. This runs before the new group is stored, which is the point.
  useEffect(() => {
    const tracker = trackerRef.current;
    if (tracker && groupRef.current !== group) {
      const seconds = tracker.flush();
      if (seconds && enabledRef.current) {
        writeStore(addSeconds(readStore(), seconds, new Date(), groupRef.current));
      }
    }
    groupRef.current = group;
  }, [group]);

  useEffect(() => {
    if (!isBrowser) return undefined;

    const tracker = createTimeTracker();
    trackerRef.current = tracker;
    tracker.setVisible(document.visibilityState === 'visible');

    const persist = () => {
      // Flushed either way, so the seconds are discarded rather than banked
      // up and written the moment somebody signs in. Time spent before there
      // was an account was not spent as that account.
      const seconds = tracker.flush();
      if (!seconds || !enabledRef.current) return;
      const next = addSeconds(readStore(), seconds, new Date(), groupRef.current);
      writeStore(next);
    };

    const onActivity = () => tracker.markActivity();

    const onVisibility = () => {
      const visible = document.visibilityState === 'visible';
      // Bank what was earned before leaving, or a tab closed from the
      // background loses the last stretch of reading.
      if (!visible) persist();
      tracker.setVisible(visible);
    };

    // Window focus is deliberately NOT treated as leaving. Reading this site
    // with notes open beside it is normal, and the idle timeout already covers
    // somebody who has actually walked away.
    const tick = setInterval(() => tracker.tick(), TICK_MS);
    const flush = setInterval(persist, FLUSH_MS);

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);
    // pagehide is the one that fires reliably on mobile Safari; beforeunload
    // does not.
    window.addEventListener('pagehide', persist);

    return () => {
      clearInterval(tick);
      clearInterval(flush);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', persist);
      persist();
    };
  }, [isBrowser]);

  return trackerRef;
}
