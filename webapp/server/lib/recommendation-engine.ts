/**
 * AI Recommendation Engine
 * Simplified version using content-based filtering
 */

import { invokeLLM } from "../_core/llm";
import * as db from "../db";

export interface RecommendationResult {
  toolId: number;
  toolName: string;
  score: number;
  reason: string;
}

export class RecommendationEngine {
  /**
   * Generate personalized tool recommendations using AI
   */
  async generateRecommendations(
    userId: number,
    projectDescription: string,
    limit: number = 10
  ): Promise<RecommendationResult[]> {
    // Get all tools
    const allTools = await db.getAllAITools();
    
    // Get user's review history to understand preferences
    const userReviews = await db.getToolReviewsByUserId(userId);
    const reviewedToolIds = new Set(userReviews.map(r => r.toolId));
    
    // Build context about user preferences
    const highRatedTools = userReviews
      .filter(r => r.rating >= 4)
      .map(r => {
        const tool = allTools.find(t => t.id === r.toolId);
        return tool ? `${tool.name} (${tool.category})` : null;
      })
      .filter(Boolean);
    
    // Use AI to recommend tools
    const toolsJson = allTools
      .filter(t => !reviewedToolIds.has(t.id))
      .map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        notes: t.notes,
        reliabilityScore: t.reliabilityScore,
        budgetTier: t.budgetTier,
        skillLevel: t.skillLevel,
      }));
    
    const prompt = `You are an AI tool recommendation expert. Based on the user's project and preferences, recommend the best AI tools.

Project Description: ${projectDescription}

User's Previously Liked Tools: ${highRatedTools.length > 0 ? highRatedTools.join(", ") : "None yet"}

Available Tools:
${JSON.stringify(toolsJson, null, 2)}

Please recommend the top ${limit} tools that would be most helpful for this project. For each recommendation, provide:
1. The tool ID
2. A relevance score (0-100)
3. A brief reason why this tool is recommended

Return your response as a JSON array of objects with this structure:
[
  {
    "toolId": number,
    "score": number,
    "reason": "string"
  }
]`;
    
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a helpful AI tool recommendation expert. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tool_recommendations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      toolId: { type: "number" },
                      score: { type: "number" },
                      reason: { type: "string" }
                    },
                    required: ["toolId", "score", "reason"],
                    additionalProperties: false
                  }
                }
              },
              required: ["recommendations"],
              additionalProperties: false
            }
          }
        }
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') return [];
      
      const parsed = JSON.parse(content);
      const recommendations: RecommendationResult[] = [];
      
      for (const rec of parsed.recommendations) {
        const tool = allTools.find(t => t.id === rec.toolId);
        if (!tool) continue;
        
        recommendations.push({
          toolId: rec.toolId,
          toolName: tool.name,
          score: rec.score,
          reason: rec.reason
        });
      }
      
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error("[RecommendationEngine] Error:", error);
      return [];
    }
  }
}

export const recommendationEngine = new RecommendationEngine();
