import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, { useCallback, useEffect, useState } from 'react';
import DsaRoadmap from '../components/DsaRoadmap';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import { summarise } from '@site/src/lib/progressStore';

// --- Custom 2D Line-Art SVGs ---

const IconOOP = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Minimalist Isometric Cube representing an "Object" */}
    <polygon points="12 3 4 7.5 12 12 20 7.5 12 3" />
    <polyline points="4 7.5 4 16.5 12 21 12 12" />
    <polyline points="20 7.5 20 16.5 12 21" />
  </svg>
);

const IconDBMS = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);

const IconOS = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);

const IconCN = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <circle cx="5" cy="18" r="3" />
    <circle cx="19" cy="18" r="3" />
    <line x1="10.5" y1="7.5" x2="6.5" y2="15.5" />
    <line x1="13.5" y1="7.5" x2="17.5" y2="15.5" />
    <line x1="8" y1="18" x2="16" y2="18" />
  </svg>
);

const IconCodeTracing = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
    <circle cx="12" cy="12" r="2.5" />
    <line x1="13.5" y1="13.5" x2="15.5" y2="15.5" />
  </svg>
);

const IconDesignPatterns = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Architectural Layers */}
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
);

const IconDBDesign = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Table 1 */}
    <rect x="3" y="4" width="6" height="16" rx="1" />
    <line x1="3" y1="9" x2="9" y2="9" />
    <line x1="3" y1="14" x2="9" y2="14" />
    {/* Table 2 */}
    <rect x="15" y="4" width="6" height="16" rx="1" />
    <line x1="15" y1="9" x2="21" y2="9" />
    <line x1="15" y1="14" x2="21" y2="14" />
    {/* Crow's foot relationship (One-to-Many) */}
    <path d="M9 14h6" />
    <polyline points="12 11 15 14 12 17" />
  </svg>
);

const IconSystemDesign = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9" />
    <path d="M12 18v-5" />
    <path d="M12 15h6v3" />
    <path d="M12 15H6v3" />
    <rect x="3" y="18" width="6" height="4" rx="1" />
    <rect x="15" y="18" width="6" height="4" rx="1" />
  </svg>
);


const essentialsSubjects = [
  { title: 'OOP Essential', group: 'oop-essential', href: '/docs/oop-essential/1-four-pillars-of-oop', Icon: IconOOP, accentColor: '#60a5fa', comingSoon: false },
  { title: 'DBMS Essential', group: 'dbms-essential', href: '/docs/dbms-essential/1-what-is-a-transaction', Icon: IconDBMS, accentColor: '#a78bfa', comingSoon: false },
  { title: 'OS Essentials', group: 'os-essential', href: '/docs/os-essential/1-process-vs-thread', Icon: IconOS, accentColor: '#f59e0b', comingSoon: false },
  { title: 'CN Essential', group: 'cn-essential', href: '/docs/cn-essential/1-osi-model-tcp-ip', Icon: IconCN, accentColor: '#34d399', comingSoon: false },
];

const additionalsSubjects = [
  { title: 'OOP Additional', group: 'oop-additional', href: '/docs/oop-additional/19-static-binding-vs-dynamic-binding', Icon: IconOOP, accentColor: '#93c5fd', comingSoon: false },
  { title: 'DBMS Additional', group: 'dbms-additional', href: '/docs/dbms-additional/9-bcnf-vs-3nf', Icon: IconDBMS, accentColor: '#c4b5fd', comingSoon: false },
  { title: 'OS Additional', group: 'os-additional', href: '/docs/os-additional/1-priority-inversion-mars-rover', Icon: IconOS, accentColor: '#fbbf24', comingSoon: false },
  { title: 'CN Additional', group: 'cn-additional', href: '/docs/cn-additional/1-sessions-vs-jwt', Icon: IconCN, accentColor: '#6ee7b7', comingSoon: false },
];

const practiceSubjects = [
  { title: 'OS Problems', group: 'os-problems', href: '/docs/os-problems/1-cpu-scheduling-fcfs-sjf-srtf-round-robin', Icon: IconOS, accentColor: '#fb923c', comingSoon: false },
  { title: 'Design Patterns', group: 'design-patterns', href: '/docs/design-patterns/1-singleton-pattern', Icon: IconDesignPatterns, accentColor: '#38bdf8', comingSoon: false },
  { title: 'CN Problems', group: 'cn-problems', href: '/docs/cn-problems/1-subnetting', Icon: IconCN, accentColor: '#2dd4bf', comingSoon: false },
  { title: 'Code Tracing', group: 'code-tracing', href: '/docs/code-tracing/1-code-trace-static-instance-constructor', Icon: IconCodeTracing, accentColor: '#fb7185', comingSoon: false },
  { title: 'DB Design', group: 'database-design', href: '/docs/database-design/1-wallet-payment-system', Icon: IconDBDesign, accentColor: '#c084fc', comingSoon: false },
];

