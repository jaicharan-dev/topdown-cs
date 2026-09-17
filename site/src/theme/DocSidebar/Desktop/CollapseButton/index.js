import React from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';

export default function CollapseButton({onClick}) {
  return (
    <button
      type="button"
      title={translate({
        id: 'theme.docs.sidebar.collapseButtonTitle',
        message: 'Toggle sidebar',
        description: 'The title attribute for collapse button of doc sidebar',
      })}
      aria-label="Toggle sidebar"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        cursor: 'pointer',
        color: 'var(--ifm-color-emphasis-700)',
        background: 'transparent',
        border: 'none',
        borderRadius: '6px',
        transition: 'background 0.2s',
      }}
      onMouseOver={(e) => e.currentTarget.style.background = 'var(--ifm-color-emphasis-200)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
      </svg>
    </button>
  );
}
