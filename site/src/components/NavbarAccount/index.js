/**
 * The account control in the navbar: a picture that opens a small editor.
 *
 * Signed out it is a Sign in button, not an empty avatar. A circle with a
 * question mark in it is the site admitting it does not know who you are,
 * which is both unfriendly and useless; a button says what to do about it.
 *
 * With no Supabase project configured there is nothing to sign into, so it
 * stays a picture and edits a profile that lives only in this browser. The
 * rest of the site already behaves that way, and a sign in button that
 * cannot work would be worse than none.
 *
 * The name and picture are kept in the progress store rather than beside it,
 * which means they ride the existing sync to other devices for nothing.
 */

import React, { useEffect, useRef, useState } from 'react';
import useProgress from '@site/src/hooks/useProgress';
import useCloudSync from '@site/src/hooks/useCloudSync';
import { ACCEPTED_TYPES, fileToAvatar, initialsFor } from '@site/src/lib/avatar';
import styles from './styles.module.css';

/** The picture Google gave us, if the reader has not set their own. */
function googleAvatar(user) {
  const meta = user?.user_metadata || {};
  return meta.avatar_url || meta.picture || '';
}

function displayName(profile, user) {
  if (profile?.name) return profile.name;
  const meta = user?.user_metadata || {};
  return meta.full_name || meta.name || user?.email || '';
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
  const { ready, store, updateProfile } = useProgress();
  const { enabled, user, status, signIn, signOut } = useCloudSync();

  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const wrapperRef = useRef(null);
  const fileRef = useRef(null);

  const profile = store?.profile || { name: '', avatar: '' };
  const name = displayName(profile, user);
  const picture = profile.avatar || googleAvatar(user);
  const initials = initialsFor(profile.name, name);

  // The panel follows the stored name until it is opened, so another device's
  // edit is not overwritten by a field that was filled in before it arrived.
  useEffect(() => {
    if (open) setDraftName(profile.name || '');
  }, [open]);

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

  const onPickFile = async (event) => {
    const file = event.target.files?.[0];
    // Clear first: picking the same file twice must still fire a change.
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      updateProfile({ avatar: await fileToAvatar(file) });
    } catch (err) {
      setError(err?.message || 'That picture could not be used.');
    } finally {
      setBusy(false);
    }
  };

  const onSaveName = (event) => {
    event.preventDefault();
    updateProfile({ name: draftName.trim() });
    setOpen(false);
  };

  // Signed out with accounts available: a button that says what it is for.
  if (enabled && !user && status !== 'loading') {
    return (
      <button
        type="button"
        className={`csf-navbar-account csf-tip ${styles.signIn}`}
        data-csf-tip="Sign in to save your progress and read it on any device"
        onClick={signIn}>
        Sign in
      </button>
    );
  }

  return (
    <div className={`csf-navbar-account csf-tip ${styles.wrapper}`} ref={wrapperRef} data-csf-tip={
      name ? `Signed in as ${name}. Edit your name and picture` : 'Your name and picture'
    }>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={name ? `Account: ${name}` : 'Your profile'}
        onClick={() => setOpen((value) => !value)}>
        {picture ? (
          <img className={styles.avatar} src={picture} alt="" />
        ) : (
          <span className={styles.avatar} data-initials={initials ? 'true' : 'false'}>
            {ready && initials ? initials : <PersonMark />}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Your profile">
          <div className={styles.head}>
            <button
              type="button"
              className={styles.pictureButton}
              onClick={() => fileRef.current?.click()}
              disabled={busy}>
              {picture ? (
                <img className={styles.bigAvatar} src={picture} alt="" />
              ) : (
                <span
                  className={styles.bigAvatar}
                  data-initials={initials ? 'true' : 'false'}>
                  {initials || <PersonMark />}
                </span>
              )}
              <span className={styles.pictureHint}>
                {busy ? 'Resizing' : 'Change'}
              </span>
            </button>

            <div className={styles.who}>
              <div className={styles.name}>{name || 'You'}</div>
              {user?.email && <div className={styles.email}>{user.email}</div>}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className={styles.file}
            onChange={onPickFile}
          />

          <form className={styles.form} onSubmit={onSaveName}>
            <label className={styles.label} htmlFor="csf-profile-name">
              Display name
            </label>
            <div className={styles.row}>
              <input
                id="csf-profile-name"
                className={styles.input}
                value={draftName}
                maxLength={40}
                placeholder="What should we call you?"
                onChange={(event) => setDraftName(event.target.value)}
              />
              <button type="submit" className={styles.save}>
                Save
              </button>
            </div>
          </form>

          {error && <p className={styles.error}>{error}</p>}

          {profile.avatar && (
            <button
              type="button"
              className={styles.link}
              onClick={() => updateProfile({ avatar: '' })}>
              Remove picture
            </button>
          )}

          {enabled && user && (
            <button type="button" className={styles.link} onClick={signOut}>
              Sign out
            </button>
          )}

          {!enabled && (
            <p className={styles.note}>Saved in this browser only.</p>
          )}
        </div>
      )}
    </div>
  );
}
