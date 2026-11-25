import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import React, { useCallback, useEffect, useState } from 'react';
import CsRoadmap, { CS_GROUPS } from '../components/CsRoadmap';
import DsaRoadmap from '../components/DsaRoadmap';
import HomeStats from '@site/src/components/HomeStats';
import manifest from '@site/src/data/contentManifest.json';
import useProgress from '@site/src/hooks/useProgress';
import { summarise } from '@site/src/lib/progressStore';

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

/**
 * The homepage tabs.
 *
 * Data driven because the plan is for this list to grow: SQL, ML, deep
 * learning and the rest each want a tab rather than another column. Adding
 * one should be an entry here and a panel below, not a layout change.
 *
 * `groups` names the manifest groups a tab covers, which drives the progress
 * readout on the tab itself.
 */
const TABS = [
  { id: 'cs', label: 'CS Fundamentals', groups: CS_GROUPS },
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

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  const {store} = useProgress();
  const [activeTab, selectTab] = useHomeTabs();

  // Before hydration this is all zeros, so nothing is coloured in and the
  // server markup and the first client render agree.
  const summary = React.useMemo(() => summarise(store, manifest), [store]);

  /**
   * Totals for a tab, so each tab can show how far along its own content is.
   *
   * Tabs hide things: before them you could see your CS and DSA progress side
   * by side, and now you cannot. The readout on each tab gives that back.
   */
  const tabProgress = (tab) => {
    let done = 0;
    let total = 0;
    for (const group of tab.groups) {
      const all = manifest.groups[group];
      if (!all) continue;
      total += all.pages;
      done += summary.groups[group] ? summary.groups[group].completedPages : 0;
    }
    return { done, total };
  };

  const onTabKeyDown = (event) => {
    const index = TABS.findIndex((tab) => tab.id === activeTab);
    let next = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    selectTab(TABS[next].id);
    const el = document.getElementById(`csf-tab-${TABS[next].id}`);
    if (el) el.focus();
  };

  return (
    <Layout
      title="Interview-Ready CS Fundamentals"
      description="Interview-ready CS fundamentals. Not a textbook. Just the answers any interviewer would want to hear."
      wrapperClassName="homepage">

      <main className="csf-tabs">
        <div className="csf-rail">
          <p className="csf-rail__heading">Sections</p>
          <div
            className="csf-tablist"
            role="tablist"
            aria-label="Content sections"
            aria-orientation="vertical">
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
                  <span className="csf-tab__row">
                    <span className="csf-tab__label">{tab.label}</span>
                    {total > 0 ? (
                      <span className="csf-tab__count">
                        {done}/{total}
                      </span>
                    ) : (
                      /* A tab with nothing behind it yet says so, rather
                         than showing a blank where every other tab has a
                         number and looking like a loading failure. */
                      <span className="csf-tab__soon">Soon</span>
                    )}
                  </span>
                  {total > 0 && (
                    /* The track is drawn even at zero, so the tab shows how
                       much is left as well as how much is done. */
                    <span className="csf-tab__track" aria-hidden="true">
                      <span
                        className="csf-tab__fill"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Every panel stays in the markup and is hidden rather than
            unmounted, so all of the content is in the prerendered HTML for
            search engines and for anyone landing on a linked tab. */}
        <div className="csf-tabpanels">
          <div
            role="tabpanel"
            id="csf-panel-cs"
            aria-labelledby="csf-tab-cs"
            className="csf-tabpanel"
            hidden={activeTab !== 'cs'}>
            <CsRoadmap />
          </div>

          <div
            role="tabpanel"
            id="csf-panel-dsa"
            aria-labelledby="csf-tab-dsa"
            className="csf-tabpanel"
            hidden={activeTab !== 'dsa'}>
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
        </div>

        {/* Third column. It was reserved and empty, to balance the rail so
            the canvas sits on the page's centre line; the balance is the
            same now that there is something in it. */}
        <HomeStats />
      </main>
    </Layout>
  );
}
