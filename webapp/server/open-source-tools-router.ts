import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";

const OPEN_SOURCE_TOOLS = [
  {
    id: "coolify",
    name: "Coolify",
    category: "Infrastructure",
    replaces: "Heroku / Vercel / Netlify",
    githubStars: 32400,
    githubUrl: "https://github.com/coollabsio/coolify",
    description: "Self-hosted PaaS platform for deploying apps, databases, and services",
    features: ["One-click deployments", "Auto SSL", "Docker support", "Built-in databases"],
    installCmd: "curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash",
    estimatedMonthlySavings: 200,
    tags: ["deployment", "hosting", "paas"],
    status: "stable",
    lastUpdated: "2024-03-01",
  },
  {
    id: "n8n",
    name: "n8n",
    category: "Automation",
    replaces: "Zapier / Make",
    githubStars: 47800,
    githubUrl: "https://github.com/n8n-io/n8n",
    description: "Self-hosted workflow automation with 400+ integrations",
    features: ["400+ integrations", "Visual builder", "Code nodes", "Webhooks"],
    installCmd: "npx n8n",
    estimatedMonthlySavings: 150,
    tags: ["automation", "workflow", "integrations"],
    status: "stable",
    lastUpdated: "2024-03-10",
  },
  {
    id: "authentik",
    name: "Authentik",
    category: "Security",
    replaces: "Auth0 / Okta",
    githubStars: 14300,
    githubUrl: "https://github.com/goauthentik/authentik",
    description: "Open-source identity provider with SSO, LDAP, SAML, and OIDC",
    features: ["SSO", "LDAP/SAML", "MFA", "Custom flows"],
    installCmd: "docker compose up -d",
    estimatedMonthlySavings: 500,
    tags: ["auth", "sso", "security"],
    status: "stable",
    lastUpdated: "2024-02-20",
  },
];

export const openSourceToolsRouter = router({
  // List all tools with optional category filter
  listTools: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        installedOnly: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ input }) => {
      let tools = OPEN_SOURCE_TOOLS;

      if (input?.category && input.category !== "All") {
        tools = tools.filter((t) => t.category === input.category);
      }

      if (input?.search) {
        const q = input.search.toLowerCase();
        tools = tools.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.tags.some((tag) => tag.includes(q))
        );
      }

      return {
        tools,
        total: tools.length,
        categories: [...new Set(OPEN_SOURCE_TOOLS.map((t) => t.category))],
        totalMonthlySavings: tools.reduce((sum, t) => sum + t.estimatedMonthlySavings, 0),
      };
    }),

  // Get tool by ID
  getTool: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const tool = OPEN_SOURCE_TOOLS.find((t) => t.id === input.id);
      if (!tool) {
        throw new Error(`Tool ${input.id} not found`);
      }
      return tool;
    }),

  // Track tool installation status per user
  markInstalled: protectedProcedure
    .input(
      z.object({
        toolId: z.string(),
        installed: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In production, this would update the database
      return {
        success: true,
        toolId: input.toolId,
        installed: input.installed,
        userId: ctx.user?.id,
        timestamp: new Date().toISOString(),
      };
    }),

  // Get usage statistics summary
  getStats: publicProcedure.query(async () => {
    const totalTools = OPEN_SOURCE_TOOLS.length;
    const totalStars = OPEN_SOURCE_TOOLS.reduce((sum, t) => sum + t.githubStars, 0);
    const totalMonthlySavings = OPEN_SOURCE_TOOLS.reduce(
      (sum, t) => sum + t.estimatedMonthlySavings,
      0
    );
    const categories = [...new Set(OPEN_SOURCE_TOOLS.map((t) => t.category))];

    return {
      totalTools,
      totalStars,
      totalMonthlySavings,
      annualSavings: totalMonthlySavings * 12,
      categoriesCount: categories.length,
      categories,
      topTool: OPEN_SOURCE_TOOLS.reduce((a, b) =>
        a.githubStars > b.githubStars ? a : b
      ),
    };
  }),

  // Search tools by tag
  searchByTag: publicProcedure
    .input(z.object({ tag: z.string() }))
    .query(async ({ input }) => {
      const tools = OPEN_SOURCE_TOOLS.filter((t) =>
        t.tags.includes(input.tag.toLowerCase())
      );
      return { tools, count: tools.length };
    }),

  // Get install command for a tool
  getInstallCommand: publicProcedure
    .input(z.object({ toolId: z.string(), platform: z.enum(["linux", "mac", "windows", "docker"]).optional() }))
    .query(async ({ input }) => {
      const tool = OPEN_SOURCE_TOOLS.find((t) => t.id === input.toolId);
      if (!tool) throw new Error(`Tool ${input.toolId} not found`);

      return {
        toolId: input.toolId,
        name: tool.name,
        command: tool.installCmd,
        platform: input.platform || "linux",
        githubUrl: tool.githubUrl,
      };
    }),
});
