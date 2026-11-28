/**
 * The schema design questions, as one flowchart.
 *
 * These were a lane at the bottom of the CS map, under DBMS, which read as
 * "a bit more DBMS when you have time". They are the longest pages on the
 * site by a wide margin: fifty thousand words across six questions, where
 * the whole of DSA is a hundred and twenty-six thousand across a hundred
 * and sixty-nine. A lane of one box was the wrong shape for that.
 *
 * Each node is one question and its bar is that question's checkpoints, so
 * the map shows where somebody is INSIDE a question rather than only
 * whether they have finished one. On pages this long that is the whole
 * difference between a progress bar and a progress bar worth looking at.
 *
 * The edges are the order the pages themselves claim. The wallet says it is
 * "the first and shortest ... deliberately the foundation for the rest",
 * and every later page links back to the ones above it: stock trading
 * references Splitwise, food delivery and ride hailing; e-commerce
 * references all four. Nothing here was invented to make the picture
 * tidier.
 *
 * Same viewBox width as the other two maps, so a label is the same size
 * whichever tab you are on.
 */

import React from 'react';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import { checkpointsFor, sectionSeconds } from '@site/src/lib/progressStore';
import { formatDuration } from '@site/src/lib/timeTracker';
import RoadmapGraph from '@site/src/components/RoadmapGraph';

const VIEW_W = 1130;
const VIEW_H = 420;

export const DB_DESIGN_GROUPS = ['database-design'];

const ROW = { foundation: 56, build: 186, hardest: 316 };

/**
 * Node ids are page ids, which is what lets the checkpoint lookup work with
 * no translation table. The hrefs are derived from the same ids below.
 */
const NODES = [
  {
    id: '1-wallet-payment-system',
    label: 'Digital Wallet',
    hub: true,
    x: 565, y: ROW.foundation, w: 230, h: 48,
    accent: '#38bdf8',
  },

  {
    id: '4-expense-splitting-splitwise',
    label: 'Splitwise',
    x: 230, y: ROW.build, w: 180, h: 46,
    accent: '#a78bfa',
  },
  {
    id: '5-food-delivery-swiggy-zomato',
    label: 'Food Delivery',
    x: 565, y: ROW.build, w: 190, h: 46,
    accent: '#fb923c',
  },
  {
    id: '6-cab-booking-uber-ola',
    label: 'Ride Hailing',
    x: 900, y: ROW.build, w: 185, h: 46,
    accent: '#4ade80',
  },

  {
    id: '7-stock-trading-zerodha-groww',
    label: 'Stock Trading',
    x: 390, y: ROW.hardest, w: 190, h: 46,
    accent: '#facc15',
  },
  {
    id: '8-ecommerce-amazon-flipkart',
    label: 'E-Commerce',
    x: 740, y: ROW.hardest, w: 190, h: 46,
    accent: '#fb7185',
  },
].map((node) => ({
  ...node,
  href: manifest.pages.find((page) => page.id === node.id)?.url || '/',
}));

/** Every edge travels exactly one row, so no wire doubles back. */
const EDGES = [
  { from: '1-wallet-payment-system', to: '4-expense-splitting-splitwise' },
  { from: '1-wallet-payment-system', to: '5-food-delivery-swiggy-zomato' },
  { from: '1-wallet-payment-system', to: '6-cab-booking-uber-ola' },

  { from: '4-expense-splitting-splitwise', to: '7-stock-trading-zerodha-groww' },
  { from: '5-food-delivery-swiggy-zomato', to: '7-stock-trading-zerodha-groww' },
  { from: '5-food-delivery-swiggy-zomato', to: '8-ecommerce-amazon-flipkart' },
  { from: '6-cab-booking-uber-ola', to: '8-ecommerce-amazon-flipkart' },
];

/** How many checkpoints each question declares, read once at module load. */
const TOTALS = Object.fromEntries(
  NODES.map((node) => [
    node.id,
    manifest.pages.find((page) => page.id === node.id)?.checkpoints?.length || 0,
  ])
);

export default function DbDesignRoadmap() {
  const { store } = useProgress();

  const progressFor = (nodeId) => {
    const total = TOTALS[nodeId] || 0;
    if (!total) return { done: 0, total: 0 };
    const ticked = Object.keys(checkpointsFor(store, nodeId)).length;
    return { done: Math.min(ticked, total), total };
  };

  // Only shown once there is some: "0m" beside a heading is a reproach,
  // not a statistic.
  const seconds = sectionSeconds(store, DB_DESIGN_GROUPS);
  const readingTime = seconds ? formatDuration(seconds) : null;

  return (
    <RoadmapGraph
      nodes={NODES}
      edges={EDGES}
      width={VIEW_W}
      height={VIEW_H}
      progressFor={progressFor}
      meta={readingTime}
      idPrefix="csf-dbd"
      title="Schema design"
      label="Database design questions, and the order they build on each other"
    />
  );
}
