/**
 * SintraPrime Open Source Tools Hub Router
 *
 * Provides data and search capabilities for the 10 top open-source tools
 * that replace paid software, covering hosting, AI voice, prompt testing,
 * RAG workflows, autonomous agents, database versioning, chatbot infrastructure,
 * meeting transcription, agent-native interfaces, and web automation.
 */

import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";

// ============================================================================
// STATIC DATA – 10 Open-Source Tools
// ============================================================================

export const OPEN_SOURCE_TOOLS = [
  {
    id: 1,
    name: "Coolify",
    slug: "coolify",
    tagline: "Self-Hostable PaaS — Own Your Deployments",
    category: "Hosting & Deployment",
    categorySlug: "hosting",
    replaces: "Vercel, Heroku, Netlify, Railway",
    githubUrl: "https://github.com/coollabsio/coolify",
    websiteUrl: "https://coolify.io",
    stars: "40k+",
    license: "Apache-2.0",
    badge: "Top Pick",
    badgeColor: "blue",
    icon: "Server",
    description:
      "Coolify is a fully open-source, self-hostable platform-as-a-service that gives developers the power of Vercel, Heroku, or Netlify on their own infrastructure — without the subscription fees. It supports deploying static sites, full-stack applications, databases (PostgreSQL, MySQL, Redis, MongoDB, and more), and 280+ one-click services directly from a clean web dashboard.",
    whyItMatters:
      "For indie hackers and startups, cloud PaaS costs can spiral quickly as traffic grows. Coolify eliminates per-seat and per-build pricing by running entirely on servers you control — a $5/month VPS can host dozens of projects. It also provides complete data sovereignty, making it attractive for teams with compliance or privacy requirements.",
    features: [
      "One-click deployment of static sites, Docker containers, and full-stack apps",
      "Built-in support for 280+ services including databases, caches, and queues",
      "Automatic SSL via Let's Encrypt and custom domain management",
      "Git-based CI/CD with GitHub, GitLab, and Bitbucket integrations",
      "Real-time build logs, rollback support, and environment variable management",
      "Multi-server and multi-team support with role-based access control",
      "Preview deployments for pull requests",
      "Webhooks and API for automation",
    ],
    useCases: [
      "Indie hackers deploying SaaS products without vendor lock-in",
      "Startups reducing cloud spend by self-hosting on bare-metal or VPS",
      "Agencies managing multiple client deployments from one dashboard",
      "Teams requiring GDPR-compliant, on-premise deployment pipelines",
    ],
    trend: "open-source PaaS",
  },
  {
    id: 2,
    name: "Fish Speech (Vish Speech)",
    slug: "fish-speech",
    tagline: "State-of-the-Art Open-Source Text-to-Speech",
    category: "AI Voice & TTS",
    categorySlug: "voice",
    replaces: "ElevenLabs, Murf, Play.ht, Azure TTS",
    githubUrl: "https://github.com/fishaudio/fish-speech",
    websiteUrl: "https://fish.audio",
    stars: "18k+",
    license: "CC-BY-NC-SA-4.0",
    badge: "God-Tier",
    badgeColor: "purple",
    icon: "Mic",
    description:
      "Fish Speech (also known in AI video communities as Vish Speech) is a state-of-the-art open-source text-to-speech system trained on over 10 million hours of audio across 50+ languages. Its latest model, OpenAudio S1, delivers voice synthesis quality that rivals — and in many benchmarks surpasses — leading paid APIs. It supports zero-shot voice cloning from a 10–30 second audio sample, making it ideal for narration, AI video workflows, and voice-enabled products.",
    whyItMatters:
      "Paid TTS APIs charge per character or per minute, making large-scale narration projects expensive. Fish Speech can be self-hosted on a GPU server, reducing per-unit costs to near zero. Its voice cloning capability means creators can build consistent brand voices or replicate narrators without ongoing API subscriptions.",
    features: [
      "Zero-shot and few-shot voice cloning from short audio samples",
      "50+ language support with natural prosody and emotion",
      "Streaming inference for low-latency real-time applications",
      "OpenAI-compatible API endpoint for drop-in replacement",
      "Emotion tags and tone control (whisper, shout, laugh)",
      "4B-parameter flagship model with SOTA benchmark scores",
      "Docker and Python deployment options",
      "REST API and Python SDK for integration",
    ],
    useCases: [
      "AI video creators generating narration without per-minute API fees",
      "Podcast and audiobook producers building automated pipelines",
      "Developers building voice assistants and conversational AI products",
      "Accessibility tools requiring high-quality multilingual speech synthesis",
    ],
    trend: "open-source TTS",
  },
  {
    id: 3,
    name: "Promptfoo",
    slug: "promptfoo",
    tagline: "LLM Evals, Red Teaming & Vulnerability Scanning",
    category: "AI Testing & Security",
    categorySlug: "testing",
    replaces: "Custom eval frameworks, Giskard, proprietary red-team tools",
    githubUrl: "https://github.com/promptfoo/promptfoo",
    websiteUrl: "https://www.promptfoo.dev",
    stars: "6k+",
    license: "MIT",
    badge: "Security",
    badgeColor: "red",
    icon: "ShieldCheck",
    description:
      "Promptfoo is a comprehensive open-source testing and evaluation framework for LLM applications, prompts, agents, and RAG pipelines. It enables developers and security teams to run automated evaluations, compare model outputs side-by-side, and conduct red-team penetration tests to discover vulnerabilities before deployment. It supports GPT, Claude, Gemini, Llama, and virtually any model provider.",
    whyItMatters:
      "As AI applications move into production, the risk of prompt injection, data exfiltration, jailbreaks, and unsafe outputs grows significantly. Promptfoo provides a structured, repeatable way to test for 50+ vulnerability types — replacing ad-hoc manual testing with automated, CI/CD-integrated safety evaluation. It was recently acquired by OpenAI, underscoring its importance to the AI security ecosystem.",
    features: [
      "Automated prompt evaluation with custom assertion types",
      "Side-by-side model comparison (GPT vs Claude vs Gemini vs Llama)",
      "Red teaming with 50+ vulnerability probes (prompt injection, jailbreaks, PII leakage)",
      "RAG pipeline evaluation for retrieval quality and answer faithfulness",
      "CI/CD integration via CLI and GitHub Actions",
      "LLM vulnerability scanner for codebases",
      "Safety evaluation for toxicity, bias, and harmful content",
      "YAML-based configuration for reproducible test suites",
    ],
    useCases: [
      "AI engineers evaluating prompt quality across model versions",
      "Security teams red-teaming LLM-powered applications before launch",
      "Enterprises ensuring compliance with AI safety policies",
      "Researchers comparing model performance on domain-specific benchmarks",
    ],
    trend: "LLM red teaming",
  },
  {
    id: 4,
    name: "OpenRAG",
    slug: "openrag",
    tagline: "End-to-End Agentic RAG Platform",
    category: "RAG & Knowledge AI",
    categorySlug: "rag",
    replaces: "Perplexity for Teams, Glean, Notion AI, Guru",
    githubUrl: "https://github.com/langflow-ai/openrag",
    websiteUrl: "https://docs.openr.ag",
    stars: "3k+",
    license: "MIT",
    badge: "New",
    badgeColor: "green",
    icon: "Database",
    description:
      "OpenRAG is a comprehensive, end-to-end Retrieval-Augmented Generation platform that enables intelligent document search and AI-powered conversations over your own data. Users can upload documents in any format, process them through configurable chunking and embedding pipelines, and query them via a chat interface. Its agentic workflow engine and drag-and-drop builder make it accessible to both developers and non-technical users.",
    whyItMatters:
      "Hosted knowledge-assistant platforms charge per seat and per query, making them expensive for teams with large document libraries. OpenRAG provides full visibility and control over every component of the RAG pipeline — from document parsing and chunking to vector indexing and retrieval — enabling teams to build production-grade knowledge assistants without vendor lock-in.",
    features: [
      "Document ingestion supporting PDF, DOCX, TXT, HTML, and more",
      "Configurable chunking strategies and embedding model selection",
      "Agentic workflows with tool use and multi-step reasoning",
      "Drag-and-drop pipeline builder for no-code RAG construction",
      "Multi-LLM support (OpenAI, Anthropic, local models via Ollama)",
      "Vector database integrations (Pinecone, Weaviate, Chroma, pgvector)",
      "REST API for programmatic document ingestion and querying",
      "Conversation memory and session management",
    ],
    useCases: [
      "Teams building internal knowledge bases over proprietary documents",
      "Legal and compliance teams querying large document repositories",
      "Customer support automation over product documentation",
      "Researchers building domain-specific AI assistants",
    ],
    trend: "agentic RAG",
  },
  {
    id: 5,
    name: "DeerFlow 2.0",
    slug: "deerflow",
    tagline: "Open-Source SuperAgent Harness by ByteDance",
    category: "Autonomous Agents",
    categorySlug: "agents",
    replaces: "Devin, AutoGPT Pro, Manus paid tiers",
    githubUrl: "https://github.com/bytedance/deer-flow",
    websiteUrl: "https://deerflow.tech",
    stars: "12k+",
    license: "MIT",
    badge: "God-Tier",
    badgeColor: "orange",
    icon: "Zap",
    description:
      "DeerFlow 2.0, released by ByteDance, is a fully open-source SuperAgent harness that transforms complex goals into seamless autonomous executions. Built on LangGraph and LangChain, it orchestrates sub-agents with access to sandboxed code execution, persistent memory, modular skills, and external tools. It hit #1 on GitHub Trending on launch day and represents the state of the art in self-hostable autonomous agent frameworks.",
    whyItMatters:
      "Paid autonomous agent platforms charge premium subscription fees for capabilities that DeerFlow provides for free. By running on your own infrastructure, you retain full control over agent behavior, data privacy, and cost. The harness architecture — batteries included, fully extensible — means teams can deploy research, coding, and content-creation agents without writing orchestration code from scratch.",
    features: [
      "Sub-agent orchestration with LangGraph-based state machines",
      "Sandboxed code execution (local process, Docker, or E2B)",
      "Persistent memory across agent sessions",
      "Modular skill system for extending agent capabilities",
      "Built-in tools: web search, file system, code interpreter, browser",
      "Multi-modal support (text, images, documents)",
      "REST API and web UI for agent management",
      "Three sandbox modes for flexible security profiles",
    ],
    useCases: [
      "Developers automating research, coding, and report generation",
      "Startups building autonomous AI employees for repetitive workflows",
      "Researchers experimenting with multi-agent architectures",
      "Teams replacing expensive paid agent platforms with self-hosted alternatives",
    ],
    trend: "autonomous agents",
  },
  {
    id: 6,
    name: "Dolt",
    slug: "dolt",
    tagline: "Git for Data — Version-Controlled SQL Database",
    category: "Database & Data Versioning",
    categorySlug: "database",
    replaces: "Custom migration tools, Liquibase Pro, Flyway Enterprise",
    githubUrl: "https://github.com/dolthub/dolt",
    websiteUrl: "https://dolthub.com",
    stars: "18k+",
    license: "Apache-2.0",
    badge: "Unique",
    badgeColor: "teal",
    icon: "GitBranch",
    description:
      "Dolt is a SQL database that you can fork, clone, branch, merge, push, and pull — just like a Git repository. It connects like any MySQL database but adds a complete version-control layer to your structured data. Teams can create feature branches for schema changes, merge data from different sources, audit the full history of every row, and roll back to any previous state with a single SQL call.",
    whyItMatters:
      "Database schema and data migrations are among the riskiest operations in software development. Dolt brings the safety net of Git branching to data, enabling teams to experiment with schema changes on branches, review diffs before merging, and maintain a complete audit trail — capabilities that previously required expensive enterprise tooling or complex custom solutions.",
    features: [
      "Full Git semantics: branch, merge, diff, log, rebase for SQL data",
      "MySQL-compatible wire protocol — connect with any MySQL client",
      "Row-level diffs and commit history queryable via SQL",
      "DoltHub: a GitHub-like platform for sharing and collaborating on datasets",
      "Merge conflict detection and resolution for data",
      "Interactive rebase support for data history rewriting",
      "CLI and Go API for scripting and automation",
      "Doltgres: a PostgreSQL-compatible variant",
    ],
    useCases: [
      "Engineering teams managing database schema changes collaboratively",
      "Data teams versioning ML training datasets and feature stores",
      "Compliance teams maintaining immutable audit trails for regulated data",
      "Open data publishers sharing versioned public datasets via DoltHub",
    ],
    trend: "database versioning",
  },
  {
    id: 7,
    name: "AstrBot",
    slug: "astrbot",
    tagline: "All-in-One Agentic Chatbot Infrastructure",
    category: "Chatbot & Messaging",
    categorySlug: "chatbot",
    replaces: "Intercom, Drift, ManyChat, Botpress Cloud",
    githubUrl: "https://github.com/AstrBotDevs/AstrBot",
    websiteUrl: "https://astrbot.app",
    stars: "5k+",
    license: "AGPL-3.0",
    badge: "Multi-Platform",
    badgeColor: "indigo",
    icon: "Bot",
    description:
      "AstrBot is an open-source, all-in-one agentic chatbot platform and development framework that integrates with mainstream instant messaging applications including Telegram, Discord, Slack, QQ, and WeChat. It supports RAG-powered knowledge retrieval, multi-channel plugin architecture, a visual management interface, and agent orchestration — making it a comprehensive substitute for commercial chatbot infrastructure.",
    whyItMatters:
      "Commercial chatbot platforms charge per conversation, per seat, or per integration, creating unpredictable costs at scale. AstrBot provides the full stack — multi-platform connectivity, LLM integration, RAG, and agent orchestration — in a single self-hostable package. Its visual management interface lowers the barrier for non-developers to configure and deploy intelligent bots.",
    features: [
      "Multi-platform support: Telegram, Discord, Slack, QQ, WeChat, and more",
      "RAG integration for knowledge-base-powered responses",
      "Plugin architecture for extending functionality per channel",
      "Visual web management interface for bot configuration",
      "Agent orchestration with tool use and multi-step reasoning",
      "LLM provider flexibility (OpenAI, Anthropic, local models)",
      "Conversation history and session management",
      "Docker deployment for easy self-hosting",
    ],
    useCases: [
      "Communities deploying intelligent bots across Discord and Telegram",
      "Businesses automating customer support across multiple messaging channels",
      "Developers building multi-platform AI assistants with shared context",
      "Teams replacing expensive commercial chatbot subscriptions",
    ],
    trend: "agentic chatbot",
  },
  {
    id: 8,
    name: "OpenUtter",
    slug: "openutter",
    tagline: "Headless Google Meet Bot for Transcription",
    category: "Meeting Transcription",
    categorySlug: "transcription",
    replaces: "Otter.ai, Fireflies.ai, Grain, MeetGeek",
    githubUrl: "https://github.com/openclaw/openutter",
    websiteUrl: "https://openclaw.report/ecosystem/openutter-meeting-bot",
    stars: "1k+",
    license: "MIT-0",
    badge: "Free",
    badgeColor: "green",
    icon: "Video",
    description:
      "OpenUtter is an open-source headless Google Meet bot that joins meetings programmatically, captures live captions in real time, and produces full transcripts and screenshots — all without requiring a visible browser window. It is designed to integrate with AI agent frameworks like OpenClaw, enabling agents to attend meetings, extract information, and act on meeting content autonomously.",
    whyItMatters:
      "Paid meeting transcription services charge per hour of audio or per seat, making them expensive for teams with high meeting volumes. OpenUtter provides the same core capability — joining meetings and capturing transcripts — for free, with MIT-0 licensing that requires no attribution. Its headless design makes it ideal for automated pipelines where no human operator is present.",
    features: [
      "Headless Google Meet participation without a visible browser",
      "Real-time live caption capture and transcript generation",
      "Screenshot capture at configurable intervals",
      "Transcript storage organized by meeting ID",
      "Integration with AI agent frameworks (OpenClaw, custom agents)",
      "MIT-0 license — free to use, modify, and redistribute without attribution",
      "Lightweight Node.js implementation",
      "Webhook support for post-meeting processing",
    ],
    useCases: [
      "Teams automating meeting notes and action item extraction",
      "AI agents attending meetings on behalf of users",
      "Researchers capturing and analyzing meeting content at scale",
      "Creators building meeting intelligence tools without API fees",
    ],
    trend: "meeting transcription",
  },
  {
    id: 9,
    name: "CLI-Anything",
    slug: "cli-anything",
    tagline: "Make ALL Software Agent-Native",
    category: "Agent-Native Interfaces",
    categorySlug: "agent-native",
    replaces: "Custom API wrappers, MCP servers, proprietary tool integrations",
    githubUrl: "https://github.com/HKUDS/CLI-Anything",
    websiteUrl: "https://clianything.net",
    stars: "2k+",
    license: "MIT",
    badge: "Emerging",
    badgeColor: "yellow",
    icon: "Terminal",
    description:
      "CLI-Anything is a groundbreaking project from HKUDS that makes any software agent-native by wrapping command-line interfaces into structured, discoverable tools that both humans and AI agents can operate. Feed it documentation or SDK manuscripts and it generates a powerful, stateful CLI that wraps individual endpoints into coherent agent-ready interfaces — bridging the gap between the world's software and AI automation.",
    whyItMatters:
      "The vast majority of software was not designed with AI agents in mind. CLI-Anything addresses this by providing a universal adapter layer that transforms any CLI or API into an agent-compatible tool. This eliminates the need to write custom MCP servers or API wrappers for every tool an agent needs to use, dramatically accelerating the development of agent-powered workflows.",
    features: [
      "Automatic CLI generation from documentation or SDK manuscripts",
      "Stateful CLI wrapping for complex multi-step workflows",
      "Structured, discoverable tool interfaces for AI agents",
      "Support for OpenClaw, LangChain, and other agent frameworks",
      "One-command setup for any codebase",
      "Human-readable and machine-readable output formats",
      "Plugin architecture for custom tool adapters",
      "Active development with frequent releases",
    ],
    useCases: [
      "Developers making existing CLI tools accessible to AI agents",
      "Teams building agent workflows over legacy software without APIs",
      "AI engineers reducing boilerplate in tool integration code",
      "Researchers exploring agent-native software design patterns",
    ],
    trend: "agent-native interfaces",
  },
  {
    id: 10,
    name: "LightPanda Browser",
    slug: "lightpanda",
    tagline: "Headless Browser Built for AI Agents",
    category: "Web Automation",
    categorySlug: "automation",
    replaces: "Playwright, Puppeteer, Selenium for headless use cases",
    githubUrl: "https://github.com/lightpanda-io/browser",
    websiteUrl: "https://lightpanda.io",
    stars: "4k+",
    license: "AGPL-3.0",
    badge: "9x Faster",
    badgeColor: "orange",
    icon: "Globe",
    description:
      "LightPanda is an open-source headless browser written from scratch in Zig, designed specifically for AI agents and automation tasks. It strips away all graphical rendering while retaining full JavaScript execution, DOM manipulation, and web API support. Benchmarks show it uses 9x less memory and executes 11x faster than Chrome in headless mode — making it the most efficient option for large-scale scraping, testing, and AI agent web browsing.",
    whyItMatters:
      "Traditional headless browsers like Chrome and Firefox carry enormous overhead from their graphical rendering engines — overhead that is entirely wasted in automation contexts. LightPanda's ground-up redesign eliminates this waste, enabling AI agents to browse the web at scale with a fraction of the compute resources. This is particularly valuable for LLM training data collection, web agent evaluation, and high-throughput scraping pipelines.",
    features: [
      "9x lower memory footprint than Chrome headless",
      "11x faster execution than Chrome in automation benchmarks",
      "Full JavaScript execution with V8-compatible engine",
      "Complete DOM API support for reliable scraping",
      "CDP (Chrome DevTools Protocol) compatibility for existing tooling",
      "Playwright and Puppeteer API compatibility layer",
      "Built in Zig for maximum performance and minimal dependencies",
      "Active development with growing community",
    ],
    useCases: [
      "AI agents browsing the web for research and data collection",
      "Large-scale web scraping pipelines requiring low resource usage",
      "CI/CD test suites needing fast, lightweight browser automation",
      "LLM training data collection at scale",
    ],
    trend: "headless browser",
  },
];

