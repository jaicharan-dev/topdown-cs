import { translate } from "@docusaurus/Translate";
import { escapeHtml } from "@easyops-cn/docusaurus-search-local/dist/client/client/utils/escapeHtml";
import { iconNoResults } from "./icons";
import styles from "./SearchBar.module.css";

/**
 * Quick-navigation fallback shown when a query returns nothing, even with
 * fuzzy/typo-tolerant matching applied. Keeps a searcher moving instead of
 * hitting a dead end.
 */
const FALLBACK_SECTIONS = [
  { label: "OOP", href: "/docs/oop-essential/1-four-pillars-of-oop" },
  { label: "DBMS", href: "/docs/dbms-essential/1-what-is-a-transaction" },
  { label: "OS", href: "/docs/os-essential/1-process-vs-thread" },
  { label: "Networks", href: "/docs/cn-essential/1-osi-model-tcp-ip" },
  { label: "Design Patterns", href: "/docs/design-patterns/1-singleton-pattern" },
  { label: "DSA Roadmap", href: "/" },
];

export function EmptyTemplate({ query } = {}) {
  if (process.env.NODE_ENV !== "production") {
    return `<span class="${styles.noResults}">⚠️ The search index is only available when you run docusaurus build!</span>`;
  }

  const trimmedQuery = (query || "").trim();
  const heading = trimmedQuery
    ? translate(
        {
          id: "theme.SearchBar.noResultsTextForQuery",
          message: 'No matches for "{query}"',
        },
        { query: trimmedQuery }
      )
    : translate({
        id: "theme.SearchBar.noResultsText",
        message: "No results",
      });

  const hint = translate({
    id: "theme.SearchBar.noResultsHint",
    message: "Double-check the spelling, use a shorter word, or jump to a section:",
  });

  const chips = FALLBACK_SECTIONS.map(
    (section) =>
      `<a class="${styles.noResultsChip}" href="${section.href}">${escapeHtml(
        section.label
      )}</a>`
  ).join("");

  return [
    `<span class="${styles.noResults}">`,
    `<span class="${styles.noResultsIcon}">${iconNoResults}</span>`,
    `<span class="${styles.noResultsTitle}">${escapeHtml(heading)}</span>`,
    `<span class="${styles.noResultsHint}">${escapeHtml(hint)}</span>`,
    `<span class="${styles.noResultsChips}">${chips}</span>`,
    `</span>`,
  ].join("");
}
