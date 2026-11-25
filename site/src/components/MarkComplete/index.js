/**
 * The per-page completion control.
 *
 * Sits at the FOOT of the page rather than the header, deliberately: you mark
 * something complete after reading it, and a button beside the title invites
 * ticking a page you have not read. The tick is self-reported, which is the
 * honest version for now; inferring completion from scroll depth and dwell
 * time is a later refinement rather than a replacement.
 *
 * Renders disabled until the store has loaded, so the server-rendered markup
 * and the first client render agree and hydration stays quiet.
 *
 * Ticking while signed out still ticks. The prompt that follows is an offer,
 * not a toll: refusing to record the click would mean the site quietly lost
 * work somebody had already done, which is a worse thing to do to a reader
 * than letting them keep it in one browser. It appears once and then takes
 * the hint.
 */

import Link from '@docusaurus/Link';
import React, { useEffect, useState } from 'react';
import useProgress from '@site/src/hooks/useProgress';
import useCloudSync from '@site/src/hooks/useCloudSync';
import styles from './styles.module.css';

/** Separate from the progress blob: this is about the prompt, not the data. */
const DISMISSED_KEY = 'topdowncs:signin-prompt-dismissed';

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

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch (err) {
    // Blocked storage is not a reason to break the page; the prompt simply
    // shows again next time, which is the harmless direction to fail in.
    return false;
  }
}

export default function MarkComplete({ contentId }) {
  const { ready, isComplete, toggle } = useProgress();
  const { enabled, user, status, signIn } = useCloudSync();
  const [prompt, setPrompt] = useState(false);

  // Read after mount, never during render: localStorage does not exist while
  // the page is being prerendered.
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => setDismissed(readDismissed()), []);

  if (!contentId) return null;

  const done = ready && isComplete(contentId);
  const signedOut = enabled && !user && status !== 'loading';

  const onToggle = () => {
    const wasDone = done;
    toggle(contentId);
    // Only when finishing something, and only once. Nobody needs to be sold
    // an account for un-ticking a box.
    if (!wasDone && signedOut && !dismissed) setPrompt(true);
  };

  const onDismiss = () => {
    setPrompt(false);
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch (err) {
      // Nothing to do: it will offer again, which is the kinder failure.
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        data-complete={done ? 'true' : 'false'}
        disabled={!ready}
        aria-pressed={done}
        onClick={onToggle}>
        <span className={styles.box} aria-hidden="true">
          {done && <CheckIcon />}
        </span>
        <span>{done ? 'Completed' : 'Mark as complete'}</span>
      </button>

      {prompt ? (
        <div className={styles.prompt} role="status">
          <p className={styles.promptText}>
            <strong>Saved in this browser.</strong> Sign in to keep your
            progress and your reading history on every device you use.
          </p>
          <div className={styles.promptActions}>
            <button type="button" className={styles.signIn} onClick={signIn}>
              Sign in
            </button>
            <button type="button" className={styles.later} onClick={onDismiss}>
              Not now
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.note}>
          {done ? (
            <>
              Saved{signedOut ? ' in this browser' : ''}.{' '}
              <Link to="/progress">See your progress</Link>.
            </>
          ) : (
            'Tracks your progress as you work through the site.'
          )}
        </p>
      )}
    </div>
  );
}
