/**
 * What stands where someone's progress would be, before there is any.
 *
 * Shown instead of a dashboard full of zeros. A level 1, an empty year and a
 * ring at nought out of 332 are not a reader's progress; they are the shape
 * progress will take, presented as though it were theirs, and it reads as a
 * site that has lost something rather than one waiting to start.
 */

import React from 'react';
import GoogleMark from '@site/src/components/GoogleMark';
import useCloudSync from '@site/src/hooks/useCloudSync';
import useSession from '@site/src/hooks/useSession';
import { setGuest } from '@site/src/lib/guest';
import styles from './styles.module.css';

export default function SignInPrompt({ compact = false, children }) {
  const { signIn } = useCloudSync();
  const { guest } = useSession();

  return (
    <div className={styles.box} data-compact={compact ? 'true' : 'false'}>
      <h2 className={styles.title}>
        {compact ? 'Track your progress' : 'Sign in to track your progress'}
      </h2>
      <p className={styles.text}>
        {children ||
          'Pages you finish, the time you spend reading, your level and your rank are kept with your account, so they follow you to any device you read on.'}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.signIn}
          onClick={() => {
            // Asking for an account is the opposite of having decided not to
            // have one, so it clears the guest preference.
            setGuest(false);
            signIn();
          }}>
          <GoogleMark className={styles.googleMark} />
          <span>Sign in with Google</span>
        </button>
        {!guest && !compact && (
          <button
            type="button"
            className={styles.later}
            onClick={() => setGuest(true)}>
            Keep reading as a guest
          </button>
        )}
      </div>
      {guest && (
        <p className={styles.guestNote}>
          You are reading as a guest. Everything on the site is open; nothing
          is recorded until you sign in.
        </p>
      )}
    </div>
  );
}
