/**
 * Digital Product Creator
 * 
 * AI-powered system for generating professional documents, infographics,
 * brand assets, and visual content.
 */

import { routeAIRequest } from "./multi-model-router";

export type ProductType = 
  | "legal_document"
  | "contract"
  | "demand_letter"
  | "infographic"
  | "logo"
  | "letterhead"
  | "business_card"
  | "social_media_post";

export interface ProductRequest {
  type: ProductType;
  title: string;
  description: string;
  brandColors?: string[];
  brandName?: string;
  style?: "professional" | "modern" | "classic" | "creative";
  content?: Record<string, any>;
}

export interface GeneratedProduct {
  type: ProductType;
  title: string;
  content: string;
  format: "markdown" | "html" | "svg" | "json";
  metadata: Record<string, any>;
}

/**
 * Generate legal document with AI
 */
export async function generateLegalDocument(request: {
  documentType: "demand_letter" | "contract" | "motion" | "brief";
  parties: { plaintiff?: string; defendant?: string; client?: string };
  facts: string[];
  legalBasis: string[];
  demands?: string[];
}): Promise<GeneratedProduct> {
  const prompt = `Generate a professional legal document with the following details:

Document Type: ${request.documentType}
Parties: ${JSON.stringify(request.parties)}
Facts: ${request.facts.join("; ")}
Legal Basis: ${request.legalBasis.join("; ")}
${request.demands ? `Demands: ${request.demands.join("; ")}` : ""}

Create a properly formatted legal document with:
1. Appropriate header and caption
2. Introduction/background section
3. Statement of facts
4. Legal arguments with citations
5. Relief/demands requested
6. Professional closing

Use formal legal language and proper document structure. Include placeholder dates as [DATE] and signatures as [SIGNATURE].`;

  const response = await routeAIRequest({
    messages: [
      {
        role: "system",
        content: "You are a legal document drafting expert. Create professional, well-structured legal documents.",
      },
      { role: "user", content: prompt },
    ],
    preferredCapability: "reasoning",
    maxTokens: 8000,
  });

  return {
    type: "legal_document",
    title: `${request.documentType.replace("_", " ").toUpperCase()}`,
    content: response.content,
    format: "markdown",
    metadata: {
      documentType: request.documentType,
      parties: request.parties,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate demand letter
 */
export async function generateDemandLetter(request: {
  creditorName: string;
  debtorName: string;
  debtAmount: number;
  violations: string[];
  demands: string[];
}): Promise<GeneratedProduct> {
  const prompt = `Generate a professional demand letter for FDCPA violations:

To: ${request.creditorName}
From: ${request.debtorName}
Debt Amount: $${request.debtAmount.toFixed(2)}

Violations:
${request.violations.map((v, i) => `${i + 1}. ${v}`).join("\n")}

Demands:
${request.demands.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Create a formal demand letter with:
1. Proper letterhead format
2. Date and addresses
3. Subject line
4. Introduction stating purpose
5. Detailed description of violations with FDCPA citations
6. Clear demands and deadlines
7. Professional closing with consequences if demands not met

Use formal legal language appropriate for debt collection disputes.`;

  const response = await routeAIRequest({
    messages: [
      {
        role: "system",
        content: "You are a consumer rights attorney drafting demand letters for FDCPA violations.",
      },
      { role: "user", content: prompt },
    ],
    preferredCapability: "reasoning",
    maxTokens: 4000,
  });

  return {
    type: "demand_letter",
    title: `Demand Letter - ${request.creditorName}`,
    content: response.content,
    format: "markdown",
    metadata: {
      creditor: request.creditorName,
      debtor: request.debtorName,
      amount: request.debtAmount,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate infographic content structure
 */
export async function generateInfographic(request: {
  topic: string;
  dataPoints: Array<{ label: string; value: string | number }>;
  style: "professional" | "modern" | "creative";
}): Promise<GeneratedProduct> {
  const prompt = `Create an infographic structure for: ${request.topic}

Data Points:
${request.dataPoints.map((dp) => `- ${dp.label}: ${dp.value}`).join("\n")}

Style: ${request.style}

Provide a JSON structure with:
1. Title and subtitle
2. Sections with visual hierarchy
3. Data visualization suggestions (chart types)
4. Color scheme recommendations
5. Layout structure

Respond with valid JSON.`;

  const response = await routeAIRequest({
    messages: [
      {
        role: "system",
        content: "You are a visual designer creating infographic structures. Respond with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    preferredCapability: "chat",
  });

  let jsonText = response.content.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  }

  const structure = JSON.parse(jsonText);

  return {
    type: "infographic",
    title: request.topic,
    content: JSON.stringify(structure, null, 2),
    format: "json",
    metadata: {
      style: request.style,
      dataPointCount: request.dataPoints.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate brand assets description (for AI image generation)
 */
export async function generateBrandAsset(request: {
  assetType: "logo" | "letterhead" | "business_card";
  brandName: string;
  industry: string;
  style: "professional" | "modern" | "classic" | "creative";
  colors?: string[];
}): Promise<GeneratedProduct> {
  const prompt = `Create a detailed design specification for a ${request.assetType}:

Brand Name: ${request.brandName}
Industry: ${request.industry}
Style: ${request.style}
${request.colors ? `Brand Colors: ${request.colors.join(", ")}` : ""}

Provide:
1. Design concept and rationale
2. Visual elements and composition
3. Typography recommendations
4. Color palette (if not specified)
5. Detailed image generation prompt for AI
6. File specifications

Respond with JSON structure.`;

  const response = await routeAIRequest({
    messages: [
      {
        role: "system",
        content: "You are a brand designer creating asset specifications. Respond with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    preferredCapability: "chat",
  });

  let jsonText = response.content.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  }

  const specification = JSON.parse(jsonText);

  return {
    type: request.assetType as ProductType,
    title: `${request.brandName} ${request.assetType.replace("_", " ")}`,
    content: JSON.stringify(specification, null, 2),
    format: "json",
    metadata: {
      brandName: request.brandName,
      industry: request.industry,
      style: request.style,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate contract template
 */
export async function generateContract(request: {
  contractType: "service_agreement" | "nda" | "employment" | "settlement";
  parties: string[];
  terms: string[];
  jurisdiction: string;
}): Promise<GeneratedProduct> {
  const prompt = `Generate a professional contract template:

Contract Type: ${request.contractType}
Parties: ${request.parties.join(", ")}
Jurisdiction: ${request.jurisdiction}

Key Terms:
${request.terms.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Create a complete contract with:
1. Title and preamble
2. Definitions section
3. Detailed terms and conditions
4. Rights and obligations of each party
5. Payment/compensation terms (if applicable)
6. Confidentiality clauses
7. Termination provisions
8. Dispute resolution
9. Governing law (${request.jurisdiction})
10. Signature blocks

Use proper legal formatting and professional language. Include placeholders for dates, amounts, and specific details as [PLACEHOLDER].`;

  const response = await routeAIRequest({
    messages: [
      {
        role: "system",
        content: "You are a contract attorney drafting professional legal agreements.",
      },
      { role: "user", content: prompt },
    ],
    preferredCapability: "reasoning",
    maxTokens: 8000,
  });

  return {
    type: "contract",
    title: `${request.contractType.replace("_", " ").toUpperCase()} - ${request.parties.join(" & ")}`,
    content: response.content,
    format: "markdown",
    metadata: {
      contractType: request.contractType,
      parties: request.parties,
      jurisdiction: request.jurisdiction,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Convert markdown to HTML for document export
 */
export function markdownToHTML(markdown: string, title: string): string {
  // Basic markdown to HTML conversion
  let html = markdown;

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Paragraphs
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  // Wrap in document structure
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Georgia, serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #333;
    }
    h1 { font-size: 28px; margin-bottom: 10px; }
    h2 { font-size: 22px; margin-top: 30px; margin-bottom: 10px; }
    h3 { font-size: 18px; margin-top: 20px; margin-bottom: 8px; }
    p { margin-bottom: 15px; }
    ul, ol { margin-bottom: 15px; }
    li { margin-bottom: 5px; }
    strong { font-weight: bold; }
    em { font-style: italic; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}
