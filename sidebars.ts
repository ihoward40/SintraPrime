import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/installation',
        'getting-started/quick-start-docker',
        'getting-started/quick-start-local',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'core-concepts/architecture-overview',
        'core-concepts/governance-model',
        'core-concepts/receipt-ledger',
        'core-concepts/agent-mode-engine',
        'core-concepts/workflow-runner',
      ],
    },
    {
      type: 'category',
      label: 'Agent System',
      items: [
        'agents/overview',
        'agents/howard-trust-navigator',
        'agents/sentinel-guard',
        'agents/general-purpose-agent',
        'agents/content-production-agent',
      ],
    },
    {
      type: 'category',
      label: 'Adapters & Integrations',
      items: [
        'adapters/overview',
        'adapters/gmail',
        'adapters/notion',
        'adapters/slack',
        'adapters/shell',
        'adapters/browser',
        'adapters/sms',
        'adapters/voice-transcription',
      ],
    },
    {
      type: 'category',
      label: 'Multi-Platform Bots',
      items: [
        'bots/overview',
        'bots/telegram',
        'bots/discord',
        'bots/facebook-instagram',
        'bots/whatsapp',
        'bots/tiktok',
      ],
    },
    {
      type: 'category',
      label: 'Evidence Systems',
      items: [
        'evidence-systems/lifecycle',
        'evidence-systems/email-ingest',
        'evidence-systems/web-snapshots',
        'evidence-systems/call-ingest',
        'evidence-systems/timeline-builder',
        'evidence-systems/narrative-generator',
      ],
    },
    {
      type: 'category',
      label: 'Kilo Skills',
      items: [
        'kilo-skills/overview',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/overview',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing/guide',
      ],
    },
  ],
  apiSidebar: [
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'api-reference/overview',
      ],
    },
  ],
};

export default sidebars;
