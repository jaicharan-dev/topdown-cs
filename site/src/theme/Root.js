/**
 * Wraps the entire app.
 *
 * Docusaurus mounts Root once and keeps it mounted across client side
 * navigation, which makes it the only correct home for anything that has to
 * survive moving between pages. The time tracker lives here for exactly that
 * reason: hanging it off a page component would restart the timer, and drop
 * whatever it had not yet flushed, every time somebody clicked a link.
 */

import React from 'react';
import useTimeOnSite from '@site/src/hooks/useTimeOnSite';

export default function Root({ children }) {
  useTimeOnSite();
  return <>{children}</>;
}
