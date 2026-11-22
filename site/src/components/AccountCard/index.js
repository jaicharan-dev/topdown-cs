/**
 * Sign in, and the state of syncing.
 *
 * Renders nothing when the site has no Supabase project configured, which is
 * the default. A checkout with no keys looks exactly as it did before
 * accounts existed, rather than showing a sign in button that cannot work.
 */

import React, { useState } from 'react';
import useCloudSync from '@site/src/hooks/useCloudSync';
import styles from './styles.module.css';

function GoogleMark() {
  return (
    <svg className={styles.googleMark} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71A5.41 5.41 0 013.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.82.96 4.04l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 00.96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

const STATUS_TEXT = {
  loading: 'Checking your session.',
  syncing: 'Syncing.',
  error: 'Sync failed. Your progress on this device is untouched.',
};

export default function AccountCard() {
  const {
    enabled,
    user,
    status,
    error,
    lastSyncedAt,
    signIn,
    signOut,
    syncNow,
    forgetRemote,
  } = useCloudSync();

  const [confirming, setConfirming] = useState(false);

  if (!enabled) return null;

  const onForget = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    await forgetRemote();
  };

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Account</h2>
          <p className={styles.note}>
            {user
              ? 'Your progress follows you to any browser you sign in to.'
              : 'Sign in to carry your progress between devices. Everything you have done so far on this device is kept and merged in.'}
          </p>
        </div>

        {!user && status !== 'loading' && (
          <button type="button" className={styles.google} onClick={signIn}>
            <GoogleMark />
            <span>Sign in with Google</span>
          </button>
        )}
      </div>

      {user && (
        <div className={styles.session}>
          <div className={styles.who}>
            <span className={styles.email}>{user.email}</span>
            <span className={styles.status} data-status={status}>
              {status === 'synced' && lastSyncedAt
                ? `Synced at ${lastSyncedAt.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : STATUS_TEXT[status] || ''}
            </span>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={syncNow}
              disabled={status === 'syncing'}>
              Sync now
            </button>
            <button type="button" className={styles.button} onClick={signOut}>
              Sign out
            </button>
            <button
              type="button"
              className={styles.danger}
              onClick={onForget}
              onBlur={() => setConfirming(false)}>
              {confirming ? 'Really delete it?' : 'Delete stored copy'}
            </button>
          </div>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {confirming && (
        <p className={styles.note}>
          This removes the copy kept on the server and signs you out. Your
          progress on this device is not touched.
        </p>
      )}
    </section>
  );
}
