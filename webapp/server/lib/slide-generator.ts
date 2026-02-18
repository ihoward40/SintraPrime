/**
 * Slide Generation System
 * 
 * Professional slide creation with AI-powered content planning,
 * layout design, and export capabilities.
 */

import { routeAIRequest } from "./multi-model-router";

export interface SlideContent {
  title: string;
  subtitle?: string;
  content: string[];
  notes?: string;
  layout: "title" | "content" | "two-column" | "image-text" | "quote" | "conclusion";
  visualStyle?: "professional" | "creative" | "minimal" | "bold";
}

export interface PresentationOutline {
  title: string;
  subtitle?: string;
  author?: string;
  theme: "legal" | "business" | "academic" | "creative";
  slides: SlideContent[];
  totalSlides: number;
}

export interface SlideGenerationRequest {
  topic: string;
  purpose: "case_summary" | "legal_brief" | "client_presentation" | "training" | "general";
  targetAudience: "legal_professionals" | "clients" | "judges" | "general_public";
  slideCount?: number;
  tone?: "formal" | "conversational" | "persuasive" | "educational";
  includeVisuals?: boolean;
  keyPoints?: string[];
}

/**
 * Generate presentation outline with AI
 */
export async function generatePresentationOutline(
  request: SlideGenerationRequest
): Promise<PresentationOutline> {
  const prompt = `You are a professional presentation designer. Create a comprehensive slide deck outline for the following:

Topic: ${request.topic}
Purpose: ${request.purpose}
Target Audience: ${request.targetAudience}
Desired Slide Count: ${request.slideCount || "8-12"}
Tone: ${request.tone || "formal"}

${request.keyPoints ? `Key Points to Cover:\n${request.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}` : ""}

Create a slide-by-slide outline with:
1. Compelling slide titles (insights/conclusions, NOT topic labels)
2. 3-5 key points per slide with supporting evidence
3. Appropriate layout for each slide
4. Speaker notes for context
5. Logical narrative flow

Respond with valid JSON in this exact structure:
{
  "title": "Presentation Title",
  "subtitle": "Optional subtitle",
  "theme": "legal|business|academic|creative",
  "slides": [
    {
      "title": "Insight-driven title (not topic label)",
      "subtitle": "Optional subtitle",
      "content": ["Key point 1 with evidence", "Key point 2 with data", "Key point 3 with reasoning"],
      "notes": "Speaker notes and context",
      "layout": "title|content|two-column|image-text|quote|conclusion",
      "visualStyle": "professional|creative|minimal|bold"
    }
  ]
}

Guidelines:
- First slide should be title slide
- Last slide should be conclusion/call-to-action
- Each slide should have ONE central idea
- Use data and evidence to support claims
- Maintain narrative flow between slides
- Tailor content to audience expertise level`;

  const response = await routeAIRequest({
    messages: [
      {
        role: "system",
        content: "You are a professional presentation designer. Always respond with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    preferredCapability: "reasoning",
    maxTokens: 8000,
  });

  // Parse JSON response
  let jsonText = response.content.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/```\n?/g, "");
  }

  const outline = JSON.parse(jsonText);

  return {
    ...outline,
    totalSlides: outline.slides.length,
    author: request.purpose === "legal_brief" ? "Legal Team" : undefined,
  };
}

/**
 * Enhance slide content with AI
 */
export async function enhanceSlideContent(
  slide: SlideContent,
  context: { topic: string; audience: string }
): Promise<SlideContent> {
  const prompt = `Enhance the following slide content to be more impactful and evidence-based:

Title: ${slide.title}
Current Content: ${slide.content.join(", ")}
Topic Context: ${context.topic}
Audience: ${context.audience}

Provide:
1. More compelling title (insight/conclusion-driven)
2. Enhanced key points with specific data/evidence
3. Improved speaker notes

Respond with JSON:
{
  "title": "Enhanced title",
  "content": ["Enhanced point 1", "Enhanced point 2", "Enhanced point 3"],
  "notes": "Enhanced speaker notes"
}`;

  const response = await routeAIRequest({
    messages: [
      { role: "system", content: "You are a presentation content expert. Respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    preferredCapability: "chat",
  });

  let jsonText = response.content.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  }

  const enhanced = JSON.parse(jsonText);

  return {
    ...slide,
    title: enhanced.title,
    content: enhanced.content,
    notes: enhanced.notes,
  };
}

/**
 * Generate slide content from case data
 */
export async function generateCaseSummarySlides(caseData: {
  title: string;
  caseNumber?: string;
  description?: string;
  caseType?: string;
  status?: string;
  keyFacts?: string[];
  legalIssues?: string[];
  arguments?: string[];
}): Promise<PresentationOutline> {
  const keyPoints = [
    ...(caseData.keyFacts || []),
    ...(caseData.legalIssues || []),
    ...(caseData.arguments || []),
  ];

  return generatePresentationOutline({
    topic: `${caseData.title}${caseData.caseNumber ? ` (${caseData.caseNumber})` : ""}`,
    purpose: "case_summary",
    targetAudience: "legal_professionals",
    slideCount: 8,
    tone: "formal",
    keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
  });
}

/**
 * Convert outline to markdown format for slide tools
 */
export function outlineToMarkdown(outline: PresentationOutline): string {
  let markdown = `# ${outline.title}\n\n`;

  if (outline.subtitle) {
    markdown += `## ${outline.subtitle}\n\n`;
  }

  if (outline.author) {
    markdown += `**By:** ${outline.author}\n\n`;
  }

  markdown += `---\n\n`;

  outline.slides.forEach((slide, index) => {
    // Slide title
    markdown += `## ${slide.title}\n\n`;

    if (slide.subtitle) {
      markdown += `### ${slide.subtitle}\n\n`;
    }

    // Slide content
    if (slide.layout === "two-column") {
      const mid = Math.ceil(slide.content.length / 2);
      const leftColumn = slide.content.slice(0, mid);
      const rightColumn = slide.content.slice(mid);

      markdown += `<div class="two-column">\n\n`;
      markdown += `**Column 1:**\n${leftColumn.map((c) => `- ${c}`).join("\n")}\n\n`;
      markdown += `**Column 2:**\n${rightColumn.map((c) => `- ${c}`).join("\n")}\n\n`;
      markdown += `</div>\n\n`;
    } else if (slide.layout === "quote") {
      markdown += `> ${slide.content[0]}\n\n`;
      if (slide.content.length > 1) {
        markdown += slide.content.slice(1).map((c) => `- ${c}`).join("\n") + "\n\n";
      }
    } else {
      markdown += slide.content.map((c) => `- ${c}`).join("\n") + "\n\n";
    }

    // Speaker notes
    if (slide.notes) {
      markdown += `<aside class="notes">\n${slide.notes}\n</aside>\n\n`;
    }

    // Slide separator
    if (index < outline.slides.length - 1) {
      markdown += `---\n\n`;
    }
  });

  return markdown;
}

/**
 * Generate presentation themes
 */
export function getThemeStyles(theme: string): Record<string, string> {
  const themes: Record<string, Record<string, string>> = {
    legal: {
      primaryColor: "#1e3a8a", // Deep blue
      secondaryColor: "#64748b", // Slate
      accentColor: "#dc2626", // Red
      backgroundColor: "#ffffff",
      textColor: "#1e293b",
      fontFamily: "Georgia, serif",
    },
    business: {
      primaryColor: "#0f172a", // Dark slate
      secondaryColor: "#3b82f6", // Blue
      accentColor: "#f59e0b", // Amber
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      fontFamily: "Inter, sans-serif",
    },
    academic: {
      primaryColor: "#7c3aed", // Purple
      secondaryColor: "#6366f1", // Indigo
      accentColor: "#ec4899", // Pink
      backgroundColor: "#fafafa",
      textColor: "#18181b",
      fontFamily: "Crimson Text, serif",
    },
    creative: {
      primaryColor: "#ec4899", // Pink
      secondaryColor: "#8b5cf6", // Purple
      accentColor: "#f59e0b", // Amber
      backgroundColor: "#0f172a",
      textColor: "#f8fafc",
      fontFamily: "Poppins, sans-serif",
    },
  };

  return themes[theme] || themes.business;
}
