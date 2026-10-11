import React from 'react';

/**
 * Line-art figure for "Interfaces vs. Abstract Classes: Modern Java Differences".
 * Architectural monochrome line art: one ink colour, no color fills, zero collisions.
 */

function Figure({ id = 'j8', viewBox, children, caption }) {
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

export function DefaultCollisionFigure() {
  return (
    <Figure
      id="j8-coll"
      viewBox="0 0 660 264"
      caption="Two unrelated interfaces provide HybridClient with conflicting default methods. Java refuses to compile until you explicitly choose."
    >
      <defs>
        <marker
          id="j8-coll-head"
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

      {/* 1. Interface 1: CloudService (x: 25 to 275, width: 250) */}
      <rect x="25" y="20" width="250" height="60" rx="6" className="fig-line" />
      <text x="105" y="40" className="fig-t fig-strong">CloudService</text>
      <rect x="195" y="28" width="68" height="18" rx="3" className="fig-line fig-faint" />
      <text x="229" y="40" className="fig-cap" textAnchor="middle">INTERFACE</text>
      <path d="M25 50 H 275" className="fig-line fig-faint" />
      <text x="150" y="68" className="fig-mono" textAnchor="middle">default connect() &#123; ... &#125;</text>

      {/* 2. Interface 2: OnPremService (x: 385 to 635, width: 250) */}
      <rect x="385" y="20" width="250" height="60" rx="6" className="fig-line" />
      <text x="460" y="40" className="fig-t fig-strong">OnPremService</text>
      <rect x="555" y="28" width="68" height="18" rx="3" className="fig-line fig-faint" />
      <text x="589" y="40" className="fig-cap" textAnchor="middle">INTERFACE</text>
      <path d="M385 50 H 635" className="fig-line fig-faint" />
      <text x="510" y="68" className="fig-mono" textAnchor="middle">default connect() &#123; ... &#125;</text>

      {/* 3. Both default methods converge toward center */}
      <path d="M150 80 V 114 H 295" className="fig-line" />
      <path d="M510 80 V 114 H 365" className="fig-line" />

      {/* Collision Warning Label */}
      <text x="330" y="100" className="fig-cap" textAnchor="middle">COMPILE ERROR: AMBIGUOUS DEFAULT METHOD</text>

      {/* Collision Barrier 'X' */}
      <g className="fig-line fig-x">
        <path d="M322 106 l16 16 M338 106 l-16 16" />
      </g>

      {/* Downward resolution stem */}
      <path d="M330 128 V 158" className="fig-line" markerEnd="url(#j8-coll-head)" />

      {/* 4. Subclass resolving explicitly (x: 155 to 505, width: 350) */}
      <rect x="155" y="160" width="350" height="80" rx="6" className="fig-line" />
      <text x="280" y="182" className="fig-t fig-strong">HybridClient</text>
      <rect x="375" y="170" width="118" height="18" rx="3" className="fig-line fig-faint" />
      <text x="434" y="182" className="fig-cap" textAnchor="middle">EXPLICIT OVERRIDE</text>
      <path d="M155 194 H 505" className="fig-line fig-faint" />
      <text x="330" y="214" className="fig-mono fig-strong" textAnchor="middle">CloudService.super.connect();</text>
      <text x="330" y="230" className="fig-t fig-faint" textAnchor="middle">Disambiguated explicitly by calling specific interface</text>
    </Figure>
  );
}
