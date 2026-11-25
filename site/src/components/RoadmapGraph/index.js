/**
 * A dependency graph drawn as an SVG flowchart, on a canvas that spans the page.
 *
 * Extracted from the DSA roadmap so the CS fundamentals can be shown the same
 * way. Everything here is geometry and interaction. What the nodes mean, where
 * they sit and how far through them the reader is all arrive as props, so
 * adding another graph later is a data file rather than another copy of this.
 *
 * `idPrefix` is not optional in practice: every edge defines an SVG gradient
 * by id, both graphs are in the DOM at the same time (panels are hidden, not
 * unmounted), and duplicate ids would make one graph's wires pick up the
 * other's colours.
 *
 * ---- The view ----
 *
 * Three numbers describe it: how big the graph is drawn (`scale`), how much
 * of it the window shows, and how far along it has been pushed (`view.x`).
 *
 * `scale` comes from the panel, not from the page: the panel is what the
 * graphs were laid out against, so the graph stays the same size whatever
 * else is on screen. The box is then as wide as the page, which is the whole
 * point. Panning used to run into an invisible wall at the panel's edge well
 * short of anything a reader could see, and now the canvas reaches both
 * edges of the window.
 *
 * Both axes pan freely. The box is a window the graph moves behind, not a
 * frame that resizes itself around whatever the graph currently needs.
 *
 * The zoom buttons anchor on the top edge of that window, so whatever is at
 * the top stays at the top and the blocks grow downwards from it rather than
 * the whole graph swelling out of the page in both directions. That is a
 * property of the zoom, not of the canvas: it does not require the graph to
 * be pinned, and pinning it would take away the dragging that makes this a
 * canvas in the first place. The wheel zooms about the pointer instead,
 * which is what a pointer is for.
 *
 * One exception, for a coarse pointer. There a vertical drag belongs to the
 * page, so nothing that falls below the window could ever be panned back
 * into view; the window grows with the zoom instead, which keeps the whole
 * graph reachable without taking the page's scrolling away.
 *
 * The viewBox is computed to match the box, rather than being a fixed
 * `0 0 width height` with preserveAspectRatio making up the difference. That
 * keeps one scale for both axes and leaves no letterboxing to reason about.
 *
 * ---- What the gestures take ----
 *
 *  - A plain wheel belongs to the page. Zooming on it would mean a reader
 *    scrolling past the homepage gets caught by the graph, so zoom needs ctrl
 *    or cmd held, which is also what a trackpad pinch sends.
 *  - Touch gets `touch-action: pan-y`, so a vertical swipe still scrolls the
 *    page and only a sideways drag moves the graph. Sideways is the only
 *    direction there is anything to pan in, so nothing is lost.
 *  - The buttons work everywhere and need no gesture at all.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from '@docusaurus/router';

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.6;
const HOME_VIEW = { k: 1, x: 0, y: 0 };

/**
 * The smallest the graph is drawn, in rendered pixels per viewBox unit.
 *
 * A phone gives the panel about 330px and these graphs are 1130 units across,
 * which would draw them at 0.29 and put a node label under 5px. Below this
 * the graph is drawn bigger than the panel instead and panned sideways, which
 * is what the scrollbox here used to do.
 */
const MIN_READABLE = 0.62;

/** Past this many pixels a press is a drag, and must not open a node. */
const DRAG_SLOP = 4;

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

/**
 * How tall the window is, in graph units.
 *
 * A fixed window everywhere a drag can reach both ways. Where it cannot, the
 * window grows with the zoom so that zooming in never puts a row somewhere
 * the reader has no gesture to get to.
 */
function windowHeight(frame, height, k) {
  return height * (frame.coarse ? Math.max(1, k) : 1);
}

/**
 * Keep the graph within reach.
 *
 * The window runs origin..origin+vis and the content runs value..value+span*k
 * on each axis. Whichever is bigger, the two values below are the positions
 * where their edges line up, so anything between them overlaps. The slack
 * lets the graph be pushed past the edge rather than stopping dead against
 * it: enough to feel loose, not enough to lose it.
 */
