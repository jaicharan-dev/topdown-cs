import React, { useCallback, useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import { translate } from "@docusaurus/Translate";
import { usePluralForm } from "@docusaurus/theme-common";
import clsx from "clsx";
import useSearchQuery from "@easyops-cn/docusaurus-search-local/dist/client/client/theme/hooks/useSearchQuery";
import { fetchIndexesByWorker, searchByWorker } from "@easyops-cn/docusaurus-search-local/dist/client/client/theme/searchByWorker";
import { SearchDocumentType, } from "@easyops-cn/docusaurus-search-local/dist/client/shared/interfaces";
import { highlight } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/highlight";
import { highlightStemmed } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/highlightStemmed";
import { getStemmedPositions } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/getStemmedPositions";
import LoadingRing from "@easyops-cn/docusaurus-search-local/dist/client/client/theme/LoadingRing/LoadingRing";
import { concatDocumentPath } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/concatDocumentPath";
import { Mark, searchContextByPaths, useAllContextsWithNoSearchContext, } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/proxiedGenerated";
import styles from "./SearchPage.module.css";
import { normalizeContextByPath } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/normalizeContextByPath";
export default function SearchPage() {
    return (<Layout>
      <SearchPageContent />
    </Layout>);
}
function SearchPageContent() {
    const { siteConfig: { baseUrl }, i18n: { currentLocale }, } = useDocusaurusContext();
    const { selectMessage } = usePluralForm();
    const { searchValue, searchContext, searchVersion, updateSearchPath, updateSearchContext, } = useSearchQuery();
    const [searchQuery, setSearchQuery] = useState(searchValue);
    const [searchResults, setSearchResults] = useState();
    const versionUrl = `${baseUrl}${searchVersion}`;
    const pageTitle = useMemo(() => searchQuery
        ? translate({
            id: "theme.SearchPage.existingResultsTitle",
            message: 'Search results for "{query}"',
            description: "The search page title for non-empty query",
        }, {
            query: searchQuery,
        })
        : translate({
            id: "theme.SearchPage.emptyResultsTitle",
            message: "Search the documentation",
            description: "The search page title for empty query",
        }), [searchQuery]);
    useEffect(() => {
        updateSearchPath(searchQuery);
        if (searchQuery) {
            (async () => {
                const results = await searchByWorker(versionUrl, searchContext, searchQuery, 100);
                setSearchResults(results);
            })();
        }
        else {
            setSearchResults(undefined);
        }
        // `updateSearchPath` should not be in the deps,
        // otherwise will cause call stack overflow.
    }, [searchQuery, versionUrl, searchContext]);
    const handleSearchInputChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);
    useEffect(() => {
        if (searchValue && searchValue !== searchQuery) {
            setSearchQuery(searchValue);
        }
    }, [searchValue]);
    const [searchWorkerReady, setSearchWorkerReady] = useState(false);
    useEffect(() => {
        async function doFetchIndexes() {
            if (!Array.isArray(searchContextByPaths) ||
                searchContext ||
                useAllContextsWithNoSearchContext) {
                await fetchIndexesByWorker(versionUrl, searchContext);
            }
            setSearchWorkerReady(true);
        }
        doFetchIndexes();
    }, [searchContext, versionUrl]);
    return (<React.Fragment>
      <Head>
        {/*
         We should not index search pages
          See https://github.com/facebook/docusaurus/pull/3233
        */}
        <meta property="robots" content="noindex, follow"/>
        <title>{pageTitle}</title>
      </Head>

      <div className="container margin-vert--lg">
        <h1>{pageTitle}</h1>

        <div className="row">
          <div className={clsx("col", {
            [styles.searchQueryColumn]: Array.isArray(searchContextByPaths),
            "col--9": Array.isArray(searchContextByPaths),
            "col--12": !Array.isArray(searchContextByPaths),
        })}>
            <input type="search" name="q" className={styles.searchQueryInput} aria-label="Search" onChange={handleSearchInputChange} value={searchQuery} autoComplete="off" autoFocus/>
          </div>
          {Array.isArray(searchContextByPaths) ? (<div className={clsx("col", "col--3", "padding-left--none", styles.searchContextColumn)}>
              <select name="search-context" className={styles.searchContextInput} id="context-selector" value={searchContext} onChange={(e) => updateSearchContext(e.target.value)}>
                {useAllContextsWithNoSearchContext && (<option value="">
                    {translate({
                    id: "theme.SearchPage.searchContext.everywhere",
                    message: "Everywhere",
                })}
                  </option>)}
                {searchContextByPaths.map((context) => {
                const { label, path } = normalizeContextByPath(context, currentLocale);
                return (<option key={path} value={path}>
                      {label}
                    </option>);
            })}
              </select>
            </div>) : null}
        </div>

        {!searchWorkerReady && searchQuery && (<div className={styles.loadingRow}>
            <LoadingRing />
          </div>)}

        {searchResults && searchResults.length > 0 && (<p className={styles.resultCount}>
            {selectMessage(searchResults.length, translate({
                id: "theme.SearchPage.documentsFound.plurals",
                message: "1 document found|{count} documents found",
                description: 'Pluralized label for "{count} documents found". Use as much plural forms (separated by "|") as your language support (see https://www.unicode.org/cldr/cldr-aux/charts/34/supplemental/language_plural_rules.html)',
            }, { count: searchResults.length }))}
          </p>)}

        {searchResults && searchResults.length === 0 &&
            (process.env.NODE_ENV === "production" ? (<NoResults query={searchQuery} />) : (<p>
              ⚠️ The search index is only available when you run docusaurus
              build!
            </p>))}

        <section className={styles.resultList}>
          {searchResults &&
            searchResults.map((item) => (<SearchResultItem key={item.document.i} searchResult={item}/>))}
        </section>
      </div>
    </React.Fragment>);
}

