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

export default function MarkComplete({ contentId }) {
  const { ready, isComplete, toggle } = useProgress();
  const { canSave, resolving, guest } = useSession();
  const { signIn } = useCloudSync();
  const [asking, setAsking] = useState(false);

  if (!contentId) return null;

  const done = ready && isComplete(contentId);

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
          ) : canSave ? (
            'Tracks your progress as you work through the site.'
          ) : guest ? (
            'Reading as a guest. Sign in to start tracking your progress.'
          ) : (
            'Sign in to track your progress.'
          )}
        </p>
      )}
    </div>
  );
}
