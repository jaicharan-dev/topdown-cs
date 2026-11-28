/**
 * "You left off at..." at the top of a checkpointed page.
 *
 * The reason checkpoints are worth having on a nine thousand word page is
 * not the progress bar, it is this: coming back two days later and being
 * put back where you were instead of scrolling for it.
 *
 * Shown only when there is something to resume, which is to say at least
 * one checkpoint ticked and at least one left. On an untouched page it
 * would be noise above the first paragraph, and on a finished one it would
 * be pointing at nothing.
 */

import React from 'react';
import useProgress from '@site/src/hooks/useProgress';
import { usePageCheckpoints } from './index';
import styles from './Resume.module.css';

export default function CheckpointResume() {
  const { ready, isCheckpointDone } = useProgress();
  const { contentId, list } = usePageCheckpoints();

  if (!ready || !contentId || list.length === 0) return null;

  const done = list.filter((entry) => isCheckpointDone(contentId, entry.id));
  if (done.length === 0 || done.length === list.length) return null;

  // The first one not yet ticked, which is not always the one after the
  // last tick: somebody may have read the scale section first and come back
  // for the middle.
  const next = list.find((entry) => !isCheckpointDone(contentId, entry.id));
  if (!next) return null;

  return (
    <aside className={styles.banner}>
      <span className={styles.count}>
        {done.length} of {list.length} done
      </span>
      {/* A plain anchor, not a Link: onBrokenAnchors only knows about
          headings written in the markdown, and would report a checkpoint's
          own id as broken on every build. */}
      <a className={styles.link} href={`#checkpoint-${next.id}`}>
        Pick up at {next.label || `checkpoint ${list.indexOf(next) + 1}`}
      </a>
    </aside>
  );
}