const FALLBACK_SECTIONS = [
  { label: "OOP", href: "/docs/oop-essential/1-four-pillars-of-oop" },
  { label: "DBMS", href: "/docs/dbms-essential/1-what-is-a-transaction" },
  { label: "OS", href: "/docs/os-essential/1-process-vs-thread" },
  { label: "Networks", href: "/docs/cn-essential/1-osi-model-tcp-ip" },
  { label: "Design Patterns", href: "/docs/design-patterns/1-singleton-pattern" },
  { label: "DSA Roadmap", href: "/" },
];

function NoResults({ query }) {
  return (<div className={styles.noResults}>
      <p className={styles.noResultsTitle}>
        {query
            ? translate({
                id: "theme.SearchPage.noResultsTextForQuery",
                message: 'No matches for "{query}"',
            }, { query })
            : translate({
                id: "theme.SearchPage.noResultsText",
                message: "No documents were found",
            })}
      </p>
      <p className={styles.noResultsHint}>
        {translate({
            id: "theme.SearchPage.noResultsHint",
            message: "Double-check the spelling, use a shorter word, or jump to a section:",
        })}
      </p>
      <div className={styles.noResultsChips}>
        {FALLBACK_SECTIONS.map((section) => (<Link key={section.label} className={styles.noResultsChip} to={section.href}>
            {section.label}
          </Link>))}
      </div>
    </div>);
}
function SearchResultItem({ searchResult: { document, type, page, tokens, metadata }, }) {
    const isTitle = type === SearchDocumentType.Title;
    const isKeywords = type === SearchDocumentType.Keywords;
    const isDescription = type === SearchDocumentType.Description;
    const isDescriptionOrKeywords = isDescription || isKeywords;
    const isTitleRelated = isTitle || isDescriptionOrKeywords;
    const isContent = type === SearchDocumentType.Content;
    const pathItems = (isTitle ? document.b : page.b).slice();
    const articleTitle = (isContent || isDescriptionOrKeywords ? document.s : document.t);
    if (!isTitleRelated) {
        pathItems.push(page.t);
    }
    let search = "";
    if (Mark && tokens.length > 0) {
        const params = new URLSearchParams();
        for (const token of tokens) {
            params.append("_highlight", token);
        }
        search = `?${params.toString()}`;
    }
    return (<Link to={document.u + search + (document.h || "")} className={styles.searchResultItem}>
      {pathItems.length > 0 && (<p className={styles.searchResultItemPath}>
          {concatDocumentPath(pathItems)}
        </p>)}
      <h2 className={styles.searchResultItemTitle} dangerouslySetInnerHTML={{
            __html: isContent || isDescriptionOrKeywords
                ? highlight(articleTitle, tokens)
                : highlightStemmed(articleTitle, getStemmedPositions(metadata, "t"), tokens, 100),
        }}/>
      {(isContent || isDescription) && (<p className={styles.searchResultItemSummary} dangerouslySetInnerHTML={{
                __html: highlightStemmed(document.t, getStemmedPositions(metadata, "t"), tokens, 100),
            }}/>)}
    </Link>);
}
