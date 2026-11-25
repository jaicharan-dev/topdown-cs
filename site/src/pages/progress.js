/**
 * The progress dashboard.
 *
 * Everything shown here comes from localStorage, so the prerendered version of
 * this page is necessarily empty and fills in once the store has loaded. The
 * skeleton is laid out identically to the real thing so the page does not jump
 * around as that happens.
 *
 * Laid out as a profile: who you are and where you stand on the left, the
 * year's activity across the top, and the detail behind a pair of tabs. The
 * history tab is the one thing here that is not a score; it is for finding
 * the page you read on Tuesday and cannot name.
 */

import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import Layout from '@theme/Layout';
import React, { useEffect, useMemo, useState } from 'react';
import AccountCard from '@site/src/components/AccountCard';
import YearHeatmap from '@site/src/components/YearHeatmap';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import useCloudSync, { useCloudEnabled } from '@site/src/hooks/useCloudSync';
import { initialsFor } from '@site/src/lib/avatar';
import { describeNextLevel, levelFromSeconds } from '@site/src/lib/levels';
import {
  activityStats,
  sectionSeconds,
  summarise,
  today,
} from '@site/src/lib/progressStore';
import { RANKS, rankProgress } from '@site/src/lib/ranks';
import { formatDuration } from '@site/src/lib/timeTracker';
import styles from './progress.module.css';

/** DSA block keys carry a number prefix, so sort on it rather than the string. */
function byBlockOrder(a, b) {
  const num = (key) => Number(/\/(\d+)-/.exec(key)?.[1] ?? 0);
  return num(a) - num(b) || a.localeCompare(b);
}

function Bar({ percent, color }) {
  return (
    <div className={styles.bar}>
      <div
        className={styles.barFill}
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
}

function Stat({ value, label, hint }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </div>
  );
}

