import React, { useState } from 'react';
import { useHistory } from '@docusaurus/router';

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
  const [hoveredNode, setHoveredNode] = useState(null);
  const history = useHistory();

  const nodeMap = DAG_NODES.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});

  // Endpoints of a connector: centre-bottom of the source, ported top of the target.
  const getPorts = (edge) => {
    const source = nodeMap[edge.from];
    const target = nodeMap[edge.to];
    if (!source || !target) return null;
    return {
      x1: source.x,
      y1: source.y + source.h / 2,
      x2: target.x + (edge.toOffset || 0),
      y2: target.y - target.h / 2,
      source,
      target,
    };
  };

  // Orthogonal connector: drop, round the corner, traverse, round, drop in.
  const getConnectorPath = (edge) => {
    const p = getPorts(edge);
    if (!p) return '';
    const { x1, y1, x2, y2 } = p;

    if (Math.abs(x1 - x2) < 1) return `M ${x1} ${y1} L ${x2} ${y2}`;

    const laneY = y1 + (y2 - y1) / 2;
    const dir = x2 > x1 ? 1 : -1;
    const r = Math.min(18, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2);

    return [
      `M ${x1} ${y1}`,
      `L ${x1} ${laneY - r}`,
      `Q ${x1} ${laneY} ${x1 + dir * r} ${laneY}`,
      `L ${x2 - dir * r} ${laneY}`,
      `Q ${x2} ${laneY} ${x2} ${laneY + r}`,
      `L ${x2} ${y2}`,
    ].join(' ');
  };

  const isEdgeHighlighted = (edge) =>
    Boolean(hoveredNode) && (edge.from === hoveredNode || edge.to === hoveredNode);

  const clearHover = () => setHoveredNode(null);

  return (
    <div className="csf-dsa-roadmap-wrapper">
      <div className="csf-dsa-svg-wrapper">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="csf-dsa-svg"
          preserveAspectRatio="xMidYMid meet"
          onTouchEnd={clearHover}
        >
          <defs>
            {EDGES.map((edge, index) => {
              const p = getPorts(edge);
              if (!p) return null;
              return (
                <linearGradient
                  key={`grad-${index}`}
                  id={`csf-dsa-wire-${index}`}
                  gradientUnits="userSpaceOnUse"
                  x1={p.x1}
                  y1={p.y1}
                  x2={p.x2}
                  y2={p.y2}
                >
                  <stop offset="0%" stopColor={p.source.accent} />
                  <stop offset="100%" stopColor={p.target.accent} />
                </linearGradient>
              );
            })}
          </defs>

          <g className="csf-dsa-edges">
            {EDGES.map((edge, index) => {
              if (!nodeMap[edge.from] || !nodeMap[edge.to]) return null;

              const highlighted = isEdgeHighlighted(edge);
              const dimmed = hoveredNode && !highlighted;

              const d = getConnectorPath(edge);

              return (
                <g key={`${edge.from}-${edge.to}-${index}`}>
                  <path
                    d={d}
                    stroke={`url(#csf-dsa-wire-${index})`}
                    className={`csf-dsa-edge ${highlighted ? 'csf-dsa-edge--highlighted' : ''} ${dimmed ? 'csf-dsa-edge--dimmed' : ''}`}
                  />
                  {highlighted && (
                    <path
                      d={d}
                      stroke={`url(#csf-dsa-wire-${index})`}
                      className="csf-dsa-edge csf-dsa-edge__pulse"
                    />
                  )}
                </g>
              );
            })}
          </g>

          <g className="csf-dsa-nodes">
            {DAG_NODES.map((node) => {
              const isHovered = hoveredNode === node.id;
              const isConnected = hoveredNode && EDGES.some(
                (e) => (e.from === hoveredNode && e.to === node.id) || (e.to === hoveredNode && e.from === node.id)
              );
              const isDimmed = hoveredNode && !isHovered && !isConnected;

              return (
                <g
                  key={node.id}
                  className={`csf-dsa-node-group ${isHovered ? 'is-hovered' : ''} ${isConnected ? 'is-connected' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ '--node-accent': node.accent, cursor: 'pointer' }}
                  onClick={() => node.href && history.push(node.href)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && node.href) {
                      e.preventDefault();
                      history.push(node.href);
                    }
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={clearHover}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setHoveredNode(node.id);
                  }}
                  tabIndex="0"
                  role="button"
                  aria-label={`${node.label} roadmap topic`}
                >
                  <rect
                    x={-node.w / 2 - 12}
                    y={-node.h / 2 - 12}
                    width={node.w + 24}
                    height={node.h + 24}
                    fill="transparent"
                    pointerEvents="all"
                    className="csf-dsa-hit-box"
                  />

                  <rect
                    x={-node.w / 2}
                    y={-node.h / 2}
                    width={node.w}
                    height={node.h}
                    rx="14"
                    ry="14"
                    pointerEvents="none"
                    className="csf-dsa-node-card"
                  />

                  {/* Accent rail along the top edge - every wire lands on it */}
                  <rect
                    x={-node.w / 2 + 18}
                    y={-node.h / 2 - 1.5}
                    width={node.w - 36}
                    height={3}
                    rx="1.5"
                    pointerEvents="none"
                    className="csf-dsa-node-tab"
                    fill={node.accent}
                  />

                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    pointerEvents="none"
                    className="csf-dsa-node-label"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

      </div>
    </div>
  );
}
