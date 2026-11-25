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
 */

import React, { useEffect } from 'react';
import useCurrentPage from '@site/src/hooks/useCurrentPage';
import useTimeOnSite from '@site/src/hooks/useTimeOnSite';
import { readStore, recordVisit, writeStore } from '@site/src/lib/progressStore';

export default function Root({ children }) {
  const page = useCurrentPage();

  // Reading time is credited to the section being read, so a heading can say
  // how long went into that subject rather than into the site as a whole.
  useTimeOnSite(page ? page.group : '');

  // Read, modify, write against localStorage rather than through React state:
  // a page could be marked complete between renders, and writing back a stale
  // React copy of the store would undo it.
  useEffect(() => {
    if (!page) return;
    writeStore(
      recordVisit(readStore(), {
        id: page.id,
        url: page.url,
        title: page.title,
        group: page.group,
      })
    );
  }, [page]);

  return <>{children}</>;
}
