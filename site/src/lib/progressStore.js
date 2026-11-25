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
const CURRENT_VERSION = 2;

/**
 * How many visits the history keeps.
 *
 * It has to be capped: this blob is written to localStorage on every flush
 * and uploaded on every sync, and an uncapped visit log grows without end.
 * Two hundred is a few weeks of ordinary use and costs about 25KB.
 */
export const HISTORY_LIMIT = 200;

/** A fresh visit to the page already at the top is a reread, not a new row. */
const REVISIT_WINDOW_MS = 30 * 60 * 1000;

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
    /** manifest group key -> seconds read in that section */
    sections: {},
    /** visits, newest first: { id, url, title, group, at } */
    history: [],
    /** what the reader calls themselves, and their picture */
    profile: emptyProfile(),
  };
}

export function emptyProfile() {
  return { name: '', avatar: '', updatedAt: '' };
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

  // Everything below arrived in version 2. A version 1 blob simply has none
  // of it, which is why each of these is built from whatever is there rather
  // than demanded.
  if (raw.sections && typeof raw.sections === 'object') {
    for (const [group, seconds] of Object.entries(raw.sections)) {
      const amount = Number(seconds);
      if (typeof group === 'string' && group && Number.isFinite(amount) && amount > 0) {
        store.sections[group] = Math.floor(amount);
      }
    }
  }

  if (Array.isArray(raw.history)) {
    const seen = new Set();
    for (const visit of raw.history) {
      if (!visit || typeof visit !== 'object') continue;
      const id = typeof visit.id === 'string' ? visit.id : '';
      const at = typeof visit.at === 'string' ? visit.at : '';
      if (!id || !at || Number.isNaN(Date.parse(at))) continue;
      const key = `${id}|${at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      store.history.push({
        id,
        at,
        url: typeof visit.url === 'string' ? visit.url : '',
        title: typeof visit.title === 'string' ? visit.title : id,
        group: typeof visit.group === 'string' ? visit.group : '',
      });
    }
    store.history.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    store.history = store.history.slice(0, HISTORY_LIMIT);
  }

  if (raw.profile && typeof raw.profile === 'object') {
    store.profile = {
      name: typeof raw.profile.name === 'string' ? raw.profile.name.slice(0, 40) : '',
      avatar: typeof raw.profile.avatar === 'string' ? raw.profile.avatar : '',
      updatedAt:
        typeof raw.profile.updatedAt === 'string' ? raw.profile.updatedAt : '',
    };
  }

  return store;
}

/**
 * Everything except the field being changed, so each mutation can return a
 * new store without listing the parts it does not touch and quietly dropping
 * one the next time a field is added.
 */
function carry(store) {
  const base = migrate(store);
  return {
    version: CURRENT_VERSION,
    completed: { ...base.completed },
    activity: { ...base.activity },
    sections: { ...base.sections },
    history: base.history.slice(),
    profile: { ...base.profile },
  };
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
  const next = carry(store);
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
export function addSeconds(store, seconds, now = new Date(), group = '') {
  const amount = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!amount) return store;

  const day = today(now);
  const entry = store?.activity?.[day] || { completed: 0, seconds: 0 };
  const capped = Math.min(MAX_SECONDS_PER_DAY, (entry.seconds || 0) + amount);
  if (capped === entry.seconds) return store;

  const next = carry(store);
  next.activity[day] = { ...entry, seconds: capped };

  // The section gets only what the day actually accepted, so a day that hits
  // the cap cannot hand a section more time than the day itself recorded.
  if (group) {
    const added = capped - (entry.seconds || 0);
    next.sections[group] = (next.sections[group] || 0) + added;
  }

  return next;
}

/**
 * Records that a page was opened.
 *
 * Opening the same page again within half an hour moves the existing row
 * rather than adding another: flicking back and forth between two pages
 * should not bury the rest of the afternoon.
 */
export function recordVisit(store, visit, now = new Date()) {
  if (!visit || !visit.id) return store;

  const next = carry(store);
  const at = now.toISOString();
  const head = next.history[0];

  if (head && head.id === visit.id) {
    const since = now.getTime() - Date.parse(head.at);
    if (Number.isFinite(since) && since < REVISIT_WINDOW_MS) {
      next.history[0] = { ...head, ...visit, at };
      return next;
    }
  }

  next.history.unshift({
    id: visit.id,
    url: visit.url || '',
    title: visit.title || visit.id,
    group: visit.group || '',
    at,
  });
  next.history = next.history.slice(0, HISTORY_LIMIT);
  return next;
}

/** Name and picture. An empty patch value clears that field. */
export function setProfile(store, patch, now = new Date()) {
  const next = carry(store);
  next.profile = {
    name:
      patch.name === undefined
        ? next.profile.name
        : String(patch.name).slice(0, 40),
    avatar: patch.avatar === undefined ? next.profile.avatar : patch.avatar || '',
    updatedAt: now.toISOString(),
  };
  return next;
}

/** Seconds read across a set of manifest groups. */
export function sectionSeconds(store, groups = []) {
  const sections = store?.sections || {};
  let total = 0;
  for (const group of groups) total += Number(sections[group]) || 0;
  return total;
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
 * day backwards for anybody west of UTC, which would put yesterday evening's
 * reading in the wrong square of the heatmap. */
export function fromDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
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
 * Active days and recorded time.
 *
 * Streaks used to live here and have been taken out on purpose. A streak
 * turns a missed day into a loss, and somebody who skips a weekend should
 * come back to a site that is glad to see them rather than one holding up
 * what they broke.
 */
export function activityStats(store) {
  const days = activeDayKeys(store);
  const totalSeconds = Object.values(store?.activity || {}).reduce(
    (sum, entry) => sum + (Number(entry?.seconds) || 0),
    0
  );

  return {
    activeDays: days.length,
    totalSeconds,
    firstDay: days.length ? days[days.length - 1] : null,
    lastDay: days.length ? days[0] : null,
  };
}

export const __internal = { STORAGE_KEY, CURRENT_VERSION };
