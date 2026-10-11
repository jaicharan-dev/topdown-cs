import React from 'react';

/**
 * Line-art figure for "Hash Collisions".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="hc-head"
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

export function CollisionFigure() {
  return (
    <Figure
      viewBox="0 0 640 250"
      caption="Both keys hash to index 1. Chaining links nodes together at that slot. Open addressing probes forward to the next empty bucket."
    >
      {/* Column Titles */}
      <text x="160" y="22" className="fig-cap" textAnchor="middle">SEPARATE CHAINING</text>
      <text x="480" y="22" className="fig-cap" textAnchor="middle">OPEN ADDRESSING (LINEAR PROBING)</text>

      {/* Center Divider */}
      <path d="M320 16 V 218" className="fig-line fig-dashed" />

      {/* LEFT: SEPARATE CHAINING */}
      {/* Table Slots */}
      <rect x="40" y="38" width="55" height="38" rx="3" className="fig-line" />
      <text x="67" y="62" className="fig-mono" textAnchor="middle">[0]</text>

      <rect x="105" y="38" width="55" height="38" rx="3" className="fig-line fig-strong" />
      <text x="132" y="62" className="fig-mono fig-strong" textAnchor="middle">[1]</text>

      <rect x="170" y="38" width="55" height="38" rx="3" className="fig-line" />
      <text x="197" y="62" className="fig-mono" textAnchor="middle">[2]</text>

      <rect x="235" y="38" width="55" height="38" rx="3" className="fig-line" />
      <text x="262" y="62" className="fig-mono" textAnchor="middle">[3]</text>

      {/* Pointer from Slot [1] to Linked List */}
      <path d="M132 76 V 104" className="fig-line" markerEnd="url(#hc-head)" />

      {/* Node 1: "Aa" */}
      <rect x="40" y="106" width="95" height="34" rx="3" className="fig-line" />
      <text x="87" y="128" className="fig-mono" textAnchor="middle">"Aa" : 1</text>

      {/* Link to Node 2 */}
      <path d="M135 123 H 175" className="fig-line" markerEnd="url(#hc-head)" />

      {/* Node 2: "BB" */}
      <rect x="175" y="106" width="105" height="34" rx="3" className="fig-line" />
      <text x="227" y="128" className="fig-mono" textAnchor="middle">"BB" : 2</text>

      <text x="160" y="174" className="fig-t fig-faint" textAnchor="middle">Linked list chains entries at slot [1]</text>
      <text x="160" y="196" className="fig-mono fig-faint" textAnchor="middle">Java HashMap default strategy</text>

      {/* RIGHT: OPEN ADDRESSING */}
      {/* Table Slots */}
      <rect x="350" y="38" width="60" height="38" rx="3" className="fig-line" />
      <text x="380" y="62" className="fig-mono" textAnchor="middle">[0]</text>

      <rect x="420" y="38" width="60" height="38" rx="3" className="fig-line fig-strong" />
      <text x="450" y="55" className="fig-mono fig-strong" textAnchor="middle">[1]</text>
      <text x="450" y="70" className="fig-mono fig-faint" textAnchor="middle">"Aa"</text>

      <rect x="490" y="38" width="60" height="38" rx="3" className="fig-line fig-strong" />
      <text x="520" y="55" className="fig-mono fig-strong" textAnchor="middle">[2]</text>
      <text x="520" y="70" className="fig-mono fig-faint" textAnchor="middle">"BB"</text>

      <rect x="560" y="38" width="60" height="38" rx="3" className="fig-line" />
      <text x="590" y="62" className="fig-mono" textAnchor="middle">[3]</text>

      {/* Probing Vector */}
      <path d="M450 76 C 450 112, 520 112, 520 78" className="fig-line fig-dashed" markerEnd="url(#hc-head)" />
      <text x="485" y="124" className="fig-mono fig-faint" textAnchor="middle">probe +1 to slot [2]</text>

      <text x="485" y="174" className="fig-t fig-faint" textAnchor="middle">Walks forward to next available bucket</text>
      <text x="485" y="196" className="fig-mono fig-faint" textAnchor="middle">No linked list pointers allocated</text>

      {/* Bottom Summary */}
      <text x="320" y="238" className="fig-t fig-faint" textAnchor="middle">
        Both keys ("Aa", "BB") hash to index 1: two different ways to resolve the clash
      </text>
    </Figure>
  );
}
