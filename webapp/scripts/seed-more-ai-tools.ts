/**
 * Seed Additional AI Tools (50 more tools)
 * 
 * Expands the Intelligence Database from 100 to 150 tools
 * across various categories with detailed information.
 */

import { createAITool } from "../server/db";

const additionalTools = [
  // Design & Creative (10 tools)
  {
    name: "Figma AI",
    category: "design",
    description: "AI-powered design tool with auto-layout and smart suggestions",
    reliability: 9,
    budgetTier: "premium",
    skillLevel: "intermediate",
    notes: "Industry standard for UI/UX design with AI features",
  },
  {
    name: "Canva AI",
    category: "design",
    description: "Easy-to-use design platform with AI template generation",
    reliability: 8,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Great for non-designers, extensive template library",
  },
  {
    name: "Adobe Firefly",
    category: "design",
    description: "Adobe's generative AI for images and design elements",
    reliability: 9,
    budgetTier: "premium",
    skillLevel: "intermediate",
    notes: "Integrated with Adobe Creative Cloud",
  },
  {
    name: "Khroma",
    category: "design",
    description: "AI color palette generator trained on your preferences",
    reliability: 7,
    budgetTier: "free",
    skillLevel: "beginner",
    notes: "Learns your color preferences over time",
  },
  {
    name: "Uizard",
    category: "design",
    description: "Transform sketches into digital designs with AI",
    reliability: 7,
    budgetTier: "medium",
    skillLevel: "beginner",
    notes: "Rapid prototyping from hand-drawn sketches",
  },
  {
    name: "Framer AI",
    category: "design",
    description: "AI-powered website builder with code export",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Generates production-ready code",
  },
  {
    name: "Looka",
    category: "design",
    description: "AI logo and brand identity generator",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Quick logo generation for startups",
  },
  {
    name: "Designs.ai",
    category: "design",
    description: "All-in-one AI design platform (logo, video, mockups)",
    reliability: 7,
    budgetTier: "medium",
    skillLevel: "beginner",
    notes: "Multiple design tools in one platform",
  },
  {
    name: "Beautiful.ai",
    category: "design",
    description: "AI-powered presentation design with smart templates",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "beginner",
    notes: "Auto-adjusts layouts as you add content",
  },
  {
    name: "Photoshop Generative Fill",
    category: "design",
    description: "AI-powered image editing and generation in Photoshop",
    reliability: 9,
    budgetTier: "premium",
    skillLevel: "advanced",
    notes: "Professional-grade AI image manipulation",
  },

  // Code & Development (10 tools)
  {
    name: "GitHub Copilot",
    category: "development",
    description: "AI pair programmer that suggests code completions",
    reliability: 9,
    budgetTier: "low",
    skillLevel: "intermediate",
    notes: "Trained on billions of lines of code",
  },
  {
    name: "Cursor",
    category: "development",
    description: "AI-first code editor built on VS Code",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Chat with your codebase, AI-powered refactoring",
  },
  {
    name: "Replit Ghostwriter",
    category: "development",
    description: "AI coding assistant in browser-based IDE",
    reliability: 8,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Great for learning and quick prototypes",
  },
  {
    name: "Tabnine",
    category: "development",
    description: "AI code completion for multiple IDEs",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Privacy-focused, can run locally",
  },
  {
    name: "Amazon CodeWhisperer",
    category: "development",
    description: "AWS's AI coding companion with security scanning",
    reliability: 8,
    budgetTier: "free",
    skillLevel: "intermediate",
    notes: "Free for individual use, AWS-optimized",
  },
  {
    name: "Codeium",
    category: "development",
    description: "Free AI code acceleration toolkit",
    reliability: 7,
    budgetTier: "free",
    skillLevel: "beginner",
    notes: "Generous free tier, 70+ languages",
  },
  {
    name: "Sourcegraph Cody",
    category: "development",
    description: "AI coding assistant that understands your codebase",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Context-aware suggestions from your repo",
  },
  {
    name: "Mintlify",
    category: "development",
    description: "AI-powered documentation generator",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Auto-generates docs from code comments",
  },
  {
    name: "Phind",
    category: "development",
    description: "AI search engine for developers",
    reliability: 8,
    budgetTier: "free",
    skillLevel: "beginner",
    notes: "Answers coding questions with sources",
  },
  {
    name: "v0.dev",
    category: "development",
    description: "Generate UI components from text descriptions",
    reliability: 8,
    budgetTier: "free",
    skillLevel: "intermediate",
    notes: "By Vercel, generates React/Tailwind code",
  },

  // Data & Analytics (10 tools)
  {
    name: "Tableau AI",
    category: "analytics",
    description: "AI-powered data visualization and analytics",
    reliability: 9,
    budgetTier: "premium",
    skillLevel: "advanced",
    notes: "Enterprise-grade business intelligence",
  },
  {
    name: "Power BI AI",
    category: "analytics",
    description: "Microsoft's AI-enhanced business analytics",
    reliability: 9,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Integrates with Microsoft ecosystem",
  },
  {
    name: "Hex",
    category: "analytics",
    description: "AI-powered data workspace for analysts",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "SQL, Python, and AI in one platform",
  },
  {
    name: "Julius AI",
    category: "analytics",
    description: "Chat with your data using natural language",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Upload CSV/Excel, ask questions",
  },
  {
    name: "Akkio",
    category: "analytics",
    description: "No-code AI for business analytics",
    reliability: 7,
    budgetTier: "medium",
    skillLevel: "beginner",
    notes: "Predictive analytics without coding",
  },
  {
    name: "Obviously AI",
    category: "analytics",
    description: "Build ML models without code",
    reliability: 7,
    budgetTier: "medium",
    skillLevel: "beginner",
    notes: "One-click predictive models",
  },
  {
    name: "DataRobot",
    category: "analytics",
    description: "Enterprise AI platform for data science",
    reliability: 9,
    budgetTier: "premium",
    skillLevel: "advanced",
    notes: "Automated machine learning at scale",
  },
  {
    name: "H2O.ai",
    category: "analytics",
    description: "Open source AI and ML platform",
    reliability: 8,
    budgetTier: "free",
    skillLevel: "advanced",
    notes: "Powerful but requires technical expertise",
  },
  {
    name: "MonkeyLearn",
    category: "analytics",
    description: "No-code text analysis with AI",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Sentiment analysis, keyword extraction",
  },
  {
    name: "Polymer",
    category: "analytics",
    description: "AI-powered data visualization from spreadsheets",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Instant dashboards from CSV files",
  },

  // Customer Service & Support (10 tools)
  {
    name: "Intercom Fin",
    category: "customer_service",
    description: "AI chatbot for customer support",
    reliability: 8,
    budgetTier: "premium",
    skillLevel: "intermediate",
    notes: "Resolves 50% of support tickets instantly",
  },
  {
    name: "Zendesk AI",
    category: "customer_service",
    description: "AI-powered customer service platform",
    reliability: 9,
    budgetTier: "premium",
    skillLevel: "intermediate",
    notes: "Industry-leading support software",
  },
  {
    name: "Ada",
    category: "customer_service",
    description: "No-code AI chatbot builder",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "beginner",
    notes: "Easy to set up, multilingual support",
  },
  {
    name: "Tidio",
    category: "customer_service",
    description: "AI chatbot for small businesses",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Affordable, good for e-commerce",
  },
  {
    name: "Freshdesk AI",
    category: "customer_service",
    description: "AI-enhanced help desk software",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Smart ticket routing and automation",
  },
  {
    name: "Kustomer",
    category: "customer_service",
    description: "AI-powered CRM for customer service",
    reliability: 8,
    budgetTier: "premium",
    skillLevel: "intermediate",
    notes: "Unified customer view across channels",
  },
  {
    name: "LivePerson",
    category: "customer_service",
    description: "Conversational AI for enterprises",
    reliability: 8,
    budgetTier: "premium",
    skillLevel: "advanced",
    notes: "Large-scale customer engagement",
  },
  {
    name: "Drift",
    category: "customer_service",
    description: "Conversational marketing and sales AI",
    reliability: 8,
    budgetTier: "premium",
    skillLevel: "intermediate",
    notes: "Qualify leads and book meetings",
  },
  {
    name: "Crisp",
    category: "customer_service",
    description: "All-in-one customer messaging with AI",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Chat, email, and social in one inbox",
  },
  {
    name: "HubSpot AI",
    category: "customer_service",
    description: "AI features across HubSpot CRM",
    reliability: 9,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Content generation, chatbots, insights",
  },

  // Productivity & Project Management (10 tools)
  {
    name: "Notion AI",
    category: "productivity",
    description: "AI writing and brainstorming in Notion",
    reliability: 8,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Integrated into Notion workspace",
  },
  {
    name: "ClickUp AI",
    category: "productivity",
    description: "AI project management and task automation",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "AI summaries, task generation",
  },
  {
    name: "Monday.com AI",
    category: "productivity",
    description: "AI-powered work operating system",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Workflow automation and insights",
  },
  {
    name: "Asana AI",
    category: "productivity",
    description: "AI features in project management",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Smart goals and workflow recommendations",
  },
  {
    name: "Mem",
    category: "productivity",
    description: "AI-powered note-taking and knowledge base",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Auto-organizes notes with AI",
  },
  {
    name: "Reflect",
    category: "productivity",
    description: "AI note-taking with backlinking",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "End-to-end encrypted, fast sync",
  },
  {
    name: "Taskade",
    category: "productivity",
    description: "AI-powered team collaboration",
    reliability: 7,
    budgetTier: "free",
    skillLevel: "beginner",
    notes: "Tasks, notes, and video chat",
  },
  {
    name: "Reclaim AI",
    category: "productivity",
    description: "AI calendar assistant for time management",
    reliability: 8,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Auto-schedules tasks and habits",
  },
  {
    name: "Motion",
    category: "productivity",
    description: "AI calendar and project manager",
    reliability: 8,
    budgetTier: "medium",
    skillLevel: "intermediate",
    notes: "Automatically plans your day",
  },
  {
    name: "Trevor AI",
    category: "productivity",
    description: "AI task scheduler with time blocking",
    reliability: 7,
    budgetTier: "low",
    skillLevel: "beginner",
    notes: "Integrates with existing task managers",
  },
];

async function main() {
  console.log("🔧 Seeding Additional AI Tools...");
  console.log("=" .repeat(60));
  console.log();

  let successCount = 0;
  let errorCount = 0;

  for (const tool of additionalTools) {
    try {
      await createAITool(tool);
      successCount++;
      console.log(`✓ Added: ${tool.name} (${tool.category})`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Failed to add ${tool.name}:`, error);
    }
  }

  console.log();
  console.log("=" .repeat(60));
  console.log(`✅ Seeding complete!`);
  console.log(`   Success: ${successCount} tools`);
  console.log(`   Errors: ${errorCount} tools`);
  console.log(`   Total in database: ${successCount + 100} tools`);
}

main().catch(console.error);
