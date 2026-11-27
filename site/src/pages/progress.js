/**
 * The progress dashboard, and the profile.
 *
 * Everything shown here comes from localStorage, so the prerendered version
 * of this page is necessarily empty and fills in once the store has loaded.
 *
 * Four sections, each reachable by `?at=` from the navbar: who you are, where
 * you stand, what you have been doing, and what you have read. A query
 * parameter rather than an anchor, because Docusaurus checks anchors against
 * the headings it collected from MDX and warns about every id a React page
 * writes for itself, however real that id is.
 *
 * There is no "by subject" breakdown any more. The roadmap on the homepage
 * already shows every subject with its counts, drawn in the shape of the
 * thing, and a second list of the same numbers was the weaker of the two.
 */

import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DifficultyRing from '@site/src/components/DifficultyRing';
import GoogleMark from '@site/src/components/GoogleMark';
import SignInPrompt from '@site/src/components/SignInPrompt';
import RankLadder from '@site/src/components/RankLadder';
import YearHeatmap from '@site/src/components/YearHeatmap';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import useCloudSync from '@site/src/hooks/useCloudSync';
import useSession from '@site/src/hooks/useSession';
import { ACCEPTED_TYPES, fileToAvatar, initialsFor } from '@site/src/lib/avatar';
import { describeNextLevel, levelFromSeconds } from '@site/src/lib/levels';
import {
  activityStats,
  checkUsername,
  difficultyBreakdown,
  displayNameFor,
  PROFILE_LINKS,
  summarise,
  today,
} from '@site/src/lib/progressStore';
import { formatDuration } from '@site/src/lib/timeTracker';
import styles from './progress.module.css';

const SECTIONS = ['profile', 'standing', 'activity', 'history'];

