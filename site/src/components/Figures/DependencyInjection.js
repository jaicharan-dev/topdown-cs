import React from 'react';

/**
 * Line-art figure for "Dependency Injection vs. Dependency Inversion".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="di-head"
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

export function DependencyInjectionFigure() {
  return (
    <Figure
      viewBox="0 0 640 280"
      caption="Without DI, the class builds its own concrete dependency and welds itself to it. With DI, an external caller hands in any implementation that satisfies the interface."
    >
      {/* Column Titles */}
      <text x="160" y="20" className="fig-cap" textAnchor="middle">HARDCODED COUPLING (NO DI)</text>
      <text x="480" y="20" className="fig-cap" textAnchor="middle">DEPENDENCY INJECTION (DI)</text>

      {/* Center Divider */}
      <path d="M320 16 V 264" className="fig-line fig-dashed" />

      {/* LEFT COLUMN: HARDCODED */}
      {/* Caller */}
      <text x="160" y="44" className="fig-mono fig-faint" textAnchor="middle">new PaymentProcessor()</text>
      <path d="M160 50 V 70" className="fig-line" markerEnd="url(#di-head)" />

      {/* Class Box */}
      <rect x="50" y="72" width="220" height="56" rx="3" className="fig-line" />
      <text x="160" y="94" className="fig-t fig-strong" textAnchor="middle">PaymentProcessor</text>
      <path d="M50 102 H 270" className="fig-line" />
      <text x="160" y="118" className="fig-mono fig-faint" textAnchor="middle">db = new MySQLDatabase()</text>

      {/* Solid downward link to concrete dependency */}
      <path d="M160 128 V 154" className="fig-line" markerEnd="url(#di-head)" />
      <text x="168" y="145" className="fig-t fig-faint">creates</text>

      {/* Concrete Dependency Box */}
      <rect x="70" y="156" width="180" height="42" rx="3" className="fig-line" />
      <text x="160" y="182" className="fig-mono fig-strong" textAnchor="middle">MySQLDatabase</text>

      {/* Warning Callouts */}
      <g className="fig-line fig-x">
        <path d="M42 222 l10 10 M52 222 l-10 10" />
      </g>
      <text x="60" y="231" className="fig-t fig-faint">Rigidly locked to MySQLDatabase</text>

      <g className="fig-line fig-x">
        <path d="M42 246 l10 10 M52 246 l-10 10" />
      </g>
      <text x="60" y="255" className="fig-t fig-faint">Impossible to mock in unit tests</text>

      {/* RIGHT COLUMN: DEPENDENCY INJECTION */}
      {/* Caller / DI Container */}
      <text x="480" y="44" className="fig-mono fig-faint" textAnchor="middle">new PaymentProcessor(db)</text>
      <path d="M480 50 V 70" className="fig-line" markerEnd="url(#di-head)" />

      {/* Class Box */}
      <rect x="370" y="72" width="220" height="56" rx="3" className="fig-line" />
      <text x="480" y="94" className="fig-t fig-strong" textAnchor="middle">PaymentProcessor</text>
      <path d="M370 102 H 590" className="fig-line" />
      <text x="480" y="118" className="fig-mono fig-faint" textAnchor="middle">constructor(Database db)</text>

      {/* Arrow down to interface */}
      <path d="M480 128 V 150" className="fig-line fig-dashed" markerEnd="url(#di-head)" />

      {/* Interface Box */}
      <rect x="385" y="152" width="190" height="38" rx="3" className="fig-line" />
      <text x="480" y="176" className="fig-mono fig-strong" textAnchor="middle">&lt;&lt;interface&gt;&gt; Database</text>

      {/* Swappable Impls Bar */}
      <path d="M480 190 V 202" className="fig-line fig-faint" />
      <path d="M360 202 H 600" className="fig-line fig-faint" />
      <path d="M360 202 V 210" className="fig-line fig-faint" />
      <path d="M480 202 V 210" className="fig-line fig-faint" />
      <path d="M600 202 V 210" className="fig-line fig-faint" />

      <text x="360" y="224" className="fig-mono fig-faint" textAnchor="middle">MySQLDb</text>
      <text x="480" y="224" className="fig-mono fig-faint" textAnchor="middle">PostgresDb</text>
      <text x="600" y="224" className="fig-mono fig-faint" textAnchor="middle">MockDb</text>

      {/* Success Callout */}
      <g className="fig-line fig-check">
        <path d="M356 248 l6 6 l12 -12" />
      </g>
      <text x="382" y="252" className="fig-t fig-faint">
        Swappable: real DB in prod, mock DB in tests
      </text>
    </Figure>
  );
}
