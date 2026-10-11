import React from 'react';

/**
 * Line-art figure for "Garbage Collection: Generational Heap".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="gc-head"
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

export function GenerationalHeapFigure() {
  return (
    <Figure
      viewBox="0 0 640 240"
      caption="New objects enter Eden. Survivors cycle through S0 and S1 with an age counter. Surviving enough cycles promotes them to the Old Generation."
    >
      {/* Zone Headers */}
      <text x="165" y="20" className="fig-cap" textAnchor="middle">YOUNG GENERATION (MINOR GC)</text>
      <text x="520" y="20" className="fig-cap" textAnchor="middle">OLD GENERATION (MAJOR GC)</text>

      {/* 1. Young Gen Border */}
      <rect x="20" y="32" width="290" height="160" rx="4" className="fig-line fig-dashed" />

      {/* Eden Space */}
      <rect x="34" y="50" width="116" height="96" rx="3" className="fig-line" />
      <text x="92" y="80" className="fig-t fig-strong" textAnchor="middle">Eden Space</text>
      <text x="92" y="104" className="fig-mono fig-faint" textAnchor="middle">new Object()</text>
      <text x="92" y="124" className="fig-t fig-faint" textAnchor="middle">most die here</text>

      {/* Arrow Eden -> Survivor */}
      <path d="M150 98 H 178" className="fig-line" markerEnd="url(#gc-head)" />

      {/* Survivor Spaces S0 / S1 */}
      <rect x="180" y="50" width="116" height="42" rx="3" className="fig-line" />
      <text x="238" y="76" className="fig-mono" textAnchor="middle">Survivor (S0)</text>

      <path d="M238 92 V 104" className="fig-line fig-faint" />

      <rect x="180" y="104" width="116" height="42" rx="3" className="fig-line" />
      <text x="238" y="130" className="fig-mono" textAnchor="middle">Survivor (S1)</text>

      {/* Subtext under young */}
      <text x="165" y="174" className="fig-t fig-faint" textAnchor="middle">Minor GC clears Eden; survivors age in S0/S1</text>

      {/* 2. Promotion Channel (Clean 110px gap between 310 and 420) */}
      <path d="M310 98 H 410" className="fig-line" markerEnd="url(#gc-head)" />
      <text x="365" y="84" className="fig-cap" textAnchor="middle">PROMOTION</text>
      <text x="365" y="118" className="fig-mono fig-faint" textAnchor="middle">age &gt;= 15</text>

      {/* 3. Old Gen Border */}
      <rect x="420" y="32" width="200" height="160" rx="4" className="fig-line fig-dashed" />

      {/* Old Gen Space */}
      <rect x="434" y="50" width="172" height="96" rx="3" className="fig-line" />
      <text x="520" y="80" className="fig-t fig-strong" textAnchor="middle">Tenured / Old Space</text>
      <text x="520" y="104" className="fig-mono fig-faint" textAnchor="middle">long-lived objects</text>
      <text x="520" y="124" className="fig-t fig-faint" textAnchor="middle">singletons, caches, pools</text>

      {/* Subtext under old */}
      <text x="520" y="174" className="fig-t fig-faint" textAnchor="middle">Major GC: slow, Stop-The-World</text>
    </Figure>
  );
}
