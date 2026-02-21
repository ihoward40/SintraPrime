import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p style={{fontSize: '1.1rem', opacity: 0.75, maxWidth: 650, margin: '0 auto 1.5rem'}}>
          Institution-grade evidence lifecycle, cryptographic verification, and court-ready
          procedural memory engine. Built in Node.js/TypeScript. Apache 2.0 Licensed.
        </p>
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>150+</div>
            <div className={styles.statLabel}>Features</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>30</div>
            <div className={styles.statLabel}>Branches</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>4</div>
            <div className={styles.statLabel}>Agent Types</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>8+</div>
            <div className={styles.statLabel}>Adapters</div>
          </div>
        </div>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/introduction">
            Get Started &rarr;
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{marginLeft: '1rem', color: 'white', borderColor: 'rgba(255,255,255,0.4)'}}
            href="https://github.com/ihoward40/SintraPrime">
            View on GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

const features = [
  {
    title: 'Governed AI Agents',
    description: 'Multi-agent architecture with Howard Trust Navigator, SentinelGuard, and specialized agents — all operating under fail-closed governance with immutable receipt trails.',
    icon: '🛡️',
  },
  {
    title: 'Court-Ready Evidence',
    description: 'SHA-256 chained, Ed25519-signed evidence lifecycle. Timeline builder, narrative generator, and binder assembly produce court-admissible documentation.',
    icon: '⚖️',
  },
  {
    title: 'Multi-Platform Integration',
    description: 'Governed adapters for Gmail, Notion, Slack, Browser, Shell, and SMS. Multi-platform bot support for Telegram, Discord, WhatsApp, Facebook, Instagram, and TikTok.',
    icon: '🔗',
  },
  {
    title: 'Workflow Engine',
    description: 'YAML/JSON declarative automation with the Validator → Planner → Executor pipeline. Every operation is auditable and receipt-backed.',
    icon: '⚙️',
  },
  {
    title: 'Kilo Skills System',
    description: 'Extensible skills framework including Make.com blueprint generation, GitHub productization, and CI badge honesty enforcement.',
    icon: '🧩',
  },
  {
    title: 'Docker-Ready Deployment',
    description: 'Production-ready Docker Compose deployment with Airlock gateway, health checks, monitoring, and forensic logging built in.',
    icon: '🚀',
  },
];

function Feature({title, description, icon}: {title: string; description: string; icon: string}) {
  return (
    <div className={clsx('col col--4', styles.featureCol)}>
      <div className={styles.featureCard}>
        <div className={styles.featureIcon}>{icon}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — Governance OS for AI Agents`}
      description="Multi-Branch Governance OS for AI Agents. Institution-grade evidence lifecycle, cryptographic verification, and court-ready procedural memory engine.">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
        <section className={styles.ctaSection}>
          <div className="container" style={{textAlign: 'center', padding: '3rem 0'}}>
            <Heading as="h2">Ready to Build with SintraPrime?</Heading>
            <p style={{fontSize: '1.1rem', opacity: 0.8, maxWidth: 600, margin: '1rem auto'}}>
              Get up and running in under 15 minutes with Docker or local development setup.
            </p>
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started/quick-start-docker">
              Quick Start with Docker
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
