import React, { useState } from 'react';

// TopDown CS Original Architectural Flowchart (15 Core Topics) - Large-Scale Substantial Architecture
const NODES = [
  // Tier 1: Core Foundation & Memory Models (Center: X=440)
  { id: 'arrays-hashing', label: 'Arrays & Hashing', x: 440, y: 50, w: 240, h: 64, count: 9, accent: '#60a5fa' },
  { id: 'two-pointers', label: 'Two Pointers', x: 250, y: 175, w: 200, h: 60, count: 5, accent: '#38bdf8' },
  { id: 'stacks-queues', label: 'Stacks & Queues', x: 630, y: 175, w: 210, h: 60, count: 8, accent: '#818cf8' },

  // Tier 2: Search Space & Linear Traversal
  { id: 'binary-search', label: 'Binary Search', x: 140, y: 300, w: 190, h: 60, count: 7, accent: '#34d399' },
  { id: 'sliding-window', label: 'Sliding Window', x: 350, y: 300, w: 200, h: 60, count: 6, accent: '#38bdf8' },
  { id: 'linked-lists', label: 'Linked Lists', x: 630, y: 300, w: 195, h: 60, count: 11, accent: '#a78bfa' },

  // Tier 3: Hierarchical Convergence Hub
  { id: 'trees-bst', label: 'Trees & BST', x: 440, y: 430, w: 220, h: 64, count: 15, accent: '#f59e0b' },

  // Tier 4: The 3 Non-Linear Computing Pillars
  { id: 'heaps-priority', label: 'Heaps & Priority', x: 160, y: 565, w: 210, h: 60, count: 7, accent: '#fb923c' },
  { id: 'graph-algorithms', label: 'Graph Algorithms', x: 440, y: 565, w: 220, h: 60, count: 13, accent: '#c084fc' },
  { id: 'backtracking', label: 'Recursion & Backtracking', x: 720, y: 565, w: 265, h: 60, count: 9, accent: '#ec4899' },

  // Tier 5: Greedy Optimization & Dynamic Programming
  { id: 'intervals', label: 'Intervals', x: 85, y: 705, w: 155, h: 60, count: 6, accent: '#facc15' },
  { id: 'greedy', label: 'Greedy Algorithms', x: 275, y: 705, w: 205, h: 60, count: 8, accent: '#fbbf24' },
  { id: '1d-dp', label: '1D Dynamic Programming', x: 580, y: 705, w: 270, h: 60, count: 12, accent: '#fb7185' },

  // Tier 6: Multi-Dimensional State & Bit Optimization
  { id: '2d-dp', label: '2D Dynamic Programming', x: 440, y: 840, w: 270, h: 64, count: 11, accent: '#f43f5e' },
  { id: 'bit-manipulation', label: 'Bit Manipulation', x: 720, y: 840, w: 210, h: 60, count: 7, accent: '#a855f7' },
];

const EDGES = [
  // Root branching
  { from: 'arrays-hashing', to: 'two-pointers' },
  { from: 'arrays-hashing', to: 'stacks-queues' },

  // Linear progression
  { from: 'two-pointers', to: 'binary-search' },
  { from: 'two-pointers', to: 'sliding-window' },
  { from: 'stacks-queues', to: 'linked-lists' },

  // Convergence to Trees & BST
  { from: 'binary-search', to: 'trees-bst' },
  { from: 'sliding-window', to: 'trees-bst' },
  { from: 'linked-lists', to: 'trees-bst' },

  // Branching to the 3 non-linear pillars
  { from: 'trees-bst', to: 'heaps-priority' },
  { from: 'trees-bst', to: 'graph-algorithms' },
  { from: 'trees-bst', to: 'backtracking' },

  // From Heaps & Priority
  { from: 'heaps-priority', to: 'intervals' },
  { from: 'heaps-priority', to: 'greedy' },

  // Convergence into 1D Dynamic Programming
  { from: 'graph-algorithms', to: '1d-dp' },
  { from: 'backtracking', to: '1d-dp' },

  // From 1D DP
  { from: '1d-dp', to: '2d-dp' },
  { from: '1d-dp', to: 'bit-manipulation' },
];

const nodeMap = NODES.reduce((acc, node) => {
  acc[node.id] = node;
  return acc;
}, {});

