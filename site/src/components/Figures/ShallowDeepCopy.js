import React from 'react';

/**
 * Line-art figure for "Shallow Copy vs. Deep Copy".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="sc-head"
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

export function ShallowVsDeepFigure() {
  return (
    <Figure
      viewBox="0 0 640 250"
      caption="A shallow copy duplicates the outer object, but inner references still point to the same instance. A deep copy recursively duplicates every nested object."
    >
      {/* 1. Shallow Copy */}
      <text x="20" y="20" className="fig-cap">SHALLOW COPY (SHARED NESTED OBJECT)</text>

      <rect x="20" y="32" width="130" height="36" rx="3" className="fig-line" />
      <text x="85" y="55" className="fig-mono" textAnchor="middle">original</text>

      <rect x="20" y="76" width="130" height="36" rx="3" className="fig-line" />
      <text x="85" y="99" className="fig-mono" textAnchor="middle">shallowCopy</text>

      {/* Both arrows point directly to the SAME Address object (ends at 276) */}
      <path d="M150 50 H 276" className="fig-line" markerEnd="url(#sc-head)" />
      <path d="M150 94 H 210 V 58 H 276" className="fig-line" markerEnd="url(#sc-head)" />

      <rect x="276" y="32" width="170" height="48" rx="3" className="fig-line" />
      <text x="361" y="53" className="fig-mono fig-strong" textAnchor="middle">Address Object</text>
      <text x="361" y="71" className="fig-mono fig-faint" textAnchor="middle">0x100 (same memory)</text>

      <g className="fig-line fig-x">
        <path d="M276 100 l8 8 M284 100 l-8 8" />
      </g>
      <text x="294" y="106" className="fig-t fig-faint">
        Shared memory reference: mutating fields through either copy affects both
      </text>

      {/* Divider */}
      <path d="M20 126 H 620" className="fig-line fig-dashed" />

      {/* 2. Deep Copy */}
      <text x="20" y="148" className="fig-cap">DEEP COPY (INDEPENDENT NESTED OBJECTS)</text>

      <rect x="20" y="160" width="130" height="34" rx="3" className="fig-line" />
      <text x="85" y="182" className="fig-mono" textAnchor="middle">original</text>

      <path d="M150 177 H 276" className="fig-line" markerEnd="url(#sc-head)" />

      <rect x="276" y="160" width="170" height="34" rx="3" className="fig-line" />
      <text x="361" y="182" className="fig-mono" textAnchor="middle">Address (0x100)</text>

      <rect x="20" y="202" width="130" height="34" rx="3" className="fig-line" />
      <text x="85" y="224" className="fig-mono" textAnchor="middle">deepCopy</text>

      <path d="M150 219 H 276" className="fig-line" markerEnd="url(#sc-head)" />

      <rect x="276" y="202" width="170" height="34" rx="3" className="fig-line" />
      <text x="361" y="224" className="fig-mono" textAnchor="middle">Address (0x200)</text>

      <g className="fig-line fig-check">
        <path d="M470 196 l5 5 l10 -10" />
      </g>
      <text x="492" y="194" className="fig-t fig-faint">Completely isolated</text>
      <text x="492" y="210" className="fig-t fig-faint">Independent allocations</text>
    </Figure>
  );
}
