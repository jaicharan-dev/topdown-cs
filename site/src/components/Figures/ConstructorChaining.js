import React from 'react';

/**
 * Line-art figure for "Constructors, Overloading, and Chaining".
 * Architectural monochrome line art: one ink colour, no color fills, zero collisions.
 */

function Figure({ id = 'cc', viewBox, children, caption }) {
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

/* 1. this() chains sideways, super() chains up --------------------------- */

export function ChainingFigure() {
  return (
    <Figure
      id="cc-chain"
      viewBox="0 0 660 256"
      caption="this() delegates to another constructor in the same class. super() delegates up to the parent. Both must be the first statement."
    >
      <defs>
        <marker
          id="cc-chain-head"
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

      {/* 1. Parent Constructor: Employee (x: 140 to 520, width: 380) */}
      <rect x="140" y="16" width="380" height="48" rx="6" className="fig-line" />
      <text x="160" y="44" className="fig-mono fig-strong">Employee(company)</text>
      <rect x="390" y="27" width="115" height="22" rx="3" className="fig-line fig-faint" />
      <text x="447" y="42" className="fig-cap" textAnchor="middle">PARENT CLASS</text>

      {/* Upward delegation via super() */}
      <path d="M260 104 V 66" className="fig-line" markerEnd="url(#cc-chain-head)" />
      <rect x="300" y="73" width="145" height="22" rx="4" className="fig-line fig-faint" />
      <text x="372" y="88" className="fig-mono fig-faint" textAnchor="middle">super(company)</text>

      {/* 2. Master Constructor in Child (x: 100 to 560, width: 460) */}
      <rect x="100" y="104" width="460" height="48" rx="6" className="fig-line" />
      <text x="120" y="132" className="fig-mono fig-strong">SoftwareEngineer(company, name, lang)</text>
      <rect x="440" y="115" width="105" height="22" rx="3" className="fig-line fig-faint" />
      <text x="492" y="130" className="fig-cap" textAnchor="middle">PRIMARY BODY</text>

      {/* Upward delegation via this() */}
      <path d="M260 192 V 154" className="fig-line" markerEnd="url(#cc-chain-head)" />
      <rect x="300" y="161" width="200" height="22" rx="4" className="fig-line fig-faint" />
      <text x="400" y="176" className="fig-mono fig-faint" textAnchor="middle">this(company, name, "Java")</text>

      {/* 3. Smaller Overloaded Constructor (x: 140 to 520, width: 380) */}
      <rect x="140" y="192" width="380" height="48" rx="6" className="fig-line fig-faint" />
      <text x="160" y="220" className="fig-mono">SoftwareEngineer(company, name)</text>
      <rect x="385" y="203" width="120" height="22" rx="3" className="fig-line fig-faint" />
      <text x="445" y="218" className="fig-cap" textAnchor="middle">OVERLOADED CALL</text>
    </Figure>
  );
}

/* 2. Initialization Order ------------------------------------------------ */

export function InitOrderFigure() {
  const steps = [
    'Static fields & initializers: parent first, then child (executed once)',
    "Parent instance fields and initialization blocks executed",
    "Parent constructor body completes (via super() call)",
    "Child instance fields and initialization blocks executed",
    "Child constructor body completes",
  ];

  return (
    <Figure
      id="cc-order"
      viewBox="0 0 660 252"
      caption="Five steps, in this order, every time: the parent is always fully constructed before the child adds anything."
    >
      {steps.map((label, i) => {
        const cy = 24 + i * 44;
        const nextCy = 24 + (i + 1) * 44;
        return (
          <g key={label}>
            {/* Step connector line */}
            {i < steps.length - 1 && (
              <path d={`M55 ${cy + 13} V ${nextCy - 13}`} className="fig-line fig-faint" />
            )}

            {/* Step number badge */}
            <circle cx="55" cy={cy} r="13" className="fig-line" />
            <text x="55" y={cy + 4} className="fig-mono fig-strong" textAnchor="middle">
              {i + 1}
            </text>

            {/* Step card */}
            <rect x="85" y={cy - 16} width="555" height="32" rx="6" className="fig-line" />
            <text x="102" y={cy + 5} className="fig-t">
              {label}
            </text>
          </g>
        );
      })}
    </Figure>
  );
}
