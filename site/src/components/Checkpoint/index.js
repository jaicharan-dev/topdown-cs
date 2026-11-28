/**
 * A resting point inside a long page, which the reader can tick.
 *
 * The design pages run to eight or nine thousand words and are read over
 * several sittings. One button at the foot of that could say nothing about
 * the four thousand words already behind you, so the site knew only
 * "opened" and "finished" and showed neither until the end.
 *
 * Checkpoints are authored, not derived. Deriving them from the numbered
 * Breaks was the obvious idea and it is wrong: on the Splitwise page all
 * three breaks land in steps 6 to 8, so a reader a third of the way in
 * would be told they were three quarters done. Where a page can be put
 * down is a judgement about the writing, so it is made in the writing.
 *
 * Ticking the last one marks the page complete, which is why this needs the
 * total from the manifest rather than counting what it can see: only one
 * checkpoint is mounted per position in the page, and none of them knows
 * about the others.
 */

import React, { useState } from 'react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import useCloudSync from '@site/src/hooks/useCloudSync';
import useSession from '@site/src/hooks/useSession';
import { setGuest } from '@site/src/lib/guest';
import styles from './styles.module.css';

/** The manifest entry for the page this is rendered inside. */
export function usePageCheckpoints() {
  const { frontMatter, metadata } = useDoc();
  const contentId = frontMatter?.id || metadata?.id?.split('/').pop() || null;
  const page = contentId
    ? manifest.pages.find((entry) => entry.id === contentId)
    : null;
  return { contentId, list: page?.checkpoints || [] };
}

function Tick() {
  return (
    <svg className={styles.tick} viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M4 10.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Checkpoint({ id, label }) {
  const { ready, isCheckpointDone, toggleCheckpoint } = useProgress();
  const { canSave, resolving } = useSession();
  const { signIn } = useCloudSync();
  const { contentId, list } = usePageCheckpoints();
  const [asking, setAsking] = useState(false);

  if (!id || !contentId) return null;

  const index = list.findIndex((entry) => entry.id === id);
  const done = ready && isCheckpointDone(contentId, id);

  const onToggle = () => {
    if (!toggleCheckpoint(contentId, id, list.length)) setAsking(true);
  };

  return (
    /* The anchor is on the wrapper so the resume link at the top of the page
       has somewhere to land. A plain id rather than a heading: a heading
       here would show up in the table of contents, which is for the
       argument of the page, not for its save points. */
    <div className={styles.wrapper} id={`checkpoint-${id}`}>
      <div className={styles.rule} aria-hidden="true" />

      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          data-done={done ? 'true' : 'false'}
          disabled={!ready || resolving}
          aria-pressed={done}
          onClick={onToggle}>
          <span className={styles.box} aria-hidden="true">
            {done && <Tick />}
          </span>
          <span className={styles.text}>
            <span className={styles.count}>
              Checkpoint {index >= 0 ? index + 1 : '?'}
              {list.length ? ` of ${list.length}` : ''}
            </span>
            {label && <span className={styles.label}>{label}</span>}
          </span>
        </button>
      </div>

      {asking && (
        /* Short on purpose. The full invitation lives at the foot of the
           page; six copies of it inside one page would be the site asking
           the same question every thousand words. */
        <p className={styles.ask}>
          <button
            type="button"
            className={styles.signIn}
            onClick={() => signIn()}>
            Sign in
          </button>
          to keep your place, or{' '}
          <button
            type="button"
            className={styles.later}
            onClick={() => {
              setGuest(true);
              setAsking(false);
            }}>
            keep reading
          </button>
          .
        </p>
      )}
    </div>
  );
}
