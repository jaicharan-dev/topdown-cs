/**
 * The activity heatmap.
 *
 * All date arithmetic lives in src/lib/heatmap.js, and the end day arrives as
 * a prop rather than being read off the clock here, so this component is a
 * plain function of its inputs and the server never renders a dated grid.
 */

import React, { useMemo } from 'react';
import {
  MAX_LEVEL,
  WEEKDAY_INITIALS,
  buildHeatmap,
  describeDay,
} from '@site/src/lib/heatmap';
import styles from './styles.module.css';

const WEEKS = 26;

export default function ProgressHeatmap({ activity, endDay, weeks = WEEKS }) {
  const grid = useMemo(
    () => buildHeatmap(activity, endDay, weeks),
    [activity, endDay, weeks]
  );

  if (!grid.columns.length) {
    return <div className={styles.placeholder} aria-hidden="true" />;
  }

  const label =
    grid.totalCompleted > 0
      ? `Activity heatmap: ${grid.totalCompleted} pages completed across ` +
        `${grid.days} day${grid.days === 1 ? '' : 's'} in the last ` +
        `${weeks} weeks.`
      : `Activity heatmap: nothing completed yet in the last ${weeks} weeks.`;

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.scroll}
        style={{ '--heatmap-weeks': weeks }}
        role="img"
        aria-label={label}>
        <div className={styles.months} aria-hidden="true">
          {grid.months.map((month) => (
            <span
              key={`${month.label}-${month.column}`}
              className={styles.month}
              style={{ gridColumnStart: month.column + 1 }}>
              {month.label}
            </span>
          ))}
        </div>

        <div className={styles.body}>
          <div className={styles.weekdays} aria-hidden="true">
            {WEEKDAY_INITIALS.map((initial, row) => (
              <span key={row} className={styles.weekday}>
                {/* Monday, Wednesday and Friday only, or the column is a mess */}
                {row % 2 === 1 ? initial : ''}
              </span>
            ))}
          </div>

          <div className={styles.grid} aria-hidden="true">
            {grid.columns.map((column, index) => (
              <div key={index} className={styles.week}>
                {column.map((cell) => (
                  <span
                    key={cell.day}
                    className={styles.cell}
                    data-level={cell.level}
                    data-future={cell.future ? 'true' : 'false'}
                    title={cell.future ? undefined : describeDay(cell)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendLabel}>Less</span>
        {Array.from({ length: MAX_LEVEL + 1 }, (_, level) => (
          <span key={level} className={styles.cell} data-level={level} />
        ))}
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  );
}