export const TOOL_CATEGORIES = [
  { id: "all", label: "All Tools", count: 10 },
  { id: "hosting", label: "Hosting & Deployment", count: 1 },
  { id: "voice", label: "AI Voice & TTS", count: 1 },
  { id: "testing", label: "AI Testing & Security", count: 1 },
  { id: "rag", label: "RAG & Knowledge AI", count: 1 },
  { id: "agents", label: "Autonomous Agents", count: 1 },
  { id: "database", label: "Database Versioning", count: 1 },
  { id: "chatbot", label: "Chatbot & Messaging", count: 1 },
  { id: "transcription", label: "Meeting Transcription", count: 1 },
  { id: "agent-native", label: "Agent-Native Interfaces", count: 1 },
  { id: "automation", label: "Web Automation", count: 1 },
];

// ============================================================================
// ROUTER
// ============================================================================

export const openSourceToolsRouter = router({
  /**
   * List all tools, optionally filtered by category or search query
   */
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        query: z.string().optional(),
      }).optional()
    )
    .query(({ input }) => {
      let tools = OPEN_SOURCE_TOOLS;

      if (input?.category && input.category !== "all") {
        tools = tools.filter((t) => t.categorySlug === input.category);
      }

      if (input?.query) {
        const q = input.query.toLowerCase();
        tools = tools.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.tagline.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.replaces.toLowerCase().includes(q) ||
            t.features.some((f) => f.toLowerCase().includes(q)) ||
            t.useCases.some((u) => u.toLowerCase().includes(q))
        );
      }

      return tools;
    }),

  /**
   * Get a single tool by slug
   */
  get: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const tool = OPEN_SOURCE_TOOLS.find((t) => t.slug === input.slug);
      if (!tool) return null;
      return tool;
    }),

  /**
   * Get all categories with counts
   */
  categories: publicProcedure.query(() => {
    return TOOL_CATEGORIES;
  }),

  /**
   * Get summary stats for the overview banner
   */
  stats: publicProcedure.query(() => {
    return {
      totalTools: OPEN_SOURCE_TOOLS.length,
      totalCategories: TOOL_CATEGORIES.length - 1, // exclude "all"
      totalStars: "100k+",
      lastUpdated: new Date().toISOString(),
    };
  }),
});
