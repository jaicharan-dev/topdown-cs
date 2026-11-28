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
const CURRENT_VERSION = 3;

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
    /**
     * pageId -> { checkpointId: ISO timestamp it was ticked }
     *
     * Long pages are read over several sittings, and one button at the foot
     * of nine thousand words could say nothing about the four that had been
     * read already. A checkpoint is a resting point the author placed, so
     * progress has somewhere to be between "opened" and "finished".
     *
     * The page's own entry in `completed` is still written, by the tick that
     * completes the last checkpoint, so points, ranks and the heatmap carry
     * on reading one field and needed no changes.
     */
    checkpoints: {},
    /** visits, newest first: { id, url, title, group, at } */
    history: [],
    /** what the reader calls themselves, and their picture */
    profile: emptyProfile(),
  };
}

export function emptyProfile() {
  return {
    name: '',
    /** Lowercase handle. Optional, and the only field with a format. */
    username: '',
    bio: '',
    location: '',
    website: '',
    github: '',
    linkedin: '',
    x: '',
    avatar: '',
    /** Assigned once, in the browser, so there is a name before there is one. */
    reader: '',
    updatedAt: '',
  };
}

/** The named links, in the order the profile shows them. */
export const PROFILE_LINKS = [
  { key: 'website', label: 'Website', placeholder: 'https://yoursite.com' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/you' },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/you',
  },
  { key: 'x', label: 'X', placeholder: 'https://x.com/you' },
];

/** 3 to 20 characters, lowercase letters, digits, underscore, hyphen. */
export const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

/**
 * Why a username is not acceptable, or '' when it is.
 *
 * Empty is acceptable: none of this is required. What is checked here is
 * shape, not availability. Availability needs a table everyone can read and a
 * unique index, which is a server change rather than a client one, so the
 * honest thing is to validate what can be validated here and not pretend.
 */
export function checkUsername(value) {
  const name = String(value || '').trim();
  if (!name) return '';
  if (name.length < 3) return 'At least 3 characters.';
  if (name.length > 20) return 'At most 20 characters.';
  if (!USERNAME_PATTERN.test(name)) {
    return 'Lowercase letters, numbers, underscore and hyphen only.';
  }
  return '';
}

/**
 * A number for somebody who has not signed in.
 *
 * Random rather than a counter, because a counter would need a server and
 * would also tell every reader how many came before them, which is a number
 * a young site should not be volunteering.
 */
export function makeReaderNumber() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

/**
 * Hands out a reader number if there is not one yet.
 *
 * Returns the SAME store when nothing changed, so a caller can write the
 * result unconditionally without causing a render on every load.
 */
export function ensureReaderNumber(store, now = new Date()) {
  if (store?.profile?.reader) return store;
  const next = carry(store);
  next.profile = { ...next.profile, reader: makeReaderNumber() };
  // Deliberately not touching updatedAt: this is not an edit the reader made,
  // and letting it win a merge would overwrite a real profile from elsewhere
  // with an empty one that happens to have a number.
  return next;
}

