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

export const __internal = { STORAGE_KEY, CURRENT_VERSION };
