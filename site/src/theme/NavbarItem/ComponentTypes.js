/**
 * Extra navbar item kinds, referenced by `type` in docusaurus.config.js.
 *
 * Swizzling this file is the supported way to put a React component of your
 * own in the navbar; the alternative is replacing the whole Navbar, which
 * would mean owning the responsive drawer, the search slot and the theme
 * toggle forever in exchange for three buttons.
 */

import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import NavbarAccount from '@site/src/components/NavbarAccount';
import NavbarHeatmap from '@site/src/components/NavbarHeatmap';
import NavbarStats from '@site/src/components/NavbarStats';

export default {
  ...ComponentTypes,
  'custom-stats': NavbarStats,
  'custom-heatmap': NavbarHeatmap,
  'custom-account': NavbarAccount,
};