function Row({ label, done, total, points, totalPoints, href, time }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <span className={styles.rowLabel}>
          {href ? <Link to={href}>{label}</Link> : label}
          {time ? <span className={styles.rowTime}>{time}</span> : null}
        </span>
        <span className={styles.rowCount}>
          {done} / {total}
          <span className={styles.rowPoints}>
            {points} / {totalPoints} pt
          </span>
        </span>
      </div>
      <Bar percent={percent} color="var(--csf-progress-accent)" />
    </div>
  );
}

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
      <p className={styles.empty}>
        Nothing here yet. Pages you open are listed here so you can find your
        way back to one, and the list never leaves this browser unless you
        sign in.
      </p>
    );
  }

  return (
    <div className={styles.history}>
      {days.map(({ day, visits: entries }) => (
        <section key={day} className={styles.historyDay}>
          <h3 className={styles.historyHeading}>{dayHeading(day, now)}</h3>
          <ul className={styles.historyList}>
            {entries.map((visit) => (
              <li key={`${visit.id}-${visit.at}`} className={styles.historyRow}>
                <span className={styles.historyTime}>
                  {new Date(visit.at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <Link className={styles.historyTitle} to={visit.url}>
                  {visit.title}
                </Link>
                <span className={styles.historyGroup}>
                  {groups[visit.group]?.label || ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function Progress() {
  const { ready, store } = useProgress();
  const cloudEnabled = useCloudEnabled();
  const { user } = useCloudSync();

  const [tab, setTab] = useState('subjects');
  const location = useLocation();

  // Followed rather than read once: the homepage links straight to the
  // history, and in a single page app arriving at a URL that differs only in
  // its query often remounts nothing at all.
  //
  // A parameter and not a hash, because Docusaurus checks anchors against the
  // headings it collected from MDX and warns about every id a React page
  // writes for itself, however real it is.
  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get('tab');
    setTab(wanted === 'history' ? 'history' : 'subjects');
  }, [location.search]);

  // replaceState rather than a router push: clicking a tab is not somewhere
  // to go back to, and pushing would make Back walk the tabs instead of
  // leaving the page. It also leaves useLocation untouched, so the effect
  // above does not fire and argue with what was just chosen.
  const selectTab = (next) => {
    setTab(next);
    window.history.replaceState(
      null,
      '',
      next === 'history'
        ? `${window.location.pathname}?tab=history`
        : window.location.pathname
    );
  };

  // The heatmap needs today's date, which must not be read during render on a
  // prerendered page: the server would stamp it with the build date.
  const [endDay, setEndDay] = useState(null);
  useEffect(() => setEndDay(today()), []);

  const summary = useMemo(() => summarise(store, manifest), [store]);
  const activity = useMemo(() => activityStats(store), [store]);
  const ladder = useMemo(() => rankProgress(summary.completedPoints), [summary]);
  const level = useMemo(
    () => levelFromSeconds(activity.totalSeconds),
    [activity]
  );

  const profile = store?.profile || { name: '', avatar: '' };
  const meta = user?.user_metadata || {};
  const name = profile.name || meta.full_name || meta.name || 'You';
  const picture = profile.avatar || meta.avatar_url || meta.picture || '';

  const blocks = useMemo(() => {
    const done = store?.completed || {};
    const out = {};
    for (const page of manifest.pages) {
      const bucket = (out[page.block] = out[page.block] || {
        pages: 0,
        points: 0,
      });
      if (done[page.id]) {
        bucket.pages += 1;
        bucket.points += page.points;
      }
    }
    return out;
  }, [store]);

  /** First unfinished page in a group, so the label links somewhere useful. */
  const nextHref = useMemo(() => {
    const done = store?.completed || {};
    const out = {};
    for (const page of manifest.pages) {
      if (done[page.id] || out[page.group]) continue;
      out[page.group] = page.url;
    }
    return out;
  }, [store]);

  const groupKeys = Object.keys(manifest.groups).sort(
    (a, b) => manifest.groups[b].points - manifest.groups[a].points
  );
  const dsaBlocks = Object.keys(manifest.blocks)
    .filter((key) => manifest.blocks[key].group === 'dsa')
    .sort(byBlockOrder);

  return (
    <Layout
      title="Your Progress"
      description="Track how much of TopDown CS you have worked through.">
      <main className={styles.page} data-ready={ready ? 'true' : 'false'}>
        <div className={styles.top}>
          {/* Who you are and where you stand, together, because they are
              read as one thing. */}
          <section className={styles.profile}>
            {picture ? (
              <img className={styles.avatar} src={picture} alt="" />
            ) : (
              <span className={styles.avatar} data-initials="true">
                {initialsFor(profile.name, name) || '?'}
              </span>
            )}

            <h1 className={styles.name}>{name}</h1>
            {user?.email && <p className={styles.email}>{user.email}</p>}

            <div className={styles.levelBadge}>
              <span className={styles.levelWord}>Level</span>
              <span className={styles.levelNumber}>{level.level}</span>
            </div>
            <Bar percent={level.percent} color="var(--csf-progress-accent)" />
            <p className={styles.levelHint}>
              {describeNextLevel(level) || 'Top level reached.'}
            </p>

            <div className={styles.rankLine}>
              <span className={styles.rankLabel}>Rank</span>
              <span
                className={styles.rankName}
                style={{ color: ladder.rank.color }}>
                {ladder.rank.name}
              </span>
            </div>
            <Bar percent={ladder.percent} color={ladder.rank.color} />
            <p className={styles.levelHint}>
              {ladder.next
                ? `${ladder.pointsNeeded} more point${
                    ladder.pointsNeeded === 1 ? '' : 's'
                  } to ${ladder.next.name}`
                : 'Top rank reached.'}
            </p>

            <ol className={styles.ladder}>
              {RANKS.map((rank, index) => (
                <li
                  key={rank.name}
                  className={styles.ladderItem}
                  data-state={
                    index < ladder.rank.index
                      ? 'past'
                      : index === ladder.rank.index
                        ? 'current'
                        : 'future'
                  }>
                  <span
                    className={styles.ladderDot}
                    style={{ background: rank.color }}
                  />
                  <span className={styles.ladderName}>{rank.name}</span>
                  <span className={styles.ladderAt}>{rank.at}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className={styles.topRight}>
            <section className={styles.stats}>
              <Stat
                value={`${summary.percent}%`}
                label="Site complete"
                hint={`${summary.completedPages} of ${summary.totalPages} pages`}
              />
              <Stat
                value={formatDuration(activity.totalSeconds)}
                label="Time reading"
                hint={
                  activity.activeDays
                    ? `About ${formatDuration(
                        Math.round(activity.totalSeconds / activity.activeDays)
                      )} a day`
                    : 'Counted only while you are here'
                }
              />
              <Stat
                value={activity.activeDays}
                label="Active days"
                hint={
                  activity.firstDay
                    ? `Since ${activity.firstDay}`
                    : 'Not started'
                }
              />
              <Stat
                value={summary.completedPoints}
                label="Points earned"
                hint="Hard pages are worth more"
              />
            </section>
          </div>
        </div>

        {/* Its own row, full width. Beside the profile column it only got
            about half a year on screen, and a year of work is the point. */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Activity</h2>
          <YearHeatmap activity={store?.activity} endDay={endDay} />
          <p className={styles.cardNote}>
            One square per day, darker for more pages finished. Time counts
            only while this tab is open and you are active, so it undercounts
            rather than flatters.
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.tabs} role="tablist" aria-label="Detail">
            <button
              type="button"
              role="tab"
              className={styles.tab}
              aria-selected={tab === 'subjects'}
              onClick={() => selectTab('subjects')}>
              By subject
            </button>
            <button
              type="button"
              role="tab"
              className={styles.tab}
              aria-selected={tab === 'history'}
              onClick={() => selectTab('history')}>
              History
            </button>
          </div>

          {tab === 'subjects' ? (
            <>
              <div className={styles.rows}>
                {groupKeys.map((key) => {
                  const group = manifest.groups[key];
                  const got = summary.groups[key];
                  const seconds = sectionSeconds(store, [key]);
                  return (
                    <Row
                      key={key}
                      label={group.label}
                      done={got.completedPages}
                      total={group.pages}
                      points={got.completedPoints}
                      totalPoints={group.points}
                      href={nextHref[key]}
                      time={seconds ? formatDuration(seconds) : null}
                    />
                  );
                })}
              </div>

              <details className={styles.details}>
                <summary className={styles.summary}>
                  DSA by topic ({dsaBlocks.length} topics)
                </summary>
                <div className={styles.rows}>
                  {dsaBlocks.map((key) => {
                    const block = manifest.blocks[key];
                    const got = blocks[key] || { pages: 0, points: 0 };
                    return (
                      <Row
                        key={key}
                        label={block.label}
                        done={got.pages}
                        total={block.pages}
                        points={got.points}
                        totalPoints={block.points}
                      />
                    );
                  })}
                </div>
              </details>
            </>
          ) : (
            <History visits={store?.history || []} groups={manifest.groups} />
          )}
        </section>

        <AccountCard />

        {/* The note stays and the button does not. Where somebody's data
            lives is worth saying; a one click way to destroy all of it,
            sitting under the page that shows how much there is to lose, is
            not worth offering. Clearing site data still clears it, and the
            account card above can delete the stored copy. */}
        <section className={styles.footerCard}>
          <div>
            <h2 className={styles.cardTitle}>Your data</h2>
            <p className={styles.cardNote}>
              Progress, your reading history and your name are kept in this
              browser, so clearing your site data clears them.{' '}
              {cloudEnabled
                ? 'Signing in keeps a second copy that follows you between devices.'
                : 'Nothing is uploaded, and there is no account to create.'}
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
