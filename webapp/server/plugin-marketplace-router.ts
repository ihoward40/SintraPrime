/**
 * SintraPrime Plugin Marketplace Router
 * Browse, install, configure, and manage plugins that extend SintraPrime.
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { plugins, userPlugins } from "../drizzle/schema-comprehensive-features";
import { eq, and, like, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Curated built-in plugin catalog
const BUILT_IN_PLUGINS = [
  {
    slug: "pacer-monitor",
    name: "PACER Court Monitor",
    description: "Real-time monitoring of PACER federal court filings with automatic alerts for case updates.",
    category: "legal" as const,
    author: "SintraPrime",
    version: "2.1.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 342,
    downloads: 1820,
    verified: true,
    tags: ["pacer", "court", "federal", "monitoring"],
  },
  {
    slug: "ai-case-summarizer",
    name: "AI Case Summarizer",
    description: "Automatically generates executive summaries for all your cases using GPT-4o. Includes timeline, key parties, and strategy overview.",
    category: "ai" as const,
    author: "SintraPrime",
    version: "1.5.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 518,
    downloads: 3240,
    verified: true,
    tags: ["ai", "summary", "gpt4", "case"],
  },
  {
    slug: "deadline-predictor",
    name: "Smart Deadline Predictor",
    description: "Uses AI to predict upcoming deadlines based on case type, jurisdiction, and filing history. Integrates with your calendar.",
    category: "ai" as const,
    author: "SintraPrime",
    version: "1.2.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 289,
    downloads: 1560,
    verified: true,
    tags: ["deadlines", "calendar", "prediction", "ai"],
  },
  {
    slug: "slack-notifications",
    name: "Slack Notifications",
    description: "Send case updates, deadline reminders, and AI insights directly to your Slack workspace.",
    category: "integration" as const,
    author: "SintraPrime",
    version: "1.0.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 156,
    downloads: 890,
    verified: true,
    tags: ["slack", "notifications", "integration"],
  },
  {
    slug: "google-calendar-sync",
    name: "Google Calendar Sync",
    description: "Two-way sync of case deadlines, hearings, and events with Google Calendar.",
    category: "integration" as const,
    author: "SintraPrime",
    version: "1.3.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 423,
    downloads: 2100,
    verified: true,
    tags: ["google", "calendar", "sync", "deadlines"],
  },
  {
    slug: "contract-risk-scorer",
    name: "Contract Risk Scorer",
    description: "Automatically scores contract risk on a 0-100 scale using AI analysis of clauses, obligations, and liability terms.",
    category: "legal" as const,
    author: "SintraPrime",
    version: "2.0.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 612,
    downloads: 4320,
    verified: true,
    tags: ["contract", "risk", "ai", "analysis"],
  },
  {
    slug: "evidence-chain-tracker",
    name: "Evidence Chain of Custody",
    description: "Blockchain-verified evidence tracking with tamper-proof audit trail and chain of custody documentation.",
    category: "legal" as const,
    author: "SintraPrime",
    version: "1.1.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 198,
    downloads: 780,
    verified: true,
    tags: ["evidence", "blockchain", "custody", "audit"],
  },
  {
    slug: "billing-quickbooks",
    name: "QuickBooks Billing Sync",
    description: "Export time entries and invoices directly to QuickBooks Online for seamless accounting integration.",
    category: "productivity" as const,
    author: "Community",
    version: "1.0.0",
    repoUrl: "https://github.com/community/sintraprime-quickbooks",
    stars: 87,
    downloads: 340,
    verified: false,
    tags: ["quickbooks", "billing", "accounting", "export"],
  },
  {
    slug: "legal-research-westlaw",
    name: "Westlaw Research Bridge",
    description: "Search Westlaw cases and statutes directly from SintraPrime's research library without leaving the app.",
    category: "legal" as const,
    author: "Community",
    version: "0.9.0",
    repoUrl: "https://github.com/community/sintraprime-westlaw",
    stars: 234,
    downloads: 1120,
    verified: false,
    tags: ["westlaw", "research", "cases", "statutes"],
  },
  {
    slug: "analytics-dashboard-pro",
    name: "Analytics Dashboard Pro",
    description: "Advanced analytics with win/loss rates, case duration trends, billing analytics, and predictive insights.",
    category: "analytics" as const,
    author: "SintraPrime",
    version: "1.4.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 445,
    downloads: 2890,
    verified: true,
    tags: ["analytics", "dashboard", "insights", "trends"],
  },
  {
    slug: "two-factor-auth",
    name: "Two-Factor Authentication",
    description: "TOTP-based 2FA for enhanced account security. Compatible with Google Authenticator and Authy.",
    category: "security" as const,
    author: "SintraPrime",
    version: "1.0.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 567,
    downloads: 5430,
    verified: true,
    tags: ["security", "2fa", "totp", "authentication"],
  },
  {
    slug: "voice-command-suite",
    name: "Voice Command Suite",
    description: "Full hands-free operation with wake-word detection, voice commands, and TTS responses.",
    category: "productivity" as const,
    author: "SintraPrime",
    version: "2.0.0",
    repoUrl: "https://github.com/ihoward40/SintraPrime",
    stars: 389,
    downloads: 1670,
    verified: true,
    tags: ["voice", "tts", "stt", "hands-free"],
  },
];

export const pluginMarketplaceRouter = router({
  /** List all available plugins with optional search/filter */
  listPlugins: publicProcedure
    .input(z.object({
      category: z.enum(["ai", "legal", "productivity", "integration", "analytics", "security", "other"]).optional(),
      search: z.string().optional(),
      verified: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      let filtered = BUILT_IN_PLUGINS;
      if (input.category) filtered = filtered.filter(p => p.category === input.category);
      if (input.verified !== undefined) filtered = filtered.filter(p => p.verified === input.verified);
      if (input.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some(t => t.includes(q))
        );
      }
      return filtered.sort((a, b) => b.downloads - a.downloads);
    }),

  /** Get installed plugins for the current user */
  getInstalled: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const installed = await db
      .select()
      .from(userPlugins)
      .where(eq(userPlugins.userId, ctx.user.id));

    return installed.map(up => {
      const plugin = BUILT_IN_PLUGINS.find(p => p.slug === String(up.pluginId));
      return { ...up, pluginDetails: plugin ?? null };
    });
  }),

  /** Install a plugin */
  install: protectedProcedure
    .input(z.object({
      slug: z.string(),
      config: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const plugin = BUILT_IN_PLUGINS.find(p => p.slug === input.slug);
      if (!plugin) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plugin not found." });
      }

      const db = await getDb();
      // Use slug index as pluginId for built-in plugins
      const pluginId = BUILT_IN_PLUGINS.indexOf(plugin) + 1;

      await db
        .insert(userPlugins)
        .values({
          userId: ctx.user.id,
          pluginId,
          enabled: true,
          config: input.config ?? {},
        })
        .onDuplicateKeyUpdate({ set: { enabled: true } });

      return { success: true, plugin };
    }),

  /** Uninstall a plugin */
  uninstall: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const plugin = BUILT_IN_PLUGINS.find(p => p.slug === input.slug);
      if (!plugin) throw new TRPCError({ code: "NOT_FOUND", message: "Plugin not found." });

      const db = await getDb();
      const pluginId = BUILT_IN_PLUGINS.indexOf(plugin) + 1;
      await db
        .delete(userPlugins)
        .where(and(eq(userPlugins.userId, ctx.user.id), eq(userPlugins.pluginId, pluginId)));
      return { success: true };
    }),

  /** Toggle plugin enabled/disabled */
  toggle: protectedProcedure
    .input(z.object({ slug: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const plugin = BUILT_IN_PLUGINS.find(p => p.slug === input.slug);
      if (!plugin) throw new TRPCError({ code: "NOT_FOUND", message: "Plugin not found." });

      const db = await getDb();
      const pluginId = BUILT_IN_PLUGINS.indexOf(plugin) + 1;
      await db
        .update(userPlugins)
        .set({ enabled: input.enabled })
        .where(and(eq(userPlugins.userId, ctx.user.id), eq(userPlugins.pluginId, pluginId)));
      return { success: true };
    }),

  /** Get marketplace stats */
  getStats: publicProcedure.query(async () => {
    return {
      totalPlugins: BUILT_IN_PLUGINS.length,
      verifiedPlugins: BUILT_IN_PLUGINS.filter(p => p.verified).length,
      categories: [...new Set(BUILT_IN_PLUGINS.map(p => p.category))].length,
      totalDownloads: BUILT_IN_PLUGINS.reduce((acc, p) => acc + p.downloads, 0),
    };
  }),
});
