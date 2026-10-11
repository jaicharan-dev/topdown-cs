import React from 'react';

/**
 * Line-art figure for "Exceptions: Checked vs. Unchecked".
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

/* Throwable splits in two, Exception splits again ------------------------ */

export function ThrowableTreeFigure() {
  return (
    <Figure
      viewBox="0 0 640 230"
      caption="Only the Exception branch is yours to handle. An Error means the JVM itself is in serious trouble, so never catch it in application code."
    >
      {/* Root: Throwable */}
      <rect x="250" y="16" width="140" height="42" rx="3" className="fig-line" />
      <text x="320" y="42" className="fig-t fig-strong" textAnchor="middle">Throwable</text>

      {/* Primary Fork */}
      <path d="M320 58 V 76 H 165 V 96" className="fig-line" />
      <path d="M320 76 H 490 V 96" className="fig-line" />

      {/* Left Branch: Exception */}
      <rect x="95" y="96" width="140" height="40" rx="3" className="fig-line" />
      <text x="165" y="121" className="fig-t fig-strong" textAnchor="middle">Exception</text>

      {/* Right Branch: Error */}
      <rect x="420" y="96" width="140" height="40" rx="3" className="fig-line fig-faint" />
      <text x="490" y="121" className="fig-t fig-faint" textAnchor="middle">Error</text>
      <text x="490" y="152" className="fig-t fig-faint" textAnchor="middle">unrecoverable (OOM, StackOverflow)</text>

      {/* Sub-Fork under Exception */}
      <path d="M165 136 V 156 H 85 V 176" className="fig-line" />
      <path d="M165 156 H 245 V 176" className="fig-line" />

      {/* Checked Exceptions */}
      <rect x="20" y="176" width="130" height="42" rx="3" className="fig-line" />
      <text x="85" y="196" className="fig-t fig-strong" textAnchor="middle">Checked</text>
      <text x="85" y="210" className="fig-mono fig-faint" textAnchor="middle">IOException, etc.</text>

      {/* Unchecked Exceptions */}
      <rect x="170" y="176" width="150" height="42" rx="3" className="fig-line" />
      <text x="245" y="196" className="fig-t fig-strong" textAnchor="middle">RuntimeException</text>
      <text x="245" y="210" className="fig-mono fig-faint" textAnchor="middle">NullPointer, etc.</text>
    </Figure>
  );
}
