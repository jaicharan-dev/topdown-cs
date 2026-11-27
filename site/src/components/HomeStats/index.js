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
import GoogleMark from '@site/src/components/GoogleMark';
import SignInPrompt from '@site/src/components/SignInPrompt';
import manifest from '@site/src/data/contentManifest.json';
import useCloudSync from '@site/src/hooks/useCloudSync';
import useProgress from '@site/src/hooks/useProgress';
import useSession from '@site/src/hooks/useSession';
import { setGuest } from '@site/src/lib/guest';
import {
  activityStats,
  difficultyBreakdown,
  summarise,
} from '@site/src/lib/progressStore';
import { formatDuration } from '@site/src/lib/timeTracker';
import styles from './styles.module.css';


/* The same three difficulties the ring uses, and the same colours. */
const BANDS = [
  { key: 'easy', label: 'Easy', color: '#2dd4bf' },
  { key: 'medium', label: 'Med', color: '#fbbf24' },
  { key: 'hard', label: 'Hard', color: '#fb7185' },
];

/**
 * The same standing, as one line, for a phone.
 *
 * The panel version is a ring, two figures and a button, and on a phone that
 * took the top third of the screen and pushed the flowchart off the bottom
 * of it. That is the wrong way round: the graph is what the page is for.
 *
 * So the numbers lose their panel and become a line of them, the way a
 * scoreboard reads. A thin bar under the counts carries the proportion that
 * the ring used to, which is the one thing a row of digits cannot show.
 *
 * It is a link rather than a readout: the figures the panel dropped are all
 * on the progress page, one tap away, instead of crowding the line.
 */
function StandingStrip({ breakdown, done, total, seconds }) {
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <Link
      className={styles.strip}
      to="/progress?at=standing"
      aria-label={`${done} of ${total} pages done. Your progress.`}>
      <span className={styles.stripRow}>
        <span className={styles.stripTotal}>
          <strong className={styles.stripDone}>{done}</strong>
          <span className={styles.stripOf}>/{total}</span>
        </span>

        {BANDS.map((band) => {
          const entry = breakdown[band.key] || { done: 0, total: 0 };
          return (
            <span key={band.key} className={styles.chip}>
              <span className={styles.chipLabel} style={{ color: band.color }}>
                {band.label}
              </span>
              <span className={styles.chipCount}>
                {entry.done}
                <span className={styles.stripOf}>/{entry.total}</span>
              </span>
            </span>
          );
        })}

        <span className={styles.stripTime}>{formatDuration(seconds)}</span>
      </span>

      <span className={styles.stripTrack} aria-hidden="true">
        <span className={styles.stripFill} style={{ width: `${percent}%` }} />
      </span>
    </Link>
  );
}


/**
 * The invitation, as one line, for the same reason as the strip above.
 *
 * Not the compact SignInPrompt: that is a heading, a sentence and a button,
 * and the whole point here is to be shorter than a sentence. The sentence is
 * on the progress page for anybody who wants it.
 */
function SignInStrip() {
  const { signIn } = useCloudSync();

  return (
    <div className={styles.strip} data-signin="true">
      <span className={styles.stripRow}>
        <span className={styles.stripPitch}>Track your progress</span>
        <button
          type="button"
          className={styles.stripSignIn}
          onClick={() => {
            // Asking for an account is the opposite of having decided not
            // to have one, so it clears the guest preference.
            setGuest(false);
            signIn();
          }}>
          <GoogleMark className={styles.stripMark} />
          <span>Sign in</span>
        </button>
      </span>
    </div>
  );
}

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
        className={`csf-home-stats ${styles.shell}`}
        data-ready={resolving ? 'false' : 'true'}>
        <div className={styles.box}>
          <SignInPrompt compact>
            Pages you finish, your reading time, your level and your rank are
            kept with your account.
          </SignInPrompt>
        </div>

        {/* On a phone the invitation is a line too. Three sentences about
            what an account keeps, above a flowchart nobody can see yet, is
            the page arguing with itself. */}
        <SignInStrip />
      </aside>
    );
  }

  return (
    /* The global class is a layout hook: the homepage grid has to place this
       explicitly once the reserved column goes, and a CSS module name is not
       something custom.css can name.

       Both shapes are rendered and the stylesheet picks one. The alternative
       is measuring the window in script, which cannot be done before the
       first paint: the page would draw one shape and swap to the other, and
       on the shape this replaces that swap is a third of the screen moving. */
    <aside
      className={`csf-home-stats ${styles.shell}`}
      data-ready={ready ? 'true' : 'false'}>
      <div className={styles.box}>
        <DifficultyRing
          breakdown={breakdown}
          done={summary.completedPages}
          total={summary.totalPages}
        />

        <div className={styles.divider} />

        <dl className={styles.figures}>
          <div className={styles.figure}>
            <dt className={styles.label}>Read time</dt>
            <dd className={styles.value}>
              {formatDuration(stats.totalSeconds)}
            </dd>
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
      </div>

      <StandingStrip
        breakdown={breakdown}
        done={summary.completedPages}
        total={summary.totalPages}
        seconds={stats.totalSeconds}
      />
    </aside>
  );
}
