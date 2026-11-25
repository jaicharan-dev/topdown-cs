/**
 * The activity strip, folded into a navbar button that opens on hover.
 *
 * Hover alone would put it out of reach of a keyboard and of every phone, so
 * the panel also opens on focus within the button and on a click. Touch
 * devices send a click, not a hover, which is what makes the same control
 * work in both places.
 */

import React, { useEffect, useRef, useState } from 'react';
import YearHeatmap from '@site/src/components/YearHeatmap';
import useProgress from '@site/src/hooks/useProgress';
import { today } from '@site/src/lib/progressStore';
import styles from './styles.module.css';

export default function NavbarHeatmap() {
  const { ready, store } = useProgress();
  const [pinned, setPinned] = useState(false);
  const wrapperRef = useRef(null);

  // Today's date is read after mount, never during render: on a prerendered
  // page the server would stamp the grid with the build date.
  const [endDay, setEndDay] = useState(null);
  useEffect(() => setEndDay(today()), []);

  useEffect(() => {
    if (!pinned) return undefined;
    const onPointer = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setPinned(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setPinned(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  if (!ready) return <span className={styles.placeholder} aria-hidden="true" />;

  return (
    <div
      className={styles.wrapper}
      ref={wrapperRef}
      data-pinned={pinned ? 'true' : 'false'}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={pinned}
        aria-label="Your activity over the past year"
        onClick={() => setPinned((value) => !value)}>
        {/* Four bars of different heights: a chart, at 16 pixels. */}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1.5" y="9" width="2.6" height="5.5" rx="1" />
          <rect x="5.4" y="5.5" width="2.6" height="9" rx="1" />
          <rect x="9.3" y="7.5" width="2.6" height="7" rx="1" />
          <rect x="13.2" y="3" width="2.6" height="11.5" rx="1" />
        </svg>
        <span className={styles.label}>Activity</span>
      </button>

      <div className={styles.panel} role="group" aria-label="Activity">
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Past year</span>
        </div>
        <YearHeatmap activity={store?.activity} endDay={endDay} compact />
      </div>
    </div>
  );
}
