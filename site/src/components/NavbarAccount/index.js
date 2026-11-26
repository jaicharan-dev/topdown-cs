/**
 * The account control in the navbar.
 *
 * Signed out it is a Sign in button, not an empty avatar. A circle with a
 * question mark in it is the site admitting it does not know who you are,
 * which is both unfriendly and useless; a button says what to do about it.
 *
 * Signed in, or with no project configured to sign into, it is a picture
 * that opens a short menu: who you are, a way to the profile, and a way out.
 * The editing itself lives on the progress page rather than in here. A
 * dropdown is the wrong size for a bio, and a profile that is worth filling
 * in is worth a page.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import useProgress from '@site/src/hooks/useProgress';
import useCloudSync from '@site/src/hooks/useCloudSync';
import { initialsFor } from '@site/src/lib/avatar';
import { displayNameFor } from '@site/src/lib/progressStore';
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
  const { enabled, user, status, signIn, signOut } = useCloudSync();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const profile = store?.profile || {};
  const name = displayNameFor(profile, user);
  const picture = profile.avatar || googleAvatar(user);
  const initials = initialsFor(profile.name || profile.username, '');

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Signed out with accounts available: a button that says what it is for.
  if (enabled && !user && status !== 'loading') {
    return (
      <button
        type="button"
        className={`csf-navbar-account csf-nav-item csf-tip ${styles.signIn}`}
        data-csf-tip="Sign in to save your progress and read it on any device"
        onClick={signIn}>
        Sign in
      </button>
    );
  }

  return (
    <div className={`csf-navbar-account ${styles.wrapper}`} ref={wrapperRef}>
      <button
        type="button"
        className={`csf-nav-item csf-nav-item--icon ${styles.trigger}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ready ? `Account: ${name}` : 'Your account'}
        onClick={() => setOpen((value) => !value)}>
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

      {open && (
        <div className={styles.panel} role="menu" aria-label="Account">
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
                {user?.email || (profile.username ? `@${profile.username}` : 'Not signed in')}
              </div>
            </div>
          </div>

          <Link
            className={styles.action}
            to="/progress?at=profile"
            onClick={() => setOpen(false)}>
            Edit profile
          </Link>

          {enabled && user ? (
            <button type="button" className={styles.action} onClick={signOut}>
              Sign out
            </button>
          ) : enabled ? (
            <button type="button" className={styles.action} onClick={signIn}>
              Sign in
            </button>
          ) : (
            <p className={styles.note}>
              Saved in this browser. No account to sign into on this build.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
