/**
 * Counts time actually spent reading.
 *
 * The easy version of this feature is a timer that runs from page load, and it
 * is wrong in a way that makes every number it produces worthless: a tab left
 * open overnight reports eight hours of study. Three things guard against
 * that, and all three matter.
 *
 *  - Visibility. Time only accrues while the tab is actually on screen. This
 *    is the strongest signal available and the cheapest to trust.
 *  - Idleness. A visible tab with no interaction for `idleMs` stops counting.
 *    The threshold is deliberately generous, because reading a long answer
 *    without touching anything is normal here and punishing it would
 *    undercount exactly the users who are concentrating hardest.
 *  - Clamping. Every sample counts at most `tickMs * 2`, so a laptop that
 *    slept for six hours contributes one interval rather than six hours. The
 *    browser also throttles timers in background tabs, which produces the same
 *    kind of enormous delta.
 *
 * No DOM and no clock of its own, so the whole thing is testable with a fake
 * `now`. The caller wires up the events.
 */

export const TICK_MS = 5000;
export const FLUSH_MS = 15000;
export const IDLE_MS = 90000;

/**
 * Hard ceiling per day. Nobody studies twelve hours in a day, and if the
 * guards above ever fail this stops one bad session from permanently poisoning
 * somebody's history with a number they cannot correct.
 */
export const MAX_SECONDS_PER_DAY = 12 * 60 * 60;

export function createTimeTracker({
  now = () => Date.now(),
  tickMs = TICK_MS,
  idleMs = IDLE_MS,
} = {}) {
  let lastTick = null;
  let lastActivity = now();
  let visible = true;
  let pendingMs = 0;

  /** Forget the previous sample, so the gap just spent away is not counted. */
  function pause() {
    lastTick = null;
  }

  return {
    /** Any sign of life: a key, a pointer, a scroll. */
    markActivity() {
      lastActivity = now();
    },

    setVisible(isVisible) {
      visible = Boolean(isVisible);
      if (visible) {
        // coming back is itself activity, and the time away is not ours
        lastActivity = now();
      }
      pause();
    },

    /** Called on a timer. Accrues at most one clamped interval. */
    tick() {
      const at = now();

      if (!visible || at - lastActivity > idleMs) {
        pause();
        return;
      }

      if (lastTick !== null) {
        const delta = at - lastTick;
        if (delta > 0) pendingMs += Math.min(delta, tickMs * 2);
      }

      lastTick = at;
    },

    /**
     * Hands back whole seconds and keeps the remainder, so repeated flushes do
     * not round fractions away and quietly lose minutes over a long session.
     */
    flush() {
      const seconds = Math.floor(pendingMs / 1000);
      if (seconds > 0) pendingMs -= seconds * 1000;
      return seconds;
    },

    /** For tests and debugging. */
    __state() {
      return { pendingMs, visible, lastTick, lastActivity };
    },
  };
}

/** "2h 05m", "45m", "30s". Short enough for a stat tile. */
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${hours}h`;
}
