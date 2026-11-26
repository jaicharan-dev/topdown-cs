/**
 * One answer to "may this browser record anything".
 *
 * Progress now belongs to an account. Nothing is written while signed out:
 * no completions, no reading time, no history. The site is fully readable
 * either way, and signing in is what turns the recording on.
 *
 * The one exception is a build with no Supabase project behind it. There is
 * nothing to sign into there, so the old local-only behaviour stands rather
 * than the site quietly becoming unable to remember anything at all. Without
 * that exception, a checkout with no keys would look broken rather than
 * accountless.
 */

import { useEffect, useState } from 'react';
import useCloudSync from '@site/src/hooks/useCloudSync';
import { GUEST_EVENT, isGuest } from '@site/src/lib/guest';

export default function useSession() {
  const { enabled, user, status } = useCloudSync();

  // Read after mount, never during it. This is a prerendered site: the server
  // cannot know the preference, and reading it while rendering would give the
  // first client pass a different answer and break hydration.
  const [guestFlag, setGuestFlag] = useState(false);
  useEffect(() => {
    const sync = () => setGuestFlag(isGuest());
    sync();
    window.addEventListener(GUEST_EVENT, sync);
    // Another tab choosing guest mode should settle this one too.
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(GUEST_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const signedIn = Boolean(user);
  const resolving = enabled && status === 'loading';

  return {
    /** Whether this build has accounts at all. */
    enabled,
    signedIn,
    /** True while the session is still being worked out on first load. */
    resolving,
    /** The gate. Everything that writes to the store checks this. */
    canSave: !enabled || signedIn,
    /**
     * Chose to browse without an account, rather than simply not having got
     * round to it. Same permissions, no nudging.
     */
    guest: !signedIn && guestFlag,
  };
}
