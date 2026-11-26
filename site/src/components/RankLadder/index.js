/**
 * The whole rank ladder as one horizontal bar.
 *
 * It used to be a list of eight rows under the profile, which spent a column
 * of the page saying what the next seven ranks are called. As a bar it is one
 * line: the names sit along it, the filled part is how far along the reader
 * is, and where they stand is a position rather than a row to find.
 *
 * Segments are equal width rather than proportional to their point costs. The
 * later ranks are worth hundreds of points more than the early ones, so a
 * proportional bar would squash the first four into the left edge, and those
 * are the ones a new reader is actually travelling through.
 */

import React from 'react';
import { RANKS, rankProgress } from '@site/src/lib/ranks';
import styles from './styles.module.css';

export default function RankLadder({ points }) {
  const ladder = rankProgress(points);
  const index = ladder.rank.index;

  // How far across the whole bar: completed segments, plus progress through
  // the current one.
  const segment = 100 / RANKS.length;
  const filled = Math.min(
    100,
    index * segment + (ladder.next ? (ladder.percent / 100) * segment : segment)
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.head}>
        <span className={styles.label}>Rank</span>
        <span className={styles.current} style={{ color: ladder.rank.color }}>
          {ladder.rank.name}
        </span>
        <span className={styles.meta}>
          {ladder.next
            ? `${ladder.pointsNeeded} pt to ${ladder.next.name}`
            : 'Top rank reached'}
        </span>
      </div>

      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${filled}%`, background: ladder.rank.color }}
        />
        {/* A divider at every rank boundary, so the bar reads as eight steps
            rather than as one continuous slide. */}
        {RANKS.slice(1).map((rank, i) => (
          <span
            key={rank.name}
            className={styles.notch}
            style={{ left: `${(i + 1) * segment}%` }}
          />
        ))}
      </div>

      <ol className={styles.names}>
        {RANKS.map((rank, i) => (
          <li
            key={rank.name}
            className={styles.name}
            data-state={i < index ? 'past' : i === index ? 'current' : 'future'}
            style={i === index ? { color: rank.color } : undefined}>
            {rank.name}
          </li>
        ))}
      </ol>
    </div>
  );
}
