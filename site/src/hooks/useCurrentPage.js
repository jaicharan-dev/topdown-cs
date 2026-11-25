/**
 * Which manifest page, if any, the reader is currently on.
 *
 * Both the section timer and the history need this, and both need it from a
 * place that survives client side navigation, so it is a hook of its own
 * rather than two copies of the same lookup.
 *
 * The map is built once at module scope. It is a few hundred entries and the
 * manifest is a static import, so there is nothing to memoise per render.
 */

import { useLocation } from '@docusaurus/router';
import manifest from '@site/src/data/contentManifest.json';

const PAGE_BY_URL = new Map(manifest.pages.map((page) => [page.url, page]));

/** Trailing slashes vary between the dev server and the built site. */
function normalise(pathname) {
  if (!pathname) return '';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

export function pageForPath(pathname) {
  return PAGE_BY_URL.get(normalise(pathname)) || null;
}

export default function useCurrentPage() {
  const location = useLocation();
  return pageForPath(location?.pathname);
}
