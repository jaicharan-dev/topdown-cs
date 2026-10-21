import React from 'react';

// Minimal, monochrome diagram primitives: plain bordered boxes, thin
// connecting lines, no icons, no accent colors, as little text as possible.

export function Diagram({ children, className = '' }) {
  return <div className={`csf-sd-wrapper ${className}`}>{children}</div>;
}

export function Row({ children }) {
  return <div className="csf-sd-row">{children}</div>;
}

export function Box({ label, sub, className = '' }) {
  return (
    <div className={`csf-sd-box ${className}`}>
      <div className="csf-sd-box__label">{label}</div>
      {sub && <div className="csf-sd-box__sub">{sub}</div>}
    </div>
  );
}

export function Arrow({ label }) {
  return (
    <div className="csf-sd-arrow">
      {label && <span className="csf-sd-arrow__label">{label}</span>}
      <span className="csf-sd-arrow__line" />
    </div>
  );
}

export function Tree({ root, children }) {
  return (
    <div className="csf-sd-tree">
      {root}
      <div className="csf-sd-tree__connector" />
      <div className="csf-sd-tree__children">
        {React.Children.map(children, (child) => (
          <div className="csf-sd-tree__child-wrap">{child}</div>
        ))}
      </div>
    </div>
  );
}
