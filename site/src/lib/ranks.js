/**
 * The rank ladder.
 *
 * Thresholds are absolute points, never a percentage of the site. That is the
 * whole point: publishing new pages must never demote somebody. With
 * percentages, a user sitting at Expert would silently drop to Advanced the
 * day we add a new block, which is the fastest way to make progress tracking
 * feel like a punishment.
 *
 * The cost of absolute thresholds is that they have to be kept in sight of the
 * content. The top rank is set below the current total so it is reachable
 * without clearing literally every page; verify-manifest-urls.js fails if the
 * manifest ever shrinks past it.
 *
 * Points are difficulty weighted (easy 1, medium 2, hard 3), so the ladder
 * rewards working through hard pages rather than collecting easy ones. Early
 * ranks are deliberately close together: the first few should arrive while
 * somebody is still deciding whether the site is worth their time.
 */

export const RANKS = [
  { name: 'Beginner', at: 0, color: '#8b8b8b' },
  { name: 'Novice', at: 10, color: '#60a5fa' },
  { name: 'Apprentice', at: 40, color: '#34d399' },
  { name: 'Practitioner', at: 90, color: '#a78bfa' },
  { name: 'Proficient', at: 160, color: '#f59e0b' },
  { name: 'Advanced', at: 250, color: '#fb7185' },
  { name: 'Expert', at: 380, color: '#38bdf8' },
  { name: 'Master', at: 520, color: '#c084fc' },
];

/** The highest rank whose threshold the points have reached. */
export function rankFor(points) {
  const safe = Number(points) || 0;
  let current = RANKS[0];
  let index = 0;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (safe >= RANKS[i].at) {
      current = RANKS[i];
      index = i;
    }
  }
  return { ...current, index };
}

/**
 * Where the user stands between their rank and the next one, for a progress
 * bar. At the top rank there is no next, and `percent` is 100 rather than 0 so
 * the bar reads as finished rather than empty.
 */
export function rankProgress(points) {
  const safe = Number(points) || 0;
  const rank = rankFor(safe);
  const next = RANKS[rank.index + 1] || null;

  if (!next) {
    return { rank, next: null, pointsIntoRank: 0, pointsNeeded: 0, percent: 100 };
  }

  const span = next.at - rank.at;
  const into = safe - rank.at;
  return {
    rank,
    next,
    pointsIntoRank: into,
    pointsNeeded: next.at - safe,
    percent: span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

/** The top threshold, so the manifest check can assert it stays reachable. */
export const TOP_RANK_POINTS = RANKS[RANKS.length - 1].at;
