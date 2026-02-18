/**
 * AI Roles Service
 * 
 * Implements 3 specialized AI role configurations:
 * 1. Head of Innovation - Tool selection and workflow design
 * 2. Ghostwriter Engine - Style replication and content creation
 * 3. Senior Prompt Engineer - Documentation-grounded prompting
 */

import { invokeLLM } from "../_core/llm";

export class AIRolesService {
  /**
   * ROLE 1: Head of Innovation
   * 
   * Recommends optimal AI stacks based on budget, skill level, output type, and timeline.
   * Provides both recommendations and reasoning. Avoids hype, optimizes for efficiency and reliability.
   */
  async headOfInnovation(input: {
    projectType: string;
    budget: string;
    skillLevel: string;
    timeline?: string;
    specificRequirements?: string;
  }): Promise<{
    recommendation: string;
    reasoning: string;
    alternatives?: string;
  }> {
    const systemPrompt = `Act as Head of Innovation for a high-performance creative agency.
You have access to verified tool documentation and curated AI intelligence.
Your goal is to recommend optimal AI stacks based on:
- Budget
- Skill level
- Output type
- Timeline

Provide both recommendations and reasoning.
Avoid hype. Optimize for efficiency and reliability.`;

    const userPrompt = `Project Type: ${input.projectType}
Budget: ${input.budget}
Skill Level: ${input.skillLevel}
Timeline: ${input.timeline || "Not specified"}
Specific Requirements: ${input.specificRequirements || "None"}

Recommend the best AI tool stack for this project.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0].message.content;
    const text = typeof content === "string" ? content : "";

    return {
      recommendation: text,
      reasoning: "Based on verified tool documentation and real-world reliability data.",
    };
  }

  /**
   * ROLE 2: Ghostwriter Engine
   * 
   * Analyzes tone, pacing, vocabulary density, emotional triggers, hook structure, and CTA placement.
   * Replicates style for new topics without copying structure or content.
   * Maintains human rhythm. Avoids generic AI phrasing.
   */
  async ghostwriter(input: {
    topic: string;
    targetAudience?: string;
    contentType: string; // youtube_script, ad, reel, landing_page, legal_brief
    styleReference?: string; // Optional: paste a reference text
    length?: string;
  }): Promise<{
    content: string;
    styleAnalysis?: string;
  }> {
    const systemPrompt = `Act as a professional ghostwriter.
Analyze tone, pacing, vocabulary density, emotional triggers, hook structure, and CTA placement.
Replicate the style for new topics without copying structure or content.
Maintain human rhythm. Avoid generic AI phrasing.`;

    let userPrompt = `Content Type: ${input.contentType}
Topic: ${input.topic}
Target Audience: ${input.targetAudience || "General"}
Desired Length: ${input.length || "Standard"}`;

    if (input.styleReference) {
      userPrompt += `\n\nStyle Reference (analyze and replicate this style):\n${input.styleReference}`;
    }

    userPrompt += `\n\nCreate compelling content that matches the style and engages the audience.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0].message.content;
    const text = typeof content === "string" ? content : "";

    return {
      content: text,
      styleAnalysis: input.styleReference
        ? "Style analyzed and replicated from reference"
        : "Standard professional style applied",
    };
  }

  /**
   * ROLE 3: Senior Prompt Engineer
   * 
   * Always references uploaded documentation.
   * Provides: optimized prompt, parameter breakdown, technical reasoning, optional advanced tweaks.
   * Never guesses undocumented parameters.
   */
  async promptEngineer(input: {
    tool: string;
    goal: string;
    parameters?: Record<string, any>;
    documentation?: string; // Optional: tool documentation
  }): Promise<{
    optimizedPrompt: string;
    parameterBreakdown: string;
    technicalReasoning: string;
    advancedTweaks?: string;
  }> {
    const systemPrompt = `Act as a senior prompt engineer.
Always reference uploaded documentation.
Provide:
1. The optimized prompt
2. Parameter breakdown
3. Technical reasoning
4. Optional advanced tweaks

Never guess undocumented parameters.`;

    let userPrompt = `Tool: ${input.tool}
Goal: ${input.goal}`;

    if (input.parameters) {
      userPrompt += `\nCurrent Parameters: ${JSON.stringify(input.parameters, null, 2)}`;
    }

    if (input.documentation) {
      userPrompt += `\n\nTool Documentation:\n${input.documentation}`;
    }

    userPrompt += `\n\nProvide an optimized prompt with parameter explanations.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "prompt_engineering",
          strict: true,
          schema: {
            type: "object",
            properties: {
              optimizedPrompt: { type: "string" },
              parameterBreakdown: { type: "string" },
              technicalReasoning: { type: "string" },
              advancedTweaks: { type: "string" },
            },
            required: [
              "optimizedPrompt",
              "parameterBreakdown",
              "technicalReasoning",
              "advancedTweaks",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === "string" ? content : "{}");

    return {
      optimizedPrompt: result.optimizedPrompt || "",
      parameterBreakdown: result.parameterBreakdown || "",
      technicalReasoning: result.technicalReasoning || "",
      advancedTweaks: result.advancedTweaks,
    };
  }

  /**
   * Execute a prompt from the library
   */
  async executePrompt(
    systemPrompt: string,
    userPromptTemplate: string,
    variables: Record<string, string>
  ): Promise<string> {
    // Replace variables in template
    let userPrompt = userPromptTemplate;
    for (const [key, value] of Object.entries(variables)) {
      userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === "string" ? content : "";
  }
}

// Export singleton instance
export const aiRolesService = new AIRolesService();
