/**
 * The CS fundamentals, as one connected flowchart.
 *
 * This replaced a grid of cards. The grid said nothing about order, which
 * mattered: a reader landing on the homepage could not tell that OOP
 * Additional expects OOP Essential first, or that Design Patterns sits on top
 * of both. The graph says it without a word of explanation.
 *
 * The four subjects have no prerequisites between each other. Nothing in DBMS
 * needs OS first, so an edge between them would be a lie. They are joined at a
 * hub instead: one entry node that fans out into the four lanes, which makes
 * the whole thing a single graph without inventing an order that is not real.
 * The hub carries no link of its own and shows the total across all four, so
 * it doubles as the overall CS progress bar.
 *
 * Node ids are manifest group keys, which is what lets progress be looked up
 * without a translation table. The DSA roadmap needs one because its node ids
 * predate the manifest; this one does not, so it does not have one.
 *
 * The viewBox is the same width as the DSA roadmap on purpose. Both are drawn
 * into the same panel, so matching widths means matching scale, and a label or
 * a border is the same size whichever tab you are on.
 */

import React from 'react';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import { sectionSeconds } from '@site/src/lib/progressStore';
import { formatDuration } from '@site/src/lib/timeTracker';
import RoadmapGraph from '@site/src/components/RoadmapGraph';

const VIEW_W = 1130;
const VIEW_H = 466;

/**
 * The hub, then three tiers. Every edge travels exactly one tier, so no wire
 * doubles back.
 */
const ROW = { hub: 56, essentials: 176, additional: 296, practice: 416 };

const NODES = [
  // The entry point, and now a door as well. It sat there looking exactly
  // like every other block and doing nothing when pressed, which is the one
  // thing a block in a flowchart must not do. There is no page that means
  // "all of CS", so it opens the first page of the first subject: where
  // somebody clicking the top of a learning path is trying to get to.
  {
    id: 'cs-all',
    label: 'CS Fundamentals',
    hub: true,
    x: 565, y: ROW.hub, w: 230, h: 48,
    accent: '#818cf8',
    href: '/docs/oop-essential/1-four-pillars-of-oop',
  },

  // OOP lane. The only one that branches, so its lane is the widest.
  {
    id: 'oop-essential',
    label: 'OOP Essential',
    x: 221, y: ROW.essentials, w: 178, h: 46,
    accent: '#fb923c',
    href: '/docs/oop-essential/1-four-pillars-of-oop',
  },
  {
    id: 'oop-additional',
    label: 'OOP Additional',
    x: 221, y: ROW.additional, w: 178, h: 44,
    accent: '#60a5fa',
    href: '/docs/oop-additional/19-static-binding-vs-dynamic-binding',
  },
  {
    id: 'design-patterns',
    label: 'Design Patterns',
    x: 131, y: ROW.practice, w: 160, h: 44,
    accent: '#34d399',
    href: '/docs/design-patterns/1-singleton-pattern',
  },
  {
    id: 'code-tracing',
    label: 'Code Tracing',
    x: 311, y: ROW.practice, w: 160, h: 44,
    accent: '#facc15',
    href: '/docs/code-tracing/1-code-trace-static-instance-constructor',
  },

  // DBMS lane
  {
    id: 'dbms-essential',
    label: 'DBMS Essential',
    x: 521, y: ROW.essentials, w: 182, h: 46,
    accent: '#4ade80',
    href: '/docs/dbms-essential/1-what-is-a-transaction',
  },
  {
    id: 'dbms-additional',
    label: 'DBMS Additional',
    x: 521, y: ROW.additional, w: 182, h: 44,
    accent: '#fb7185',
    href: '/docs/dbms-additional/9-bcnf-vs-3nf',
  },
  {
    id: 'database-design',
    label: 'DB Design',
    x: 521, y: ROW.practice, w: 164, h: 44,
    accent: '#38bdf8',
    href: '/docs/database-design/1-wallet-payment-system',
  },

  // OS lane
  {
    id: 'os-essential',
    label: 'OS Essentials',
    x: 771, y: ROW.essentials, w: 168, h: 46,
    accent: '#e879f9',
    href: '/docs/os-essential/1-process-vs-thread',
  },
  {
    id: 'os-additional',
    label: 'OS Additional',
    x: 771, y: ROW.additional, w: 168, h: 44,
    accent: '#a3e635',
    href: '/docs/os-additional/1-priority-inversion-mars-rover',
  },
  {
    id: 'os-problems',
    label: 'OS Problems',
    x: 771, y: ROW.practice, w: 164, h: 44,
    accent: '#a78bfa',
    href: '/docs/os-problems/1-cpu-scheduling-fcfs-sjf-srtf-round-robin',
  },

  // CN lane
  {
    id: 'cn-essential',
    label: 'CN Essential',
    x: 991, y: ROW.essentials, w: 168, h: 46,
    accent: '#2dd4bf',
    href: '/docs/cn-essential/1-osi-model-tcp-ip',
  },
  {
    id: 'cn-additional',
    label: 'CN Additional',
    x: 991, y: ROW.additional, w: 168, h: 44,
    accent: '#f472b6',
    href: '/docs/cn-additional/1-sessions-vs-jwt',
  },
  {
    id: 'cn-problems',
    label: 'CN Problems',
    x: 991, y: ROW.practice, w: 164, h: 44,
    accent: '#22d3ee',
    href: '/docs/cn-problems/1-subnetting',
  },
];

/**
 * Connections.
 *
 * The four out of the hub need both offsets. `fromOffset` spreads the
 * departure points along the hub's bottom edge so each wire gets its own
 * vertical stem instead of four stems drawn on top of each other.
 * `laneOffset` puts the two long runs on the upper lane and the two short ones
 * on the lower lane, which is the one arrangement of the four where no wire
 * crosses another: a short run turning late stays inside the span its long
 * neighbour already left behind.
 */
const EDGES = [
  { from: 'cs-all', to: 'oop-essential', fromOffset: -54, laneOffset: -14 },
  { from: 'cs-all', to: 'dbms-essential', fromOffset: -18, laneOffset: 12 },
  { from: 'cs-all', to: 'os-essential', fromOffset: 18, laneOffset: 12 },
  { from: 'cs-all', to: 'cn-essential', fromOffset: 54, laneOffset: -14 },

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
 * keeping its own copy of the list and letting the two drift. The hub is not
 * a group, so it is not in here.
 */
export const CS_GROUPS = NODES.filter((node) => !node.hub).map((node) => node.id);

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
    // The hub stands for everything below it, so its numbers are the sum of
    // the lanes rather than a group of its own.
    if (nodeId === 'cs-all') {
      let done = 0;
      let total = 0;
      for (const id of CS_GROUPS) {
        const group = manifest.groups[id];
        if (!group) continue;
        total += group.pages;
        done += Math.min(doneByGroup[id] || 0, group.pages);
      }
      return { done, total };
    }

    const group = manifest.groups[nodeId];
    if (!group) return { done: 0, total: 0 };
    return {
      done: Math.min(doneByGroup[nodeId] || 0, group.pages),
      total: group.pages,
    };
  };

  // Only shown once there is some: "0m" beside a heading is a
  // reproach, not a statistic.
  const seconds = sectionSeconds(store, CS_GROUPS);
  const readingTime = seconds ? formatDuration(seconds) : null;

  return (
    <RoadmapGraph
      nodes={NODES}
      edges={EDGES}
      width={VIEW_W}
      height={VIEW_H}
      progressFor={progressFor}
      meta={readingTime}
      idPrefix="csf-cs"
      title="Learning path"
      label="CS fundamentals: subjects and the order to take them in"
    />
  );
}
