import { invokeLLM } from "../_core/llm";
import { claudeDiagnosisEngine } from "./claude-diagnosis";
import * as nanobotDb from "../db/nanobot-helpers";
import type { NanobotErrorLog } from "../../drizzle/schema";

export interface DiagnosisResult {
  rootCause: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedComponents: string[];
  suggestedFixes: RepairAction[];
  confidence: number; // 0-100
  requiresHumanIntervention: boolean;
}

export interface RepairAction {
  type: string;
  description: string;
  command?: string;
  automated: boolean;
  riskLevel: "low" | "medium" | "high";
}

/**
 * AI-powered diagnosis engine that analyzes errors and suggests repairs
 */
export class DiagnosisEngine {
  /**
   * Analyze an error and generate diagnosis with repair suggestions
   */
  async diagnose(error: NanobotErrorLog): Promise<DiagnosisResult> {
    // First, check if we have a matching learning entry
    const learningEntry = await nanobotDb.findMatchingLearningEntry(error.errorMessage);
    
    if (learningEntry && learningEntry.confidence > 70) {
      // Use learned repair strategy
      return this.applyLearnedStrategy(error, learningEntry);
    }

    // Use AI to analyze the error
    return await this.aiDiagnosis(error);
  }

  /**
   * Apply a previously learned repair strategy
   */
  private applyLearnedStrategy(error: NanobotErrorLog, learningEntry: any): DiagnosisResult {
    const strategy = JSON.parse(learningEntry.repairStrategy);
    
    return {
      rootCause: strategy.rootCause || "Known error pattern",
      severity: error.severity as any,
      affectedComponents: strategy.affectedComponents || [error.source || "unknown"],
      suggestedFixes: strategy.suggestedFixes || [],
      confidence: learningEntry.confidence,
      requiresHumanIntervention: learningEntry.confidence < 80,
    };
  }

