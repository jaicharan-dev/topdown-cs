import React from 'react';

/**
 * Line-art figure for "The final Keyword".
 * Architectural monochrome line art: one ink colour, no color fills, zero collisions.
 */

function Figure({ id = 'fk', viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        {children}
      </svg>
      {caption && <figcaption className="csf-fig__caption">{caption}</figcaption>}
    </figure>
  );
}

function Lock({ x, y }) {
  return (
    <g className="fig-line">
      <path d={`M${x + 3} ${y} v-4 a4 4 0 0 1 8 0 v4`} />
      <rect x={x} y={y} width="14" height="11" rx="2" />
    </g>
  );
}

export function FinalScopesFigure() {
  const scopes = [
    {
      x: 20,
      title: 'final variable',
      code: 'final List list',
      badge: 'VARIABLE',
      rule: 'Locks the reference',
      sub: 'Cannot reassign pointer to new object',
    },
    {
      x: 235,
      title: 'final method',
      code: 'final void hash()',
      badge: 'METHOD',
      rule: 'Locks the body',
      sub: 'Cannot be overridden by subclasses',
    },
    {
      x: 450,
      title: 'final class',
      code: 'final class String',
      badge: 'CLASS',
      rule: 'Locks the hierarchy',
      sub: 'Cannot be extended or inherited',
    },
  ];

  return (
    <Figure
      id="fk-scopes"
      viewBox="0 0 660 216"
      caption="Same keyword, three targets: what gets locked depends entirely on where you place it."
    >
      {scopes.map((s) => (
        <g key={s.title}>
          {/* Main Card (Width: 190) */}
          <rect x={s.x} y="20" width="190" height="96" rx="6" className="fig-line" />
          <text x={s.x + 95} y="44" className="fig-t fig-strong" textAnchor="middle">
            {s.title}
          </text>
          <path d={`M${s.x} 54 H ${s.x + 190}`} className="fig-line fig-faint" />
          <text x={s.x + 95} y="74" className="fig-mono fig-strong" textAnchor="middle">
            {s.code}
          </text>

          {/* Centered Lock Badge */}
          <rect x={s.x + 65} y="84" width="60" height="20" rx="3" className="fig-line fig-faint" />
          <Lock x={s.x + 73} y="91" />
          <text x={s.x + 105} y="98" className="fig-cap" textAnchor="middle">LOCKED</text>

          {/* Downward stem to rule card */}
          <path d={`M${s.x + 95} 116 V 134`} className="fig-line fig-faint" />

          {/* Result Card below */}
          <rect x={s.x} y="134" width="190" height="64" rx="6" className="fig-line fig-faint" />
          <text x={s.x + 95} y="156" className="fig-mono fig-strong" textAnchor="middle" style={{ fontSize: '11.5px' }}>
            {s.rule}
          </text>
          <text x={s.x + 95} y="178" className="fig-t fig-faint" textAnchor="middle" style={{ fontSize: '10.5px' }}>
            {s.sub}
          </text>
        </g>
      ))}
    </Figure>
  );
}
