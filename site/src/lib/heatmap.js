/**
 * Lays out the activity heatmap: a GitHub-style grid of weeks.
 *
 * Pure on purpose, and takes the end day as an argument rather than calling
 * `new Date()` itself. A component that reads the clock while rendering is a
 * hydration bug waiting to happen on a prerendered site: the server stamps the
 * grid with the build date and the browser stamps it with today's, and React
 * finds two different trees. The caller passes the day once it is in the
 * browser, so the server never renders a dated grid at all.
 *
 * Weeks run Sunday to Saturday, matching the calendar most users picture.
 */

import { fromDay, today } from './progressStore';
import { formatDuration } from './timeTracker';

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * How dark a square is. Thresholds are page counts, chosen so that a normal
 * day of study lands mid scale rather than instantly maxing it out: finishing
 * one page should look different from finishing eight.
 */
export function levelFor(completed) {
  if (!completed) return 0;
  if (completed <= 1) return 1;
  if (completed <= 3) return 2;
  if (completed <= 6) return 3;
  return 4;
}

export const MAX_LEVEL = 4;

/**
 * Minimum columns between two month labels. A label is roughly three columns
 * wide, so labelling two months that start a fortnight apart renders them on
 * top of each other ("MayJun"). The month is simply left unlabelled; the
 * squares still carry the exact date in their tooltip.
 */
const MIN_LABEL_GAP = 3;

/**
 * @param activity the store's `activity` map
 * @param endDay   'YYYY-MM-DD', the last day shown (normally today)
 * @param weeks    how many week columns to draw
 */
export function buildHeatmap(activity = {}, endDay, weeks = 26) {
  if (!endDay) return { columns: [], months: [], totalCompleted: 0, days: 0 };

  const end = fromDay(endDay);

  // walk back to the Sunday of the end day's week, then back again to the
  // first column, so the grid always ends with a complete current week
  const gridStart = fromDay(endDay);
  gridStart.setDate(gridStart.getDate() - end.getDay() - (weeks - 1) * 7);

  const columns = [];
  const months = [];
  let totalCompleted = 0;
  let days = 0;
  let lastMonth = null;

  const cursor = new Date(gridStart);
  for (let week = 0; week < weeks; week += 1) {
    const column = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = today(cursor);
      const future = cursor > end;
      const entry = future ? null : activity[day];
      const completed = Number(entry?.completed) || 0;
      const seconds = Number(entry?.seconds) || 0;

      if (!future) {
        totalCompleted += completed;
        if (completed > 0 || seconds > 0) days += 1;
      }

      column.push({
        day,
        future,
        completed,
        seconds,
        level: future ? 0 : levelFor(completed),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // label a column when its month differs from the one before it, and
    // there is room for the label to sit without colliding
    const month = fromDay(column[0].day).getMonth();
    if (month !== lastMonth) {
      const previous = months[months.length - 1];
      if (!previous || week - previous.column >= MIN_LABEL_GAP) {
        months.push({ column: week, label: MONTH_NAMES[month] });
      }
      lastMonth = month;
    }

    columns.push(column);
  }

  return { columns, months, totalCompleted, days };
}

/**
 * A square's tooltip: "3 pages, 45m on 14 Mar".
 *
 * Time is only mentioned when there is some, so a day spent reading without
 * ticking anything still reads as a day of work rather than an empty one.
 */
export function describeDay(cell) {
  const date = fromDay(cell.day);
  const when = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;

  const parts = [];
  if (cell.completed) {
    parts.push(`${cell.completed} page${cell.completed === 1 ? '' : 's'}`);
  }
  if (cell.seconds) parts.push(formatDuration(cell.seconds));

  if (!parts.length) return `Nothing on ${when}`;
  return `${parts.join(', ')} on ${when}`;
}
