import React from 'react';

/**
 * Line-art figures for "Composition vs. Inheritance".
 * Architectural monochrome line art: one ink colour, no color fills, zero collisions.
 */

function Figure({ id = 'ci', viewBox, children, caption }) {
  const markerId = `${id}-head`;
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id={markerId}
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

/* 1. Core Comparison: IS-A vs HAS-A -------------------------------------- */

export function InheritanceVsCompositionFigure() {
  return (
    <Figure
      id="ci-core"
      viewBox="0 0 660 216"
      caption="Inheritance welds classes together at compile time. Composition assembles independent objects at runtime."
    >
      <defs>
        <marker
          id="ci-core-head"
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

      {/* Column Titles */}
      <text x="160" y="20" className="fig-cap" textAnchor="middle">INHERITANCE (IS-A HIERARCHY)</text>
      <text x="495" y="20" className="fig-cap" textAnchor="middle">COMPOSITION (HAS-A CONTAINER)</text>

      {/* Center Divider */}
      <path d="M330 16 V 196" className="fig-line fig-dashed" />

      {/* Left: Inheritance */}
      <rect x="70" y="34" width="180" height="48" rx="6" className="fig-line" />
      <text x="160" y="62" className="fig-t fig-strong" textAnchor="middle">Vehicle</text>

      {/* UML Generalization: hollow triangle pointing UP to parent at (160, 82) */}
      <path d="M160 82 l-8 14 h16 z" className="fig-line fig-tri" />
      <path d="M160 96 V 126" className="fig-line" />

      <rect x="70" y="126" width="180" height="48" rx="6" className="fig-line" />
      <text x="160" y="154" className="fig-t fig-strong" textAnchor="middle">Car</text>
      <text x="160" y="196" className="fig-cap" textAnchor="middle">RIGID COMPILE-TIME COUPLING</text>

      {/* Right: Composition */}
      <rect x="360" y="68" width="125" height="74" rx="6" className="fig-line" />
      <text x="422" y="94" className="fig-t fig-strong" textAnchor="middle">Car</text>
      <path d="M360 104 H 485" className="fig-line fig-faint" />
      <text x="422" y="126" className="fig-mono fig-faint" textAnchor="middle">engine</text>

      {/* UML Composition: filled diamond attached to Car, pointing to Engine */}
      <path d="M485 104 l6 -5 l6 5 l-6 5 z" className="fig-line" style={{ fill: 'var(--fig-ink)' }} />
      <path d="M497 104 H 535" className="fig-line" markerEnd="url(#ci-core-head)" />

      <rect x="535" y="68" width="105" height="74" rx="6" className="fig-line" />
      <text x="587" y="94" className="fig-t fig-strong" textAnchor="middle">Engine</text>
      <path d="M535 104 H 640" className="fig-line fig-faint" />
      <text x="587" y="126" className="fig-mono fig-faint" textAnchor="middle">start()</text>

      <text x="495" y="196" className="fig-cap" textAnchor="middle">PLUGGABLE, SWAPPABLE AT RUNTIME</text>
    </Figure>
  );
}

/* 2. The Three Flavors of HAS-A ----------------------------------------- */

export function HasASpectrumFigure() {
  return (
    <Figure
      id="ci-spec"
      viewBox="0 0 660 196"
      caption="Association, Aggregation, and Composition represent increasing tightness of object lifetimes."
    >
      <defs>
        <marker
          id="ci-spec-head"
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

      {/* Top Header & Lifetime Coupling Axis */}
      <text x="25" y="20" className="fig-cap">LIFETIME COUPLING SPECTRUM</text>
      <path d="M195 16 H 635" className="fig-line fig-faint" markerEnd="url(#ci-spec-head)" />

      {/* 1. Association (x: 20 to 215, center: 117) */}
      <g>
        <rect x="25" y="38" width="82" height="42" rx="6" className="fig-line" />
        <text x="66" y="64" className="fig-t fig-strong" textAnchor="middle">Customer</text>

        <path d="M107 59 H 127" className="fig-line" />

        <rect x="127" y="38" width="76" height="42" rx="6" className="fig-line" />
        <text x="165" y="64" className="fig-t fig-strong" textAnchor="middle">Order</text>

        <rect x="52" y="94" width="130" height="22" rx="4" className="fig-line fig-faint" />
        <text x="117" y="109" className="fig-cap" textAnchor="middle">ASSOCIATION</text>
        <text x="117" y="132" className="fig-mono fig-faint" textAnchor="middle">uses-a</text>
        <text x="117" y="152" className="fig-t fig-faint" textAnchor="middle" style={{ fontSize: '11px' }}>
          neither owns the other
        </text>
      </g>

      {/* Divider 1 */}
      <path d="M222 36 V 166" className="fig-line fig-dashed" />

      {/* 2. Aggregation (x: 230 to 435, center: 332) */}
      <g>
        <rect x="235" y="38" width="88" height="42" rx="6" className="fig-line" />
        <text x="279" y="64" className="fig-t fig-strong" textAnchor="middle">Department</text>

        {/* Hollow diamond attached to Department */}
        <path d="M323 59 l6 -5 l6 5 l-6 5 z" className="fig-line fig-tri" />
        <path d="M335 59 H 345" className="fig-line" />

        <rect x="345" y="38" width="86" height="42" rx="6" className="fig-line" />
        <text x="388" y="64" className="fig-t fig-strong" textAnchor="middle">Professor</text>

        <rect x="267" y="94" width="130" height="22" rx="4" className="fig-line fig-faint" />
        <text x="332" y="109" className="fig-cap" textAnchor="middle">AGGREGATION</text>
        <text x="332" y="132" className="fig-mono fig-faint" textAnchor="middle">weak has-a</text>
        <text x="332" y="152" className="fig-t fig-faint" textAnchor="middle" style={{ fontSize: '11px' }}>
          part outlives the whole
        </text>
      </g>

      {/* Divider 2 */}
      <path d="M442 36 V 166" className="fig-line fig-dashed" />

      {/* 3. Composition (x: 450 to 645, center: 547) */}
      <g>
        <rect x="455" y="38" width="82" height="42" rx="6" className="fig-line" />
        <text x="496" y="64" className="fig-t fig-strong" textAnchor="middle">House</text>

        {/* Filled diamond attached to House */}
        <path d="M537 59 l6 -5 l6 5 l-6 5 z" className="fig-line" style={{ fill: 'var(--fig-ink)' }} />
        <path d="M549 59 H 559" className="fig-line" />

        <rect x="559" y="38" width="76" height="42" rx="6" className="fig-line" />
        <text x="597" y="64" className="fig-t fig-strong" textAnchor="middle">Room</text>

        <rect x="482" y="94" width="130" height="22" rx="4" className="fig-line fig-faint" />
        <text x="547" y="109" className="fig-cap" textAnchor="middle">COMPOSITION</text>
        <text x="547" y="132" className="fig-mono fig-faint" textAnchor="middle">strong has-a</text>
        <text x="547" y="152" className="fig-t fig-faint" textAnchor="middle" style={{ fontSize: '11px' }}>
          part dies with container
        </text>
      </g>
    </Figure>
  );
}
