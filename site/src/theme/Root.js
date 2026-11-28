/**
 * Wraps the entire app.
 *
 * Docusaurus mounts Root once and keeps it mounted across client side
 * navigation, which makes it the only correct home for anything that has to
 * survive moving between pages. The time tracker lives here for exactly that
 * reason: hanging it off a page component would restart the timer, and drop
 * whatever it had not yet flushed, every time somebody clicked a link.
 *
 * The visit log lives here for the same reason, and because it has to see
 * every navigation rather than only the ones that happen to remount a doc.
 *
 * So does the account session. The navbar, the tick at the foot of every doc
 * page and the progress page all want it at the same time, and before it was
 * a provider each of them opened its own auth listener and its own debounce
 * timer, so one local change set two or three merges racing each other.
 *
 * And so does the progress store, for the same reason and after the same
 * mistake: a design page carries five checkpoints, a resume banner and the
 * tick at the foot, which with the navbar came to nine copies of one store.
 */

import React, { useEffect } from 'react';
import { CloudSyncProvider } from '@site/src/hooks/useCloudSync';
import { ProgressProvider } from '@site/src/hooks/useProgress';
import useCurrentPage from '@site/src/hooks/useCurrentPage';
import useSession from '@site/src/hooks/useSession';
import useTimeOnSite from '@site/src/hooks/useTimeOnSite';
import { readStore, recordVisit, writeStore } from '@site/src/lib/progressStore';

export default function Root({ children }) {
  return (
    <CloudSyncProvider>
      <ProgressProvider>
        <Recorder>{children}</Recorder>
      </ProgressProvider>
    </CloudSyncProvider>
  );
}

/**
 * Everything that watches and writes.
 *
 * A separate component because it reads the session, and a component cannot
 * consume a context it is itself providing.
 */
function Recorder({ children }) {
  const page = useCurrentPage();
  const { canSave } = useSession();

  // Reading time is credited to the section being read, so a heading can say
  // how long went into that subject rather than into the site as a whole.
  // Nothing is counted at all without an account to count it against.
  useTimeOnSite(page ? page.group : '', canSave);

  // Read, modify, write against localStorage rather than through React state:
  // a page could be marked complete between renders, and writing back a stale
  // React copy of the store would undo it.
  useEffect(() => {
    if (!page || !canSave) return;
    writeStore(
      recordVisit(readStore(), {
        id: page.id,
        url: page.url,
        title: page.title,
        group: page.group,
      })
    );
  }, [page, canSave]);

  return <>{children}</>;
}
