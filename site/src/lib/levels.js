/**
 * The level ladder, earned by time spent reading.
 *
 * Deliberately a different axis from rank. Rank measures what you have
 * finished and is the real score; level measures that you turned up, and is
 * the one that moves on a day when nothing clicked. A reader who spends an
 * hour stuck on paging algorithms and ticks nothing has still done an hour of
 * work, and the homepage should say so.
 *
 * Each level costs a quarter hour more than the one before it:
 *
 *   level 2 at 15m, 3 at 45m, 4 at 1h30, 5 at 2h30, 10 at 11h, 20 at 47h
 *
 * The first few arrive quickly on purpose, while somebody is still deciding
 * whether the site is worth their evening. After that it slows to something
 * that stays meaningful for months rather than topping out in a fortnight.
 */

/** Minutes added to the cost of each successive level. */
const STEP_MINUTES = 15;

/** Nobody is getting here, but an unbounded ladder is an unbounded loop. */
export const MAX_LEVEL = 99;

/** Total minutes needed to reach a level. Level 1 is free. */
export function minutesForLevel(level) {
  const safe = Math.max(1, Math.floor(Number(level) || 1));
  return (STEP_MINUTES * safe * (safe - 1)) / 2;
}

/**
 * Where a reader stands, from their total recorded seconds.
 *
 * Returns the level, how far through it they are, and what the next one
 * costs, so a caller can draw a bar without redoing the arithmetic.
 */
export function levelFromSeconds(seconds) {
  const minutes = Math.max(0, Number(seconds) || 0) / 60;

  // Inverse of minutesForLevel: the largest L with (15/2)L(L-1) <= minutes.
  const solved = Math.floor(
    (1 + Math.sqrt(1 + (8 * minutes) / STEP_MINUTES)) / 2
  );
  const level = Math.min(MAX_LEVEL, Math.max(1, solved));

  const floorMinutes = minutesForLevel(level);
  const nextMinutes = level >= MAX_LEVEL ? null : minutesForLevel(level + 1);

  if (nextMinutes === null) {
    return {
      level,
      minutes,
      intoLevel: 0,
      span: 0,
      minutesToNext: 0,
      percent: 100,
    };
  }

  const span = nextMinutes - floorMinutes;
  const into = minutes - floorMinutes;
  return {
    level,
    minutes,
    intoLevel: into,
    span,
    minutesToNext: Math.max(0, Math.ceil(nextMinutes - minutes)),
    percent: span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 0,
  };
}

/**
 * "12m to level 4", or null at the top.
 *
 * Phrased as what is left rather than as a total, because the number that
 * makes somebody read one more page is the small one.
 */
export function describeNextLevel(info) {
  if (!info || info.percent === 100) return null;
  const minutes = info.minutesToNext;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours}h ${String(rest).padStart(2, '0')}m to level ${info.level + 1}`;
  }
  return `${minutes}m to level ${info.level + 1}`;
}
