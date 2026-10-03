import {themes as prismThemes} from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
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
        'sha384-odtC+0UGzz0/GqGqcZJmji9jsl71T08IQHTcgFoaGg++I1I6IijvA7B9PFOhQO1F',
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

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
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
        items: [],
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


