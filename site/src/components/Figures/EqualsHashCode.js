import React from 'react';

/**
 * Line-art figure for "equals() and hashCode() Contract".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="eh-head"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M1 1.5 L8 5 L1 8.5" className="fig-head" />
          </marker>
        </defs>
        {children}
      </svg>
      {caption && <figcaption className="csf-fig__caption">{caption}</figcaption>}
    </figure>
  );
}

export function EqualsContractFigure() {
  const buckets = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <Figure
      viewBox="0 0 640 280"
      caption="When equals() is overridden without hashCode(), identical keys hash to different buckets. The map can never find the stored value."
    >
      <text x="320" y="20" className="fig-cap" textAnchor="middle">THE BROKEN CONTRACT BUG</text>

      {/* 1. Put operation: hashes to Bucket 2 */}
      <text x="201" y="40" className="fig-mono fig-strong" textAnchor="middle">map.put(new User(1), "Alice")</text>
      <text x="201" y="56" className="fig-t fig-faint" textAnchor="middle">identity hash lands</text>
      <text x="201" y="70" className="fig-t fig-faint" textAnchor="middle">in Bucket 2</text>
      <path d="M201 76 V 104" className="fig-line" markerEnd="url(#eh-head)" />

      {/* 2. Get operation: hashes to Bucket 7 */}
      <text x="551" y="40" className="fig-mono fig-strong" textAnchor="middle">map.get(new User(1))</text>
      <text x="551" y="56" className="fig-t fig-faint" textAnchor="middle">different identity hash</text>
      <text x="551" y="70" className="fig-t fig-faint" textAnchor="middle">lands in Bucket 7</text>
      <path d="M551 76 V 104" className="fig-line fig-dashed" markerEnd="url(#eh-head)" />

      {/* 3. Bucket Array */}
      {buckets.map((b) => {
        const bx = 30 + b * 70;
        return (
          <g key={b}>
            <rect x={bx} y="108" width="62" height="42" rx="3" className="fig-line" />
            <text x={bx + 31} y="134" className="fig-mono" textAnchor="middle">[{b}]</text>
          </g>
        );
      })}

      {/* 4. Entry Stored in Bucket 2 (bx=170, center=201) */}
      <path d="M201 150 V 178" className="fig-line" markerEnd="url(#eh-head)" />
      <rect x="116" y="184" width="170" height="42" rx="3" className="fig-line" />
      <text x="201" y="210" className="fig-mono" textAnchor="middle">User(1) : "Alice"</text>

      {/* Empty Lookup in Bucket 7 (bx=520, center=551) */}
      <path d="M551 150 V 178" className="fig-line fig-dashed" markerEnd="url(#eh-head)" />
      <rect x="496" y="184" width="110" height="42" rx="3" className="fig-line fig-dashed" />
      <text x="551" y="210" className="fig-mono fig-faint" textAnchor="middle">empty (null)</text>

      {/* Callout Warning Banner */}
      <g className="fig-line fig-x">
        <path d="M80 252 l10 10 M90 252 l-10 10" />
      </g>
      <text x="102" y="261" className="fig-t fig-strong">
        u1.equals(u2) is true, but they checked different buckets! Result: null
      </text>
    </Figure>
  );
}