export default function DsaRoadmap() {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Flowchart-style orthogonal connector with clean 90-degree rounded corners
  const getOrthogonalPath = (source, target) => {
    const x1 = source.x;
    const y1 = source.y + source.h / 2;
    const x2 = target.x;
    const y2 = target.y - target.h / 2;

    // Straight vertical drop if perfectly aligned
    if (Math.abs(x1 - x2) < 2) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    const ym = y1 + (y2 - y1) * 0.5;
    const maxR = Math.min(8, Math.abs(x2 - x1) / 2, Math.abs(ym - y1), Math.abs(y2 - ym));
    const R = Math.max(2, maxR);
    const dir = x2 > x1 ? 1 : -1;

    return [
      `M ${x1} ${y1}`,
      `L ${x1} ${ym - R}`,
      `Q ${x1} ${ym} ${x1 + dir * R} ${ym}`,
      `L ${x2 - dir * R} ${ym}`,
      `Q ${x2} ${ym} ${x2} ${ym + R}`,
      `L ${x2} ${y2}`
    ].join(' ');
  };

  const isEdgeHighlighted = (edge) => {
    if (!hoveredNode) return false;
    return edge.from === hoveredNode || edge.to === hoveredNode;
  };

  const hoveredObj = hoveredNode ? nodeMap[hoveredNode] : null;

  return (
    <div className="csf-dsa-roadmap-wrapper">
      <div className="csf-dsa-svg-wrapper">
        <svg 
          viewBox="0 0 880 910" 
          className="csf-dsa-svg"
          preserveAspectRatio="xMidYMid meet"
          onTouchEnd={() => {
            setHoveredNode(null);
            setActiveTooltip(null);
          }}
        >
          {/* Flowchart Orthogonal Edges */}
          <g className="csf-dsa-edges">
            {EDGES.map((edge, index) => {
              const source = nodeMap[edge.from];
              const target = nodeMap[edge.to];
              if (!source || !target) return null;

              const highlighted = isEdgeHighlighted(edge);
              const dimmed = hoveredNode && !highlighted;
              const edgeColor = highlighted && hoveredObj ? hoveredObj.accent : undefined;

              return (
                <path
                  key={`${edge.from}-${edge.to}-${index}`}
                  d={getOrthogonalPath(source, target)}
                  className={`csf-dsa-edge ${highlighted ? 'csf-dsa-edge--highlighted' : ''} ${dimmed ? 'csf-dsa-edge--dimmed' : ''}`}
                  style={highlighted ? { stroke: edgeColor } : undefined}
                />
              );
            })}
          </g>

          {/* Flowchart Nodes */}
          <g className="csf-dsa-nodes">
            {NODES.map((node) => {
              const isHovered = hoveredNode === node.id;
              const isConnected = hoveredNode && EDGES.some(
                e => (e.from === hoveredNode && e.to === node.id) || (e.to === hoveredNode && e.from === node.id)
              );

              return (
                <g
                  key={node.id}
                  className={`csf-dsa-node-group ${isHovered ? 'is-hovered' : ''} ${isConnected ? 'is-connected' : ''}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ '--node-accent': node.accent }}
                  onMouseEnter={() => {
                    setHoveredNode(node.id);
                    setActiveTooltip(node);
                  }}
                  onMouseLeave={() => {
                    setHoveredNode(null);
                    setActiveTooltip(null);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setHoveredNode(node.id);
                    setActiveTooltip(node);
                  }}
                  tabIndex="0"
                  role="button"
                  aria-label={`${node.label} roadmap topic`}
                >
                  {/* Stationary invisible hit boundary — guarantees 0 hover cursor jitter */}
                  <rect
                    x={-node.w / 2 - 14}
                    y={-node.h / 2 - 14}
                    width={node.w + 28}
                    height={node.h + 28}
                    fill="transparent"
                    pointerEvents="all"
                    className="csf-dsa-hit-box"
                  />

                  {/* TopDown CS Card Rect */}
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

                  {/* TopDown CS Label */}
                  <text
                    x="0"
                    y="1"
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

        {/* Clean Non-Intrusive Tooltip */}
        {activeTooltip && (
          <div 
            className="csf-dsa-tooltip"
            style={{
              left: `${(activeTooltip.x / 880) * 100}%`,
              top: `${(activeTooltip.y / 910) * 100}%`,
              borderColor: activeTooltip.accent,
              transform: activeTooltip.y < 120 ? 'translate(-50%, 42px)' : 'translate(-50%, -135%)',
            }}
          >
            <div className="csf-dsa-tooltip__title">{activeTooltip.label}</div>
            <div className="csf-dsa-tooltip__subtitle">{activeTooltip.count} Curated Problems</div>
            <div className="csf-dsa-tooltip__status">In Progress</div>
          </div>
        )}
      </div>
    </div>
  );
}