/**
 * The homepage tabs.
 *
 * Data driven because the plan is for this list to grow: SQL, ML, deep
 * learning and the rest each want a tab rather than another column. Adding
 * one should be an entry here and a panel below, not a layout change.
 *
 * `groups` names the manifest groups a tab covers, which drives the progress
 * underline on the tab itself.
 */
const TABS = [
  {
    id: 'cs',
    label: 'CS Fundamentals',
    groups: [
      ...essentialsSubjects,
      ...additionalsSubjects,
      ...practiceSubjects,
    ].map((subject) => subject.group),
  },
  { id: 'dsa', label: 'DSA', groups: ['dsa'] },
  { id: 'system-design', label: 'System Design', groups: [] },
];

const DEFAULT_TAB = TABS[0].id;

function useHomeTabs() {
  const [active, setActive] = useState(DEFAULT_TAB);

  // The hash is read after hydration, never during render. Reading it while
  // rendering would make the prerendered markup and the first client render
  // disagree whenever somebody opens a link to a tab.
  //
  // It is also followed afterwards, not just on mount. This is a single page
  // app, so arriving at a different hash often does not remount anything:
  // without the listener the URL would say one tab and the page would show
  // another, and the browser's back button would do nothing visible.
  useEffect(() => {
    const sync = () => {
      const fromHash = window.location.hash.replace(/^#/, '');
      if (TABS.some((tab) => tab.id === fromHash)) setActive(fromHash);
      else if (!fromHash) setActive(DEFAULT_TAB);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const select = useCallback((id) => {
    setActive(id);
    // replaceState rather than assigning location.hash: assigning would jump
    // the page to any element sharing that id, and would push a history entry
    // for every click, so Back would walk through tabs instead of leaving.
    const url = id === DEFAULT_TAB ? window.location.pathname : `#${id}`;
    window.history.replaceState(null, '', url);
  }, []);

  return [active, select];
}

/**
 * A subject card, with the reader's progress along its bottom edge.
 *
 * The bar appears only once there is something to show. A first time visitor
 * sees the homepage exactly as it was before progress tracking existed,
 * rather than fourteen cards all reporting zero, which would read as a list
 * of chores rather than an invitation.
 *
 * It is positioned absolutely, mirroring the accent tab on the top edge, so
 * it takes no layout space and cannot shift the card when it appears after
 * hydration.
 */
/**
 * A subject card, tinted by how much of it the reader has finished.
 *
 * The progress indicator IS the accent tab along the top edge, rather than a
 * second bar underneath it. Two lines in the same colour on one small card
 * read as decoration, not information, and nobody could tell which of them
 * meant something.
 *
 * Three states, each a step brighter, expressed in the same color-mix
 * vocabulary the cards already used for hover:
 *
 *   none      calm: a dim tab and a muted icon
 *   partial   the tab fills in, the tint and border come up
 *   complete  the accent at full strength, with a soft glow
 *
 * `--progress` drives the fill width in CSS, so the bar animates on its own
 * when the store loads instead of appearing fully grown.
 */
function CompactCard({title, href, Icon, accentColor, comingSoon, done = 0, total = 0}) {
  const ratio = total > 0 ? Math.min(1, done / total) : 0;
  const state = done >= total && total > 0 ? 'complete' : done > 0 ? 'partial' : 'none';
  const label =
    !comingSoon && total > 0 && done > 0
      ? `${title}, ${done} of ${total} done`
      : title;

  return (
    <Link
      to={href}
      className={`csf-compact-card ${comingSoon ? 'csf-compact-card--soon' : ''}`}
      style={{
        '--card-accent': accentColor,
        '--progress': ratio,
        // Written as a concrete value rather than left to CSS. The identical
        // calc works on the roadmap nodes but would not track --progress on
        // these cards: the filter kept resolving with the fallback even
        // though the variable computed correctly on the same element. Not
        // worth more digging when the component can simply state the answer.
        // Coming Soon is desaturated too. Excluding it left the one card
        // nobody can do as the most colourful unfinished thing on the page.
        // It stays distinguishable by its lower opacity and its badge, and
        // the hover preview deliberately skips it: there is nothing to
        // preview.
        filter: `saturate(${(0.08 + 0.92 * ratio).toFixed(3)})`,
      }}
      data-progress={comingSoon ? undefined : state}
      title={comingSoon ? 'Coming Soon' : label}
      aria-label={comingSoon ? `${title}, coming soon` : label}
      onClick={(e) => comingSoon && e.preventDefault()}
    >
      <div className="csf-compact-card__glow" aria-hidden="true" />
      <div className="csf-compact-card__icon">
        <Icon />
      </div>
      <div className="csf-compact-card__title">{title}</div>
      {comingSoon && <span className="csf-compact-card__badge">Soon</span>}
      {!comingSoon && done > 0 && (
        <span className="csf-compact-card__rail" aria-hidden="true" />
      )}
    </Link>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  const {store} = useProgress();
  const [activeTab, selectTab] = useHomeTabs();

  // Before hydration this is all zeros, so nothing is coloured in and the
  // server markup and the first client render agree.
  const summary = React.useMemo(() => summarise(store, manifest), [store]);

  const progressFor = (group) => {
    const got = summary.groups[group];
    const all = manifest.groups[group];
    return { done: got ? got.completedPages : 0, total: all ? all.pages : 0 };
  };

  /**
   * Totals for a tab, so each tab can show how far along its own content is.
   *
   * Tabs hide things: before them you could see your CS and DSA progress side
   * by side, and now you cannot. The underline on each tab gives that back.
   */
  const tabProgress = (tab) => {
    let done = 0;
    let total = 0;
    for (const group of tab.groups) {
      const all = manifest.groups[group];
      if (!all) continue;
      total += all.pages;
      done += progressFor(group).done;
    }
    return { done, total };
  };

  const onTabKeyDown = (event) => {
    const index = TABS.findIndex((tab) => tab.id === activeTab);
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    selectTab(TABS[next].id);
    const el = document.getElementById(`csf-tab-${TABS[next].id}`);
    if (el) el.focus();
  };

  const renderSection = (label, subjects) => (
    <div className="csf-section-group">
      <p className="csf-section-label">{label}</p>
      <div className="csf-compact-grid csf-compact-grid--wide">
        {subjects.map((subject) => (
          <CompactCard
            key={subject.title}
            {...subject}
            {...progressFor(subject.group)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Layout
      title="Interview-Ready CS Fundamentals"
      description="Interview-ready CS fundamentals. Not a textbook. Just the answers any interviewer would want to hear."
      wrapperClassName="homepage">

      {/* Hero */}
      <section className="csf-hero">
        <div className="csf-hero__glow" aria-hidden="true" />
        <h1 className="csf-hero__title">
          Top<span className="csf-hero__accent">Down</span> CS
        </h1>
        <p className="csf-hero__subtitle">
          Not a textbook. Not a course. Just the answers any interviewer would want to hear.
        </p>
      </section>

      <main className="csf-tabs">
        <div className="csf-tablist" role="tablist" aria-label="Content sections">
          {TABS.map((tab) => {
            const { done, total } = tabProgress(tab);
            const ratio = total > 0 ? Math.min(1, done / total) : 0;
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`csf-tab-${tab.id}`}
                className="csf-tab"
                aria-selected={selected}
                aria-controls={`csf-panel-${tab.id}`}
                /* Only the selected tab is in the tab order; the arrow keys
                   move between them, which is how a tablist is expected to
                   behave. */
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                onKeyDown={onTabKeyDown}>
                <span className="csf-tab__label">{tab.label}</span>
                {total > 0 && (
                  <span className="csf-tab__count">
                    {done} / {total}
                  </span>
                )}
                {done > 0 && (
                  <span
                    className="csf-tab__progress"
                    style={{ width: `${ratio * 100}%` }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Every panel stays in the markup and is hidden rather than
            unmounted, so all of the content is in the prerendered HTML for
            search engines and for anyone landing on a linked tab. */}
        <div
          role="tabpanel"
          id="csf-panel-cs"
          aria-labelledby="csf-tab-cs"
          className="csf-tabpanel"
          hidden={activeTab !== 'cs'}>
          {renderSection('Essentials', essentialsSubjects)}
          <div className="csf-section-divider" />
          {renderSection('Additionals', additionalsSubjects)}
          <div className="csf-section-divider" />
          {renderSection('Practice & Problems', practiceSubjects)}
        </div>

        <div
          role="tabpanel"
          id="csf-panel-dsa"
          aria-labelledby="csf-tab-dsa"
          className="csf-tabpanel"
          hidden={activeTab !== 'dsa'}>
          <p className="csf-section-label">DSA Roadmap</p>
          <DsaRoadmap />
        </div>

        <div
          role="tabpanel"
          id="csf-panel-system-design"
          aria-labelledby="csf-tab-system-design"
          className="csf-tabpanel"
          hidden={activeTab !== 'system-design'}>
          <div className="csf-soon-panel">
            <div className="csf-soon-panel__icon" aria-hidden="true">
              <IconSystemDesign />
            </div>
            <h2 className="csf-soon-panel__title">System Design is on the way</h2>
            <p className="csf-soon-panel__text">
              The same treatment as the rest of the site: the answer an
              interviewer actually wants, not a textbook chapter. Nothing to
              read here yet.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}

