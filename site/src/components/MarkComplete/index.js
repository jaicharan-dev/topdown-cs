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
 */

import Link from '@docusaurus/Link';
import React from 'react';
import useProgress from '@site/src/hooks/useProgress';
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

  if (!contentId) return null;

  const done = ready && isComplete(contentId);

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        data-complete={done ? 'true' : 'false'}
        disabled={!ready}
        aria-pressed={done}
        onClick={() => toggle(contentId)}>
        <span className={styles.box} aria-hidden="true">
          {done && <CheckIcon />}
        </span>
        <span>{done ? 'Completed' : 'Mark as complete'}</span>
      </button>
      <p className={styles.note}>
        {done ? (
          <>
            Saved in this browser.{' '}
            <Link to="/progress">See your progress</Link>.
          </>
        ) : (
          'Tracks your progress. Stored in this browser only.'
        )}
      </p>
    </div>
  );
}
