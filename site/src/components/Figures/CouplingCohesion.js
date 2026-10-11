import React from 'react';

/**
 * Line-art figures for "Coupling and Cohesion".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="ch-head"
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

/* Two spectrums, best to worst ------------------------------------------- */

export function SpectrumsFigure() {
  const cohesion = ['Functional', 'Sequential', 'Temporal', 'Coincidental'];
  const coupling = ['Data', 'Control', 'Common', 'Content'];

  const row = (y, label, items) => (
    <g>
      <text x="20" y={y - 14} className="fig-cap">{label}</text>
      <path d={`M20 ${y} H 600`} className="fig-line" markerEnd="url(#ch-head)" />
      {items.map((item, i) => (
        <g key={item}>
          <path d={`M${50 + i * 170} ${y - 8} V ${y + 8}`} className="fig-line" />
          <text x={50 + i * 170} y={y + 28} className="fig-mono" textAnchor="middle">{item}</text>
        </g>
      ))}
      <text x="50" y={y - 24} className="fig-t fig-faint" textAnchor="middle">best</text>
      <text x="560" y={y - 24} className="fig-t fig-faint" textAnchor="middle">worst</text>
    </g>
  );

  return (
    <Figure
      viewBox="0 0 640 220"
      caption="Walk cohesion left to right and it gets worse. Walk coupling the same way and it also gets worse: the goal is to sit at the left end of both."
    >
      {row(60, 'COHESION: inside one class', cohesion)}
      {row(160, 'COUPLING: between classes', coupling)}
    </Figure>
  );
}

/* The train wreck, and the one-hop fix ------------------------------------ */

export function TrainWreckFigure() {
  return (
    <Figure
      viewBox="0 0 640 240"
      caption="Four hops deep means four places this line can break. Asking the immediate object directly encapsulates the navigation."
    >
      {/* 1. Train Wreck */}
      <text x="20" y="22" className="fig-cap">TRAIN WRECK (VIOLATES LAW OF DEMETER)</text>

      {/* Nodes */}
      <rect x="20" y="34" width="70" height="36" rx="3" className="fig-line" />
      <text x="55" y="57" className="fig-mono" textAnchor="middle">order</text>

      <path d="M90 52 H 108" className="fig-line" markerEnd="url(#ch-head)" />

      <rect x="114" y="34" width="112" height="36" rx="3" className="fig-line" />
      <text x="170" y="57" className="fig-mono" textAnchor="middle">.getCustomer()</text>

      <path d="M226 52 H 244" className="fig-line" markerEnd="url(#ch-head)" />

      <rect x="250" y="34" width="104" height="36" rx="3" className="fig-line" />
      <text x="302" y="57" className="fig-mono" textAnchor="middle">.getProfile()</text>

      <path d="M354 52 H 372" className="fig-line" markerEnd="url(#ch-head)" />

      <rect x="378" y="34" width="108" height="36" rx="3" className="fig-line" />
      <text x="432" y="57" className="fig-mono" textAnchor="middle">.getAddress()</text>

      <path d="M486 52 H 504" className="fig-line" markerEnd="url(#ch-head)" />

      <rect x="510" y="34" width="108" height="36" rx="3" className="fig-line" />
      <text x="564" y="57" className="fig-mono" textAnchor="middle">.getZipCode()</text>

      {/* Train Wreck Warning */}
      <g className="fig-line fig-x">
        <path d="M22 84 l10 10 M32 84 l-10 10" />
      </g>
      <text x="40" y="93" className="fig-t fig-faint">
        Reaches through 3 foreign objects: tight coupling, fragile chain
      </text>

      {/* Divider */}
      <path d="M20 122 H 620" className="fig-line fig-dashed" />

      {/* 2. Law of Demeter Fix */}
      <text x="20" y="148" className="fig-cap">LAW OF DEMETER FIX (TELL, DON'T ASK)</text>

      <rect x="20" y="160" width="280" height="40" rx="3" className="fig-line" />
      <text x="160" y="185" className="fig-mono fig-strong" textAnchor="middle">
        order.getDeliveryZipCode()
      </text>

      <g className="fig-line fig-check">
        <path d="M320 182 l6 6 l12 -12" />
      </g>
      <text x="348" y="186" className="fig-t fig-faint">
        One call, one object: navigation stays private to Order
      </text>
    </Figure>
  );
}
