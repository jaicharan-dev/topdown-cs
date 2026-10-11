import React from 'react';

// Lightweight, theme-aware diagram primitives for explaining concepts inline
// in docs (comparison boxes, locked/public field lists, small parent-child
// trees). Styled to match the site's card language (see csf-dsa-* in
// custom.css) instead of generic code-block ASCII art or unstyled Mermaid.

export function Diagram({ children, className = '' }) {
  return <div className={`csf-cd-wrapper ${className}`}>{children}</div>;
}

export function Row({ children }) {
  return <div className="csf-cd-row">{children}</div>;
}

export function Box({ title, accent, children, className = '' }) {
  const style = accent ? { '--cd-accent': accent } : undefined;
  return (
    <div className={`csf-cd-box ${className}`} style={style}>
      {title && <div className="csf-cd-box__title">{title}</div>}
      <div className="csf-cd-box__body">{children}</div>
    </div>
  );
}

export function Arrow({ label }) {
  return (
    <div className="csf-cd-arrow">
      <span className="csf-cd-arrow__line" />
      {label && <span className="csf-cd-arrow__label">{label}</span>}
    </div>
  );
}

// variant: 'locked' | 'public' | 'neutral'
export function Field({ icon, code, hint, variant = 'neutral' }) {
  return (
    <div className={`csf-cd-field csf-cd-field--${variant}`}>
      <div className="csf-cd-field__main">
        <span className="csf-cd-field__icon" aria-hidden="true">{icon}</span>
        <code className="csf-cd-field__code">{code}</code>
      </div>
      {hint && <div className="csf-cd-field__hint">{hint}</div>}
    </div>
  );
}

export function Tree({ root, children }) {
  return (
    <div className="csf-cd-tree">
      {root}
      <div className="csf-cd-tree__connector" />
      <div className="csf-cd-tree__children">
        {React.Children.map(children, (child) => (
          <div className="csf-cd-tree__child-wrap">{child}</div>
        ))}
      </div>
    </div>
  );
}
