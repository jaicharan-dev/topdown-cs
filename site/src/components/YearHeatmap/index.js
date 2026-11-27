/**
 * Twelve months of activity as one horizontal strip.
 *
 * Replaces the unbroken grid of weeks, which showed whatever happened to fit
 * and labelled whatever happened to have room. Here each month is its own
 * block with a gap and its own label, so a reader can find April without
 * counting columns.
 *
 * `endDay` arrives as a prop and is never read from the clock here. This is a
 * prerendered site: a component that calls new Date() while rendering stamps
 * the server's build date into the markup and the browser's date into the
 * first client render, and React finds two different trees.
 */

import React from 'react';
import { buildYearHeatmap, describeDay } from '@site/src/lib/heatmap';
import styles from './styles.module.css';

const WEEKDAY_ROWS = [
  { row: 1, label: 'Mon' },
  { row: 3, label: 'Wed' },
  { row: 5, label: 'Fri' },
];

export default function YearHeatmap({ activity, endDay, compact = false }) {
  const grid = buildYearHeatmap(activity, endDay);

  // Before the day is known there is nothing honest to draw, and an empty
  // strip of the right height stops the page jumping when it arrives.
  if (!grid.months.length) {
    return <div className={styles.placeholder} aria-hidden="true" />;
  }

  return (
    <div className={styles.wrapper} data-compact={compact ? 'true' : 'false'}>
      <div className={styles.scroll}>
        <div className={styles.strip}>
          {/* Three labels, not seven: at this square size the rest collide. */}
          <div className={styles.weekdays} aria-hidden="true">
            {WEEKDAY_ROWS.map(({ row, label }) => (
              <span
                key={label}
                className={styles.weekday}
                style={{ gridRow: row + 1 }}>
                {label}
              </span>
            ))}
          </div>

          {grid.months.map((month) => (
            <div key={month.key} className={styles.month}>
              {/* The year sits above its own run of months. Hung off the
                  first month of each year rather than drawn as a separate
                  row, so it cannot drift out of step with the columns it
                  is labelling. */}
              <div className={styles.yearLabel}>
                {month.startsYear ? month.year : ''}
              </div>
              <div className={styles.weeks}>
                {month.weeks.map((week, index) => (
                  <div key={index} className={styles.week}>
                    {week.map((cell, row) =>
                      cell ? (
                        <div
                          key={cell.day}
                          className={styles.cell}
                          data-level={cell.level}
                          data-future={cell.future ? 'true' : 'false'}
                          title={describeDay(cell)}
                        />
                      ) : (
                        // Days outside this month are a gap, not an empty
                        // day: a square for 31 June would be a lie.
                        <div key={`pad-${index}-${row}`} className={styles.pad} />
                      )
                    )}
                  </div>
                ))}
              </div>
              <div className={styles.monthLabel}>{month.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.legend} aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={styles.cell} data-level={level} />
          ))}
          <span>More</span>
        </div>
      </div>

    </div>
  );
}
