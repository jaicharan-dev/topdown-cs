import React from 'react';

/**
 * Line-art figure for "SOLID Principles".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        {children}
      </svg>
      {caption && <figcaption className="csf-fig__caption">{caption}</figcaption>}
    </figure>
  );
}

export function SolidOverviewFigure() {
  const rules = [
    {
      letter: 'S',
      title: 'Single Responsibility Principle',
      rule: 'A class should have one, and only one, reason to change',
      tag: 'Cohesion',
    },
    {
      letter: 'O',
      title: 'Open / Closed Principle',
      rule: 'Open for extension, closed for modification',
      tag: 'Polymorphism',
    },
    {
      letter: 'L',
      title: 'Liskov Substitution Principle',
      rule: 'Subtypes must honor the contract of their base types',
      tag: 'Inheritance',
    },
    {
      letter: 'I',
      title: 'Interface Segregation Principle',
      rule: 'Clients should not be forced to depend on unused methods',
      tag: 'Granularity',
    },
    {
      letter: 'D',
      title: 'Dependency Inversion Principle',
      rule: 'High-level modules must depend on abstractions, not concretions',
      tag: 'Decoupling',
    },
  ];

  return (
    <Figure
      viewBox="0 0 640 334"
      caption="Five architectural rules pushing toward the same goal: change one module without breaking another."
    >
      {rules.map((r, i) => {
        const y = 14 + i * 64;
        const nextY = 14 + (i + 1) * 64;
        return (
          <g key={r.letter}>
            {/* Connector segment between cards (never crosses into the badge or text) */}
            {i < rules.length - 1 && (
              <path d={`M62 ${y + 54} V ${nextY}`} className="fig-line fig-faint" />
            )}

            {/* Container Card */}
            <rect x="25" y={y} width="590" height="54" rx="3" className="fig-line" />

            {/* Letter Badge Circle */}
            <circle cx="62" cy={y + 27} r="16" className="fig-line" />
            <text x="62" y={y + 33} className="fig-t fig-strong" textAnchor="middle">
              {r.letter}
            </text>

            {/* Internal Divider */}
            <path d={`M95 ${y} V ${y + 54}`} className="fig-line fig-faint" />

            {/* Title & Core Rule */}
            <text x="110" y={y + 24} className="fig-t fig-strong">
              {r.title}
            </text>
            <text x="110" y={y + 43} className="fig-mono fig-faint">
              {r.rule}
            </text>

            {/* Architectural Theme Tag */}
            <rect x="495" y={y + 15} width="105" height="24" rx="3" className="fig-line fig-faint" />
            <text x="547" y={y + 31} className="fig-mono fig-faint" textAnchor="middle">
              {r.tag}
            </text>
          </g>
        );
      })}
    </Figure>
  );
}
