/**
 * Level and rank in the navbar.
 *
 * These two are the reason to come back, so they follow the reader around the
 * site rather than living only on a dashboard they have to go and find.
 *
 * Nothing is shown until the store has loaded. A prerendered page cannot know
 * anybody's level, and rendering a confident "Level 1" that jumps to 7 a
 * moment later is worse than rendering nothing for that moment.
 */

import React from 'react';
import Link from '@docusaurus/Link';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import { levelFromSeconds } from '@site/src/lib/levels';
import { activityStats, summarise } from '@site/src/lib/progressStore';
import { rankFor } from '@site/src/lib/ranks';
import { formatDuration } from '@site/src/lib/timeTracker';
import styles from './styles.module.css';

export default function NavbarStats() {
  const { ready, store } = useProgress();

  if (!ready) return <span className={styles.placeholder} aria-hidden="true" />;

  const summary = summarise(store, manifest);
  const stats = activityStats(store);
  const level = levelFromSeconds(stats.totalSeconds);
  const rank = rankFor(summary.completedPoints);

  return (
    <Link
      to="/progress"
      className={styles.pill}
      title={`Level ${level.level}, ${rank.name}, ${formatDuration(
        stats.totalSeconds
      )} read`}>
      <span className={styles.level}>
        <span className={styles.levelWord}>Lv</span>
        <span className={styles.levelNumber}>{level.level}</span>
      </span>
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.rank} style={{ color: rank.color }}>
        {rank.name}
      </span>
      {/* The bar is how far through the current level they are, which is the
          number that moves on an ordinary evening. */}
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${level.percent}%` }} />
      </span>
    </Link>
  );
}