function limitWith(frame, next, width, height) {
  if (!frame) return next;
  const axis = (origin, vis, span, value) => {
    const a = origin;
    const b = origin + vis - span * next.k;
    const slack = vis * 0.35;
    return clamp(value, Math.min(a, b) - slack, Math.max(a, b) + slack);
  };
  return {
    k: next.k,
    x: axis(frame.originX, frame.visW, width, next.x),
    // The window's top is graph y = 0, so extra height always falls below the
    // graph and never opens a band above it.
    y: axis(0, windowHeight(frame, height, next.k), height, next.y),
  };
}

const isHome = (view) =>
  view.k === HOME_VIEW.k && view.x === HOME_VIEW.x && view.y === HOME_VIEW.y;

export default function RoadmapGraph({
  nodes,
  edges,
  width,
  height,
  progressFor,
  idPrefix,
  label,
  title,
}) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [view, setView] = useState(HOME_VIEW);
  // Measured, so null until the first layout. The server and the first client
  // render both see null and draw the plain fitted graph, which is why they
  // agree.
  const [frame, setFrame] = useState(null);

  const wrapperRef = useRef(null);
  const surfaceRef = useRef(null);
  const gestureRef = useRef(null);
  const movedRef = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const history = useHistory();

  const nodeMap = nodes.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});

  // The wrapper keeps the panel's width whatever the surface inside it does,
  // so it is the stable thing to measure. Both it and the page matter: the
  // panel can stay at its maximum while the window around it grows.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      const pageWidth = document.documentElement.clientWidth;
      if (!rect.width || !pageWidth) return;
      const scale = Math.max(rect.width / width, MIN_READABLE);
      const visW = pageWidth / scale;
      const next = {
        boxW: pageWidth,
        // Pull the box back to the page's left edge. The wrapper's own
        // position does not depend on this, so measuring it is not circular.
        offsetX: -rect.left,
        scale,
        visW,
        originX: (width - visW) / 2,
        // Whether a drag can go up and down here, or only sideways.
        coarse: window.matchMedia('(pointer: coarse)').matches,
      };
      const prev = frameRef.current;
      if (
        prev &&
        prev.boxW === next.boxW &&
        prev.offsetX === next.offsetX &&
        prev.scale === next.scale &&
        prev.coarse === next.coarse
      ) {
        return;
      }
      frameRef.current = next;
      setFrame(next);
      // A graph that has not been moved stays centred when the window changes.
      if (isHome(viewRef.current)) return;
      setView((current) => limitWith(next, current, width, height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [width]);

  const limit = useCallback(
    (next) => limitWith(frameRef.current, next, width, height),
    [width, height]
  );

  /** Screen point to graph point, before the view transform. */
  const toLocal = useCallback(
    (clientX, clientY) => {
      const el = surfaceRef.current;
      const f = frameRef.current;
      if (!el || !f) return { x: width / 2, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / f.scale + f.originX,
        y: (clientY - rect.top) / f.scale,
      };
    },
    [width]
  );

  /** Zoom while holding one graph point still under the anchor. */
  const zoomAround = useCallback(
    (factor, anchorX, anchorY) => {
      setView((current) => {
        const k = clamp(current.k * factor, MIN_ZOOM, MAX_ZOOM);
        if (k === current.k) return current;
        const ratio = k / current.k;
        return limit({
          k,
          x: anchorX - (anchorX - current.x) * ratio,
          y: anchorY - (anchorY - current.y) * ratio,
        });
      });
    },
    [limit]
  );

  // The buttons anchor on the middle of the top edge: sideways so repeated
  // presses do not walk the graph off to one side, and on the top so whatever
  // is up there stays put and the blocks grow downwards from it.
  const zoomFromButton = (factor) => zoomAround(factor, width / 2, 0);

  // The wheel listener is attached by hand because it has to be able to call
  // preventDefault, and React's own wheel handler is passive.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      // About the pointer, not the top: the reader has said where they mean.
      const point = toLocal(event.clientX, event.clientY);
      zoomAround(Math.pow(0.9985, event.deltaY), point.x, point.y);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [toLocal, zoomAround]);

  // Dragging is tracked on the window rather than through setPointerCapture:
  // capturing would redirect the click that follows to the surface, and the
  // nodes would stop opening.
  useEffect(() => {
    const onMove = (event) => {
      const gesture = gestureRef.current;
      const f = frameRef.current;
      if (!gesture || !f) return;
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_SLOP) movedRef.current = true;
      setView(
        limit({
          k: gesture.view.k,
          x: gesture.view.x + dx / f.scale,
          y: gesture.view.y + dy / f.scale,
        })
      );
    };
    const onEnd = () => {
      gestureRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [limit]);

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    movedRef.current = false;
    gestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      view: viewRef.current,
    };
  };

  const openNode = (node) => {
    // A drag that ends on a node is a drag, not a click on that node.
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    if (node.href) history.push(node.href);
  };

  // Endpoints of a connector: bottom of the source, top of the target.
  // `toOffset` nudges the arrival point so two parents landing on one child do
  // not stack on the same pixel; `fromOffset` does the same for the departure
  // point, which matters for a hub with several children. Without it every
  // wire out of the hub shares one vertical stem and they draw on top of each
  // other.
  const getPorts = (edge) => {
    const source = nodeMap[edge.from];
    const target = nodeMap[edge.to];
    if (!source || !target) return null;
    return {
      x1: source.x + (edge.fromOffset || 0),
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

    // Halfway down by default. `laneOffset` moves the horizontal run to its
    // own lane, so two wires heading the same way out of one node do not lay
    // their long segments on top of each other.
    const laneY = y1 + (y2 - y1) / 2 + (edge.laneOffset || 0);
    const dir = x2 > x1 ? 1 : -1;
    const r = Math.min(
      18,
      Math.abs(x2 - x1) / 2,
      Math.abs(laneY - y1),
      Math.abs(y2 - laneY)
    );

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

  // Before the first measurement this is the plain fitted graph, which is what
  // the server renders too.
  const scale = frame ? frame.scale : null;
  const visW = frame ? frame.visW : width;
  const visH = frame ? windowHeight(frame, height, view.k) : height;
  const originX = frame ? frame.originX : 0;
  const surfaceStyle = frame
    ? {
        width: `${frame.boxW}px`,
        marginLeft: `${frame.offsetX}px`,
        height: `${visH * scale}px`,
      }
    : { aspectRatio: `${width} / ${height}` };

  return (
    <div className="csf-graph-wrapper" ref={wrapperRef}>
      <div className="csf-graph-bar">
        <p className="csf-graph-title">{title}</p>
        {/* Zoom out and zoom in are one control in two halves. Reset is a
            different kind of action, so it sits apart with an icon that says
            what it does: between a plus and a minus it was just the button in
            the middle, and nothing about it said reset. */}
        <div className="csf-graph-controls">
          <div className="csf-graph-zoom">
            <button
              type="button"
              onClick={() => zoomFromButton(1 / 1.25)}
              disabled={view.k <= MIN_ZOOM + 0.001}
              aria-label={`Zoom out of the ${title}`}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 8h8" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => zoomFromButton(1.25)}
              disabled={view.k >= MAX_ZOOM - 0.001}
              aria-label={`Zoom into the ${title}`}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 8h8M8 4v8" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            className="csf-graph-reset"
            onClick={() => setView(HOME_VIEW)}
            disabled={isHome(view)}
            aria-label={`Reset the ${title}`}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 3.2A4.8 4.8 0 1 1 3.9 5.6" />
              <path d="M8 3.2L5.9 1.9M8 3.2L5.9 4.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* The grabbing cursor is CSS :active rather than a class from the
          gesture ref, because writing a ref does not re-render and the class
          would lag a frame behind the hand. */}
      <div
        className="csf-graph-surface"
        ref={surfaceRef}
        style={surfaceStyle}
        onPointerDown={onPointerDown}>
        <svg
          viewBox={`${originX} 0 ${visW} ${visH}`}
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

          {/* Everything that moves lives in here. */}
          <g
            className="csf-graph-viewport"
            transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
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
                      cursor: node.href ? 'pointer' : 'inherit',
                    }}
                    onClick={() => openNode(node)}
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
                    /* A node with nowhere to go is not a button and does not
                       take focus: a hub node that summarises the graph would
                       otherwise be a tab stop that does nothing when pressed. */
                    {...(node.href ? { tabIndex: '0', role: 'button' } : {})}
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
          </g>
        </svg>
      </div>
    </div>
  );
}
