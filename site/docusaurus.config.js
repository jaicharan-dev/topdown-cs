import {themes as prismThemes} from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'TopDown CS',
  tagline: 'Only what you need for the interview. Nothing else.',
  favicon: 'img/favicon-rounded.png',

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
          ignorePatterns: ['/docs/cn/**', '/docs/dbms/**', '/docs/os/**'],
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
    {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXX',
      async: true,
      crossorigin: 'anonymous',
    }
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      image: 'img/topdown-social-card.png',
      metadata: [
        {name: 'keywords', content: 'computer science, software engineering, coding interviews, object oriented programming, system design, dbms'}
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
        style: 'dark',
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


