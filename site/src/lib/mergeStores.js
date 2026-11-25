/**
 * Merges two progress stores.
 *
 * This is the one piece of Phase 2 that can destroy something a user cannot
 * get back, so it is built around two properties rather than around a
 * convenient implementation:
 *
 *   commutative  merge(a, b) equals merge(b, a)
 *   idempotent   merge(merge(a, b), b) equals merge(a, b)
 *
 * Sync runs on every sign in, on every device, in whatever order people
 * happen to open their laptops. Those two properties are what make that
 * safe. Anything resembling "last write wins" on the whole blob would let a
 * phone that has been in a drawer for a month wipe a month of work.
 *
 * A completion is never removed by a merge. If it exists on either side it
 * exists in the result, which means un-completing a page on one device does
 * not propagate. That is the deliberate trade: silently resurrecting a tick
 * is a shrug, and silently destroying a hundred is not.
 */

import { HISTORY_LIMIT, migrate, today } from './progressStore';

const CURRENT_VERSION = 2;

/**
 * Rebuilds an object with its keys in sorted order.
 *
 * Without this the merge is commutative in content but not in serialisation:
 * `{...a, ...b}` and `{...b, ...a}` hold the same entries in a different
 * insertion order, and JSON.stringify reports them as different. That would
 * make `differs` fire on every sync and upload an identical blob forever.
 */
function canonical(obj) {
  const out = {};
  for (const key of Object.keys(obj).sort()) out[key] = obj[key];
  return out;
}

/** Milliseconds since epoch, or null if the value is not a usable date. */
function timeOf(value) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** The earlier of two timestamps: when the page was FIRST finished. */
function earliest(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ta = timeOf(a);
  const tb = timeOf(b);
  if (ta === null) return b;
  if (tb === null) return a;
  return ta <= tb ? a : b;
}

export function mergeStores(a, b) {
  const left = migrate(a);
  const right = migrate(b);

  // Completions: union, keeping the earliest timestamp for anything on both
  // sides. Earliest rather than latest because the timestamp means "when you
  // finished this", and that does not change by syncing.
  const completed = { ...left.completed };
  for (const [id, at] of Object.entries(right.completed)) {
    completed[id] = earliest(completed[id], at);
  }

  const activity = {};

  // Seconds: the larger of the two, never the sum. Summing is not idempotent,
  // so syncing twice would double somebody's reading time, and syncing in a
  // loop would inflate it without limit. The cost is that studying on two
  // devices on the same day reports the larger session rather than the total,
  // which undercounts. That is the same direction the tracker already errs in.
  for (const [day, entry] of Object.entries(left.activity)) {
    activity[day] = { completed: 0, seconds: entry.seconds || 0 };
  }
  for (const [day, entry] of Object.entries(right.activity)) {
    const existing = activity[day];
    activity[day] = {
      completed: 0,
      seconds: Math.max(existing ? existing.seconds : 0, entry.seconds || 0),
    };
  }

  // Daily completion counts are DERIVED from the merged timestamps rather
  // than added up from both sides. Adding them would double count every page
  // present on both devices. Deriving them is idempotent by construction, and
  // it quietly repairs any drift in a store that was damaged earlier.
  for (const at of Object.values(completed)) {
    if (timeOf(at) === null) continue;
    const day = today(new Date(at));
    if (!activity[day]) activity[day] = { completed: 0, seconds: 0 };
    activity[day].completed += 1;
  }

  // Drop days that ended up holding nothing, so repeated merges cannot grow
  // the blob with empty entries.
  for (const [day, entry] of Object.entries(activity)) {
    if (!entry.completed && !entry.seconds) delete activity[day];
  }

  // Section time: the larger of the two, for the same reason as the daily
  // seconds. Summing is not idempotent and syncing twice would double it.
  const sections = {};
  for (const [group, seconds] of Object.entries(left.sections)) {
    sections[group] = seconds;
  }
  for (const [group, seconds] of Object.entries(right.sections)) {
    sections[group] = Math.max(sections[group] || 0, seconds);
  }

  // History: the union, keyed on the page and the moment it was opened, so
  // the same visit arriving from both sides stays one row. Newest first and
  // cut to the limit, which is deterministic and therefore still commutative:
  // both devices cut the same union at the same place.
  const visits = new Map();
  for (const visit of [...left.history, ...right.history]) {
    visits.set(`${visit.id}|${visit.at}`, visit);
  }
  const history = [...visits.values()]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, HISTORY_LIMIT);

  // Profile: whichever was edited later. Ties go to the larger serialisation
  // rather than to a side, because "whichever I was handed first" would not
  // be commutative and the two devices would disagree forever.
  const profile = pickProfile(left.profile, right.profile);

  return {
    version: CURRENT_VERSION,
    completed: canonical(completed),
    activity: canonical(activity),
    sections: canonical(sections),
    history,
    profile,
  };
}

function pickProfile(a, b) {
  const ta = timeOf(a.updatedAt) ?? -1;
  const tb = timeOf(b.updatedAt) ?? -1;
  if (ta !== tb) return ta > tb ? { ...a } : { ...b };
  const sa = JSON.stringify(canonical(a));
  const sb = JSON.stringify(canonical(b));
  return sa >= sb ? { ...a } : { ...b };
}

/**
 * Whether a merge would change what is already stored remotely, so an
 * unchanged session does not write on every page load.
 */
export function differs(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
