import React from 'react';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import RoadmapGraph from '@site/src/components/RoadmapGraph';

// Question counts come from the generated stats, keyed by the same ids used
// for the nodes below, so adding a question updates the roadmap on its own.
/**
 * Layout grid.
 * Every tier sits on a fixed row; every edge travels exactly one tier.
 * Columns are chosen so the connectors are either dead-vertical or a single
 * rounded elbow — the graph routes itself without a line ever crossing another.
 */
const ROW = { t1: 62, t2: 196, t3: 330, t4: 464, t5: 598, t6: 732, t7: 856 };

const DAG_NODES = [
  // Tier 1 — the one true entry point
  { id: 'arrays-hashing', label: 'Arrays & Hashing', x: 565, y: ROW.t1, w: 240, h: 48, accent: '#60a5fa', href: '/docs/dsa/arrays-hashing/1-two-sum' },

  // Tier 2 — the four directions out of arrays, plus the two numeric tracks
  { id: 'math-basics', label: 'Math Basics', x: 120, y: ROW.t2, w: 160, h: 44, accent: '#fbbf24', href: '/docs/dsa/math-number-theory/1-palindrome-number' },
  { id: 'strings', label: 'Strings', x: 300, y: ROW.t2, w: 140, h: 44, accent: '#38bdf8', href: '/docs/dsa/strings/1-valid-anagram' },
  { id: 'two-pointers', label: 'Two Pointers', x: 540, y: ROW.t2, w: 175, h: 44, accent: '#34d399', href: '/docs/dsa/two-pointers/1-valid-palindrome' },
  { id: 'stacks-queues', label: 'Stacks & Queues', x: 770, y: ROW.t2, w: 190, h: 44, accent: '#818cf8', href: '/docs/dsa/stacks/1-valid-parentheses' },
  { id: 'bit-manipulation', label: 'Bit Manipulation', x: 990, y: ROW.t2, w: 200, h: 44, accent: '#c084fc', href: '/docs/dsa/bit-manipulation/1-single-number' },

  // Tier 3 — windowed scans, search space, pointer chasing
  { id: 'sliding-window', label: 'Sliding Window', x: 300, y: ROW.t3, w: 185, h: 44, accent: '#2dd4bf', href: '/docs/dsa/sliding-window/1-longest-substring-without-repeating-characters' },
  { id: 'binary-search', label: 'Binary Search', x: 540, y: ROW.t3, w: 175, h: 44, accent: '#34d399', href: '/docs/dsa/binary-search/1-binary-search' },
  { id: 'linked-lists', label: 'Linked Lists', x: 770, y: ROW.t3, w: 170, h: 44, accent: '#a78bfa', href: '/docs/dsa/linked-lists/1-reverse-linked-list' },

  // Tier 4 — local-optimum reasoning, and the hierarchical hub
  { id: 'greedy', label: 'Greedy', x: 300, y: ROW.t4, w: 150, h: 44, accent: '#4ade80', href: '/docs/dsa/greedy/1-best-time-to-buy-and-sell-stock' },
  { id: 'trees-bst', label: 'Trees & BST', x: 655, y: ROW.t4, w: 210, h: 48, accent: '#f59e0b', href: '/docs/dsa/trees/1-tree-traversals-inorder-preorder-postorder' },

  // Tier 5 — everything that grows out of ordering and recursion
  { id: 'intervals', label: 'Intervals', x: 300, y: ROW.t5, w: 160, h: 44, accent: '#facc15', href: '/docs/dsa/intervals/1-meeting-rooms' },
  { id: 'tries', label: 'Tries', x: 480, y: ROW.t5, w: 130, h: 44, accent: '#38bdf8', href: '/docs/dsa/tries/1-implement-trie-prefix-tree' },
  { id: 'heaps-priority-queues', label: 'Heaps & Priority Queues', x: 690, y: ROW.t5, w: 225, h: 44, accent: '#fb923c', href: '/docs/dsa/heaps-priority-queues/1-top-k-frequent-elements' },
  { id: 'backtracking', label: 'Backtracking', x: 930, y: ROW.t5, w: 170, h: 44, accent: '#ec4899', href: '/docs/dsa/recursion-backtracking/1-subsets' },

  // Tier 6 — traversal at scale, and memoised state
  { id: 'graphs', label: 'Graphs', x: 690, y: ROW.t6, w: 165, h: 44, accent: '#a855f7', href: '/docs/dsa/graphs/1-number-of-islands' },
  { id: '1d-dp', label: '1D Dynamic Programming', x: 930, y: ROW.t6, w: 225, h: 44, accent: '#fb7185', href: '/docs/dsa/16-1d-dp/1-climbing-stairs' },

  // Tier 7 — multi-dimensional state
  { id: '2d-dp', label: '2D Dynamic Programming', x: 930, y: ROW.t7, w: 225, h: 44, accent: '#f43f5e', href: '/docs/dsa/17-2d-dp/1-unique-paths' },
];

