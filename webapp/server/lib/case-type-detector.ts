import { invokeLLM } from '../_core/llm';

export interface CaseTypeDetectionResult {
  caseType: string;
  confidence: number;
  suggestedWorkflow: string[];
  relevantLaws: string[];
  keyDocuments: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  suggestedStrategy: string;
}

export interface CaseInput {
  title?: string;
  description?: string;
  documents?: string[];
  parties?: string[];
  jurisdiction?: string;
}

const CASE_TYPES = [
  'FDCPA Violation',
  'Consumer Protection',
  'Debt Collection Abuse',
  'Credit Reporting Dispute',
  'Identity Theft',
  'Bankruptcy',
  'Contract Dispute',
  'Personal Injury',
  'Employment Discrimination',
  'Civil Rights Violation',
  'Real Estate Dispute',
  'Family Law',
  'Criminal Defense',
  'Immigration',
  'Intellectual Property',
];

export async function detectCaseType(input: CaseInput): Promise<CaseTypeDetectionResult> {
  const prompt = buildDetectionPrompt(input);

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a legal case type detection AI. Analyze case information and determine the most likely case type, relevant laws, and suggested workflow.

Available case types: ${CASE_TYPES.join(', ')}

Respond with a JSON object containing:
- caseType: The detected case type from the list above
- confidence: A number between 0 and 1 indicating confidence in the detection
- suggestedWorkflow: Array of workflow steps specific to this case type
- relevantLaws: Array of relevant laws, statutes, or regulations
- keyDocuments: Array of key documents needed for this case type
- estimatedComplexity: "low", "medium", or "high"
- suggestedStrategy: A brief strategic recommendation for handling this case`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'case_type_detection',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              caseType: { type: 'string' },
              confidence: { type: 'number' },
              suggestedWorkflow: {
                type: 'array',
                items: { type: 'string' },
              },
              relevantLaws: {
                type: 'array',
                items: { type: 'string' },
              },
              keyDocuments: {
                type: 'array',
                items: { type: 'string' },
              },
              estimatedComplexity: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
              },
              suggestedStrategy: { type: 'string' },
            },
            required: [
              'caseType',
              'confidence',
              'suggestedWorkflow',
              'relevantLaws',
              'keyDocuments',
              'estimatedComplexity',
              'suggestedStrategy',
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      throw new Error('No valid response from LLM');
    }

    const result: CaseTypeDetectionResult = JSON.parse(content);
    return result;
  } catch (error) {
    console.error('[CaseTypeDetector] Error detecting case type:', error);
    throw error;
  }
}

function buildDetectionPrompt(input: CaseInput): string {
  const parts: string[] = [];

  if (input.title) {
    parts.push(`Case Title: ${input.title}`);
  }

  if (input.description) {
    parts.push(`Description: ${input.description}`);
  }

  if (input.parties && input.parties.length > 0) {
    parts.push(`Parties Involved: ${input.parties.join(', ')}`);
  }

  if (input.jurisdiction) {
    parts.push(`Jurisdiction: ${input.jurisdiction}`);
  }

  if (input.documents && input.documents.length > 0) {
    parts.push(`Available Documents: ${input.documents.join(', ')}`);
  }

  return parts.join('\n\n');
}

export async function generateCaseWorkflow(
  caseType: string,
  customRequirements?: string[]
): Promise<string[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a legal workflow generator. Create a detailed step-by-step workflow for handling a specific case type.

Each step should be actionable and specific to the case type. Include:
- Initial client consultation steps
- Document collection and review
- Legal research requirements
- Filing deadlines and procedures
- Communication protocols
- Settlement negotiation steps
- Trial preparation if applicable

Respond with a JSON object containing a "workflow" array of strings.`,
        },
        {
          role: 'user',
          content: `Generate a detailed workflow for: ${caseType}${
            customRequirements && customRequirements.length > 0
              ? `\n\nAdditional Requirements:\n${customRequirements.join('\n')}`
              : ''
          }`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'workflow_generation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['workflow'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      throw new Error('No valid response from LLM');
    }

    const result = JSON.parse(content);
    return result.workflow;
  } catch (error) {
    console.error('[CaseTypeDetector] Error generating workflow:', error);
    throw error;
  }
}

export async function suggestCaseDocuments(
  caseType: string,
  currentDocuments: string[]
): Promise<{ required: string[]; optional: string[]; missing: string[] }> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a legal document advisor. Analyze what documents are needed for a specific case type and identify what's missing.

Categorize documents as:
- required: Essential documents that must be obtained
- optional: Helpful but not critical documents
- missing: Required documents that are not currently available

Respond with a JSON object containing these three arrays.`,
        },
        {
          role: 'user',
          content: `Case Type: ${caseType}\n\nCurrent Documents:\n${currentDocuments.join('\n')}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'document_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              required: {
                type: 'array',
                items: { type: 'string' },
              },
              optional: {
                type: 'array',
                items: { type: 'string' },
              },
              missing: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['required', 'optional', 'missing'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      throw new Error('No valid response from LLM');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('[CaseTypeDetector] Error suggesting documents:', error);
    throw error;
  }
}
