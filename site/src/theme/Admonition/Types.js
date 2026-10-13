import React from 'react';
import DefaultAdmonitionTypes from '@theme-original/Admonition/Types';
import AdmonitionLayout from '@theme/Admonition/Layout';

/**
 * Two extra admonition types for the interview walkthroughs.
 *
 * `:::decision` marks a why-this-and-not-that moment. These are the whole value
 * of a schema-design page and they used to read as flat prose.
 *
 * `:::broke` marks the moment a requirement invalidates something already on
 * the board — the design actually changing, not just being explained.
 *
 * Registered here rather than left as unknown types, which Docusaurus renders
 * as `info` with a console warning.
 */

const IconDecision = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3v7a3 3 0 0 0 3 3h9" />
    <path d="M6 21v-7" />
    <path d="M15 10l3 3-3 3" />
  </svg>
);

const IconBroke = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 2L6 13h5l-1 9 7-11h-5l1-9z" />
  </svg>
);

function AdmonitionDecision(props) {
  return (
    <AdmonitionLayout
      icon={<IconDecision />}
      title="Decision"
      {...props}
      className={['alert', 'csf-admonition--decision', props.className]
        .filter(Boolean)
        .join(' ')}
    >
      {props.children}
    </AdmonitionLayout>
  );
}

function AdmonitionBroke(props) {
  return (
    <AdmonitionLayout
      icon={<IconBroke />}
      title="This breaks the design"
      {...props}
      className={['alert', 'csf-admonition--broke', props.className]
        .filter(Boolean)
        .join(' ')}
    >
      {props.children}
    </AdmonitionLayout>
  );
}

export default {
  ...DefaultAdmonitionTypes,
  decision: AdmonitionDecision,
  broke: AdmonitionBroke,
};
