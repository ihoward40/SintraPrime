import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SintraPrime',
  tagline: 'Multi-Branch Governance OS for AI Agents',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  url: 'https://ihoward40.github.io',
  baseUrl: '/SintraPrime/',

  organizationName: 'ihoward40',
  projectName: 'SintraPrime',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/ihoward40/SintraPrime/tree/gh-pages-source/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/ihoward40/SintraPrime/tree/gh-pages-source/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/sintraprime-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    announcementBar: {
      id: 'v2_release',
      content: '🚀 SintraPrime v2.0 is here — 150+ features, 30 branches, court-ready governance. <a href="/SintraPrime/docs/getting-started/introduction">Get Started →</a>',
      backgroundColor: '#0d9488',
      textColor: '#ffffff',
      isCloseable: true,
    },
    navbar: {
      title: 'SintraPrime',
      logo: {
        alt: 'SintraPrime Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API',
        },
        {
          href: 'https://github.com/ihoward40/SintraPrime',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Getting Started', to: '/docs/getting-started/introduction'},
            {label: 'Architecture', to: '/docs/core-concepts/architecture-overview'},
            {label: 'Governance', to: '/docs/core-concepts/governance-model'},
          ],
        },
        {
          title: 'Systems',
          items: [
            {label: 'Agent System', to: '/docs/agents/overview'},
            {label: 'Evidence Systems', to: '/docs/evidence-systems/lifecycle'},
            {label: 'Adapters', to: '/docs/adapters/overview'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'GitHub', href: 'https://github.com/ihoward40/SintraPrime'},
            {label: 'Contributing', to: '/docs/contributing/guide'},
            {label: 'Blog', to: '/blog'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Isiah Howard. SintraPrime — Apache 2.0 License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'typescript', 'docker'],
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
