import React from 'react';

/**
 * Line-art figure for "Interfaces vs. Abstract Classes".
 * Architectural monochrome line art: one ink colour, no color fills, zero collisions.
 */

function Figure({ id = 'ia', viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        {children}
      </svg>
      {caption && <figcaption className="csf-fig__caption">{caption}</figcaption>}
    </figure>
  );
}

export function InterfaceVsAbstractFigure() {
  return (
    <Figure
      id="ia-main"
      viewBox="0 0 660 252"
      caption="An abstract class shares real state down a strict family line. An interface defines a capability contract that unrelated classes can satisfy."
    >
      {/* Column Titles */}
      <text x="150" y="20" className="fig-cap" textAnchor="middle">ABSTRACT CLASS (IS-A HIERARCHY)</text>
      <text x="490" y="20" className="fig-cap" textAnchor="middle">INTERFACE (CAN-DO CAPABILITY)</text>

      {/* Center Divider */}
      <path d="M325 16 V 230" className="fig-line fig-dashed" />

      {/* LEFT: ABSTRACT CLASS HIERARCHY */}
      {/* Parent: Mammal (x: 50 to 250, width: 200, height: 70) */}
      <rect x="50" y="34" width="200" height="70" rx="6" className="fig-line" />
      <text x="126" y="52" className="fig-t fig-strong">Mammal</text>
      <rect x="180" y="41" width="60" height="16" rx="3" className="fig-line fig-faint" />
      <text x="210" y="53" className="fig-cap" textAnchor="middle">ABSTRACT</text>
      <path d="M50 62 H 250" className="fig-line fig-faint" />
      <text x="66" y="78" className="fig-mono fig-faint">warmBlood = true</text>
      <text x="66" y="94" className="fig-mono">heartRate()</text>

      {/* UML Generalization: Tip touches base of Mammal at (150, 104) */}
      <path d="M150 104 l-8 14 h16 z" className="fig-line fig-tri" />
      <path d="M150 118 V 138" className="fig-line" />
      <path d="M90 138 H 210" className="fig-line" />
      <path d="M90 138 V 160" className="fig-line" />
      <path d="M210 138 V 160" className="fig-line" />

      {/* Subclasses */}
      <rect x="36" y="160" width="108" height="50" rx="6" className="fig-line" />
      <text x="90" y="180" className="fig-t fig-strong" textAnchor="middle">Dog</text>
      <text x="90" y="198" className="fig-mono fig-faint" textAnchor="middle">warmBlood</text>

      <rect x="156" y="160" width="108" height="50" rx="6" className="fig-line" />
      <text x="210" y="180" className="fig-t fig-strong" textAnchor="middle">Whale</text>
      <text x="210" y="198" className="fig-mono fig-faint" textAnchor="middle">warmBlood</text>

      <text x="150" y="232" className="fig-cap" textAnchor="middle">SHARED STATE AND STRICT LINEAGE</text>

      {/* RIGHT: INTERFACE REALIZATION */}
      {/* Interface Box (x: 390 to 590, width: 200, height: 64) */}
      <rect x="390" y="34" width="200" height="64" rx="6" className="fig-line" />
      <text x="456" y="52" className="fig-t fig-strong">Swimmer</text>
      <rect x="520" y="41" width="60" height="16" rx="3" className="fig-line fig-faint" />
      <text x="550" y="53" className="fig-cap" textAnchor="middle">INTERFACE</text>
      <path d="M390 62 H 590" className="fig-line fig-faint" />
      <text x="490" y="84" className="fig-mono" textAnchor="middle">void swim()</text>

      {/* UML Realization: Dashed stems + hollow triangle touching interface at (490, 98) */}
      <path d="M490 98 l-8 14 h16 z" className="fig-line fig-tri" />
      <path d="M490 112 V 138" className="fig-line fig-dashed" />
      <path d="M382 138 H 598" className="fig-line fig-dashed" />
      <path d="M382 138 V 160" className="fig-line fig-dashed" />
      <path d="M490 138 V 160" className="fig-line fig-dashed" />
      <path d="M598 138 V 160" className="fig-line fig-dashed" />

      {/* Unrelated Implementing Classes (Width 88px each, generous padding for Submarine) */}
      <rect x="338" y="160" width="88" height="50" rx="6" className="fig-line" />
      <text x="382" y="180" className="fig-t fig-strong" textAnchor="middle">Human</text>
      <text x="382" y="198" className="fig-mono fig-faint" textAnchor="middle">swim()</text>

      <rect x="446" y="160" width="88" height="50" rx="6" className="fig-line" />
      <text x="490" y="180" className="fig-t fig-strong" textAnchor="middle">Whale</text>
      <text x="490" y="198" className="fig-mono fig-faint" textAnchor="middle">swim()</text>

      <rect x="554" y="160" width="88" height="50" rx="6" className="fig-line" />
      <text x="598" y="180" className="fig-t fig-strong" textAnchor="middle">Submarine</text>
      <text x="598" y="198" className="fig-mono fig-faint" textAnchor="middle">swim()</text>

      <text x="490" y="232" className="fig-cap" textAnchor="middle">UNRELATED CLASSES, ZERO SHARED LINEAGE</text>
    </Figure>
  );
}
