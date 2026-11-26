/**
 * The reader's standing, on the homepage.
 *
 * Sits in the column that used to be reserved and empty. That column existed
 * only to balance the rail so the flowchart could sit on the page's centre
 * line; filling it with the numbers that make somebody come back costs
 * nothing and keeps the graph exactly where it was.
 *
 * Level and rank are deliberately not here. They live in the navbar, where
 * they follow the reader around the whole site, and showing the same two
 * numbers twice on one screen made neither of them worth reading.
 */

import React from 'react';
import Link from '@docusaurus/Link';
import DifficultyRing from '@site/src/components/DifficultyRing';
import SignInPrompt from '@site/src/components/SignInPrompt';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import useSession from '@site/src/hooks/useSession';
import {
  activityStats,
  difficultyBreakdown,
  summarise,
} from '@site/src/lib/progressStore';
import { formatDuration } from '@site/src/lib/timeTracker';
import styles from './styles.module.css';

export default function HomeStats() {
  const { ready, store } = useProgress();
  const { canSave, resolving } = useSession();

  // Everything here comes from localStorage, so the prerendered version has
  // nothing to say. The box keeps its shape while that resolves rather than
  // appearing and shoving the page around.
  const summary = summarise(store, manifest);
  const stats = activityStats(store);
  const breakdown = difficultyBreakdown(store, manifest);

  // Nothing is recorded without an account, so there is nothing true to put
  // here. The invitation goes in the same box, at the same width.
  if (!canSave) {
    return (
      <aside
        className={`csf-home-stats ${styles.box}`}
        data-ready={resolving ? 'false' : 'true'}>
        <SignInPrompt compact>
          Pages you finish, your reading time, your level and your rank are
          kept with your account.
        </SignInPrompt>
      </aside>
    );
  }

  return (
    /* The global class is a layout hook: the homepage grid has to place this
       explicitly once the reserved column goes, and a CSS module name is not
       something custom.css can name. */
    <aside
      className={`csf-home-stats ${styles.box}`}
      data-ready={ready ? 'true' : 'false'}>
      <DifficultyRing
        breakdown={breakdown}
        done={summary.completedPages}
        total={summary.totalPages}
      />

      <div className={styles.divider} />

      <dl className={styles.figures}>
        <div className={styles.figure}>
          <dt className={styles.label}>Read time</dt>
          <dd className={styles.value}>{formatDuration(stats.totalSeconds)}</dd>
        </div>
        <div className={styles.figure}>
          <dt className={styles.label}>Active days</dt>
          <dd className={styles.value}>{stats.activeDays}</dd>
        </div>
      </dl>

      {/* History rather than the dashboard: Progress is already a button in
          the navbar, so a second way to the same page is a wasted line. */}
      <Link className={styles.historyButton} to="/progress?at=history">
        History
      </Link>
    </aside>
  );
}