/** What to call somebody, in the order they would want to be called it. */
export function displayNameFor(profile, user) {
  if (profile?.name) return profile.name;
  if (profile?.username) return profile.username;
  const meta = user?.user_metadata || {};
  if (meta.full_name) return meta.full_name;
  if (meta.name) return meta.name;
  if (user?.email) return user.email;
  return profile?.reader ? `Reader #${profile.reader}` : 'Reader';
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

  // Version 3. Same shape of guard as the rest: a store written before
  // checkpoints existed simply has none, and a malformed one contributes
  // whatever parts of it are well formed.
  if (raw.checkpoints && typeof raw.checkpoints === 'object') {
    for (const [pageId, marks] of Object.entries(raw.checkpoints)) {
      if (typeof pageId !== 'string' || !pageId) continue;
      if (!marks || typeof marks !== 'object') continue;
      const kept = {};
      for (const [ckId, at] of Object.entries(marks)) {
        if (typeof ckId !== 'string' || !ckId) continue;
        kept[ckId] = typeof at === 'string' ? at : new Date().toISOString();
      }
      if (Object.keys(kept).length) store.checkpoints[pageId] = kept;
    }
  }

  if (raw.profile && typeof raw.profile === 'object') {
    const text = (value, max) =>
      typeof value === 'string' ? value.slice(0, max) : '';
    store.profile = {
      name: text(raw.profile.name, 40),
      username: text(raw.profile.username, 20).toLowerCase(),
      bio: text(raw.profile.bio, 280),
      location: text(raw.profile.location, 60),
      website: text(raw.profile.website, 200),
      github: text(raw.profile.github, 200),
      linkedin: text(raw.profile.linkedin, 200),
      x: text(raw.profile.x, 200),
      avatar: typeof raw.profile.avatar === 'string' ? raw.profile.avatar : '',
      reader: text(raw.profile.reader, 12),
      updatedAt: text(raw.profile.updatedAt, 40),
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
    checkpoints: Object.fromEntries(
      Object.entries(base.checkpoints).map(([page, marks]) => [
        page,
        { ...marks },
      ])
    ),
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
  const take = (key, max, transform) => {
    if (patch[key] === undefined) return next.profile[key];
    const value = String(patch[key]).slice(0, max);
    return transform ? transform(value) : value;
  };
  next.profile = {
    name: take('name', 40),
    username: take('username', 20, (v) => v.trim().toLowerCase()),
    bio: take('bio', 280),
    location: take('location', 60),
    website: take('website', 200),
    github: take('github', 200),
    linkedin: take('linkedin', 200),
    x: take('x', 200),
    avatar: patch.avatar === undefined ? next.profile.avatar : patch.avatar || '',
    reader: take('reader', 12),
    updatedAt: now.toISOString(),
  };
  return next;
}

/**
 * Completed pages split by difficulty, for the ring on the homepage.
 *
 * Counted from the pages themselves rather than from a stored tally: a tally
 * would be a second source of truth for something already recorded, and the
 * two would drift the first time a page changed difficulty.
 */
export function difficultyBreakdown(store, manifest) {
  const done = store?.completed || {};
  const out = {};
  for (const [key, total] of Object.entries(manifest.difficulties || {})) {
    out[key] = { done: 0, total };
  }
  for (const page of manifest.pages) {
    if (!done[page.id]) continue;
    const bucket = out[page.difficulty];
    if (bucket) bucket.done += 1;
  }
  return out;
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

/* ------------------------------------------------------------------ *
 * Checkpoints
 *
 * A checkpoint belongs to a page and is identified by a short slug the
 * author writes into the page. The pair (pageId, checkpointId) is the key,
 * so two pages may use the same slug without colliding and a checkpoint
 * cannot outlive the page that declared it.
 * ------------------------------------------------------------------ */

/** The ticks on one page, as a plain object. Never null. */
export function checkpointsFor(store, contentId) {
  const marks = store?.checkpoints?.[contentId];
  return marks && typeof marks === 'object' ? marks : {};
}

export function isCheckpointDone(store, contentId, checkpointId) {
  return Boolean(checkpointsFor(store, contentId)[checkpointId]);
}

/** How many of this page's checkpoints are ticked. */
export function checkpointCount(store, contentId) {
  return Object.keys(checkpointsFor(store, contentId)).length;
}

/**
 * Tick or untick one checkpoint, and keep the page's own completion in step.
 *
 * `total` is how many checkpoints the page declares, which comes from the
 * manifest: the store has no way to know, and without it the last tick could
 * not tell that it was the last. Passing 0 leaves completion alone, which is
 * what a caller that does not know should do rather than guess.
 *
 * Completing the last one marks the page complete, and unticking any one
 * marks it incomplete again, so the two can never disagree in this browser.
 * They can disagree after a merge, where two devices hold different halves
 * of the same page; summarise() closes that gap when it counts.
 */
export function setCheckpoint(
  store,
  contentId,
  checkpointId,
  done,
  { total = 0, now = new Date() } = {}
) {
  if (!contentId || !checkpointId) return store;

  const next = carry(store);
  const marks = { ...checkpointsFor(next, contentId) };

  if (done) marks[checkpointId] = now.toISOString();
  else delete marks[checkpointId];

  if (Object.keys(marks).length) next.checkpoints[contentId] = marks;
  else delete next.checkpoints[contentId];

  if (!total) return next;

  // setComplete carries the store again, which is one more copy than this
  // strictly needs. It is also the only place that knows how to keep the
  // day's completion tally straight, and duplicating that here is how the
  // two would drift.
  const all = Object.keys(marks).length >= total;
  if (all !== Boolean(next.completed[contentId])) {
    return setComplete(next, contentId, all, now);
  }
  return next;
}

export function toggleCheckpoint(store, contentId, checkpointId, options = {}) {
  return setCheckpoint(
    store,
    contentId,
    checkpointId,
    !isCheckpointDone(store, contentId, checkpointId),
    options
  );
}

/**
 * Completion counts for the whole site and per group, weighted by difficulty.
 * `manifest` is src/data/contentManifest.json.
 */
export function summarise(store, manifest) {
  const done = store?.completed || {};
  const marks = store?.checkpoints || {};
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
    const total = page.checkpoints ? page.checkpoints.length : 0;

    // A checkpointed page scores as it is read rather than all at once. A
    // nine thousand word design worked through to its third break has four
    // fifths of the reading behind it, and a page count that says 0 is the
    // reason the ranks were wrong about this section in the first place.
    const ticked = total
      ? Math.min(total, Object.keys(marks[page.id] || {}).length)
      : 0;

    // Complete if the page says so, or if every checkpoint is ticked. The
    // second case is the one that cannot happen in a single browser, where
    // the last tick writes the completion itself; it happens after a merge,
    // where two devices held different halves of the same page.
    const finished = Boolean(done[page.id]) || (total > 0 && ticked >= total);
    const points = total ? ticked : finished ? page.points : 0;

    if (!finished && !points) continue;

    if (finished) completedPages += 1;
    completedPoints += finished && !total ? page.points : points;

    const g = groups[page.group];
    if (g) {
      if (finished) g.completedPages += 1;
      g.completedPoints += finished && !total ? page.points : points;
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
