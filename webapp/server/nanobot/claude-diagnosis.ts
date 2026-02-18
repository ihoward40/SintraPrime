import Anthropic from "@anthropic-ai/sdk";
import type { NanobotErrorLog } from "../../drizzle/schema";
import type { DiagnosisResult } from "./diagnosis-engine";

/**
 * Claude Code integration for enhanced AI diagnosis
 * Uses Anthropic's Claude API for advanced error analysis
 */
export class ClaudeDiagnosisEngine {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }
    
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * Analyze an error using Claude's advanced reasoning
   */
  async diagnose(error: NanobotErrorLog): Promise<DiagnosisResult> {
    const prompt = this.buildDiagnosisPrompt(error);

    try {
      const message = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307", // Fast and cost-effective for diagnosis
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent analysis
        system: `You are an expert system diagnostician for SintraPrime, a legal warfare platform.
Your role is to analyze errors and provide concrete, actionable repair strategies.
You have deep knowledge of:
- Node.js/Express backend systems
- React frontend applications
- Database connection issues (MySQL/TiDB)
- API integration problems
- Authentication and session management
- Network and connectivity issues

Always respond with valid JSON matching the DiagnosisResult schema.
Prioritize automated fixes when possible and be specific about repair actions.`,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      // Extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }

      const diagnosis: DiagnosisResult = JSON.parse(jsonMatch[0]);
      
      return diagnosis;
    } catch (err) {
      console.error("Claude diagnosis failed:", err);
      throw err;
    }
  }

  /**
   * Build a detailed diagnostic prompt for Claude
   */
  private buildDiagnosisPrompt(error: NanobotErrorLog): string {
    return `
Analyze this system error and provide a detailed diagnosis in JSON format.

**Error Details:**
- Type: ${error.errorType}
- Severity: ${error.severity}
- Message: ${error.errorMessage}
- Source: ${error.source || "unknown"}
- Timestamp: ${new Date(error.createdAt).toISOString()}

${error.stackTrace ? `**Stack Trace:**\n\`\`\`\n${error.stackTrace.substring(0, 1000)}\n\`\`\`\n` : ""}

${error.context ? `**Context:**\n\`\`\`json\n${JSON.stringify(error.context, null, 2).substring(0, 500)}\n\`\`\`\n` : ""}

**Required JSON Response Format:**
\`\`\`json
{
  "rootCause": "string - detailed explanation of what caused this error",
  "severity": "low" | "medium" | "high" | "critical",
  "affectedComponents": ["array", "of", "component", "names"],
  "suggestedFixes": [
    {
      "type": "string - fix type identifier",
      "description": "string - what this fix does",
      "command": "string - optional command to execute",
      "automated": boolean - can this be automated?,
      "riskLevel": "low" | "medium" | "high"
    }
  ],
  "confidence": number (0-100),
  "requiresHumanIntervention": boolean
}
\`\`\`

**Common Fix Types:**
- restart_connection: Restart database/API connections
- retry_request: Retry failed HTTP requests with backoff
- clear_cache: Clear application cache
- restart_service: Restart affected service/process
- restore_config: Restore default configuration
- refresh_tokens: Refresh authentication tokens
- update_dependencies: Update outdated packages
- fix_permissions: Fix file/directory permissions

Provide your analysis now in valid JSON format.
`.trim();
  }

  /**
   * Get a quick diagnosis for triage (faster, cheaper)
   */
  async quickDiagnose(error: NanobotErrorLog): Promise<{
    severity: string;
    category: string;
    automated: boolean;
  }> {
    try {
      const message = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 100,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: `Categorize this error in JSON format:
Error: ${error.errorMessage}
Type: ${error.errorType}

Respond with: {"severity": "low|medium|high|critical", "category": "database|network|auth|frontend|backend|unknown", "automated": true|false}`,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON in response");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("Quick diagnosis failed:", err);
      return {
        severity: "medium",
        category: "unknown",
        automated: false,
      };
    }
  }
}

// Export singleton instance
export const claudeDiagnosisEngine = process.env.ANTHROPIC_API_KEY
  ? new ClaudeDiagnosisEngine()
  : null;
