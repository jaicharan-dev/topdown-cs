/**
 * The activity strip, folded into a navbar button that opens on hover.
 *
 * Hover alone would put it out of reach of a keyboard and of every phone, so
 * the panel also opens on focus within the button. A click does not open it:
 * a click goes to the activity section of the progress page, which is the
 * same thing at full size and is what every other control in this row does.
 *
 * The panel is centred on the window rather than hung off the button's right
 * edge. It is nearly a thousand pixels wide, so anchoring it to a control in
 * the corner pushed most of a year of reading off to one side.
 */

import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import YearHeatmap from '@site/src/components/YearHeatmap';
import useProgress from '@site/src/hooks/useProgress';
import useSession from '@site/src/hooks/useSession';
import { activityStats, today } from '@site/src/lib/progressStore';
import { formatDuration } from '@site/src/lib/timeTracker';
import styles from './styles.module.css';

export default function NavbarHeatmap({ mobile }) {
  const { ready, store } = useProgress();
  const { canSave } = useSession();

  // Today's date is read after mount, never during render: on a prerendered
  // page the server would stamp the grid with the build date.
  const [endDay, setEndDay] = useState(null);
  useEffect(() => setEndDay(today()), []);

  // Nothing to report without an account, and a level 1 beside an empty
  // year is a worse answer than no badge at all.
  if (!ready || !canSave) {
    return mobile ? null : (
      <span
        className={`csf-navbar-activity ${styles.placeholder}`}
        aria-hidden="true"
      />
    );
  }

  // Nothing on a phone: Activity is a button on the row under the bar,
  // drawn by MobileBar, and a menu entry for it as well would be the same
  // destination twice on one screen.
  if (mobile) return null;

  const stats = activityStats(store);

  return (
    <div className={`csf-navbar-activity ${styles.wrapper}`}>
      <Link
        to="/progress?at=activity"
        className={`csf-nav-item ${styles.trigger}`}
        aria-label="Your activity over the past year">
        {/* Four bars of different heights: a chart, at 14 pixels. */}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1.5" y="9" width="2.6" height="5.5" rx="1" />
          <rect x="5.4" y="5.5" width="2.6" height="9" rx="1" />
          <rect x="9.3" y="7.5" width="2.6" height="7" rx="1" />
          <rect x="13.2" y="3" width="2.6" height="11.5" rx="1" />
        </svg>
        <span className={styles.label}>Activity</span>
      </Link>

      <div className={styles.panel} role="group" aria-label="Activity">
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Past year</span>
          <span className={styles.panelMeta}>
            {formatDuration(stats.totalSeconds)} over {stats.activeDays} day
            {stats.activeDays === 1 ? '' : 's'}
          </span>
        </div>
        <YearHeatmap activity={store?.activity} endDay={endDay} compact />
      </div>
    </div>
  );
}