/** "Today", "Yesterday", or a written date, for a history heading. */
function dayHeading(day, now) {
  if (day === today(now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === today(yesterday)) return 'Yesterday';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function History({ visits, groups }) {
  const now = new Date();

  // Grouped by day, in the order the store already keeps them, which is
  // newest first. No sorting here: the store is the one place that decides.
  const days = useMemo(() => {
    const out = [];
    for (const visit of visits) {
      const day = today(new Date(visit.at));
      const last = out[out.length - 1];
      if (last && last.day === day) last.visits.push(visit);
      else out.push({ day, visits: [visit] });
    }
    return out;
  }, [visits]);

  if (!visits.length) {
    return (
      <p className={styles.empty}>Nothing read yet.</p>
    );
  }

  return (
    <div className={styles.history}>
      {days.map(({ day, visits: entries }) => (
        <section key={day} className={styles.historyDay}>
          <h3 className={styles.historyHeading}>
            {dayHeading(day, now)}
            <span className={styles.historyCount}>
              {entries.length} page{entries.length === 1 ? '' : 's'}
            </span>
          </h3>
          <ul className={styles.historyList}>
            {entries.map((visit) => (
              <li key={`${visit.id}-${visit.at}`}>
                <Link className={styles.historyRow} to={visit.url}>
                  <span className={styles.historyTime}>
                    {new Date(visit.at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className={styles.historyTitle}>{visit.title}</span>
                  <span className={styles.historyGroup}>
                    {groups[visit.group]?.label || ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * The rule for a field, sitting in the field's own corner.
 *
 * Absolutely placed over the input rather than inside it, because an input
 * cannot have children. Pointer events are off so it never eats a click
 * meant for the box underneath, and it leaves as soon as there is an answer.
 */
function Hint({ show, children }) {
  if (!show) return null;
  return (
    <span className={styles.hint} aria-hidden="true">
      {children}
    </span>
  );
}

/** The editable profile. Everything in it is optional except turning up. */
function ProfileForm({ profile, onSave, user, cloud }) {
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // Follows the stored profile until it is edited, so a sync arriving from
  // another device is not overwritten by a field filled in before it landed.
  useEffect(() => setDraft(profile), [profile.updatedAt]);

  const set = (key) => (event) => {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setSaved('');
    setError('');
  };

  const onPickFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onSave({ avatar: await fileToAvatar(file) });
    } catch (err) {
      setError(err?.message || 'That picture could not be used.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const wanted = draft.username.trim().toLowerCase();

    const problem = checkUsername(wanted);
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setSaving(true);
    try {
      // Only when it changed. Re-saving a bio should not cost a round trip,
      // and claiming a name you already hold is a no-op worth not making.
      if (wanted !== (profile.username || '')) {
        const result = await cloud.claimHandle(wanted);
        if (!result.ok) {
          setError('That username is taken. Try another.');
          return;
        }
        setSaved(result.reserved ? 'Saved. Username reserved.' : 'Saved.');
      } else {
        setSaved('Saved.');
      }

      const patch = {
        name: draft.name.trim(),
        username: wanted,
        bio: draft.bio.trim(),
        location: draft.location.trim(),
      };
      for (const link of PROFILE_LINKS) {
        patch[link.key] = (draft[link.key] || '').trim();
      }
      onSave(patch);
    } finally {
      setSaving(false);
    }
  };

  const picture =
    profile.avatar ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    '';
  const initials = initialsFor(profile.name || profile.username, '');

  return (
    <form className={styles.profileForm} onSubmit={submit}>
      <div className={styles.profileHead}>
        <button
          type="button"
          className={styles.pictureButton}
          onClick={() => fileRef.current?.click()}
          disabled={busy}>
          {picture ? (
            <img className={styles.avatar} src={picture} alt="" />
          ) : (
            <span
              className={styles.avatar}
              data-initials={initials ? 'true' : 'false'}>
              {initials || ' '}
            </span>
          )}
          <span className={styles.pictureHint}>
            {busy ? 'Resizing' : 'Change'}
          </span>
        </button>

        <div className={styles.profileWho}>
          <h2 className={styles.profileName}>{displayNameFor(profile, user)}</h2>

          {/* Which account this is, named, with the provider shown. A page
              about who you are should say who the site thinks you are. */}
          {cloud.enabled && user ? (
            <p className={styles.account}>
              <GoogleMark className={styles.accountMark} />
              <span className={styles.accountEmail}>{user.email}</span>
            </p>
          ) : (
            <p className={styles.profileSub}>
              {profile.reader ? `Reader #${profile.reader}` : ''}
            </p>
          )}

          {cloud.enabled && (
            <div className={styles.authRow}>
              <button
                type="button"
                className={styles.authButton}
                onClick={cloud.switchAccount}>
                Switch account
              </button>
              <button
                type="button"
                className={styles.authButton}
                onClick={cloud.guestMode}>
                Continue as guest
              </button>
              <button
                type="button"
                className={`${styles.authButton} ${styles.authLeave}`}
                onClick={cloud.leave}>
                Sign out
              </button>
            </div>
          )}

          {/* The one case where none of the above can be true. Said here
              because this is where somebody comes looking for it. */}
          {!cloud.enabled && (
            <p className={styles.profileSub}>
              This build has no Supabase project configured, so there is no
              account to sign in to. Progress is kept in this browser.
            </p>
          )}

          {/* Only shown when it is not the boring answer. A sync that quietly
              stops working is the one failure a reader has to be told about,
              because everything else on the page keeps looking fine. */}
          {cloud.enabled && user && cloud.status === 'error' && (
            <p className={styles.syncError}>
              {cloud.error || 'Could not sync. Your progress here is safe.'}
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className={styles.file}
        onChange={onPickFile}
      />

      {cloud.usernameConflict && (
        <p className={styles.conflict}>
          Somebody else took that username before this account could. Pick
          another one.{' '}
          <button
            type="button"
            className={styles.quiet}
            onClick={cloud.clearUsernameConflict}>
            Dismiss
          </button>
        </p>
      )}

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Display name</span>
          <Hint show={!draft.name}>optional</Hint>
          <input
            className={styles.input}
            value={draft.name}
            maxLength={40}
            placeholder="Jaicharan Y"
            onChange={set('name')}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Username</span>
          {/* The one field with a rule worth knowing before you type. */}
          <Hint show={!draft.username}>unique</Hint>
          <div className={styles.prefixed}>
            <span className={styles.prefix}>@</span>
            <input
              className={styles.input}
              value={draft.username}
              maxLength={20}
              placeholder="jaicharan"
              autoComplete="off"
              spellCheck="false"
              onChange={set('username')}
            />
          </div>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Location</span>
          <Hint show={!draft.location}>optional</Hint>
          <input
            className={styles.input}
            value={draft.location}
            maxLength={60}
            placeholder="Bengaluru, India"
            onChange={set('location')}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Bio</span>
          <Hint show={!draft.bio}>optional</Hint>
          <input
            className={styles.input}
            value={draft.bio}
            maxLength={280}
            placeholder="swe @ solarwinds"
            onChange={set('bio')}
          />
        </label>

        {/* One box per place somebody might be, rather than one box called
            Contact that asks them to invent a format. */}
        {PROFILE_LINKS.map((link) => (
          <label key={link.key} className={styles.field}>
            <span className={styles.fieldLabel}>{link.label}</span>
            <Hint show={!draft[link.key]}>optional</Hint>
            <input
              className={styles.input}
              value={draft[link.key] || ''}
              maxLength={200}
              placeholder={link.placeholder}
              autoComplete="off"
              spellCheck="false"
              onChange={set(link.key)}
            />
          </label>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formFoot}>
        <button type="submit" className={styles.save} disabled={saving}>
          {saving ? 'Saving' : 'Save profile'}
        </button>
        {saved && <span className={styles.savedNote}>{saved}</span>}
        {profile.avatar && (
          <button
            type="button"
            className={styles.quiet}
            onClick={() => onSave({ avatar: '' })}>
            Remove picture
          </button>
        )}
      </div>
    </form>
  );
}

export default function Progress() {
  const { ready, store, updateProfile } = useProgress();
  const cloud = useCloudSync();
  const { canSave, resolving } = useSession();
  const { user } = cloud;
  const location = useLocation();

  // The heatmap needs today's date, which must not be read during render on a
  // prerendered page: the server would stamp it with the build date.
  const [endDay, setEndDay] = useState(null);
  useEffect(() => setEndDay(today()), []);

  // Arriving from a navbar control scrolls to the section it stands for.
  // Waits for `ready`, or it would scroll to a section that has not been
  // filled in yet and land in the wrong place.
  useEffect(() => {
    if (!ready) return;
    const wanted = new URLSearchParams(location.search).get('at');
    if (!SECTIONS.includes(wanted)) return;
    const target = document.getElementById(`csf-${wanted}`);
    if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [location.search, ready]);

  const summary = useMemo(() => summarise(store, manifest), [store]);
  const activity = useMemo(() => activityStats(store), [store]);
  const level = useMemo(
    () => levelFromSeconds(activity.totalSeconds),
    [activity]
  );
  const breakdown = useMemo(
    () => difficultyBreakdown(store, manifest),
    [store]
  );

  const profile = store?.profile || {};

  // Without an account there is no progress to show, so the page is the
  // invitation rather than a dashboard of zeros wearing somebody's name.
  if (!canSave) {
    return (
      <Layout
        title="Your Progress"
        description="Track how much of TopDown CS you have worked through.">
        <main className={styles.page} data-ready={resolving ? 'false' : 'true'}>
          <SignInPrompt />
        </main>
      </Layout>
    );
  }

  return (
    <Layout
      title="Your Progress"
      description="Track how much of TopDown CS you have worked through.">
      <main className={styles.page} data-ready={ready ? 'true' : 'false'}>
        <section id="csf-profile" className={styles.card}>
          <ProfileForm
            profile={profile}
            onSave={updateProfile}
            user={user}
            cloud={cloud}
          />
        </section>

        <section id="csf-standing" className={styles.card}>
          <div className={styles.standing}>
            <DifficultyRing
              breakdown={breakdown}
              done={summary.completedPages}
              total={summary.totalPages}
            />

            <div className={styles.bars}>
              {/* Level and rank each get the full width of the card rather
                  than a column of eight rows under the profile. */}
              <div className={styles.barBlock}>
                <div className={styles.barHead}>
                  <span className={styles.barLabel}>Level</span>
                  <span className={styles.barValue}>{level.level}</span>
                  <span className={styles.barMeta}>
                    {describeNextLevel(level) || 'Top level reached'}
                  </span>
                </div>
                <div className={styles.bar}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${level.percent}%` }}
                  />
                </div>
                <p className={styles.barNote}>
                  {formatDuration(activity.totalSeconds)} read
                </p>
              </div>

              <div className={styles.barBlock}>
                <RankLadder points={summary.completedPoints} />
                <p className={styles.barNote}>
                  {summary.completedPoints} of {summary.totalPoints} points
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="csf-activity" className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.cardTitle}>Activity</h2>
            {/* Three numbers, no paragraph. The grid underneath is the
                explanation. */}
            <dl className={styles.figures}>
              <div className={styles.figure}>
                <dt>Pages</dt>
                <dd>{summary.completedPages}</dd>
              </div>
              <div className={styles.figure}>
                <dt>Read time</dt>
                <dd>{formatDuration(activity.totalSeconds)}</dd>
              </div>
              <div className={styles.figure}>
                <dt>Active days</dt>
                <dd>{activity.activeDays}</dd>
              </div>
            </dl>
          </div>
          <YearHeatmap activity={store?.activity} endDay={endDay} />
        </section>

        <section id="csf-history" className={styles.card}>
          <div className={styles.sectionHead}>
            <h2 className={styles.cardTitle}>History</h2>
            <span className={styles.sectionMeta}>
              {(store?.history || []).length} recent page
              {(store?.history || []).length === 1 ? '' : 's'}
            </span>
          </div>
          <History visits={store?.history || []} groups={manifest.groups} />
        </section>
      </main>
    </Layout>
  );
}
