/**
 * Components every .md page can use without importing them.
 *
 * Only for things that belong to the site rather than to one page. A
 * checkpoint qualifies: it is part of how the site records progress, and
 * requiring six import lines at the top of every long page would put the
 * machinery in the author's way.
 */

import MDXComponents from '@theme-original/MDXComponents';
import Checkpoint from '@site/src/components/Checkpoint';

export default {
  ...MDXComponents,
  Checkpoint,
};
