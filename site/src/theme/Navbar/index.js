/**
 * The navbar, with a second row under it on a phone.
 *
 * Wrapping rather than replacing: the original keeps the drawer, the search
 * slot, the theme toggle and the scroll behaviour, and this adds one row
 * after it. The row styles itself out of the way above the drawer
 * breakpoint, where the bar has room for what it carries.
 */

import React from 'react';
import Navbar from '@theme-original/Navbar';
import MobileBar from '@site/src/components/MobileBar';

export default function NavbarWrapper(props) {
  return (
    <>
      <Navbar {...props} />
      <MobileBar />
    </>
  );
}
