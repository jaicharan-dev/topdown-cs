import React from 'react';

/**
 * Line-art figures for "Method Overloading vs. Overriding".
 * Architectural monochrome line art: one ink colour, no color fills, zero collisions.
 */

function Figure({ id = 'oo', viewBox, children, caption }) {
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

/* 1. Binding Time: Compile-Time vs Runtime ------------------------------- */

export function BindingTimeFigure() {
  return (
    <Figure
      id="oo-bind"
      viewBox="0 0 660 248"
      caption="Both are polymorphism. They differ in when the choice is made, and what information is used to make that choice."
    >
      <defs>
        <marker
          id="oo-bind-head"
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

      {/* Top Column Headers */}
      <text x="165" y="20" className="fig-cap" textAnchor="middle">METHOD OVERLOADING</text>
      <text x="495" y="20" className="fig-cap" textAnchor="middle">METHOD OVERRIDING</text>

      {/* Center Dashed Divider */}
      <path d="M330 14 V 186" className="fig-line fig-dashed" />

      {/* Left Column: Overloading (Early / Compile Time) */}
      <rect x="40" y="32" width="250" height="38" rx="6" className="fig-line" />
      <text x="165" y="56" className="fig-mono fig-strong" textAnchor="middle">area(4, 6)</text>

      <path d="M165 70 V 98" className="fig-line" markerEnd="url(#oo-bind-head)" />
      <text x="165" y="88" className="fig-cap" textAnchor="middle">MATCH PARAMS</text>

      <rect x="40" y="104" width="250" height="38" rx="6" className="fig-line" />
      <text x="165" y="128" className="fig-mono" textAnchor="middle">area(int, int)</text>
      <text x="165" y="162" className="fig-t fig-faint" textAnchor="middle">Resolved from argument list</text>

      {/* Right Column: Overriding (Late / Runtime) */}
      <rect x="365" y="32" width="260" height="38" rx="6" className="fig-line" />
      <text x="495" y="56" className="fig-mono fig-strong" textAnchor="middle">processor.processPayment()</text>

      <path d="M495 70 V 98" className="fig-line" markerEnd="url(#oo-bind-head)" />
      <text x="495" y="88" className="fig-cap" textAnchor="middle">LOOKUP VTABLE</text>

      <rect x="355" y="104" width="280" height="38" rx="6" className="fig-line" />
      <text x="495" y="128" className="fig-mono" textAnchor="middle">CryptoProcessor.processPayment()</text>
      <text x="495" y="162" className="fig-t fig-faint" textAnchor="middle">Resolved from actual object instance</text>

      {/* Time Axis at bottom */}
      <path d="M30 200 H 630" className="fig-line fig-faint" markerEnd="url(#oo-bind-head)" />
      <path d="M165 194 V 206" className="fig-line fig-faint" />
      <path d="M495 194 V 206" className="fig-line fig-faint" />
      <text x="165" y="226" className="fig-cap" textAnchor="middle">STATIC: COMPILE TIME</text>
      <text x="495" y="226" className="fig-cap" textAnchor="middle">DYNAMIC: RUN TIME</text>
    </Figure>
  );
}

/* 2. Return Type Alone Cannot Overload ----------------------------------- */

export function ReturnTypeFigure() {
  return (
    <Figure
      id="oo-ret"
      viewBox="0 0 660 176"
      caption="At the call site, the compiler inspects only the name and arguments. Return types are not part of the signature match."
    >
      <defs>
        <marker
          id="oo-ret-head"
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

      {/* Call Site Card on Left (x: 20 to 160, width: 140) */}
      <rect x="20" y="58" width="140" height="52" rx="6" className="fig-line" />
      <text x="90" y="78" className="fig-cap" textAnchor="middle">CALL SITE</text>
      <text x="90" y="98" className="fig-mono fig-strong" textAnchor="middle">calculate(5)</text>

      {/* Stretched connector channel with BLOCKED badge */}
      <path d="M160 84 H 206" className="fig-line" />
      <text x="183" y="75" className="fig-cap" textAnchor="middle">CALL</text>

      {/* Clear barrier 'X' situated at x=214 to 226 */}
      <g className="fig-line fig-x">
        <path d="M214 78 l12 12 M226 78 l-12 12" />
      </g>

      {/* Disambiguation fork stemming from x=242 */}
      <path d="M242 46 V 122" className="fig-line" />
      <path d="M242 46 H 272" className="fig-line" markerEnd="url(#oo-ret-head)" />
      <path d="M242 122 H 272" className="fig-line" markerEnd="url(#oo-ret-head)" />

      {/* Candidate 1 */}
      <rect x="278" y="26" width="362" height="40" rx="6" className="fig-line" />
      <text x="296" y="51" className="fig-mono">int calculate(int x)</text>
      <rect x="520" y="35" width="105" height="22" rx="3" className="fig-line fig-faint" />
      <text x="572" y="50" className="fig-cap" textAnchor="middle">CANDIDATE 1</text>

      {/* Ambiguity central note */}
      <rect x="360" y="73" width="200" height="22" rx="4" className="fig-line fig-faint" />
      <text x="460" y="88" className="fig-cap" textAnchor="middle">AMBIGUOUS: SAME PARAMETERS</text>

      {/* Candidate 2 */}
      <rect x="278" y="102" width="362" height="40" rx="6" className="fig-line" />
      <text x="296" y="127" className="fig-mono">double calculate(int x)</text>
      <rect x="520" y="111" width="105" height="22" rx="3" className="fig-line fig-faint" />
      <text x="572" y="126" className="fig-cap" textAnchor="middle">CANDIDATE 2</text>
    </Figure>
  );
}

/* 3. Runtime Virtual Method Dispatch ----------------------------------- */

export function DispatchFigure() {
  return (
    <Figure
      id="oo-disp"
      viewBox="0 0 660 178"
      caption="The declared type decides compile-time validity. At runtime, the JVM looks up the actual object's vtable to dispatch the overriding method body."
    >
      <defs>
        <marker
          id="oo-disp-head"
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
      <text x="105" y="22" className="fig-cap" textAnchor="middle">REFERENCE VARIABLE</text>
      <text x="345" y="22" className="fig-cap" textAnchor="middle">ACTUAL OBJECT (HEAP)</text>
      <text x="560" y="22" className="fig-cap" textAnchor="middle">VIRTUAL METHOD TABLE</text>

      {/* Col 1: Reference Variable (x: 20 to 190, width: 170) */}
      <rect x="20" y="36" width="170" height="74" rx="6" className="fig-line" />
      <text x="105" y="60" className="fig-mono fig-strong" textAnchor="middle">processor</text>
      <path d="M20 72 H 190" className="fig-line fig-faint" />
      <text x="105" y="94" className="fig-mono fig-faint" textAnchor="middle">PaymentProcessor</text>

      {/* Stretched Channel 1 (x: 190 to 265, length: 75px) */}
      <path d="M190 73 H 265" className="fig-line" markerEnd="url(#oo-disp-head)" />
      <text x="227" y="64" className="fig-cap" textAnchor="middle">POINTS TO</text>

      {/* Col 2: Heap Object Instance (x: 265 to 425, width: 160) */}
      <rect x="265" y="36" width="160" height="74" rx="6" className="fig-line" />
      <text x="345" y="66" className="fig-mono fig-strong" textAnchor="middle">CryptoProcessor</text>
      <text x="345" y="88" className="fig-mono fig-faint" textAnchor="middle">@ 0x7F20</text>

      {/* Stretched Channel 2 (x: 425 to 485, length: 60px) */}
      <path d="M425 73 H 485" className="fig-line" markerEnd="url(#oo-disp-head)" />
      <text x="455" y="64" className="fig-cap" textAnchor="middle">VTABLE</text>

      {/* Col 3: VTable Card (x: 485 to 640, width: 155) */}
      <rect x="485" y="36" width="155" height="114" rx="6" className="fig-line" />
      <rect x="495" y="46" width="135" height="30" rx="4" className="fig-line fig-strong" />
      <text x="562" y="66" className="fig-mono fig-strong" textAnchor="middle">processPayment()</text>
      <text x="562" y="100" className="fig-mono fig-faint" textAnchor="middle">getFee()</text>
      <text x="562" y="128" className="fig-mono fig-faint" textAnchor="middle">log()</text>
    </Figure>
  );
}
