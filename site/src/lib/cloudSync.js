/**
 * Talking to Supabase.
 *
 * Three things shape this file:
 *
 * 1. The feature is OFF unless both config values are present. The site is
 *    useful without an account and must keep working when nobody has set any
 *    keys, so every entry point here returns a harmless null rather than
 *    throwing. A local checkout with no Supabase project behaves exactly as
 *    it did before Phase 2.
 *
 * 2. The SDK is imported dynamically. It is a large dependency and most
 *    visitors never sign in, so it has no business sitting in the bundle that
 *    every reader downloads to look at one answer.
 *
 * 3. The anon key is public, and that is fine ONLY because row level security
 *    is switched on. See supabase/schema.sql. If those policies are missing,
 *    the key in the bundle is an open door to every user's data.
 */

import { mergeStores } from './mergeStores';

/** Matches the optional ceiling in schema.sql, minus room for the envelope. */
const MAX_UPLOAD_BYTES = 1000000;

let clientPromise = null;

export function isConfigured(config) {
  return Boolean(config && config.supabaseUrl && config.supabaseAnonKey);
}

/**
 * The single shared client, created on first use. Returns null when the site
 * has no Supabase project configured, which is the normal state of a fresh
 * checkout.
 */
export function getClient(config) {
  if (!isConfigured(config)) return Promise.resolve(null);

  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            // the OAuth redirect comes back with the code in the URL
            detectSessionInUrl: true,
            flowType: 'pkce',
          },
        })
      )
      .catch((err) => {
        // a failed import must not wedge the promise forever
        clientPromise = null;
        throw err;
      });
  }

  return clientPromise;
}

/**
 * The stored blob for a user, or null if they have never synced.
 *
 * A missing row is an expected state, not an error: it is what a brand new
 * account looks like. Supabase reports it as PGRST116, which is filtered out
 * with maybeSingle so the caller does not have to care.
 */
export async function fetchRemote(client, userId) {
  const { data, error } = await client
    .from('progress')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? data.data : null;
}

export async function pushRemote(client, userId, store) {
  const payload = JSON.stringify(store);
  if (payload.length > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Refusing to upload ${payload.length} bytes of progress, which is past ` +
        `the ${MAX_UPLOAD_BYTES} byte limit.`
    );
  }

  const { error } = await client
    .from('progress')
    .upsert({ user_id: userId, data: store }, { onConflict: 'user_id' });

  if (error) throw error;
  return store;
}

/**
 * One sync pass: read what is stored, merge it with what is here, and write
 * the result back on both sides.
 *
 * The merge is commutative and idempotent (see mergeStores.js), so it does
 * not matter which device syncs first, how often this runs, or whether it
 * runs twice because somebody refreshed. Nothing a user has finished is lost
 * by syncing, in either direction.
 */
export async function syncOnce(client, userId, localStore) {
  const remote = await fetchRemote(client, userId);
  const merged = mergeStores(localStore, remote);

  // Only write when the merge actually changed what is stored, so opening the
  // dashboard on a device that is already up to date costs one read.
  if (JSON.stringify(merged) !== JSON.stringify(remote)) {
    await pushRemote(client, userId, merged);
  }

  return merged;
}

/** Deletes the stored copy. The local copy is the caller's business. */
export async function deleteRemote(client, userId) {
  const { error } = await client.from('progress').delete().eq('user_id', userId);
  if (error) throw error;
}


/**
 * Is this username free for the signed in user to take?
 *
 * An answer here is advice, not a reservation: another browser can take the
 * name between this call and the save. claimUsername is what decides.
 * Returns true when it cannot tell, so a database without usernames.sql
 * applied does not block anybody from saving a profile.
 */
export async function usernameAvailable(client, candidate) {
  if (!client || !candidate) return true;
  const { data, error } = await client.rpc('username_available', {
    candidate,
  });
  if (error) return true;
  return data !== false;
}

/** Raised by claimUsername when somebody else holds the name. */
export const USERNAME_TAKEN = 'username-taken';

/**
 * Takes a username, or releases it when given an empty one.
 *
 * Throws USERNAME_TAKEN when the name belongs to somebody else. Any other
 * failure, including usernames.sql never having been run, resolves rather
 * than throwing: a missing optional table must not stop somebody saving a
 * bio.
 */
export async function claimUsername(client, candidate) {
  if (!client) return null;
  const { data, error } = await client.rpc('claim_username', {
    candidate: candidate || '',
  });
  if (!error) return data || '';

  // 23505 is unique_violation, which the function raises for a name that is
  // already held. Postgres sends it through as the error code.
  if (error.code === '23505' || /taken/i.test(error.message || '')) {
    const taken = new Error('That username is taken.');
    taken.reason = USERNAME_TAKEN;
    throw taken;
  }

  // Anything else is the feature being unavailable rather than the name
  // being refused, and the local profile is still saved either way.
  return null;
}
