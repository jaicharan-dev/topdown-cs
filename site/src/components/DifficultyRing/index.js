/**
 * Completion as one ring, split by difficulty.
 *
 * Three arcs round a single circle rather than three separate bars, because
 * the thing worth seeing at a glance is how much of the whole is done; the
 * split into easy, medium and hard is the second question and gets the
 * second reading.
 *
 * Each difficulty owns a fixed share of the circle, sized by how many pages
 * it has, and fills its own share. That keeps the ring honest: a reader who
 * finishes every easy page has not filled the circle, because easy pages are
 * not the whole site.
 */

import React from 'react';
import styles from './styles.module.css';

const SIZE = 132;
const STROKE = 9;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A gap between arcs, so two full neighbours do not read as one. */
const GAP = 5;

const BANDS = [
  { key: 'easy', label: 'Easy', color: '#2dd4bf' },
  { key: 'medium', label: 'Med.', color: '#fbbf24' },
  { key: 'hard', label: 'Hard', color: '#fb7185' },
];

export default function DifficultyRing({ breakdown, done, total }) {
  const grandTotal = BANDS.reduce(
    (sum, band) => sum + (breakdown[band.key]?.total || 0),
    0
  );

  // Where each band starts, walking the circle once.
  let offset = 0;
  const arcs = BANDS.map((band) => {
    const entry = breakdown[band.key] || { done: 0, total: 0 };
    const share = grandTotal ? entry.total / grandTotal : 0;
    const span = Math.max(0, CIRCUMFERENCE * share - GAP);
    const filled = entry.total ? (entry.done / entry.total) * span : 0;
    const arc = { ...band, ...entry, start: offset, span, filled };
    offset += CIRCUMFERENCE * share;
    return arc;
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.ringBox}>
        <svg
          className={styles.ring}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${done} of ${total} pages complete`}>
          {/* Rotated so the circle starts at the top rather than at three
              o'clock, which is where an eye expects a dial to begin. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {arcs.map((arc) => (
              <React.Fragment key={arc.key}>
                <circle
                  className={styles.track}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  strokeWidth={STROKE}
                  strokeDasharray={`${arc.span} ${CIRCUMFERENCE - arc.span}`}
                  strokeDashoffset={-arc.start}
                  style={{ stroke: arc.color }}
                />
                {arc.filled > 0 && (
                  <circle
                    className={styles.fill}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    strokeWidth={STROKE}
                    strokeDasharray={`${arc.filled} ${
                      CIRCUMFERENCE - arc.filled
                    }`}
                    strokeDashoffset={-arc.start}
                    style={{ stroke: arc.color }}
                  />
                )}
              </React.Fragment>
            ))}
          </g>
        </svg>

        <div className={styles.centre}>
          <div className={styles.done}>{done}</div>
          <div className={styles.of}>/{total}</div>
          <div className={styles.word}>done</div>
        </div>
      </div>

      <ul className={styles.legend}>
        {arcs.map((arc) => (
          <li key={arc.key} className={styles.legendRow}>
            <span className={styles.legendLabel} style={{ color: arc.color }}>
              {arc.label}
            </span>
            <span className={styles.legendCount}>
              {arc.done}
              <span className={styles.legendOf}>/{arc.total}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
