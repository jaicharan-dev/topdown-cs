/**
 * System design, as one flowchart.
 *
 * The thing worth knowing before reading this file: about a third of a
 * system design syllabus was already on this site, filed under CS
 * fundamentals. The CN lanes cover proxies, load balancers, CDNs, DNS,
 * TLS, HTTP versions, WebSockets, HTTP caching and idempotency keys. The
 * DBMS lanes cover CAP, eventual consistency, replication, sharding, shard
 * keys and hotspots, isolation levels and crash recovery.
 *
 * So this section does not teach load balancers again. A second page on
 * the same subject is two pages that drift apart, and a reader who has
 * finished CN and is then taught it again has been wasted. The map sends
 * people into those lanes instead, as `prerequisite` nodes drawn
 * differently, because a box that looked like the others would not say it
 * lives in another tab.
 *
 * Those borrowed lanes are deliberately NOT in the tab's own groups. One
 * page has one id, so finishing a CN page anywhere ticks it everywhere,
 * and counting them here as well would open this tab at 40% for somebody
 * who has not read a word of system design. In interview prep that is the
 * dangerous direction to be wrong in: it tells somebody they are ready.
 *
 * Same viewBox width as the other three maps, so a label is the same size
 * whichever tab you are on.
 */

import React from 'react';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import { sectionSeconds } from '@site/src/lib/progressStore';
import { formatDuration } from '@site/src/lib/timeTracker';
import RoadmapGraph from '@site/src/components/RoadmapGraph';

const VIEW_W = 1130;
const VIEW_H = 420;

/** Only this section's own groups. See the note above on the borrowed ones. */
export const SYSTEM_DESIGN_GROUPS = ['sd-essential'];

/** The lanes this map sends people into, which live in the CS tab. */
const PREREQUISITES = ['cn-essential', 'cn-additional', 'dbms-additional'];

const ROW = { start: 56, build: 186, deeper: 316 };

const NODES = [
  // Estimation leads because it is where a system design answer actually
  // starts: the numbers decide which of several designs is being asked
  // for, and everything below is chosen by them.
  {
    id: '1-back-of-the-envelope',
    label: 'Estimation',
    hub: true,
    x: 565, y: ROW.start, w: 230, h: 48,
    accent: '#818cf8',
  },

  {
    id: '2-caching-strategies',
    label: 'Caching',
    x: 230, y: ROW.build, w: 180, h: 46,
    accent: '#2dd4bf',
  },
  {
    id: '3-rate-limiting',
    label: 'Rate Limiting',
    x: 565, y: ROW.build, w: 190, h: 46,
    accent: '#fbbf24',
  },
  {
    id: '4-queues-and-async',
    label: 'Queues & Async',
    x: 900, y: ROW.build, w: 200, h: 46,
    accent: '#fb7185',
  },

  // The groundwork, in the CS tab. Each one sits under the topic it
  // actually serves rather than being a decorative row: caching leads into
  // CDNs and proxies, rate limiting into the HTTP and API lane, and
  // asynchronous work into the durability and consistency lane.
  {
    id: 'cn-essential',
    label: 'Networking',
    kind: 'prerequisite',
    x: 230, y: ROW.deeper, w: 180, h: 44,
    accent: '#38bdf8',
    href: '/docs/cn-essential/9-proxy-load-balancer-cdn',
  },
  {
    id: 'cn-additional',
    label: 'Web & APIs',
    kind: 'prerequisite',
    x: 565, y: ROW.deeper, w: 180, h: 44,
    accent: '#a78bfa',
    href: '/docs/cn-additional/5-api-idempotency',
  },
  {
    id: 'dbms-additional',
    label: 'Data at Scale',
    kind: 'prerequisite',
    x: 900, y: ROW.deeper, w: 190, h: 44,
    accent: '#4ade80',
    href: '/docs/dbms-additional/30-cap-theorem-sql-vs-nosql',
  },
].map((node) =>
  node.href
    ? node
    : {
        ...node,
        href: manifest.pages.find((page) => page.id === node.id)?.url || '/',
      }
);

/** Every edge travels exactly one row, so no wire doubles back. */
const EDGES = [
  { from: '1-back-of-the-envelope', to: '2-caching-strategies' },
  { from: '1-back-of-the-envelope', to: '3-rate-limiting' },
  { from: '1-back-of-the-envelope', to: '4-queues-and-async' },

  { from: '2-caching-strategies', to: 'cn-essential' },
  { from: '3-rate-limiting', to: 'cn-additional' },
  { from: '4-queues-and-async', to: 'dbms-additional' },
];

export default function SystemDesignRoadmap() {
  const { store } = useProgress();

  const doneByGroup = React.useMemo(() => {
    const done = store && store.completed ? store.completed : {};
    const out = {};
    for (const page of manifest.pages) {
      if (done[page.id]) out[page.group] = (out[page.group] || 0) + 1;
    }
    return out;
  }, [store]);

  const progressFor = (nodeId) => {
    // A borrowed lane reports its whole group, which is the honest number
    // for it: the node stands for the lane, not for one page.
    const group = manifest.groups[nodeId];
    if (group) {
      return {
        done: Math.min(doneByGroup[nodeId] || 0, group.pages),
        total: group.pages,
      };
    }

    // This section's own nodes are single pages, so they are done or not.
    const page = manifest.pages.find((entry) => entry.id === nodeId);
    if (!page) return { done: 0, total: 0 };
    return { done: store?.completed?.[nodeId] ? 1 : 0, total: 1 };
  };

  // Only this section's reading time. The CN and DBMS lanes report their
  // own in the tab they belong to, and counting them twice would make the
  // site's hours add up to more than anybody has spent.
  const seconds = sectionSeconds(store, SYSTEM_DESIGN_GROUPS);
  const readingTime = seconds ? formatDuration(seconds) : null;

  return (
    <RoadmapGraph
      nodes={NODES}
      edges={EDGES}
      width={VIEW_W}
      height={VIEW_H}
      progressFor={progressFor}
      meta={readingTime}
      idPrefix="csf-sd"
      title="System design"
      label="System design topics, and the networking and data lanes they build on"
    />
  );
}

export { PREREQUISITES };
