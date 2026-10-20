import React from 'react';

// Proportional Gantt chart for scheduling / disk-arm problems: segment widths
// are actually proportional to duration (unlike hand-spaced ASCII art), and
// the track scrolls horizontally on narrow screens instead of squeezing
// labels unreadable.
//
// segments: [{ label, start, end, accent? }]  — start/end in the same time unit.
// idle segments (CPU/head doing nothing) can be passed with accent="#a1a1aa"
// and a label like "idle".
export function GanttChart({ segments, unit = 'ms' }) {
  const total = Math.max(...segments.map((s) => s.end));
  const boundaries = Array.from(
    new Set(segments.flatMap((s) => [s.start, s.end]))
  ).sort((a, b) => a - b);

  return (
    <div className="csf-gantt-wrapper">
      <div className="csf-gantt-scroll">
        <div
          className="csf-gantt-inner"
          style={{ minWidth: `${Math.max(total * 16, 320)}px` }}
        >
          <div className="csf-gantt-track">
            {segments.map((seg, i) => {
              const widthPct = ((seg.end - seg.start) / total) * 100;
              const style = {
                width: `${widthPct}%`,
                '--gantt-accent': seg.accent || 'var(--ifm-color-primary)',
              };
              return (
                <div key={i} className="csf-gantt-segment" style={style}>
                  <span className="csf-gantt-segment__label">{seg.label}</span>
                  <span className="csf-gantt-segment__duration">
                    {seg.end - seg.start}
                    {unit}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="csf-gantt-ticks">
            {boundaries.map((t) => (
              <span
                key={t}
                className={`csf-gantt-tick ${t === 0 ? 'csf-gantt-tick--start' : ''} ${
                  t === total ? 'csf-gantt-tick--end' : ''
                }`}
                style={{ left: `${(t / total) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
