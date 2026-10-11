import React from 'react';

/**
 * Line-art figure for "The static Keyword".
 * Architectural monochrome line art: one ink colour, no color fills, zero collisions.
 */

function Figure({ id = 'sk', viewBox, children, caption }) {
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

export function SharedCopyFigure() {
  const students = [
    { title: 'Student A', data: 'name="Alice", marks=95', x: 25, cx: 115 },
    { title: 'Student B', data: 'name="Bob", marks=88', x: 240, cx: 330 },
    { title: 'Student C', data: 'name="Charlie", marks=91', x: 455, cx: 545 },
  ];

  return (
    <Figure
      id="sk-shared"
      viewBox="0 0 660 240"
      caption="Each student instance holds its own individual fields in heap memory. There is only one schoolName stored at the class level: every instance points at the same shared copy."
    >
      <defs>
        <marker
          id="sk-shared-head"
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

      {/* 1. Shared Class-Level State in Method Area (x: 200 to 460, width: 260) */}
      <rect x="200" y="16" width="260" height="58" rx="6" className="fig-line" />
      <text x="280" y="38" className="fig-t fig-strong">Student Class</text>
      <rect x="365" y="26" width="85" height="18" rx="3" className="fig-line fig-faint" />
      <text x="407" y="38" className="fig-cap" textAnchor="middle">METHOD AREA</text>
      <path d="M200 48 H 460" className="fig-line fig-faint" />
      <text x="330" y="64" className="fig-mono fig-strong" textAnchor="middle">static schoolName = "Harvard"</text>

      {/* 2. Bus Routing */}
      {/* Upward trunk into class box */}
      <path d="M330 102 V 76" className="fig-line fig-strong" markerEnd="url(#sk-shared-head)" />
      <text x="330" y="94" className="fig-cap" textAnchor="middle">SHARED REFERENCE (ONE COPY)</text>

      {/* Horizontal bus line connecting all 3 columns */}
      <path d="M115 102 H 545" className="fig-line fig-faint" />

      {/* 3. Three Student Instances in Heap Memory */}
      {students.map((s) => (
        <g key={s.title}>
          {/* Vertical feed stem into the bus line */}
          <path d={`M${s.cx} 134 V 102`} className="fig-line fig-faint" />
          <rect x={s.x} y="134" width="180" height="60" rx="6" className="fig-line" />
          <text x={s.cx} y="156" className="fig-t fig-strong" textAnchor="middle">
            {s.title}
          </text>
          <path d={`M${s.x} 166 H ${s.x + 180}`} className="fig-line fig-faint" />
          <text x={s.cx} y="184" className="fig-mono fig-faint" textAnchor="middle" style={{ fontSize: '11px' }}>
            {s.data}
          </text>
        </g>
      ))}

      {/* Summary Note */}
      <text x="330" y="222" className="fig-cap" textAnchor="middle">
        MUTATING schoolName THROUGH ANY INSTANCE UPDATES IT FOR ALL INSTANCES SIMULTANEOUSLY
      </text>
    </Figure>
  );
}
