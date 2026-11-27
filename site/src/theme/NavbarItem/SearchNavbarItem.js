/**
 * The search slot, in whichever of the two places is on screen.
 *
 * The theme renders search in the navbar and nothing in the drawer, which
 * worked while the bar had room for it. On a phone the bar now keeps only
 * the level badge and the picture, so search follows Progress and the
 * sections into the menu rather than disappearing.
 *
 * Only one of the two is ever mounted. Both would build the search index
 * twice and bind the keyboard shortcut twice, and the shortcut would land
 * on whichever input the page happened to render first, which on a phone is
 * the one nobody can see.
 */

import React from 'react';
import { useWindowSize } from '@docusaurus/theme-common';
import SearchBar from '@theme/SearchBar';
import NavbarSearch from '@theme/Navbar/Search';

export default function SearchNavbarItem({ mobile, className }) {
  const windowSize = useWindowSize();

  // In the drawer it is a row of the menu, like everything else in there.
  if (mobile) {
    return (
      <li className="menu__list-item csf-drawer-search">
        <SearchBar />
      </li>
    );
  }

  // The drawer exists only below the breakpoint, and that is exactly where
  // this copy is hidden, so below it there is nothing for this one to do.
  // During the first render the size is not known yet and the bar's copy is
  // what gets prerendered; the stylesheet keeps it out of sight until the
  // measurement arrives and this unmounts it.
  if (windowSize === 'mobile') return null;

  return (
    <NavbarSearch className={className}>
      <SearchBar />
    </NavbarSearch>
  );
}
