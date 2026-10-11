import React from 'react';

/**
 * Line-art figure for "The Diamond Problem".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="dp-tri"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M1 1.5 L8 5 L1 8.5 Z" className="fig-line fig-tri" />
          </marker>
        </defs>
        {children}
      </svg>
      {caption && <figcaption className="csf-fig__caption">{caption}</figcaption>}
    </figure>
  );
}

export function DiamondProblemFigure() {
  return (
    <Figure
      viewBox="0 0 640 280"
      caption="Multiple inheritance forms a diamond. SmartPhone inherits conflicting turnOn() methods and duplicate serialNumber state."
    >
      {/* 1. Top Ancestor: Device */}
      <rect x="235" y="16" width="170" height="58" rx="3" className="fig-line" />
      <text x="320" y="36" className="fig-t fig-strong" textAnchor="middle">Device</text>
      <path d="M235 44 H 405" className="fig-line" />
      <text x="320" y="62" className="fig-mono" textAnchor="middle">turnOn() | serialNumber</text>

      {/* Orthogonal inheritance lines from Camera & Phone up to Device */}
      <path d="M170 104 V 86 H 280 V 74" className="fig-line" markerEnd="url(#dp-tri)" />
      <path d="M470 104 V 86 H 360 V 74" className="fig-line" markerEnd="url(#dp-tri)" />

      {/* 2. Middle Children: Camera & Phone */}
      <rect x="85" y="104" width="170" height="54" rx="3" className="fig-line" />
      <text x="170" y="124" className="fig-t fig-strong" textAnchor="middle">Camera</text>
      <path d="M85 132 H 255" className="fig-line" />
      <text x="170" y="148" className="fig-mono" textAnchor="middle">turnOn() [Camera]</text>

      <rect x="385" y="104" width="170" height="54" rx="3" className="fig-line" />
      <text x="470" y="124" className="fig-t fig-strong" textAnchor="middle">Phone</text>
      <path d="M385 132 H 555" className="fig-line" />
      <text x="470" y="148" className="fig-mono" textAnchor="middle">turnOn() [Phone]</text>

      {/* Orthogonal multiple inheritance lines from SmartPhone up to Camera & Phone */}
      <path d="M260 200 V 178 H 170 V 158" className="fig-line fig-dashed" markerEnd="url(#dp-tri)" />
      <path d="M380 200 V 178 H 470 V 158" className="fig-line fig-dashed" markerEnd="url(#dp-tri)" />

      {/* 3. Bottom Convergent Child: SmartPhone */}
      <rect x="220" y="200" width="200" height="66" rx="3" className="fig-line" />
      <text x="320" y="222" className="fig-t fig-strong" textAnchor="middle">SmartPhone</text>
      <path d="M220 230 H 420" className="fig-line" />

      {/* Conflict marks inside SmartPhone */}
      <text x="320" y="246" className="fig-mono" textAnchor="middle">turnOn() ?</text>
      <text x="320" y="260" className="fig-t fig-faint" textAnchor="middle">which parent's logic runs?</text>

      {/* Side conflict annotation 1 */}
      <g className="fig-line fig-x">
        <path d="M24 188 l10 10 M34 188 l-10 10" />
      </g>
      <text x="42" y="196" className="fig-t fig-strong">Ambiguity 1:</text>
      <text x="42" y="214" className="fig-t fig-faint">Conflicting method logic</text>

      {/* Side conflict annotation 2 */}
      <g className="fig-line fig-x">
        <path d="M446 188 l10 10 M456 188 l-10 10" />
      </g>
      <text x="464" y="196" className="fig-t fig-strong">Ambiguity 2:</text>
      <text x="464" y="214" className="fig-t fig-faint">Duplicate state in memory</text>
    </Figure>
  );
}
