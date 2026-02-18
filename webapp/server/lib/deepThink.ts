/**
 * DeepThink Analysis Runner
 * 
 * Implements deep analysis capabilities for complex legal and financial scenarios
 * Uses LLM for multi-step reasoning and strategic planning
 */

import { invokeLLM } from '../_core/llm';
import { createReceipt } from './receiptLedger';

export interface DeepThinkRequest {
  userId: number;
  scenario: string;
  context: Record<string, any>;
  analysisType: 'legal_strategy' | 'financial_analysis' | 'trust_planning' | 'compliance_review';
  depth: 'shallow' | 'medium' | 'deep';
}

export interface DeepThinkResult {
  analysis_id: string;
  timestamp: Date;
  scenario: string;
  findings: string[];
  recommendations: string[];
  risks: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mitigation: string;
  }>;
  confidence: number;
  reasoning_steps: string[];
  metadata: Record<string, any>;
}

/**
 * Run deep analysis on scenario
 * @param {DeepThinkRequest} request - Analysis request
 * @returns {Promise<DeepThinkResult>} Analysis result
 */
export async function runDeepThinkAnalysis(request: DeepThinkRequest): Promise<DeepThinkResult> {
  const analysisId = `deepthink_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Build system prompt based on analysis type
  const systemPrompt = getSystemPrompt(request.analysisType);
  
  // Build user prompt with scenario and context
  const userPrompt = buildUserPrompt(request);
  
  // Invoke LLM for analysis
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'deep_think_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            findings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key findings from the analysis',
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Actionable recommendations',
            },
            risks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  severity: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'critical'],
                  },
                  description: { type: 'string' },
                  mitigation: { type: 'string' },
                },
                required: ['severity', 'description', 'mitigation'],
                additionalProperties: false,
              },
            },
            confidence: {
              type: 'number',
              description: 'Confidence score from 0-100',
            },
            reasoning_steps: {
              type: 'array',
              items: { type: 'string' },
              description: 'Step-by-step reasoning process',
            },
          },
          required: ['findings', 'recommendations', 'risks', 'confidence', 'reasoning_steps'],
          additionalProperties: false,
        },
      },
    },
  });
  
  // Parse response
  const content = response.choices[0].message.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected response format from LLM');
  }
  const parsed = JSON.parse(content);
  
  const result: DeepThinkResult = {
    analysis_id: analysisId,
    timestamp: new Date(),
    scenario: request.scenario,
    findings: parsed.findings,
    recommendations: parsed.recommendations,
    risks: parsed.risks,
    confidence: parsed.confidence,
    reasoning_steps: parsed.reasoning_steps,
    metadata: {
      analysis_type: request.analysisType,
      depth: request.depth,
      context_keys: Object.keys(request.context),
    },
  };
  
  // Create audit receipt
  await createReceipt({
    action: 'deepthink_analysis',
    actor: `user:${request.userId}`,
    details: {
      analysis_id: analysisId,
      analysis_type: request.analysisType,
      depth: request.depth,
      confidence: parsed.confidence,
      findings_count: parsed.findings.length,
      recommendations_count: parsed.recommendations.length,
      risks_count: parsed.risks.length,
    },
    outcome: 'success',
    metadata: {
      llm_model: 'default',
      tokens_used: response.usage?.total_tokens || 0,
    },
  });
  
  return result;
}

/**
 * Get system prompt for analysis type
 * @param {string} analysisType - Analysis type
 * @returns {string} System prompt
 */
function getSystemPrompt(analysisType: string): string {
  const prompts = {
    legal_strategy: `You are an expert legal strategist specializing in consumer protection law, FDCPA, FCRA, and RICO cases. 
Analyze the provided scenario and provide comprehensive strategic recommendations. 
Consider all legal angles, potential defenses, and offensive strategies.
Identify risks and provide specific mitigation strategies.`,
    
    financial_analysis: `You are a financial analyst specializing in trust accounting, tax optimization, and estate planning.
Analyze the provided financial scenario with attention to tax implications, compliance requirements, and optimization opportunities.
Provide detailed findings, actionable recommendations, and risk assessments.`,
    
    trust_planning: `You are a trust and estate planning expert with deep knowledge of fiduciary duties, tax law, and beneficiary rights.
Analyze the trust planning scenario and provide comprehensive guidance on structure, administration, and compliance.
Consider tax efficiency, asset protection, and beneficiary interests.`,
    
    compliance_review: `You are a compliance officer specializing in regulatory requirements for trusts, estates, and financial institutions.
Review the provided scenario for compliance issues, regulatory risks, and best practices.
Identify gaps, recommend corrective actions, and assess severity of findings.`,
  };
  
  return prompts[analysisType as keyof typeof prompts] || prompts.legal_strategy;
}

/**
 * Build user prompt with scenario and context
 * @param {DeepThinkRequest} request - Analysis request
 * @returns {string} User prompt
 */
function buildUserPrompt(request: DeepThinkRequest): string {
  const depthInstructions = {
    shallow: 'Provide a concise analysis with top 3 findings and recommendations.',
    medium: 'Provide a balanced analysis with detailed findings and practical recommendations.',
    deep: 'Provide an exhaustive analysis with comprehensive findings, multi-layered recommendations, and detailed risk assessment.',
  };
  
  return `# Analysis Request

**Scenario:**
${request.scenario}

**Context:**
${JSON.stringify(request.context, null, 2)}

**Analysis Depth:** ${request.depth}
${depthInstructions[request.depth]}

Please analyze this scenario and provide:
1. Key findings (identify critical issues, patterns, and insights)
2. Actionable recommendations (specific steps to take)
3. Risk assessment (identify risks with severity and mitigation strategies)
4. Confidence score (0-100, based on available information)
5. Reasoning steps (show your analytical process)

Focus on practical, actionable insights that can be implemented immediately.`;
}

/**
 * Run comparative analysis between multiple scenarios
 * @param {Array<DeepThinkRequest>} requests - Multiple analysis requests
 * @returns {Promise<Object>} Comparative analysis
 */
export async function runComparativeAnalysis(
  requests: DeepThinkRequest[]
): Promise<{
  scenarios: DeepThinkResult[];
  comparison: {
    common_findings: string[];
    divergent_recommendations: Array<{
      scenario: string;
      recommendation: string;
    }>;
    highest_risks: Array<{
      scenario: string;
      risk: string;
      severity: string;
    }>;
  };
}> {
  // Run all analyses
  const results = await Promise.all(
    requests.map(req => runDeepThinkAnalysis(req))
  );
  
  // Find common findings
  const allFindings = results.flatMap(r => r.findings);
  const findingCounts = new Map<string, number>();
  allFindings.forEach(f => {
    findingCounts.set(f, (findingCounts.get(f) || 0) + 1);
  });
  
  const commonFindings = Array.from(findingCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([finding]) => finding);
  
  // Collect divergent recommendations
  const divergentRecommendations = results.flatMap(r => 
    r.recommendations.map(rec => ({
      scenario: r.scenario,
      recommendation: rec,
    }))
  );
  
  // Identify highest risks
  const allRisks = results.flatMap(r => 
    r.risks.map(risk => ({
      scenario: r.scenario,
      risk: risk.description,
      severity: risk.severity,
    }))
  );
  
  const highestRisks = allRisks
    .filter(r => r.severity === 'critical' || r.severity === 'high')
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity as keyof typeof severityOrder] - 
             severityOrder[a.severity as keyof typeof severityOrder];
    });
  
  return {
    scenarios: results,
    comparison: {
      common_findings: commonFindings,
      divergent_recommendations: divergentRecommendations,
      highest_risks: highestRisks,
    },
  };
}

/**
 * Generate analysis report
 * @param {DeepThinkResult} result - Analysis result
 * @returns {string} Markdown report
 */
export function generateAnalysisReport(result: DeepThinkResult): string {
  return `# DeepThink Analysis Report

**Analysis ID:** ${result.analysis_id}  
**Timestamp:** ${result.timestamp.toISOString()}  
**Confidence:** ${result.confidence}%

## Scenario

${result.scenario}

## Key Findings

${result.findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## Recommendations

${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Risk Assessment

${result.risks.map(risk => `
### ${risk.severity.toUpperCase()}: ${risk.description}

**Mitigation:** ${risk.mitigation}
`).join('\n')}

## Reasoning Process

${result.reasoning_steps.map((step, i) => `**Step ${i + 1}:** ${step}`).join('\n\n')}

---

*Analysis generated by DeepThink Analysis Runner*
`;
}

/**
 * Save analysis result to database
 * @param {DeepThinkResult} result - Analysis result
 * @returns {Promise<void>}
 */
export async function saveAnalysisResult(result: DeepThinkResult): Promise<void> {
  // In production, save to database
  // For now, just create a receipt
  await createReceipt({
    action: 'analysis_saved',
    actor: 'system',
    details: {
      analysis_id: result.analysis_id,
      confidence: result.confidence,
      findings_count: result.findings.length,
      recommendations_count: result.recommendations.length,
    },
    outcome: 'success',
  });
}
