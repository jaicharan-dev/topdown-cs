/**
 * A dependency graph drawn as an SVG flowchart.
 *
 * Extracted from the DSA roadmap so the CS fundamentals can be shown the same
 * way. Having one tab as a hand drawn flowchart and the other as a grid of
 * cards made the site look assembled rather than designed, and the flowchart
 * was the better half.
 *
 * Everything here is geometry and interaction. What the nodes mean, where
 * they sit and how far through them the reader is all arrive as props, so
 * adding another graph later is a data file rather than another copy of this.
 *
 * `idPrefix` is not optional in practice: every edge defines an SVG gradient
 * by id, both graphs are in the DOM at the same time (panels are hidden, not
 * unmounted), and duplicate ids would make one graph's wires pick up the
 * other's colours.
 *
 * The class names still say `csf-graph-`, shared by both graphs. They were
 * `csf-dsa-` when only one existed.
 */

import React, { useState } from 'react';
import { useHistory } from '@docusaurus/router';

export default function RoadmapGraph({
  nodes,
  edges,
  width,
  height,
  progressFor,
  idPrefix,
  label,
}) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const history = useHistory();

  const nodeMap = nodes.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});

  // Endpoints of a connector: centre bottom of the source, ported top of the
  // target. `toOffset` nudges the arrival point so two parents landing on one
  // child do not stack on the same pixel.
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
    <div className="csf-graph-wrapper">
      <div className="csf-graph-svg-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="csf-graph-svg"
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={label}
          onTouchEnd={clearHover}>
          <defs>
            {edges.map((edge, index) => {
              const p = getPorts(edge);
              if (!p) return null;
              return (
                <linearGradient
                  key={`grad-${index}`}
                  id={`${idPrefix}-wire-${index}`}
                  gradientUnits="userSpaceOnUse"
                  x1={p.x1}
                  y1={p.y1}
                  x2={p.x2}
                  y2={p.y2}>
                  <stop offset="0%" stopColor={p.source.accent} />
                  <stop offset="100%" stopColor={p.target.accent} />
                </linearGradient>
              );
            })}
          </defs>

          <g className="csf-graph-edges">
            {edges.map((edge, index) => {
              if (!nodeMap[edge.from] || !nodeMap[edge.to]) return null;

              const highlighted = isEdgeHighlighted(edge);
              const dimmed = hoveredNode && !highlighted;
              const d = getConnectorPath(edge);

              return (
                <g key={`${edge.from}-${edge.to}-${index}`}>
                  <path
                    d={d}
                    stroke={`url(#${idPrefix}-wire-${index})`}
                    className={`csf-graph-edge ${
                      highlighted ? 'csf-graph-edge--highlighted' : ''
                    } ${dimmed ? 'csf-graph-edge--dimmed' : ''}`}
                  />
                  {highlighted && (
                    <path
                      d={d}
                      stroke={`url(#${idPrefix}-wire-${index})`}
                      className="csf-graph-edge csf-graph-edge__pulse"
                    />
                  )}
                </g>
              );
            })}
          </g>

          <g className="csf-graph-nodes">
            {nodes.map((node) => {
              const { done, total } = progressFor(node.id);
              const hasProgress = done > 0 && total > 0;
              const railWidth = node.w - 36;
              const doneState =
                total > 0 && done >= total
                  ? 'complete'
                  : done > 0
                    ? 'partial'
                    : 'none';
              const isHovered = hoveredNode === node.id;
              const isConnected =
                hoveredNode &&
                edges.some(
                  (e) =>
                    (e.from === hoveredNode && e.to === node.id) ||
                    (e.to === hoveredNode && e.from === node.id)
                );
              const isDimmed = hoveredNode && !isHovered && !isConnected;

              return (
                <g
                  key={node.id}
                  className={`csf-graph-node-group is-done-${doneState} ${
                    isHovered ? 'is-hovered' : ''
                  } ${isConnected ? 'is-connected' : ''} ${
                    isDimmed ? 'is-dimmed' : ''
                  }`}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{
                    '--node-accent': node.accent,
                    // drives the saturation ramp in CSS
                    '--progress': total > 0 ? done / total : 0,
                    cursor: 'pointer',
                  }}
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
                  aria-label={
                    hasProgress
                      ? `${node.label}, ${done} of ${total} done`
                      : total > 0
                        ? `${node.label}, ${total} pages`
                        : node.label
                  }>
                  <rect
                    x={-node.w / 2 - 12}
                    y={-node.h / 2 - 12}
                    width={node.w + 24}
                    height={node.h + 24}
                    fill="transparent"
                    pointerEvents="all"
                    className="csf-graph-hit-box"
                  />

                  <rect
                    x={-node.w / 2}
                    y={-node.h / 2}
                    width={node.w}
                    height={node.h}
                    rx="12"
                    ry="12"
                    pointerEvents="none"
                    className="csf-graph-node-card"
                  />

                  {/* The accent rail along the top edge doubles as the
                      progress bar: this rect is the track and the next is the
                      filled part. Every incoming wire lands on it. */}
                  <rect
                    x={-node.w / 2 + 18}
                    y={-node.h / 2 - 2}
                    width={railWidth}
                    height={4}
                    rx="2"
                    pointerEvents="none"
                    className="csf-graph-node-tab"
                    fill={node.accent}
                    {...(hasProgress
                      ? {
                          // Inline, because an inline style beats both the
                          // base rule and the theme scoped ones. Alpha rather
                          // than opacity so it reads correctly on a dark card
                          // and on a white one.
                          style: {
                            fill: `color-mix(in srgb, ${node.accent} 30%, transparent)`,
                          },
                        }
                      : {})}
                  />

                  {hasProgress && (
                    <rect
                      x={-node.w / 2 + 18}
                      y={-node.h / 2 - 2}
                      width={Math.max(4, (railWidth * done) / total)}
                      height={4}
                      rx="2"
                      pointerEvents="none"
                      className="csf-graph-node-tab-fill"
                      fill={node.accent}
                    />
                  )}

                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    pointerEvents="none"
                    className="csf-graph-node-label">
                    {node.label}
                  </text>

                  {/* Just under the card, right aligned: the label fills the
                      card and a connector leaves from the bottom centre, so
                      this corner is the only space reliably free. */}
                  {total > 0 && (
                    <text
                      x={node.w / 2}
                      y={node.h / 2 + 14}
                      textAnchor="end"
                      pointerEvents="none"
                      className="csf-graph-node-count">
                      {hasProgress ? `${done}/${total}` : total}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
