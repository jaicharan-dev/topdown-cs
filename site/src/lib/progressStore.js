/**
 * The progress store: one versioned blob in localStorage.
 *
 * Deliberately framework-free. Phase 2 will sync this object to a backend,
 * and that sync code should not have to care about React. Everything here is
 * a pure function over a plain object except readStore/writeStore.
 *
 * Every accessor is defensive. localStorage throws rather than returning null
 * in a private window, with site data blocked, or inside some embedded
 * browsers, and a study site has no business breaking because of that. On any
 * failure we fall back to an in-memory store: the page still works, the tick
 * just does not survive a reload.
 */

import { MAX_SECONDS_PER_DAY } from './timeTracker';

const STORAGE_KEY = 'topdowncs:progress';
const CURRENT_VERSION = 1;

/** Local calendar day, not UTC: a heatmap should match the user's own date. */
export function today(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyStore() {
  return {
    version: CURRENT_VERSION,
    /** contentId -> ISO timestamp it was marked complete */
    completed: {},
    /** 'YYYY-MM-DD' -> { completed: n, seconds: n } */
    activity: {},
  };
}

/**
 * Bring an older or malformed blob up to the current shape. Returns a valid
 * store for any input, including garbage, so callers never have to branch.
 */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return emptyStore();

  const store = emptyStore();

  if (raw.completed && typeof raw.completed === 'object') {
    for (const [id, at] of Object.entries(raw.completed)) {
      if (typeof id === 'string' && id) {
        store.completed[id] = typeof at === 'string' ? at : new Date().toISOString();
      }
    }
  }

  if (raw.activity && typeof raw.activity === 'object') {
    for (const [day, entry] of Object.entries(raw.activity)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      store.activity[day] = {
        completed: Number(entry?.completed) || 0,
        seconds: Number(entry?.seconds) || 0,
      };
    }
  }

  return store;
}

/**
 * Set only when a real write FAILED, never alongside a successful one. If it
 * shadowed working storage, clearing site data in another tab would fire the
 * storage event, we would read an empty localStorage, and the progress the
 * user just cleared would come straight back from memory.
 */
let memoryFallback = null;

export function readStore() {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryFallback ? migrate(memoryFallback) : emptyStore();
    return migrate(JSON.parse(raw));
  } catch (err) {
    // blocked, full, private mode, or corrupt JSON
    return memoryFallback ? migrate(memoryFallback) : emptyStore();
  }
}

/**
 * Same-tab subscribers. The `storage` event deliberately does not fire in the
 * tab that caused the write, so without this a dashboard left open would sit
 * there showing stale minutes while the tracker flushed behind it.
 */
const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function writeStore(store) {
  if (typeof window === 'undefined') {
    memoryFallback = store;
    return store;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    memoryFallback = null;
  } catch (err) {
    // quota or blocked: keep going with the in-memory copy
    memoryFallback = store;
  }
  // One broken subscriber must not stop the others, and must never take down
  // the write that triggered it: a crash here would mean clicking "mark as
  // complete" silently failing.
  for (const listener of listeners) {
    try {
      listener(store);
    } catch (err) {
      // a subscriber's problem, not the store's
    }
  }
  return store;
}

export function isComplete(store, contentId) {
  return Boolean(store?.completed?.[contentId]);
}

/** Returns a NEW store; never mutates the one passed in. */
export function setComplete(store, contentId, complete, now = new Date()) {
  const next = {
    version: CURRENT_VERSION,
    completed: { ...store.completed },
    activity: { ...store.activity },
  };
  const day = today(now);
  const wasComplete = Boolean(next.completed[contentId]);

  if (complete && !wasComplete) {
    next.completed[contentId] = now.toISOString();
    const entry = next.activity[day] || { completed: 0, seconds: 0 };
    next.activity[day] = { ...entry, completed: entry.completed + 1 };
  } else if (!complete && wasComplete) {
    delete next.completed[contentId];
    const entry = next.activity[day];
    if (entry && entry.completed > 0) {
      // only undo today's own tally; yesterday's history is not rewritten
      next.activity[day] = { ...entry, completed: entry.completed - 1 };
    }
  }

  return next;
}

