import React from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import Heading from '@theme/Heading';
import MDXContent from '@theme/MDXContent';
import ShareButton from '@site/src/components/ShareButton';
import CheckpointResume from '@site/src/components/Checkpoint/Resume';
import MarkComplete from '@site/src/components/MarkComplete';

function useSyntheticTitle() {
  const {metadata, frontMatter, contentTitle} = useDoc();
  const shouldRender =
    !frontMatter.hide_title && typeof contentTitle === 'undefined';
  if (!shouldRender) {
    return null;
  }
  return metadata.title;
}

export default function DocItemContent({children}) {
  const syntheticTitle = useSyntheticTitle();
  const {metadata, frontMatter} = useDoc();

  // The manifest keys on the bare frontmatter id (`4-crc-computation`), not
  // on metadata.id, which Docusaurus qualifies with the directory
  // (`cn-problems/4-crc-computation`). generate-content-manifest.js fails the
  // build if any page lacks a unique frontmatter id, so this is always set;
  // the fallback is only for a doc rendered outside that guarantee.
  const contentId =
    frontMatter?.id || metadata?.id?.split('/').pop() || null;

  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, 'markdown')}>
      {syntheticTitle && (
        <header className="csf-question-header">
          <Heading as="h1" className="csf-question-header__title">
            {syntheticTitle}
          </Heading>
          <ShareButton title={syntheticTitle} permalink={metadata.permalink} />
        </header>
      )}
      {/* Above the page, not below it: it exists to be seen before the
          reader starts scrolling for where they were. */}
      <CheckpointResume />
      <MDXContent>{children}</MDXContent>
      <MarkComplete contentId={contentId} />
    </div>
  );
}
