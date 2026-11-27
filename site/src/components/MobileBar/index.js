/**
 * Level, rank and activity, on a row of their own under the navbar.
 *
 * They were in the bar itself, which on a phone meant a wordmark, a menu
 * button, a picture and a badge carrying four words and two numbers, all
 * competing for 343 pixels. Squeezing them in cost the rank its name at the
 * narrow end and left nothing readable at any width.
 *
 * A row below the bar has the whole screen instead of a corner of it, so
 * each one can be a button with its own label. The bar above keeps the
 * three things that are about the site rather than about you: the menu, the
 * name, and your picture.
 *
 * Hidden above the drawer breakpoint, where the navbar has room and these
 * live in it. The row is still in the markup there, because deciding in
 * script needs a measurement that only arrives after the first paint.
 */

import React from 'react';
import Link from '@docusaurus/Link';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import useSession from '@site/src/hooks/useSession';
import { levelFromSeconds } from '@site/src/lib/levels';
import { activityStats, summarise } from '@site/src/lib/progressStore';
import { rankProgress } from '@site/src/lib/ranks';
import styles from './styles.module.css';

export default function MobileBar() {
  const { ready, store } = useProgress();
  const { canSave } = useSession();

  // The row keeps its height from the first paint. Appearing once the store
  // has loaded would push the whole page down a line while somebody is
  // already looking at it.
  const show = ready && canSave;

  const summary = show ? summarise(store, manifest) : null;
  const stats = show ? activityStats(store) : null;
  const level = show ? levelFromSeconds(stats.totalSeconds) : null;
  const ladder = show ? rankProgress(summary.completedPoints) : null;

  return (
    <div className={`csf-mobile-bar ${styles.bar}`} data-ready={show ? 'true' : 'false'}>
      {show && (
        <>
          <Link className={styles.button} to="/progress?at=standing">
            <span className={styles.word}>Level</span>
            <span className={styles.value}>{level.level}</span>
          </Link>

          <Link className={styles.button} to="/progress?at=standing">
            <span className={styles.word}>Rank</span>
            <span className={styles.value} style={{ color: ladder.rank.color }}>
              {ladder.rank.name}
            </span>
          </Link>

          <Link className={styles.button} to="/progress?at=activity">
            {/* Four bars of different heights: a chart, at 13 pixels. */}
            <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1.5" y="9" width="2.6" height="5.5" rx="1" />
              <rect x="5.4" y="5.5" width="2.6" height="9" rx="1" />
              <rect x="9.3" y="7.5" width="2.6" height="7" rx="1" />
              <rect x="13.2" y="3" width="2.6" height="11.5" rx="1" />
            </svg>
            <span className={styles.value}>Activity</span>
          </Link>
        </>
      )}
    </div>
  );
}
