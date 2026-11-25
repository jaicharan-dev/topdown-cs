/**
 * The reader's standing, on the homepage.
 *
 * Sits in the column that used to be reserved and empty. That column existed
 * only to balance the rail so the flowchart could sit on the page's centre
 * line; filling it with the two numbers that make somebody come back costs
 * nothing and keeps the graph exactly where it was.
 *
 * Level and rank measure different things on purpose. Rank is what you have
 * finished and is the real score. Level is that you turned up, and it moves
 * on an evening when nothing clicked, which is the evening somebody is most
 * likely to give up.
 */

import React from 'react';
import Link from '@docusaurus/Link';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import { describeNextLevel, levelFromSeconds } from '@site/src/lib/levels';
import { activityStats, summarise } from '@site/src/lib/progressStore';
import { rankProgress } from '@site/src/lib/ranks';
import { formatDuration } from '@site/src/lib/timeTracker';
import styles from './styles.module.css';

export default function HomeStats() {
  const { ready, store } = useProgress();

  // Everything here comes from localStorage, so the prerendered version has
  // nothing to say. The box keeps its shape while that resolves rather than
  // appearing and shoving the page around.
  const summary = summarise(store, manifest);
  const stats = activityStats(store);
  const level = levelFromSeconds(stats.totalSeconds);
  const ladder = rankProgress(summary.completedPoints);
  const nextLevel = describeNextLevel(level);

  return (
    /* The global class is a layout hook: the homepage grid has to place this
       explicitly once the reserved column goes, and a CSS module name is not
       something custom.css can name. */
    <aside
      className={`csf-home-stats ${styles.box}`}
      data-ready={ready ? 'true' : 'false'}>
      <div className={styles.levelBlock}>
        <div className={styles.levelRow}>
          <span className={styles.levelWord}>Level</span>
          <span className={styles.levelNumber}>{level.level}</span>
        </div>
        <div className={styles.track}>
          <div
            className={styles.fill}
            style={{ width: `${level.percent}%` }}
          />
        </div>
        <p className={styles.hint}>
          {nextLevel || 'Top level. Nothing left to prove.'}
        </p>
      </div>

      <div className={styles.divider} />

      <div className={styles.rankBlock}>
        <span className={styles.label}>Rank</span>
        <span className={styles.rankName} style={{ color: ladder.rank.color }}>
          {ladder.rank.name}
        </span>
        <div className={styles.track}>
          <div
            className={styles.fill}
            style={{ width: `${ladder.percent}%`, background: ladder.rank.color }}
          />
        </div>
        <p className={styles.hint}>
          {ladder.next
            ? `${ladder.pointsNeeded} pt to ${ladder.next.name}`
            : `${summary.completedPoints} points`}
        </p>
      </div>

      <div className={styles.divider} />

      <dl className={styles.figures}>
        <div className={styles.figure}>
          <dt className={styles.label}>Time read</dt>
          <dd className={styles.value}>{formatDuration(stats.totalSeconds)}</dd>
        </div>
        <div className={styles.figure}>
          <dt className={styles.label}>Pages done</dt>
          <dd className={styles.value}>
            {summary.completedPages}
            <span className={styles.of}>/{summary.totalPages}</span>
          </dd>
        </div>
        <div className={styles.figure}>
          <dt className={styles.label}>Active days</dt>
          <dd className={styles.value}>{stats.activeDays}</dd>
        </div>
      </dl>

      <Link className={styles.more} to="/progress">
        Full progress
      </Link>
    </aside>
  );
}
