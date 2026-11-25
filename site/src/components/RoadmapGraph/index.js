/**
 * A dependency graph drawn as an SVG flowchart on a pannable, zoomable canvas.
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
 * The view is a transform on one group inside a fixed viewBox, not a changing
 * viewBox, so the gradients keep their userSpaceOnUse coordinates and travel
 * with the geometry they belong to.
 *
 * On what the gestures are allowed to take:
 *
 *  - A plain wheel belongs to the page. Zooming on it would mean a reader
 *    scrolling past the homepage gets caught by the graph instead, so zoom
 *    needs ctrl or cmd held, which is also what a trackpad pinch sends.
 *  - Touch gets `touch-action: pan-y`, so a vertical swipe still scrolls the
 *    page and only a sideways drag moves the graph. That is exactly what the
 *    sideways scrollbox it replaces already did. Pinch stays with the browser
 *    and the buttons do the zooming, which is the trade for never leaving
 *    somebody stuck inside a graph they cannot scroll past.
 *  - The buttons work everywhere and need no gesture at all.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from '@docusaurus/router';

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.6;
const RESET_VIEW = { k: 1, x: 0, y: 0 };

/**
 * The smallest the graph is allowed to start at, in rendered pixels per
 * viewBox unit.
 *
 * A phone is about 330px wide inside the page, and these graphs are 1130
 * units across, which would start them at 0.29 and put a node label at under
 * 5px. Fitting the width is the wrong default when the result cannot be read:
 * below this the view opens zoomed in instead, and panning reaches the rest.
 * 0.62 is what the sideways scrollbox this replaced used to give.
 */
const MIN_READABLE = 0.62;

/** Past this many pixels a press is a drag, and must not open a node. */
const DRAG_SLOP = 4;

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

const sameView = (a, b) => a.k === b.k && a.x === b.x && a.y === b.y;

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
  const [view, setView] = useState(RESET_VIEW);
  // Where "reset" goes. Identity on a screen wide enough to read the graph at
  // its natural size, and zoomed in on one that is not.
  const [home, setHome] = useState(RESET_VIEW);

  const surfaceRef = useRef(null);
  const gestureRef = useRef(null);
  const movedRef = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const homeRef = useRef(home);
  homeRef.current = home;
  // Until the reader moves the graph themselves, it keeps following the
  // measured home view, so rotating a phone re-fits instead of stranding them.
  const touchedRef = useRef(false);

  const history = useHistory();

  const nodeMap = nodes.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});

  /**
   * The window onto the graph, in viewBox units.
   *
   * The surface is given the viewBox's aspect ratio stretched by the home
   * zoom, so a view that opens zoomed in gets a box tall enough to hold the
   * whole graph at that zoom. Without it a phone sees the top two rows and
   * cannot reach the rest: a vertical drag belongs to the page, so there is
   * no way to pan down.
   *
   * Because the box is always `width` units across, the window is only ever
   * taller than the viewBox, never wider, which is what keeps this to one
   * number.
   */
  const windowFor = useCallback(
    (homeK) => ({
      visW: width,
      visH: height * homeK,
      originX: 0,
      originY: (height * (1 - homeK)) / 2,
    }),
    [width, height]
  );

  /**
   * Keep the graph on screen.
   *
   * Content spans origin..origin+vis for the window and x..span*k + x for the
   * content. Whichever is larger, the pair of bounds below are the two
   * positions where their edges meet, so anything between them overlaps.
   * Slack lets the graph be pushed a little past the edge without ever being
   * pushed out of sight.
   */
  const limit = useCallback(
    (next) => {
      const win = windowFor(homeRef.current.k);
      const axis = (origin, vis, span, value) => {
        const a = origin;
        const b = origin + vis - span * next.k;
        const slack = vis * 0.25;
        return clamp(value, Math.min(a, b) - slack, Math.max(a, b) + slack);
      };
      return {
        k: next.k,
        x: axis(win.originX, win.visW, width, next.x),
        y: axis(win.originY, win.visH, height, next.y),
      };
    },
    [width, height, windowFor]
  );

  /** Screen coordinates to graph coordinates, before the view transform. */
  const toLocal = useCallback(
    (clientX, clientY) => {
      const el = surfaceRef.current;
      if (!el) return { x: width / 2, y: height / 2 };
      const rect = el.getBoundingClientRect();
      // One scale for both axes: the viewBox meets the box on width, always.
      const perPixel = width / rect.width;
      const win = windowFor(homeRef.current.k);
      return {
        x: (clientX - rect.left) * perPixel + win.originX,
        y: (clientY - rect.top) * perPixel + win.originY,
      };
    },
    [width, windowFor]
  );

  /** Zoom while holding one graph point still under the cursor. */
  const zoomAround = useCallback(
    (factor, px, py) => {
      setView((current) => {
        const k = clamp(current.k * factor, MIN_ZOOM, MAX_ZOOM);
        if (k === current.k) return current;
        const ratio = k / current.k;
        return limit({
          k,
          x: px - (px - current.x) * ratio,
          y: py - (py - current.y) * ratio,
        });
      });
    },
    [limit]
  );

  const zoomFromButton = (factor) => {
    touchedRef.current = true;
    zoomAround(factor, width / 2, height / 2);
  };

  // Work out the home view from how much room the surface actually got. The
  // panel is hidden rather than unmounted when its tab is not showing, so the
  // first measurement can be a zero width one; the observer fires again with
  // a real width when the tab opens.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;
      const fitted = rect.width / width;
      const k =
        fitted >= MIN_READABLE
          ? 1
          : Math.min(MAX_ZOOM, MIN_READABLE / fitted);
      // Centred in the window the box will have at this zoom. The window is
      // `width` by `height * k`, so centring both axes is the same sum.
      const next =
        k === 1
          ? RESET_VIEW
          : { k, x: (width * (1 - k)) / 2, y: (height * (1 - k)) / 2 };
      if (sameView(homeRef.current, next)) return;
      setHome(next);
      homeRef.current = next;
      if (!touchedRef.current) setView(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  // The wheel listener is attached by hand because it has to be able to call
  // preventDefault, and React's own wheel handler is passive.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      touchedRef.current = true;
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
      if (!gesture) return;
      const el = surfaceRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const perPixel = width / rect.width;
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_SLOP) {
        movedRef.current = true;
        touchedRef.current = true;
      }
      setView(
        limit({
          k: gesture.view.k,
          x: gesture.view.x + dx * perPixel,
          y: gesture.view.y + dy * perPixel,
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
  }, [limit, width]);

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

  return (
    <div className="csf-graph-wrapper">
      <div className="csf-graph-bar">
        <p className="csf-graph-title">{title}</p>
        {/* The controls are the thing in a box now, not the graph. They are
            also the only way to zoom that needs no gesture at all, which is
            what makes the canvas usable on a phone and from a keyboard. */}
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
            onClick={() => {
              touchedRef.current = false;
              setView(homeRef.current);
            }}
            disabled={sameView(view, home)}
            aria-label={`Reset the ${title} to its original size`}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3.5" y="3.5" width="9" height="9" rx="2" />
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
      </div>

      {/* The grabbing cursor is CSS :active rather than a class from the
          gesture ref, because writing a ref does not re-render and the class
          would lag a frame behind the hand. */}
      <div
        className="csf-graph-surface"
        ref={surfaceRef}
        /* The box carries the viewBox's shape, stretched by the home zoom, so
           a view that opens zoomed in is tall enough to hold the whole graph
           and only needs panning sideways. */
        style={{ aspectRatio: `${width} / ${height * home.k}` }}
        onPointerDown={onPointerDown}>
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
