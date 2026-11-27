/**
 * Level and rank in the navbar, with the detail behind a hover.
 *
 * These two are the reason to come back, so they follow the reader around
 * the site rather than living only on a dashboard they have to go and find.
 * The homepage box used to repeat them; it does not any more, because the
 * same two numbers in two places on one screen is one place too many.
 *
 * The button carries only the two words and their values. What is left to
 * reach the next of each is a bar apiece in the card, which is the shape that
 * answers "how much more" without making anybody read a sentence.
 *
 * Nothing is shown until the store has loaded. A prerendered page cannot know
 * anybody's level, and rendering a confident "Level 1" that jumps to 7 a
 * moment later is worse than rendering nothing for that moment.
 */

import React from 'react';
import Link from '@docusaurus/Link';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import useSession from '@site/src/hooks/useSession';
import { describeNextLevel, levelFromSeconds } from '@site/src/lib/levels';
import { activityStats, summarise } from '@site/src/lib/progressStore';
import { rankProgress } from '@site/src/lib/ranks';
import { formatDuration } from '@site/src/lib/timeTracker';
import styles from './styles.module.css';

export default function NavbarStats({ mobile }) {
  const { ready, store } = useProgress();
  const { canSave } = useSession();

  // On a phone level and rank are a row under the bar, drawn by
  // MobileBar, so neither the drawer nor the bar wants a second copy. The
  // drawer is this early return; the bar is a rule on the class below.
  if (mobile) return null;

  // Nothing to report without an account, and a level 1 beside an empty
  // year is a worse answer than no badge at all.
  if (!ready || !canSave) {
    return (
      <span
        className={`csf-navbar-stats ${styles.placeholder}`}
        aria-hidden="true"
      />
    );
  }

  const summary = summarise(store, manifest);
  const stats = activityStats(store);
  const level = levelFromSeconds(stats.totalSeconds);
  const ladder = rankProgress(summary.completedPoints);

  return (
    <div className={`csf-navbar-stats ${styles.wrapper}`}>
      <Link to="/progress?at=standing" className={`csf-nav-item ${styles.pill}`}>
        {/* The number sits against its own word. Pushed to the far end it
            read as a separate thing that happened to share a box. */}
        <span className={styles.pair}>
          <span className={styles.word}>Level</span>
          <span className={styles.value}>{level.level}</span>
        </span>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.pair}>
          <span className={styles.word}>Rank</span>
          <span className={styles.value} style={{ color: ladder.rank.color }}>
            {ladder.rank.name}
          </span>
        </span>
      </Link>

      <div className={styles.card} role="group" aria-label="Level and rank">
        <div className={styles.block}>
          <div className={styles.blockHead}>
            <span className={styles.blockTitle}>Level {level.level}</span>
            <span className={styles.blockMeta}>
              {formatDuration(stats.totalSeconds)} read
            </span>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{ width: `${level.percent}%` }}
            />
          </div>
          <p className={styles.hint}>
            {describeNextLevel(level) || 'Top level reached.'}
          </p>
        </div>

        <div className={styles.block}>
          <div className={styles.blockHead}>
            <span className={styles.blockTitle} style={{ color: ladder.rank.color }}>
              {ladder.rank.name}
            </span>
            <span className={styles.blockMeta}>
              {summary.completedPoints} pt
            </span>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{
                width: `${ladder.percent}%`,
                background: ladder.rank.color,
              }}
            />
          </div>
          <p className={styles.hint}>
            {ladder.next
              ? `${ladder.pointsNeeded} more point${
                  ladder.pointsNeeded === 1 ? '' : 's'
                } to ${ladder.next.name}`
              : 'Top rank reached.'}
          </p>
        </div>

        <p className={styles.footnote}>
          Level rises with time spent reading. Rank rises with what you finish.
        </p>
      </div>
    </div>
  );
}
