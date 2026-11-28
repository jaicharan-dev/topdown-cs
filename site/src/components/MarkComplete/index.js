/**
 * The per-page completion control.
 *
 * Sits at the FOOT of the page rather than the header, deliberately: you mark
 * something complete after reading it, and a button beside the title invites
 * ticking a page you have not read. The tick is self-reported, which is the
 * honest version for now; inferring completion from scroll depth and dwell
 * time is a later refinement rather than a replacement.
 *
 * Progress belongs to an account, so a tick without one does not quietly
 * save to this browser: it asks for the account instead. Pretending to
 * record something that will vanish with the site data, and that no other
 * device will ever see, is the worse of the two.
 */

import Link from '@docusaurus/Link';
import React, { useState } from 'react';
import { usePageCheckpoints } from '@site/src/components/Checkpoint';
import useProgress from '@site/src/hooks/useProgress';
import useSession from '@site/src/hooks/useSession';
import useCloudSync from '@site/src/hooks/useCloudSync';
import { setGuest } from '@site/src/lib/guest';
import styles from './styles.module.css';

function CheckIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false">
      <path
        d="M4 10.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * What stands in for the button on a page that has checkpoints.
 *
 * It says where you are rather than asking anything, because the asking
 * already happened five times on the way down.
 */
function CheckpointTally({ ready, ticked, total }) {
  const finished = ready && ticked >= total;

  return (
    <div className={styles.wrapper}>
      <p className={styles.note} data-complete={finished ? 'true' : 'false'}>
        {!ready ? (
          null
        ) : finished ? (
          <>
            All {total} checkpoints done, so this page is complete.{' '}
            <Link to="/progress">See your progress</Link>.
          </>
        ) : (
          <>
            {ticked} of {total} checkpoints ticked. The last one marks the
            page complete.
          </>
        )}
      </p>
    </div>
  );
}

export default function MarkComplete({ contentId }) {
  const { ready, isComplete, isCheckpointDone, toggle } = useProgress();
  const { canSave, resolving, guest } = useSession();
  const { signIn } = useCloudSync();
  const { list } = usePageCheckpoints();
  const [asking, setAsking] = useState(false);

  if (!contentId) return null;

  const done = ready && isComplete(contentId);

  // A page with checkpoints is finished by its last tick, so a button here
  // could only disagree with the ticks above it. It reports instead.
  if (list.length > 0) {
    const ticked = list.filter((entry) =>
      isCheckpointDone(contentId, entry.id)
    ).length;
    return (
      <CheckpointTally ready={ready} ticked={ticked} total={list.length} />
    );
  }

  const onToggle = () => {
    // toggle refuses without an account and says so by returning false,
    // which is the cue to offer one rather than to do nothing.
    if (!toggle(contentId)) setAsking(true);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        data-complete={done ? 'true' : 'false'}
        disabled={!ready || resolving}
        aria-pressed={done}
        onClick={onToggle}>
        <span className={styles.box} aria-hidden="true">
          {done && <CheckIcon />}
        </span>
        <span>{done ? 'Completed' : 'Mark as complete'}</span>
      </button>

      {asking ? (
        <div className={styles.prompt} role="status">
          <p className={styles.promptText}>
            <strong>Sign in to save your progress.</strong> Ticking a page
            keeps it against your account, along with your reading history and
            your level, on every device you use.
          </p>
          <div className={styles.promptActions}>
            <button
              type="button"
              className={styles.signIn}
              onClick={() => signIn()}>
              Sign in
            </button>
            <button
              type="button"
              className={styles.later}
              onClick={() => {
                // Choosing to browse without an account is an answer, and it
                // stops the site asking again on the next page.
                setGuest(true);
                setAsking(false);
              }}>
              Keep browsing
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.note}>
          {done ? (
            <>
              Saved to your account.{' '}
              <Link to="/progress">See your progress</Link>.
            </>
          ) : canSave ? null : guest ? (
            'Reading as a guest. Sign in to start tracking your progress.'
          ) : (
            'Sign in to track your progress.'
          )}
        </p>
      )}
    </div>
  );
}
