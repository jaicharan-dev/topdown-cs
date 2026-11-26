/**
 * "I am just reading."
 *
 * Signing out and choosing to browse as a guest end in the same place: no
 * session, nothing recorded. The difference is what the site does about it.
 * Somebody who signed out may have done it by accident or be about to sign
 * in as somebody else, so the tick at the foot of a page still offers an
 * account. Somebody who deliberately picked guest mode has answered that
 * question and should not be asked again.
 *
 * Kept out of the progress store on purpose: it is a preference about this
 * browser, not progress, and it has to survive the store being emptied.
 */

const KEY = 'topdowncs:guest';

/** Storage can throw outright in a private window, so every call is guarded. */
function read() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch (err) {
    return false;
  }
}

export function isGuest() {
  return read();
}

export function setGuest(on) {
  if (typeof window === 'undefined') return;
  try {
    if (on) window.localStorage.setItem(KEY, '1');
    else window.localStorage.removeItem(KEY);
  } catch (err) {
    // A browser that will not remember the preference simply asks again,
    // which is the harmless direction to fail in.
  }
  // localStorage does not fire `storage` in the tab that wrote it, so the
  // components watching this need telling by hand.
  window.dispatchEvent(new Event(GUEST_EVENT));
}

export const GUEST_EVENT = 'topdowncs:guest-changed';
