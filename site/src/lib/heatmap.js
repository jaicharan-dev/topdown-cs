/**
 * Lays out the activity heatmap: twelve months as a horizontal strip.
 *
 * Pure on purpose, and takes the end day as an argument rather than calling
 * `new Date()` itself. A component that reads the clock while rendering is a
 * hydration bug waiting to happen on a prerendered site: the server stamps the
 * grid with the build date and the browser stamps it with today's, and React
 * finds two different trees. The caller passes the day once it is in the
 * browser, so the server never renders a dated grid at all.
 *
 * Weeks run Sunday to Saturday, matching the calendar most users picture.
 *
 * There used to be a second builder here that drew one unbroken run of week
 * columns and labelled whichever months had room. The year strip replaced it
 * and it had no readers left, so it is gone rather than kept warm.
 */

import { fromDay, today } from './progressStore';
import { formatDuration } from './timeTracker';

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


/**
 * The year strip: twelve months, each its own block of weeks.
 *
 * The old grid was one unbroken run of columns with a label wherever there
 * was room for one, which meant the months it did label were approximate and
 * the ones it did not were invisible. Splitting on the month makes every
 * boundary exact and every label honest, at the cost of a ragged bottom row
 * where a month does not finish on a Saturday.
 *
 * Twelve months ending with the one the end day falls in, so today is always
 * the last square drawn rather than somewhere in the middle.
 *
 * Cells are null where a column runs off the start or end of its month. The
 * caller renders those as a gap, not as an empty day: a square for 31 June
 * would be a lie and a square for next Tuesday would be a promise.
 */
export function buildYearHeatmap(activity = {}, endDay, monthCount = 12) {
  if (!endDay) return { months: [], totalCompleted: 0, totalSeconds: 0, days: 0 };

  const end = fromDay(endDay);
  const months = [];
  let totalCompleted = 0;
  let totalSeconds = 0;
  let days = 0;

  const first = new Date(end.getFullYear(), end.getMonth() - (monthCount - 1), 1);

  for (let index = 0; index < monthCount; index += 1) {
    const monthStart = new Date(first.getFullYear(), first.getMonth() + index, 1);
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const length = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let column = new Array(7).fill(null);

    for (let date = 1; date <= length; date += 1) {
      const current = new Date(year, month, date);
      const weekday = current.getDay();
      const day = today(current);
      const future = current > end;
      const entry = future ? null : activity[day];
      const completed = Number(entry?.completed) || 0;
      const seconds = Number(entry?.seconds) || 0;

      if (!future) {
        totalCompleted += completed;
        totalSeconds += seconds;
        if (completed > 0 || seconds > 0) days += 1;
      }

      column[weekday] = {
        day,
        future,
        completed,
        seconds,
        level: future ? 0 : levelFor(completed),
      };

      if (weekday === 6 || date === length) {
        weeks.push(column);
        column = new Array(7).fill(null);
      }
    }

    months.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: MONTH_NAMES[month],
      year,
      // The run of months this year owns, so the strip can label the year
      // once above them rather than bolting it onto a month name.
      startsYear: index === 0 || month === 0,
      weeks,
    });
  }

  return { months, totalCompleted, totalSeconds, days };
}
