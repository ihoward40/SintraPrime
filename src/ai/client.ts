/**
 * OpenAI Client for SintraPrime
 * 
 * Provides AI-powered analysis and report generation for governance operations
 */

// Lazy-loaded OpenAI client
let openaiInstance: any = null;
let openaiLoadError: Error | null = null;

async function getOpenAI(): Promise<any | null> {
  if (openaiInstance) return openaiInstance;
  if (openaiLoadError) return null;
  
  try {
    // @ts-ignore - OpenAI is an optional dependency
    // Dynamic import will gracefully fail if package not installed
    const OpenAIModule = await import('openai');
    if (process.env.OPENAI_API_KEY) {
      openaiInstance = new OpenAIModule.OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_API_BASE,
      });
    }
    return openaiInstance;
  } catch (error) {
    openaiLoadError = error as Error;
    console.warn('OpenAI package not installed. AI features will be disabled.');
    return null;
  }
}

export const openai = null; // Deprecated: use getOpenAI() instead

export function isAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Generate analysis report with AI
 */
export async function generateAnalysisReport(
  analysisData: any,
  options: { format?: 'markdown' | 'text' } = {}
): Promise<string> {
  const openai = await getOpenAI();
  if (!isAIAvailable() || !openai) {
    return '# Analysis Report\n\n*AI features not available. Please configure OPENAI_API_KEY.*';
  }

  const { format = 'markdown' } = options;

  const prompt = `Generate a comprehensive governance analysis report based on the following data:

${JSON.stringify(analysisData, null, 2)}

Format the report as ${format} with the following sections:
1. Executive Summary
2. Key Findings
3. Risk Assessment
4. Recommendations
5. Compliance Status
6. Next Steps

Be professional, concise, and actionable.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a governance and compliance analyst generating audit reports.' },
        { role: 'user', content: prompt }
      ],
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('AI analysis failed:', error);
    return '# Analysis Report\n\n*AI analysis failed. See logs for details.*';
  }
}

/**
 * Generate natural language summary of DeepThink output
 */
export async function summarizeDeepThinkOutput(output: any): Promise<string> {
  const openai = await getOpenAI();
  if (!isAIAvailable() || !openai) {
    return 'AI summary not available. Please configure OPENAI_API_KEY.';
  }

  const prompt = `Summarize the following analysis output in clear, non-technical language:

${JSON.stringify(output, null, 2)}

Provide:
1. What was analyzed
2. Key findings (3-5 bullet points)
3. Overall assessment
4. Recommended actions

Keep it concise and suitable for executive review.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a governance analyst creating executive summaries.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('AI summary failed:', error);
    return 'AI summary failed. See logs for details.';
  }
}

/**
 * Generate visual diagram description for system architecture
 */
export async function generateDiagramDescription(
  systemComponents: string[]
): Promise<string> {
  const openai = await getOpenAI();
  if (!isAIAvailable() || !openai) {
    return 'AI diagram generation not available. Please configure OPENAI_API_KEY.';
  }

  const prompt = `Create a detailed description for a system architecture diagram with these components:

${systemComponents.join('\n')}

Describe:
1. Component relationships
2. Data flow
3. Security boundaries
4. Integration points

Format as a structured description suitable for diagram generation.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a system architect creating architecture diagrams.' },
        { role: 'user', content: prompt }
      ],
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('AI diagram generation failed:', error);
    return 'AI diagram generation failed. See logs for details.';
  }
}
