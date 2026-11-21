/**
 * The progress dashboard.
 *
 * Everything shown here comes from localStorage, so the prerendered version of
 * this page is necessarily empty and fills in once the store has loaded. The
 * skeleton is laid out identically to the real thing so the page does not jump
 * around as that happens.
 */

import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import React, { useEffect, useMemo, useState } from 'react';
import ProgressHeatmap from '@site/src/components/ProgressHeatmap';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import { activityStats, summarise, today } from '@site/src/lib/progressStore';
import { RANKS, rankProgress } from '@site/src/lib/ranks';
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

function Row({ label, done, total, points, totalPoints, href }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <span className={styles.rowLabel}>
          {href ? <Link to={href}>{label}</Link> : label}
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

export default function Progress() {
  const { ready, store, reset } = useProgress();

  // The heatmap needs today's date, which must not be read during render on a
  // prerendered page: the server would stamp it with the build date.
  const [endDay, setEndDay] = useState(null);
  useEffect(() => setEndDay(today()), []);

  const summary = useMemo(() => summarise(store, manifest), [store]);
  const activity = useMemo(() => activityStats(store), [store]);
  const ladder = useMemo(() => rankProgress(summary.completedPoints), [summary]);

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

  const onReset = () => {
    const confirmed = window.confirm(
      'Clear all of your progress? This cannot be undone, and it only affects ' +
        'this browser.'
    );
    if (confirmed) reset();
  };

  return (
    <Layout
      title="Your Progress"
      description="Track how much of TopDown CS you have worked through.">
      <main className={styles.page} data-ready={ready ? 'true' : 'false'}>
        <header className={styles.header}>
          <h1 className={styles.title}>Your Progress</h1>
          <p className={styles.subtitle}>
            Saved in this browser only. Nothing is uploaded, and there is no
            account to create yet.
          </p>
        </header>

        <section className={styles.rankCard}>
          <div className={styles.rankTop}>
            <div>
              <div className={styles.rankLabel}>Current rank</div>
              <div
                className={styles.rankName}
                style={{ color: ladder.rank.color }}>
                {ladder.rank.name}
              </div>
            </div>
            <div className={styles.rankPoints}>
              <strong>{summary.completedPoints}</strong> / {summary.totalPoints}
              <span> points</span>
            </div>
          </div>

          <Bar percent={ladder.percent} color={ladder.rank.color} />

          <p className={styles.rankNext}>
            {ladder.next
              ? `${ladder.pointsNeeded} more point${
                  ladder.pointsNeeded === 1 ? '' : 's'
                } to reach ${ladder.next.name}.`
              : 'Top rank reached. Everything from here is for its own sake.'}
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

        <section className={styles.stats}>
          <Stat
            value={`${summary.percent}%`}
            label="Site complete"
            hint={`${summary.completedPages} of ${summary.totalPages} pages`}
          />
          <Stat
            value={activity.currentStreak}
            label="Day streak"
            hint={`Longest: ${activity.longestStreak}`}
          />
          <Stat
            value={activity.activeDays}
            label="Active days"
            hint={
              activity.firstDay ? `Since ${activity.firstDay}` : 'Not started'
            }
          />
          <Stat
            value={summary.completedPoints}
            label="Points earned"
            hint="Hard pages are worth more"
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Activity</h2>
          <ProgressHeatmap activity={store?.activity} endDay={endDay} />
          <p className={styles.cardNote}>
            One square per day, darker for more pages finished. Time spent per
            day is recorded but not shown yet.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>By subject</h2>
          <div className={styles.rows}>
            {groupKeys.map((key) => {
              const group = manifest.groups[key];
              const got = summary.groups[key];
              return (
                <Row
                  key={key}
                  label={group.label}
                  done={got.completedPages}
                  total={group.pages}
                  points={got.completedPoints}
                  totalPoints={group.points}
                  href={nextHref[key]}
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
        </section>

        <section className={styles.footerCard}>
          <div>
            <h2 className={styles.cardTitle}>Your data</h2>
            <p className={styles.cardNote}>
              Progress lives in this browser, so it will not follow you to
              another device, and clearing your site data clears it. Accounts
              and sync are the next step.
            </p>
          </div>
          <button
            type="button"
            className={styles.reset}
            onClick={onReset}
            disabled={!ready}>
            Clear progress
          </button>
        </section>
      </main>
    </Layout>
  );
}
