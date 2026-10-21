import React from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import Heading from '@theme/Heading';
import MDXContent from '@theme/MDXContent';
import ShareButton from '@site/src/components/ShareButton';

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

  // `prose: lab` in a doc's front matter opts that page into an alternate
  // typographic treatment, so a look can be tried on one page at a time
  // without touching the default styling of the other 180.
  const proseClass = frontMatter.prose ? `prose-${frontMatter.prose}` : null;

  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, 'markdown', proseClass)}>
      {syntheticTitle && (
        <header className="csf-question-header">
          <Heading as="h1" className="csf-question-header__title">
            {syntheticTitle}
          </Heading>
          <ShareButton title={syntheticTitle} permalink={metadata.permalink} />
        </header>
      )}
      <MDXContent>{children}</MDXContent>
    </div>
  );
}