/**
 * Which manifest block each roadmap node stands for, worked out from the
 * node's own href rather than a hand written table.
 *
 * The ids here do not match the directory names (`trees-bst` is `9-trees`,
 * `math-basics` is `3-math-number-theory`), so a table would be four
 * exceptions waiting to rot. An href that stops resolving leaves the node
 * without progress rather than crashing, and the manifest generator already
 * fails the build on a bad id.
 */
const PAGE_BY_URL = new Map(manifest.pages.map((page) => [page.url, page]));

const BLOCK_FOR_NODE = DAG_NODES.reduce((out, node) => {
  const page = PAGE_BY_URL.get(node.href);
  if (page) out[node.id] = page.block;
  return out;
}, {});

/**
 * Connections. `toOffset` nudges the arrival port along the target's top edge so
 * two parents never land on the same pixel; every other connector enters dead
 * centre. Lines leave a node from the centre of its bottom edge, which turns a
 * multi-child fan-out into a single shared bus instead of a tangle.
 */
const EDGES = [
  { from: 'arrays-hashing', to: 'math-basics' },
  { from: 'arrays-hashing', to: 'strings' },
  { from: 'arrays-hashing', to: 'two-pointers' },
  { from: 'arrays-hashing', to: 'stacks-queues' },
  { from: 'arrays-hashing', to: 'bit-manipulation' },

  { from: 'strings', to: 'sliding-window' },
  { from: 'two-pointers', to: 'sliding-window', toOffset: 42 },
  { from: 'two-pointers', to: 'binary-search' },
  { from: 'two-pointers', to: 'linked-lists', toOffset: -40 },
  { from: 'stacks-queues', to: 'linked-lists' },

  { from: 'sliding-window', to: 'greedy' },
  { from: 'binary-search', to: 'trees-bst', toOffset: -45 },
  { from: 'linked-lists', to: 'trees-bst', toOffset: 45 },

  { from: 'greedy', to: 'intervals' },
  { from: 'trees-bst', to: 'tries' },
  { from: 'trees-bst', to: 'heaps-priority-queues' },
  { from: 'trees-bst', to: 'backtracking' },

  { from: 'heaps-priority-queues', to: 'graphs' },
  { from: 'backtracking', to: 'graphs', toOffset: 42 },
  { from: 'backtracking', to: '1d-dp' },

  { from: '1d-dp', to: '2d-dp' },
];

const VIEW_W = 1130;
const VIEW_H = 896;

export default function DsaRoadmap() {
  const { store } = useProgress();

  // Completed pages per block. All zeros until the store loads after
  // hydration, so the server markup and the first client render agree.
  const doneByBlock = React.useMemo(() => {
    const done = store && store.completed ? store.completed : {};
    const out = {};
    for (const page of manifest.pages) {
      if (done[page.id]) out[page.block] = (out[page.block] || 0) + 1;
    }
    return out;
  }, [store]);

  /** done and total for a node, both from the manifest so they cannot disagree. */
  const progressFor = (nodeId) => {
    const block = BLOCK_FOR_NODE[nodeId];
    if (!block || !manifest.blocks[block]) return { done: 0, total: 0 };
    const total = manifest.blocks[block].pages;
    return { done: Math.min(doneByBlock[block] || 0, total), total };
  };

  return (
    <RoadmapGraph
      nodes={DAG_NODES}
      edges={EDGES}
      width={VIEW_W}
      height={VIEW_H}
      progressFor={progressFor}
      idPrefix="csf-dsa"
      label="DSA roadmap: topics and what each one leads to"
    />
  );
}