  /**
   * Use AI (LLM) to analyze the error and suggest fixes
   */
  private async aiDiagnosis(error: NanobotErrorLog): Promise<DiagnosisResult> {
    // Try Claude first for enhanced diagnosis (optional)
    if (claudeDiagnosisEngine) {
      try {
        console.log("[Nanobot] Using Claude for AI diagnosis...");
        const claudeDiagnosis = await claudeDiagnosisEngine.diagnose(error);
        await this.storeLearningPattern(error, claudeDiagnosis);
        return claudeDiagnosis;
      } catch (claudeError) {
        console.warn(
          "[Nanobot] Claude diagnosis failed, falling back to built-in LLM:",
          claudeError
        );
      }
    }

    // Fallback to built-in LLM
    const prompt = this.buildDiagnosisPrompt(error);

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert system diagnostician for a legal warfare platform called SintraPrime. 
Your job is to analyze errors and suggest concrete repair actions. 
Always respond with valid JSON matching the DiagnosisResult schema.
Focus on practical, automated fixes when possible.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "diagnosis_result",
            strict: true,
            schema: {
              type: "object",
              properties: {
                rootCause: { type: "string" },
                severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                affectedComponents: { type: "array", items: { type: "string" } },
                suggestedFixes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      description: { type: "string" },
                      command: { type: "string" },
                      automated: { type: "boolean" },
                      riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                    },
                    required: ["type", "description", "automated", "riskLevel"],
                    additionalProperties: false,
                  },
                },
                confidence: { type: "number" },
                requiresHumanIntervention: { type: "boolean" },
              },
              required: [
                "rootCause",
                "severity",
                "affectedComponents",
                "suggestedFixes",
                "confidence",
                "requiresHumanIntervention",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error("No response from LLM");
      }

      const diagnosis: DiagnosisResult = JSON.parse(content);
      
      // Store this diagnosis pattern for future learning
      await this.storeLearningPattern(error, diagnosis);

      return diagnosis;
    } catch (err) {
      console.error("AI diagnosis failed:", err);
      // Fallback to basic heuristic diagnosis
      return this.heuristicDiagnosis(error);
    }
  }

  /**
   * Build a detailed prompt for the AI diagnosis
   */
  private buildDiagnosisPrompt(error: NanobotErrorLog): string {
    return `
Analyze this error and provide a detailed diagnosis:

**Error Type:** ${error.errorType}
**Severity:** ${error.severity}
**Error Message:** ${error.errorMessage}
**Source:** ${error.source || "unknown"}
**Stack Trace:** ${error.stackTrace ? error.stackTrace.substring(0, 500) : "N/A"}
**Context:** ${JSON.stringify(error.context, null, 2)}

Please provide:
1. Root cause analysis
2. Affected components
3. Concrete repair actions (prioritize automated fixes)
4. Confidence level (0-100)
5. Whether human intervention is required

Consider common issues:
- Database connection failures → restart DB connection pool
- API rate limits → implement exponential backoff
- Memory leaks → restart service
- Configuration errors → restore default config
- Frontend crashes → clear cache, reload page
- Authentication failures → refresh tokens
`.trim();
  }

  /**
   * Fallback heuristic diagnosis when AI fails
   */
  private heuristicDiagnosis(error: NanobotErrorLog): DiagnosisResult {
    const errorMsg = error.errorMessage.toLowerCase();
    
    // Database errors
    if (errorMsg.includes("database") || errorMsg.includes("connection") || errorMsg.includes("econnrefused")) {
      return {
        rootCause: "Database connection failure",
        severity: "high",
        affectedComponents: ["database"],
        suggestedFixes: [
          {
            type: "restart_connection",
            description: "Restart database connection pool",
            automated: true,
            riskLevel: "low",
          },
        ],
        confidence: 60,
        requiresHumanIntervention: false,
      };
    }

    // API/Network errors
    if (errorMsg.includes("fetch failed") || errorMsg.includes("network") || errorMsg.includes("timeout")) {
      return {
        rootCause: "Network or API failure",
        severity: "medium",
        affectedComponents: ["api", "network"],
        suggestedFixes: [
          {
            type: "retry_request",
            description: "Retry with exponential backoff",
            automated: true,
            riskLevel: "low",
          },
        ],
        confidence: 50,
        requiresHumanIntervention: false,
      };
    }

    // Memory/Resource errors
    if (errorMsg.includes("memory") || errorMsg.includes("heap") || errorMsg.includes("out of")) {
      return {
        rootCause: "Resource exhaustion (memory/CPU)",
        severity: "critical",
        affectedComponents: ["system"],
        suggestedFixes: [
          {
            type: "restart_service",
            description: "Restart affected service to free resources",
            automated: false,
            riskLevel: "medium",
          },
        ],
        confidence: 70,
        requiresHumanIntervention: true,
      };
    }

    // Generic fallback
    return {
      rootCause: "Unknown error - requires manual investigation",
      severity: error.severity as any,
      affectedComponents: [error.source || "unknown"],
      suggestedFixes: [
        {
          type: "manual_investigation",
          description: "Review error logs and stack trace manually",
          automated: false,
          riskLevel: "low",
        },
      ],
      confidence: 30,
      requiresHumanIntervention: true,
    };
  }

  /**
   * Store successful diagnosis pattern for future learning
   */
  private async storeLearningPattern(error: NanobotErrorLog, diagnosis: DiagnosisResult) {
    try {
      await nanobotDb.createLearningEntry({
        errorPattern: error.errorMessage.substring(0, 500),
        repairStrategy: JSON.stringify({
          rootCause: diagnosis.rootCause,
          affectedComponents: diagnosis.affectedComponents,
          suggestedFixes: diagnosis.suggestedFixes,
        }),
        confidence: diagnosis.confidence,
        timesApplied: 0,
        successRate: 0,
        metadata: {
          errorType: error.errorType,
          severity: error.severity,
        },
      });
    } catch (err) {
      console.error("Failed to store learning pattern:", err);
    }
  }
}

// Export singleton instance
export const diagnosisEngine = new DiagnosisEngine();
