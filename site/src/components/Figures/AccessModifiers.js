import React from 'react';

/**
 * Line-art figure for "Understanding Access Modifiers".
 * Architectural monochrome line art: one ink colour, no color fills, zero collisions.
 */

function Figure({ id = 'am', viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        {children}
      </svg>
      {caption && <figcaption className="csf-fig__caption">{caption}</figcaption>}
    </figure>
  );
}

export function VisibilityRingsFigure() {
  const scopes = [
    { label: 'private', scope: 'Private', sub: 'Declaring class only', r: 36, topY: 126 },
    { label: 'default', scope: 'Default', sub: 'Same package only', r: 70, topY: 92 },
    { label: 'protected', scope: 'Protected', sub: 'Package + subclasses anywhere', r: 104, topY: 58 },
    { label: 'public', scope: 'Public', sub: 'Accessible everywhere', r: 138, topY: 24 },
  ];

  return (
    <Figure
      id="am-rings"
      viewBox="0 0 660 310"
      caption="Each ring can access everything inside its boundary. private sees only its own class; public is accessible across the entire project."
    >
      {/* Concentric Visibility Circles centered at (175, 155) */}
      {scopes.map((s) => (
        <circle key={s.label} cx="175" cy="155" r={s.r} className="fig-line" />
      ))}

      {/* Micro-pills at top of each ring to isolate text from circle strokes */}
      {scopes.map((s) => (
        <g key={`badge-${s.label}`}>
          <rect
            x={175 - 34}
            y={s.topY - 8}
            width="68"
            height="18"
            rx="4"
            className="fig-line fig-faint"
            style={{ fill: 'var(--fig-bg)' }}
          />
          <text x="175" y={s.topY + 5} className="fig-mono fig-strong" textAnchor="middle" style={{ fontSize: '11px' }}>
            {s.label}
          </text>
        </g>
      ))}

      {/* Legend / Details on the right (x: 350 to 640) */}
      <text x="350" y="32" className="fig-cap">VISIBILITY SCOPE (INWARD TO OUTWARD)</text>
      <path d="M350 42 H 640" className="fig-line fig-faint" />

      {scopes.map((s, i) => {
        const cardY = 56 + i * 56;
        return (
          <g key={`card-${s.label}`}>
            <rect x="350" y={cardY} width="290" height="46" rx="6" className="fig-line" />
            <circle cx="370" cy={cardY + 23} r="4" className="fig-line" />
            <text x="386" y={cardY + 20} className="fig-mono fig-strong">
              {s.scope}
            </text>
            <text x="386" y={cardY + 37} className="fig-t fig-faint">
              {s.sub}
            </text>
          </g>
        );
      })}
    </Figure>
  );
}
