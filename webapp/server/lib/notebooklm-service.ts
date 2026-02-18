/**
 * NotebookLM Service - AI-Powered Research Platform
 * 
 * Replicates Google NotebookLM functionality using Gemini API:
 * - Document analysis and summarization
 * - Source-grounded Q&A with citations
 * - Study guides, briefings, FAQs, timelines
 * - Flashcards and quizzes generation
 */

import { invokeLLM } from "../_core/llm";
import type { Message } from "../_core/llm";

export interface DocumentAnalysisResult {
  summary: string;
  keyTopics: string[];
  wordCount: number;
  readingTime: number; // in minutes
}

export interface QAResult {
  answer: string;
  citations: Array<{
    documentId: number;
    fileName: string;
    excerpt: string;
    relevanceScore: number;
  }>;
  confidence: number;
}

export interface StudyGuideResult {
  title: string;
  sections: Array<{
    heading: string;
    content: string;
    keyPoints: string[];
  }>;
  suggestedReadings: string[];
}

export interface TimelineResult {
  events: Array<{
    date: string;
    title: string;
    description: string;
    source: string;
  }>;
}

export interface FlashcardSet {
  cards: Array<{
    front: string;
    back: string;
    category?: string;
  }>;
}

export interface QuizResult {
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
}

export class NotebookLMService {
  /**
   * Analyze a document and generate summary with key topics
   */
  async analyzeDocument(
    documentText: string,
    fileName: string
  ): Promise<DocumentAnalysisResult> {
    const wordCount = documentText.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    const prompt = `Analyze the following document and provide:
1. A comprehensive summary (3-5 paragraphs)
2. Key topics and themes (5-10 topics)

Document: "${fileName}"

Content:
${documentText.substring(0, 50000)} ${documentText.length > 50000 ? "...(truncated)" : ""}

Respond in JSON format:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2", ...]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert research assistant. Analyze documents thoroughly and extract key insights.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              keyTopics: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["summary", "keyTopics"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === "string" ? content : "{}");

    return {
      summary: result.summary || "",
      keyTopics: result.keyTopics || [],
      wordCount,
      readingTime,
    };
  }

  /**
   * Answer a question based on provided documents with source citations
   */
  async answerQuestion(
    question: string,
    documents: Array<{
      id: number;
      fileName: string;
      content: string;
    }>
  ): Promise<QAResult> {
    // Build context from all documents
    const context = documents
      .map(
        (doc, idx) =>
          `[Document ${idx + 1}: ${doc.fileName}]\n${doc.content.substring(0, 10000)}`
      )
      .join("\n\n---\n\n");

    const prompt = `Based on the provided documents, answer the following question with specific citations.

Question: ${question}

Documents:
${context}

Provide a comprehensive answer with citations. For each claim, reference the specific document and include a relevant excerpt.

Respond in JSON format:
{
  "answer": "Your detailed answer here...",
  "citations": [
    {
      "documentIndex": 0,
      "excerpt": "Relevant quote from the document",
      "relevanceScore": 0.95
    }
  ],
  "confidence": 0.9
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant. Always cite your sources and provide evidence-based answers.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "qa_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              answer: { type: "string" },
              citations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    documentIndex: { type: "integer" },
                    excerpt: { type: "string" },
                    relevanceScore: { type: "number" },
                  },
                  required: ["documentIndex", "excerpt", "relevanceScore"],
                  additionalProperties: false,
                },
              },
              confidence: { type: "number" },
            },
            required: ["answer", "citations", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === "string" ? content : "{}");

    // Map document indices to actual document info
    const citations = result.citations.map((citation: any) => ({
      documentId: documents[citation.documentIndex]?.id || 0,
      fileName: documents[citation.documentIndex]?.fileName || "Unknown",
      excerpt: citation.excerpt,
      relevanceScore: citation.relevanceScore,
    }));

    return {
      answer: result.answer || "",
      citations,
      confidence: result.confidence || 0.5,
    };
  }

  /**
   * Generate a study guide from documents
   */
  async generateStudyGuide(
    documents: Array<{ fileName: string; content: string }>,
    focusAreas?: string[]
  ): Promise<StudyGuideResult> {
    const context = documents
      .map((doc) => `[${doc.fileName}]\n${doc.content.substring(0, 10000)}`)
      .join("\n\n---\n\n");

    const focusPrompt = focusAreas?.length
      ? `Focus on these areas: ${focusAreas.join(", ")}`
      : "";

    const prompt = `Create a comprehensive study guide from the following documents.
${focusPrompt}

Documents:
${context}

Generate a structured study guide with:
- Clear section headings
- Detailed content for each section
- Key points to remember
- Suggested additional readings

Respond in JSON format:
{
  "title": "Study Guide Title",
  "sections": [
    {
      "heading": "Section Title",
      "content": "Detailed content...",
      "keyPoints": ["point1", "point2"]
    }
  ],
  "suggestedReadings": ["reading1", "reading2"]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert educator. Create clear, comprehensive study guides.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "study_guide",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    heading: { type: "string" },
                    content: { type: "string" },
                    keyPoints: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["heading", "content", "keyPoints"],
                  additionalProperties: false,
                },
              },
              suggestedReadings: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["title", "sections", "suggestedReadings"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    return JSON.parse(typeof content === "string" ? content : "{}");
  }

  /**
   * Generate a timeline from documents
   */
  async generateTimeline(
    documents: Array<{ fileName: string; content: string }>
  ): Promise<TimelineResult> {
    const context = documents
      .map((doc) => `[${doc.fileName}]\n${doc.content.substring(0, 10000)}`)
      .join("\n\n---\n\n");

    const prompt = `Extract and organize all time-based events from the following documents into a chronological timeline.

Documents:
${context}

Create a timeline with:
- Date (as specific as possible)
- Event title
- Brief description
- Source document

Respond in JSON format:
{
  "events": [
    {
      "date": "YYYY-MM-DD or descriptive date",
      "title": "Event title",
      "description": "Brief description",
      "source": "Document name"
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a historical analyst. Extract and organize temporal information accurately.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "timeline",
          strict: true,
          schema: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    source: { type: "string" },
                  },
                  required: ["date", "title", "description", "source"],
                  additionalProperties: false,
                },
              },
            },
            required: ["events"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    return JSON.parse(typeof content === "string" ? content : "{}");
  }

  /**
   * Generate flashcards from documents
   */
  async generateFlashcards(
    documents: Array<{ fileName: string; content: string }>,
    count: number = 20
  ): Promise<FlashcardSet> {
    const context = documents
      .map((doc) => `[${doc.fileName}]\n${doc.content.substring(0, 10000)}`)
      .join("\n\n---\n\n");

    const prompt = `Create ${count} flashcards from the following documents.
Each flashcard should have:
- A clear question or term on the front
- A concise answer or definition on the back
- Optional category for organization

Documents:
${context}

Respond in JSON format:
{
  "cards": [
    {
      "front": "Question or term",
      "back": "Answer or definition",
      "category": "Optional category"
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert educator. Create effective flashcards for learning.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "flashcards",
          strict: true,
          schema: {
            type: "object",
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    front: { type: "string" },
                    back: { type: "string" },
                    category: { type: "string" },
                  },
                  required: ["front", "back"],
                  additionalProperties: false,
                },
              },
            },
            required: ["cards"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    return JSON.parse(typeof content === "string" ? content : "{}");
  }

  /**
   * Generate a quiz from documents
   */
  async generateQuiz(
    documents: Array<{ fileName: string; content: string }>,
    questionCount: number = 10
  ): Promise<QuizResult> {
    const context = documents
      .map((doc) => `[${doc.fileName}]\n${doc.content.substring(0, 10000)}`)
      .join("\n\n---\n\n");

    const prompt = `Create a ${questionCount}-question multiple choice quiz from the following documents.

Each question should have:
- A clear question
- 4 answer options
- The correct answer index (0-3)
- An explanation

Documents:
${context}

Respond in JSON format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert educator. Create challenging but fair quiz questions.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quiz",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: {
                      type: "array",
                      items: { type: "string" },
                    },
                    correctAnswer: { type: "integer" },
                    explanation: { type: "string" },
                  },
                  required: ["question", "options", "correctAnswer", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    return JSON.parse(typeof content === "string" ? content : "{}");
  }

  /**
   * Generate a briefing document from documents
   */
  async generateBriefing(
    documents: Array<{ fileName: string; content: string }>,
    purpose?: string
  ): Promise<string> {
    const context = documents
      .map((doc) => `[${doc.fileName}]\n${doc.content.substring(0, 10000)}`)
      .join("\n\n---\n\n");

    const purposePrompt = purpose
      ? `Purpose: ${purpose}`
      : "Purpose: General briefing";

    const prompt = `Create a professional briefing document from the following sources.
${purposePrompt}

Documents:
${context}

The briefing should include:
- Executive summary
- Key findings
- Recommendations
- Supporting details

Format as a well-structured markdown document.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a professional analyst. Create clear, actionable briefing documents.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === "string" ? content : "";
  }

  /**
   * Generate FAQ from documents
   */
  async generateFAQ(
    documents: Array<{ fileName: string; content: string }>,
    questionCount: number = 10
  ): Promise<Array<{ question: string; answer: string }>> {
    const context = documents
      .map((doc) => `[${doc.fileName}]\n${doc.content.substring(0, 10000)}`)
      .join("\n\n---\n\n");

    const prompt = `Generate ${questionCount} frequently asked questions and answers from the following documents.

Documents:
${context}

Create questions that:
- Address common concerns
- Cover key topics
- Are clearly answered in the source material

Respond in JSON format:
{
  "faqs": [
    {
      "question": "Question text",
      "answer": "Detailed answer"
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Create useful FAQs from source material.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "faq",
          strict: true,
          schema: {
            type: "object",
            properties: {
              faqs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    answer: { type: "string" },
                  },
                  required: ["question", "answer"],
                  additionalProperties: false,
                },
              },
            },
            required: ["faqs"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === "string" ? content : "{}");
    return result.faqs || [];
  }
}

// Export singleton instance
export const notebookLMService = new NotebookLMService();
