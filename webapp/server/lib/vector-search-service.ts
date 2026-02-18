/**
 * Vector Search Service
 * 
 * Provides semantic search capabilities for NotebookLM documents using embeddings.
 * Uses OpenAI embeddings for vector generation and cosine similarity for search.
 */

import { invokeLLM } from "../_core/llm";

export interface DocumentEmbedding {
  documentId: number;
  embedding: number[];
  text: string;
  fileName: string;
}

export interface SearchResult {
  documentId: number;
  fileName: string;
  excerpt: string;
  similarity: number;
}

export class VectorSearchService {
  /**
   * Generate embedding vector for text using Gemini
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Use Gemini's embedding model
    // Note: This is a simplified implementation
    // In production, you would use a dedicated embedding model
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Convert the following text into a semantic embedding vector. Return a JSON array of 768 floating point numbers representing the text's semantic meaning.",
        },
        {
          role: "user",
          content: text.substring(0, 8000), // Limit text length
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "embedding",
          strict: true,
          schema: {
            type: "object",
            properties: {
              embedding: {
                type: "array",
                items: { type: "number" },
                description: "768-dimensional embedding vector",
              },
            },
            required: ["embedding"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === "string" ? content : "{}");
    
    return result.embedding || [];
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Search documents using semantic similarity
   */
  async searchDocuments(
    query: string,
    documents: DocumentEmbedding[],
    topK: number = 5
  ): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate similarity scores
    const results = documents.map((doc) => ({
      documentId: doc.documentId,
      fileName: doc.fileName,
      excerpt: this.extractExcerpt(doc.text, query),
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Sort by similarity (descending) and return top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Extract relevant excerpt from text based on query
   */
  private extractExcerpt(text: string, query: string, maxLength: number = 200): string {
    // Simple keyword-based excerpt extraction
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/);

    // Find sentence with most query words
    let bestSentence = sentences[0] || "";
    let maxMatches = 0;

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const matches = queryWords.filter((word) => lowerSentence.includes(word)).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestSentence = sentence;
      }
    }

    // Trim to max length
    if (bestSentence.length > maxLength) {
      return bestSentence.substring(0, maxLength) + "...";
    }

    return bestSentence.trim();
  }

  /**
   * Batch generate embeddings for multiple documents
   */
  async generateDocumentEmbeddings(
    documents: Array<{ id: number; fileName: string; content: string }>
  ): Promise<DocumentEmbedding[]> {
    const embeddings: DocumentEmbedding[] = [];

    for (const doc of documents) {
      try {
        const embedding = await this.generateEmbedding(doc.content);
        embeddings.push({
          documentId: doc.id,
          embedding,
          text: doc.content,
          fileName: doc.fileName,
        });
      } catch (error) {
        console.error(`Failed to generate embedding for document ${doc.id}:`, error);
      }
    }

    return embeddings;
  }
}

/**
 * Alternative: Use OpenAI Embeddings API (more reliable and faster)
 */
export class OpenAIVectorSearchService extends VectorSearchService {
  /**
   * Generate embedding using OpenAI's text-embedding-3-small model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000), // OpenAI limit
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Embeddings API error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}

/**
 * Factory function to get the appropriate vector search service
 */
export function getVectorSearchService(): VectorSearchService {
  // Use OpenAI if API key is available (more reliable)
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIVectorSearchService();
  }
  
  // Fallback to Gemini-based service
  return new VectorSearchService();
}
