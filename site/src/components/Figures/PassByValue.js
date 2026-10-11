import React from 'react';

/**
 * Line-art figure for "Pass by Value vs. Pass by Reference in Java".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="pbv-head"
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

export function PassByValueFigure() {
  return (
    <Figure
      viewBox="0 0 640 250"
      caption="The address 0x1A2B is copied into the parameter. Both point to the same object on the heap, but reassigning param never moves the caller's reference."
    >
      {/* Column Titles */}
      <text x="140" y="20" className="fig-cap" textAnchor="middle">STACK (CALL FRAMES)</text>
      <text x="480" y="20" className="fig-cap" textAnchor="middle">HEAP (OBJECTS IN MEMORY)</text>

      {/* Memory Boundary */}
      <path d="M290 16 V 234" className="fig-line fig-dashed" />

      {/* Stack Frame 1: main() */}
      <rect x="30" y="34" width="220" height="68" rx="3" className="fig-line" />
      <text x="44" y="54" className="fig-t fig-strong">main() frame</text>
      <path d="M30 62 H 250" className="fig-line" />
      <text x="44" y="84" className="fig-mono">myDog = 0x1A2B</text>

      {/* Stack Frame 2: modify() */}
      <rect x="30" y="138" width="220" height="68" rx="3" className="fig-line" />
      <text x="44" y="158" className="fig-t fig-strong">modify(Dog param) frame</text>
      <path d="M30 166 H 250" className="fig-line" />
      <text x="44" y="188" className="fig-mono">param = 0x1A2B</text>

      {/* Copy indicator */}
      <path d="M140 102 V 130" className="fig-line fig-faint" markerEnd="url(#pbv-head)" />
      <text x="148" y="120" className="fig-t fig-faint">value copied</text>

      {/* Heap Object 1: Original Dog */}
      <rect x="360" y="44" width="230" height="66" rx="3" className="fig-line" />
      <text x="376" y="68" className="fig-mono fig-faint">0x1A2B</text>
      <text x="376" y="92" className="fig-mono fig-strong">Dog&#123; name: "Spot" &#125;</text>

      {/* Pointer from myDog to 0x1A2B (ends at 360 flush with box) */}
      <path d="M250 80 H 360" className="fig-line" markerEnd="url(#pbv-head)" />

      {/* Pointer from param to 0x1A2B (mutating fields works) */}
      <path d="M250 178 Q 300 178 320 128 T 360 88" className="fig-line" markerEnd="url(#pbv-head)" />
      <text x="325" y="146" className="fig-t fig-faint">param.name = "Max"</text>

      {/* Heap Object 2: Reassigned Dog */}
      <rect x="360" y="156" width="230" height="66" rx="3" className="fig-line fig-faint" />
      <text x="376" y="180" className="fig-mono fig-faint">0x3C4D</text>
      <text x="376" y="204" className="fig-mono fig-faint">Dog&#123; name: "Buster" &#125;</text>

      {/* Reassignment pointer (dashed, ends at 360 flush with box) */}
      <path d="M250 192 H 360" className="fig-line fig-dashed" markerEnd="url(#pbv-head)" />
      <text x="475" y="238" className="fig-t fig-faint" textAnchor="middle">
        param = new Dog() only reassigns the local parameter
      </text>
    </Figure>
  );
}
