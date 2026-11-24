/**
 * The CS fundamentals, as a flowchart.
 *
 * This replaced a grid of cards. The grid said nothing about order, which
 * mattered: a reader landing on the homepage could not tell that OOP
 * Additional expects OOP Essential first, or that Design Patterns sits on top
 * of both. The graph says it without a word of explanation.
 *
 * The edges are real prerequisites rather than decoration. Four subject
 * lanes, three tiers: the essentials, then the additional material, then the
 * practice that depends on it.
 *
 * Node ids are manifest group keys, which is what lets progress be looked up
 * without a translation table. The DSA roadmap needs one because its node ids
 * predate the manifest; this one does not, so it does not have one.
 */

import React from 'react';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import RoadmapGraph from '@site/src/components/RoadmapGraph';

const VIEW_W = 1100;
const VIEW_H = 430;

/** Three tiers. Every edge travels exactly one tier, so no wire doubles back. */
const ROW = { essentials: 66, additional: 212, practice: 358 };

const NODES = [
  // OOP lane. The only one that branches, so its lane is the widest.
  {
    id: 'oop-essential',
    label: 'OOP Essential',
    x: 205, y: ROW.essentials, w: 175, h: 46,
    accent: '#60a5fa',
    href: '/docs/oop-essential/1-four-pillars-of-oop',
  },
  {
    id: 'oop-additional',
    label: 'OOP Additional',
    x: 205, y: ROW.additional, w: 175, h: 44,
    accent: '#93c5fd',
    href: '/docs/oop-additional/19-static-binding-vs-dynamic-binding',
  },
  {
    id: 'design-patterns',
    label: 'Design Patterns',
    x: 118, y: ROW.practice, w: 158, h: 44,
    accent: '#38bdf8',
    href: '/docs/design-patterns/1-singleton-pattern',
  },
  {
    id: 'code-tracing',
    label: 'Code Tracing',
    x: 292, y: ROW.practice, w: 158, h: 44,
    accent: '#fb7185',
    href: '/docs/code-tracing/1-code-trace-static-instance-constructor',
  },

  // DBMS lane
  {
    id: 'dbms-essential',
    label: 'DBMS Essential',
    x: 520, y: ROW.essentials, w: 175, h: 46,
    accent: '#a78bfa',
    href: '/docs/dbms-essential/1-what-is-a-transaction',
  },
  {
    id: 'dbms-additional',
    label: 'DBMS Additional',
    x: 520, y: ROW.additional, w: 175, h: 44,
    accent: '#c4b5fd',
    href: '/docs/dbms-additional/9-bcnf-vs-3nf',
  },
  {
    id: 'database-design',
    label: 'DB Design',
    x: 520, y: ROW.practice, w: 158, h: 44,
    accent: '#c084fc',
    href: '/docs/database-design/1-wallet-payment-system',
  },

  // OS lane
  {
    id: 'os-essential',
    label: 'OS Essentials',
    x: 760, y: ROW.essentials, w: 165, h: 46,
    accent: '#f59e0b',
    href: '/docs/os-essential/1-process-vs-thread',
  },
  {
    id: 'os-additional',
    label: 'OS Additional',
    x: 760, y: ROW.additional, w: 165, h: 44,
    accent: '#fbbf24',
    href: '/docs/os-additional/1-priority-inversion-mars-rover',
  },
  {
    id: 'os-problems',
    label: 'OS Problems',
    x: 760, y: ROW.practice, w: 158, h: 44,
    accent: '#fb923c',
    href: '/docs/os-problems/1-cpu-scheduling-fcfs-sjf-srtf-round-robin',
  },

  // CN lane
  {
    id: 'cn-essential',
    label: 'CN Essential',
    x: 975, y: ROW.essentials, w: 165, h: 46,
    accent: '#34d399',
    href: '/docs/cn-essential/1-osi-model-tcp-ip',
  },
  {
    id: 'cn-additional',
    label: 'CN Additional',
    x: 975, y: ROW.additional, w: 165, h: 44,
    accent: '#6ee7b7',
    href: '/docs/cn-additional/1-sessions-vs-jwt',
  },
  {
    id: 'cn-problems',
    label: 'CN Problems',
    x: 975, y: ROW.practice, w: 158, h: 44,
    accent: '#2dd4bf',
    href: '/docs/cn-problems/1-subnetting',
  },
];

const EDGES = [
  { from: 'oop-essential', to: 'oop-additional' },
  { from: 'oop-additional', to: 'design-patterns' },
  { from: 'oop-additional', to: 'code-tracing' },

  { from: 'dbms-essential', to: 'dbms-additional' },
  { from: 'dbms-additional', to: 'database-design' },

  { from: 'os-essential', to: 'os-additional' },
  { from: 'os-additional', to: 'os-problems' },

  { from: 'cn-essential', to: 'cn-additional' },
  { from: 'cn-additional', to: 'cn-problems' },
];

/**
 * The groups this graph covers, so the homepage tab can total them without
 * keeping its own copy of the list and letting the two drift.
 */
export const CS_GROUPS = NODES.map((node) => node.id);

export default function CsRoadmap() {
  const { store } = useProgress();

  // All zeros until the store loads after hydration, so the server markup and
  // the first client render agree.
  const doneByGroup = React.useMemo(() => {
    const done = store && store.completed ? store.completed : {};
    const out = {};
    for (const page of manifest.pages) {
      if (done[page.id]) out[page.group] = (out[page.group] || 0) + 1;
    }
    return out;
  }, [store]);

  const progressFor = (nodeId) => {
    const group = manifest.groups[nodeId];
    if (!group) return { done: 0, total: 0 };
    return {
      done: Math.min(doneByGroup[nodeId] || 0, group.pages),
      total: group.pages,
    };
  };

  return (
    <RoadmapGraph
      nodes={NODES}
      edges={EDGES}
      width={VIEW_W}
      height={VIEW_H}
      progressFor={progressFor}
      idPrefix="csf-cs"
      label="CS fundamentals: subjects and the order to take them in"
    />
  );
}
