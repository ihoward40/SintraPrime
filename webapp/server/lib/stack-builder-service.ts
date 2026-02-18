/**
 * Stack Builder Service
 * 
 * AI-powered tool stack recommendation system.
 * Analyzes project requirements and recommends optimal AI tool combinations.
 */

import { invokeLLM } from "../_core/llm";
import * as db from "../db";

export interface StackRequirements {
  projectName: string;
  outputType: string;
  budget: "low" | "medium" | "high";
  skillLevel: "beginner" | "intermediate" | "advanced";
  timeline?: string;
  specificNeeds?: string[];
}

export interface ToolRecommendation {
  toolId: number;
  toolName: string;
  role: string; // script, image, video, voice, automation
  reasoning: string;
  alternatives: string[];
  riskFactors?: string[];
}

export interface StackRecommendation {
  tools: ToolRecommendation[];
  overallReasoning: string;
  estimatedCost: string;
  estimatedLearningCurve: string;
  successProbability: number; // 0-100
}

export class StackBuilderService {
  /**
   * Recommend optimal tool stack based on project requirements
   */
  async recommendStack(
    requirements: StackRequirements
  ): Promise<StackRecommendation> {
    // Get all available tools
    const allTools = await db.getAllAITools();

    // Filter tools based on budget and skill level
    const suitableTools = allTools.filter(tool => {
      // Budget filtering
      if (requirements.budget === "low" && tool.budgetTier === "premium") return false;
      if (requirements.budget === "medium" && tool.budgetTier === "premium") return false;
      
      // Skill level filtering
      if (requirements.skillLevel === "beginner" && tool.skillLevel === "advanced") return false;
      
      return true;
    });

    // Group tools by category
    const toolsByCategory: Record<string, any[]> = {};
    for (const tool of suitableTools) {
      if (!toolsByCategory[tool.category]) {
        toolsByCategory[tool.category] = [];
      }
      toolsByCategory[tool.category].push(tool);
    }

    // Build context for LLM
    const toolsContext = Object.entries(toolsByCategory)
      .map(([category, tools]) => {
        const toolList = tools
          .map(
            t =>
              `- ${t.name} (Reliability: ${t.reliabilityScore}/10, Budget: ${t.budgetTier}, Skill: ${t.skillLevel})`
          )
          .join("\n");
        return `${category.toUpperCase()} TOOLS:\n${toolList}`;
      })
      .join("\n\n");

    const prompt = `You are the Head of Innovation for a high-performance creative agency.
Recommend the optimal AI tool stack for this project:

PROJECT REQUIREMENTS:
- Name: ${requirements.projectName}
- Output Type: ${requirements.outputType}
- Budget: ${requirements.budget}
- Skill Level: ${requirements.skillLevel}
- Timeline: ${requirements.timeline || "Not specified"}
- Specific Needs: ${requirements.specificNeeds?.join(", ") || "None"}

AVAILABLE TOOLS:
${toolsContext}

Provide recommendations in JSON format:
{
  "tools": [
    {
      "toolName": "Tool name from the list",
      "role": "script|image|video|voice|automation",
      "reasoning": "Why this tool fits the requirements",
      "alternatives": ["Alternative tool 1", "Alternative tool 2"],
      "riskFactors": ["Potential issue 1", "Potential issue 2"]
    }
  ],
  "overallReasoning": "High-level strategy explanation",
  "estimatedCost": "Low|Medium|High with explanation",
  "estimatedLearningCurve": "Easy|Moderate|Steep with timeline",
  "successProbability": 85
}

Prioritize:
1. Reliability over novelty
2. Tools that work well together
3. Realistic learning curves
4. Budget constraints`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are Head of Innovation. Recommend AI tool stacks based on verified documentation and real-world reliability. Avoid hype.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "stack_recommendation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tools: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    toolName: { type: "string" },
                    role: { type: "string" },
                    reasoning: { type: "string" },
                    alternatives: {
                      type: "array",
                      items: { type: "string" },
                    },
                    riskFactors: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["toolName", "role", "reasoning", "alternatives", "riskFactors"],
                  additionalProperties: false,
                },
              },
              overallReasoning: { type: "string" },
              estimatedCost: { type: "string" },
              estimatedLearningCurve: { type: "string" },
              successProbability: { type: "number" },
            },
            required: [
              "tools",
              "overallReasoning",
              "estimatedCost",
              "estimatedLearningCurve",
              "successProbability",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === "string" ? content : "{}");

    // Map tool names to tool IDs
    const recommendations: ToolRecommendation[] = [];
    for (const toolRec of result.tools || []) {
      const tool = suitableTools.find(
        t => t.name.toLowerCase() === toolRec.toolName.toLowerCase()
      );
      if (tool) {
        recommendations.push({
          toolId: tool.id,
          toolName: tool.name,
          role: toolRec.role,
          reasoning: toolRec.reasoning,
          alternatives: toolRec.alternatives,
          riskFactors: toolRec.riskFactors,
        });
      }
    }

    return {
      tools: recommendations,
      overallReasoning: result.overallReasoning || "",
      estimatedCost: result.estimatedCost || "Unknown",
      estimatedLearningCurve: result.estimatedLearningCurve || "Unknown",
      successProbability: result.successProbability || 50,
    };
  }

  /**
   * Compare multiple stack configurations
   */
  async compareStacks(stackIds: number[]): Promise<any> {
    const stacks = await Promise.all(
      stackIds.map(id => db.getProjectStackById(id))
    );

    // Get tools for each stack
    const stacksWithTools = await Promise.all(
      stacks.map(async (stack: any) => {
        if (!stack) return null;
        const tools = await db.getStackToolsByStackId(stack.id);
        return { ...stack, tools };
      })
    );

    return stacksWithTools.filter((s: any) => s !== null);
  }
}

// Export singleton instance
export const stackBuilderService = new StackBuilderService();
