import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {themes as prismThemes} from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkInterviewTurns from './src/remark/interviewTurns.mjs';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reads a `.env` beside this file, if there is one.
 *
 * Deliberately not a dependency. It handles KEY=value, blank lines, comments
 * and quotes, which is the whole of what this file ever needs to contain,
 * and the alternative is adding a package to the build for twenty lines.
 */
function readEnvFile() {
  const file = path.join(configDir, '.env');
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    if (key) out[key] = value;
  }
  return out;
}

const envFile = readEnvFile();

/** The real environment wins, so a deploy's settings are never overridden. */
const fromEnv = (name) => process.env[name] || envFile[name] || null;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'TopDown CS',
  tagline: 'Only what you need for the interview. Nothing else.',
  favicon: 'favicon.ico',

  headTags: [
    // Explicit ICO for Google favicon crawler
    {
      tagName: 'link',
      attributes: {
        rel: 'shortcut icon',
        href: '/favicon.ico',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '48x48',
        href: '/img/favicon-48x48.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '96x96',
        href: '/img/favicon-96x96.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/img/favicon-192x192.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/img/apple-touch-icon.png',
      },
    },
  ],

  // Supabase progress sync. Both values are read at BUILD time and baked into
  // the client bundle, so they live in the hosting provider's environment
  // settings, not in the repository. The anon key is designed to be public
  // and is only safe because row level security is enabled; see
  // supabase/schema.sql. Never put the service role key here: it bypasses RLS
  // entirely and would expose every user's data.
  //
  // Locally they come from site/.env instead, which is gitignored; copy
  // site/.env.example to start one. Without them the site has no accounts at
  // all, which is a perfectly good way to run it and also exactly what a
  // laptop missing the file looks like, so if sign in has vanished this is
  // the first thing to check.
  customFields: {
    supabaseUrl: fromEnv('SUPABASE_URL'),
    supabaseAnonKey: fromEnv('SUPABASE_ANON_KEY'),
  },

  url: 'https://topdowncs.com',
  baseUrl: '/',
  organizationName: 'jaicharan-dev',
  projectName: 'topdown-cs',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    }
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import('@easyops-cn/docusaurus-search-local').PluginOptions} */
      ({
        hashed: true,
        language: ['en'],
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        docsRouteBasePath: '/docs',
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        searchResultLimits: 10,
        searchResultContextMaxLength: 60,
        // Tolerate common typos (1-2 character mistakes) so a misspelled
        // query like "incapsulation" or "hahsmap" still surfaces matches
        // instead of a dead "no results" state.
        fuzzyMatchingDistance: 2,
      }),
    ],
  ],

  plugins: [
    function dsaStatsPlugin() {
      return {
        name: 'dsa-stats-generator',
        loadContent() {
          try {
            require('./scripts/generate-dsa-stats.js');
          } catch (e) {
            console.error('Failed to generate DSA stats:', e);
          }
        },
      };
    },
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          remarkPlugins: [remarkMath, remarkInterviewTurns],
          rehypePlugins: [rehypeKatex],
          // :::decision and :::broke are registered in src/theme/Admonition/Types.js
          admonitions: {
            keywords: ['decision', 'broke'],
            extendDefaults: true,
          },
        },
        blog: false,
        sitemap: {
          ignorePatterns: [
            '/docs/database-design/**',
          ],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
      type: 'text/css',
      integrity:
        'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
      crossorigin: 'anonymous',
    },
    {
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      type: 'text/css',
    },
  ],

  scripts: [
    '/js/toc-tooltip.js',
    {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4876306470624465',
      async: true,
      crossorigin: 'anonymous',
    }
  ],

  // Anybody who chose the light theme while there was one to choose still
  // has that choice in their browser, and the script the theme puts at the
  // top of the body would read it and set the page to a theme that no
  // longer has any styles behind it. This runs first, in the head, and
  // clears it, so that script finds nothing and falls back to the only
  // theme there is.
  //
  // Docusaurus stores the choice under "theme" plus a namespace of its own,
  // so the prefix is what has to go rather than one exact key.
  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `(function(){try{for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);if(k&&k.indexOf('theme')===0)localStorage.removeItem(k);}}catch(e){}})();`,
    },
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // One theme. The light one never looked like the same site: the
      // flowchart, the dot grid and the heatmap were all drawn against a
      // dark page and reading them on a pale one was a different product
      // wearing the same name. Rather than keep a second look that nobody
      // was happy with, the switch goes and so do the styles behind it.
      //
      // disableSwitch also removes the toggle the theme renders, in the
      // navbar and in the mobile drawer alike, so there is nothing left to
      // hide with CSS.
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      image: 'img/topdown-social-card.png',
      metadata: [
        {name: 'keywords', content: 'computer science, software engineering, coding interviews, operating systems, dbms, computer networks, object oriented programming, system design'},
        {property: 'og:site_name', content: 'TopDown CS'},
        {property: 'og:image:width', content: '1200'},
        {property: 'og:image:height', content: '630'},
        {property: 'og:image:alt', content: 'TopDown CS - Interview-Ready CS Fundamentals'},
        {name: 'twitter:card', content: 'summary_large_image'},
        {name: 'twitter:image:alt', content: 'TopDown CS - Interview-Ready CS Fundamentals'},
      ],
      navbar: {
        title: 'TopDown CS',
        logo: {
          alt: 'TopDown CS Logo',
          src: 'img/logo.png',
          srcDark: 'img/logo.png',
        },
        // Order matters here. The search bar is placed by hand rather than
        // left to the theme, which appends it last: the account belongs in
        // the far corner, and that is the only way to put anything after it.
        items: [
          // The homepage sections, as links. They are hidden from the bar on
          // every width and exist for the mobile drawer, which is where the
          // tab strip went: the theme already has a menu and a button to
          // open it, and a second row of tabs under a navbar on a phone is
          // one row too many. The homepage reads ?tab and opens the one it
          // names.
          //
          // A query rather than a hash because onBrokenAnchors only knows
          // about headings in MDX: an id that a React page owns is reported
          // as broken on every build, on every page that links to it.
          //
          // DSA leads, and is what the bare homepage opens on. It is the
          // section people come here for, and it was third behind two they
          // had to scroll past.
          {
            to: '/',
            label: 'DSA',
            position: 'left',
            className: 'csf-drawer-only',
            // All three are the homepage, so a path match marks every one of
            // them as the page you are on. A base nothing can match leaves
            // them all unmarked, which is the honest of the two answers: the
            // tab is a query, and the strip on the page says which one.
            activeBasePath: '/__no_match',
          },
          {
            to: '/?tab=cs',
            label: 'CS Fundamentals',
            position: 'left',
            className: 'csf-drawer-only',
            // All three are the homepage, so a path match marks every one of
            // them as the page you are on. A base nothing can match leaves
            // them all unmarked, which is the honest of the two answers: the
            // tab is a query, and the strip on the page says which one.
            activeBasePath: '/__no_match',
          },
          {
            to: '/?tab=system-design',
            label: 'System Design',
            position: 'left',
            className: 'csf-drawer-only',
            // All three are the homepage, so a path match marks every one of
            // them as the page you are on. A base nothing can match leaves
            // them all unmarked, which is the honest of the two answers: the
            // tab is a query, and the strip on the page says which one.
            activeBasePath: '/__no_match',
          },
          {
            to: '/progress',
            label: 'Progress',
            position: 'right',
            // Gives it the same pill the custom controls draw for
            // themselves, instead of bare text between two boxes, and the
            // same hover note as the controls beside it. Unknown props on a
            // navbar item are spread onto the link, which is what carries
            // the data attribute through.
            className: 'csf-nav-item csf-tip',
            'data-csf-tip':
              'Everything you have read, your rank, and your reading history',
          },
          // History has a button of its own on the homepage, which a phone
          // does not show, so in the drawer it is a row like the rest.
          {
            to: '/progress?at=history',
            label: 'History',
            position: 'right',
            className: 'csf-drawer-only',
            activeBasePath: '/__no_match',
          },
          // Custom kinds, defined in src/theme/NavbarItem/ComponentTypes.js.
          // Level and rank follow the reader around the site rather than
          // living only on a dashboard they have to go and find. On a phone
          // they are a row under the bar instead, so both of these render
          // nothing there.
          { type: 'custom-heatmap', position: 'right' },
          { type: 'custom-stats', position: 'right' },
          { type: 'search', position: 'right' },
          { type: 'custom-account', position: 'right' },
        ],
      },
      footer: {
        links: [
          {
            title: 'Legal',
            items: [
              { label: 'Privacy Policy', to: '/privacy-policy' },
              { label: 'Contact Us', to: '/contact' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} TopDown CS`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['java', 'python', 'javascript', 'cpp']
      },
    }),
};

export default config;


