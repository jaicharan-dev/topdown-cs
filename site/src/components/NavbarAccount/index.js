/**
 * The account control in the navbar.
 *
 * Opens on hover, like every other control in this row. It used to need a
 * click, which meant somebody looking for the way out of their account had
 * to guess that the picture was a button at all.
 *
 * Hover alone has no keyboard and no touch screen, so the panel also opens on
 * focus within the control, and a tap pins it open until the next tap
 * elsewhere.
 *
 * Signed out it is a Sign in button rather than an empty avatar: a circle
 * with a question mark in it is the site admitting it does not know who you
 * are, which is both unfriendly and useless.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import useProgress from '@site/src/hooks/useProgress';
import useCloudSync from '@site/src/hooks/useCloudSync';
import useSession from '@site/src/hooks/useSession';
import { initialsFor } from '@site/src/lib/avatar';
import { setGuest } from '@site/src/lib/guest';
import { displayNameFor } from '@site/src/lib/progressStore';
import GoogleMark from '@site/src/components/GoogleMark';
import styles from './styles.module.css';

/** The picture Google gave us, if the reader has not set their own. */
function googleAvatar(user) {
  const meta = user?.user_metadata || {};
  return meta.avatar_url || meta.picture || '';
}

/** Stands in for a picture nobody has set. Anything but a question mark. */
function PersonMark() {
  return (
    <svg className={styles.personMark} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c0-3.6 3.2-5.8 7.2-5.8s7.2 2.2 7.2 5.8" />
    </svg>
  );
}

export default function NavbarAccount() {
  const { ready, store } = useProgress();
  const { user, signIn, switchAccount, guestMode, leave } = useCloudSync();
  const { enabled, signedIn, resolving, guest } = useSession();

  const [pinned, setPinned] = useState(false);
  const wrapperRef = useRef(null);

  const profile = store?.profile || {};
  const name = displayNameFor(profile, user);
  const picture = profile.avatar || googleAvatar(user);
  const initials = initialsFor(profile.name || profile.username, '');

  useEffect(() => {
    if (!pinned) return undefined;
    const onPointer = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setPinned(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setPinned(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  // Signed out with accounts available: one button, and it says what it does.
  // Signing in also ends guest mode, because asking for an account is the
  // opposite of having decided not to have one.
  if (enabled && !signedIn && !resolving) {
    return (
      <button
        type="button"
        className={`csf-navbar-account csf-nav-item ${styles.signIn}`}
        onClick={() => {
          setGuest(false);
          signIn();
        }}>
        <GoogleMark className={styles.googleMark} />
        <span>Sign in</span>
      </button>
    );
  }

  // No project configured, so there is genuinely nothing to sign into. Say so
  // where somebody will look for it rather than leaving a menu that offers
  // nothing and explains nothing.
  const accountless = !enabled;

  return (
    <div
      className={`csf-navbar-account ${styles.wrapper}`}
      ref={wrapperRef}
      data-pinned={pinned ? 'true' : 'false'}>
      <button
        type="button"
        className={`csf-nav-item csf-nav-item--icon ${styles.trigger}`}
        aria-haspopup="menu"
        aria-expanded={pinned}
        aria-label={ready ? `Account: ${name}` : 'Your account'}
        onClick={() => setPinned((value) => !value)}>
        {picture ? (
          <img className={styles.avatar} src={picture} alt="" />
        ) : (
          <span
            className={styles.avatar}
            data-initials={initials ? 'true' : 'false'}>
            {ready && initials ? initials : <PersonMark />}
          </span>
        )}
      </button>

      <div className={styles.panel}>
        <div className={styles.panelInner} role="menu" aria-label="Account">
          <div className={styles.head}>
            {picture ? (
              <img className={styles.bigAvatar} src={picture} alt="" />
            ) : (
              <span
                className={styles.bigAvatar}
                data-initials={initials ? 'true' : 'false'}>
                {initials || <PersonMark />}
              </span>
            )}
            <div className={styles.who}>
              <div className={styles.name}>{name}</div>
              <div className={styles.sub}>
                {user?.email ||
                  (profile.username ? `@${profile.username}` : 'Signed in')}
              </div>
            </div>
          </div>

          <Link
            className={styles.action}
            to="/progress?at=profile"
            onClick={() => setPinned(false)}>
            Edit profile
          </Link>

          {accountless ? (
            <p className={styles.note}>
              This build has no Supabase project configured, so there is nothing
              to sign in to. Progress is kept in this browser.
            </p>
          ) : (
            <>
              {/* Switching asks Google which account. Signing out and back in
                  lands in whichever one the browser already holds, so without
                  this there is no way to reach a second. */}
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  setPinned(false);
                  switchAccount();
                }}>
                Switch account
              </button>

              {/* Guest mode and signing out end in the same place. The
                  difference is what the site does afterwards: a guest has
                  answered the question about accounts and is not asked again,
                  where somebody who merely signed out is still offered one when
                  they tick a page. */}
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  setPinned(false);
                  guestMode();
                }}>
                Continue as guest
              </button>

              <button
                type="button"
                className={`${styles.action} ${styles.leave}`}
                onClick={() => {
                  setPinned(false);
                  leave();
                }}>
                Sign out
              </button>
            </>
          )}

          {guest && (
            <p className={styles.note}>
              Reading as a guest. Nothing is recorded until you sign in.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