/**
 * Adds recorded reading time to today's tally.
 *
 * Returns the SAME object when there is nothing to add, so a flush of zero
 * seconds does not re-render every subscriber. The daily cap is enforced here
 * rather than in the tracker because this is the only place that knows what
 * the day already holds.
 */
export function addSeconds(store, seconds, now = new Date()) {
  const amount = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!amount) return store;

  const day = today(now);
  const entry = store?.activity?.[day] || { completed: 0, seconds: 0 };
  const capped = Math.min(MAX_SECONDS_PER_DAY, (entry.seconds || 0) + amount);
  if (capped === entry.seconds) return store;

  return {
    version: CURRENT_VERSION,
    completed: { ...store.completed },
    activity: { ...store.activity, [day]: { ...entry, seconds: capped } },
  };
}

export function toggleComplete(store, contentId, now = new Date()) {
  return setComplete(store, contentId, !isComplete(store, contentId), now);
}

/**
 * Completion counts for the whole site and per group, weighted by difficulty.
 * `manifest` is src/data/contentManifest.json.
 */
export function summarise(store, manifest) {
  const done = store?.completed || {};
  const groups = {};

  for (const [key, group] of Object.entries(manifest.groups)) {
    groups[key] = {
      label: group.label,
      pages: group.pages,
      points: group.points,
      completedPages: 0,
      completedPoints: 0,
    };
  }

  let completedPages = 0;
  let completedPoints = 0;

  for (const page of manifest.pages) {
    if (!done[page.id]) continue;
    completedPages += 1;
    completedPoints += page.points;
    const g = groups[page.group];
    if (g) {
      g.completedPages += 1;
      g.completedPoints += page.points;
    }
  }

  return {
    completedPages,
    totalPages: manifest.totalPages,
    completedPoints,
    totalPoints: manifest.totalPoints,
    percent: manifest.totalPages
      ? Math.round((completedPages / manifest.totalPages) * 100)
      : 0,
    groups,
  };
}

/** 'YYYY-MM-DD' -> a Date in LOCAL time. Parsing it as ISO would shift the
 * day backwards for anybody west of UTC, which is exactly the sort of bug that
 * silently breaks a streak overnight. */
export function fromDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function shiftDay(day, delta) {
  const date = fromDay(day);
  date.setDate(date.getDate() + delta);
  return today(date);
}

/** Days that saw at least one page completed, most recent first. */
function activeDayKeys(store) {
  return Object.entries(store?.activity || {})
    .filter(([, entry]) => (entry?.completed || 0) > 0 || (entry?.seconds || 0) > 0)
    .map(([day]) => day)
    .sort()
    .reverse();
}

/**
 * Active days, streaks and recorded time.
 *
 * A streak does not break until a day has fully passed: if there is activity
 * yesterday but none yet today, the streak is still running. Counting from
 * today alone would show every returning user a broken streak every morning.
 */
export function activityStats(store, now = new Date()) {
  const days = activeDayKeys(store);
  const active = new Set(days);
  const totalSeconds = Object.values(store?.activity || {}).reduce(
    (sum, entry) => sum + (Number(entry?.seconds) || 0),
    0
  );

  let currentStreak = 0;
  let cursor = today(now);
  if (!active.has(cursor)) cursor = shiftDay(cursor, -1);
  while (active.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDay(cursor, -1);
  }

  let longestStreak = 0;
  let run = 0;
  let previous = null;
  for (const day of [...days].reverse()) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    previous = day;
  }

  return {
    activeDays: days.length,
    currentStreak,
    longestStreak,
    totalSeconds,
    firstDay: days.length ? days[days.length - 1] : null,
    lastDay: days.length ? days[0] : null,
  };
}

export const __internal = { STORAGE_KEY, CURRENT_VERSION };
