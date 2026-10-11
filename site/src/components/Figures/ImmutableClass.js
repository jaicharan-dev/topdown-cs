import React from 'react';

/**
 * Line-art figure for "Immutability in Java: Defensive Copying".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="im-head"
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

export function DefensiveCopyFigure() {
  return (
    <Figure
      viewBox="0 0 640 236"
      caption="Without a defensive copy, the caller and the class share the exact same list in memory. Making a new copy insulates the immutable object from external mutations."
    >
      {/* 1. Vulnerable: Shared Reference */}
      <text x="20" y="18" className="fig-cap">WITHOUT DEFENSIVE COPY (VULNERABLE)</text>

      <rect x="50" y="28" width="190" height="38" rx="3" className="fig-line" />
      <text x="145" y="52" className="fig-mono" textAnchor="middle">caller.stocks (0x100)</text>

      <path d="M240 47 H 374" className="fig-line" markerEnd="url(#im-head)" />

      <rect x="380" y="28" width="190" height="38" rx="3" className="fig-line" />
      <text x="475" y="52" className="fig-mono" textAnchor="middle">this.stocks (0x100)</text>

      <g className="fig-line fig-x">
        <path d="M52 80 l8 8 M60 80 l-8 8" />
      </g>
      <text x="70" y="86" className="fig-t fig-faint">
        Shared memory (0x100): caller mutations directly mutate the instance state
      </text>

      {/* Divider */}
      <path d="M20 106 H 620" className="fig-line fig-dashed" />

      {/* 2. Safe: Defensive Copy */}
      <text x="20" y="126" className="fig-cap">WITH DEFENSIVE COPY (SAFE &amp; ISOLATED)</text>

      <rect x="20" y="138" width="160" height="38" rx="3" className="fig-line" />
      <text x="100" y="162" className="fig-mono" textAnchor="middle">caller.stocks (0x100)</text>

      <path d="M180 157 H 224" className="fig-line" markerEnd="url(#im-head)" />

      <rect x="230" y="138" width="180" height="38" rx="3" className="fig-line" />
      <text x="320" y="162" className="fig-mono" textAnchor="middle">new ArrayList&lt;&gt;(stocks)</text>

      <path d="M410 157 H 454" className="fig-line" markerEnd="url(#im-head)" />

      <rect x="460" y="138" width="160" height="38" rx="3" className="fig-line" />
      <text x="540" y="162" className="fig-mono fig-strong" textAnchor="middle">this.stocks (0x200)</text>

      <g className="fig-line fig-check">
        <path d="M22 198 l5 5 l10 -10" />
      </g>
      <text x="44" y="202" className="fig-t fig-faint">
        Independent allocation (0x200): external modifications cannot reach this.stocks
      </text>
    </Figure>
  );
}
