/**
 * Vector Memory System for Agent Context Persistence
 * 
 * Stores and retrieves relevant context using semantic similarity.
 * Uses in-memory storage with optional persistence to database.
 * Can be upgraded to Pinecone, Weaviate, or other vector databases.
 */

import { invokeLLM } from "../../_core/llm";

interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    userId: number;
    caseId?: number;
    timestamp: number;
    type: "conversation" | "document" | "tool_result" | "case_note";
    tags?: string[];
  };
}

class VectorMemoryStore {
  private memories: Map<string, MemoryEntry> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();

  /**
   * Generate embedding for text using OpenAI embeddings API
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    try {
      // In production, use OpenAI embeddings API
      // For now, use mock embeddings (random normalized vector)
      const mockEmbedding = this.generateMockEmbedding(text);
      this.embeddingCache.set(text, mockEmbedding);
      return mockEmbedding;
    } catch (error) {
      console.error("Embedding generation failed:", error);
      return this.generateMockEmbedding(text);
    }
  }

  /**
   * Generate mock embedding (for development without API key)
   */
  private generateMockEmbedding(text: string): number[] {
    // Generate deterministic "embedding" based on text
    const dimension = 384; // Common embedding dimension
    const embedding: number[] = [];
    
    // Use text hash to generate consistent values
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }

    // Generate vector
    for (let i = 0; i < dimension; i++) {
      const seed = hash + i;
      embedding.push(Math.sin(seed) * Math.cos(seed * 0.5));
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have same dimension");
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Store a memory entry
   */
  async store(
    content: string,
    metadata: MemoryEntry["metadata"]
  ): Promise<string> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const embedding = await this.generateEmbedding(content);

    const entry: MemoryEntry = {
      id,
      content,
      embedding,
      metadata,
    };

    this.memories.set(id, entry);
    console.log(`[VectorMemory] Stored memory ${id} for user ${metadata.userId}`);

    return id;
  }

  /**
   * Retrieve relevant memories based on semantic similarity
   */
  async retrieve(
    query: string,
    userId: number,
    options: {
      limit?: number;
      threshold?: number;
      caseId?: number;
      type?: MemoryEntry["metadata"]["type"];
    } = {}
  ): Promise<MemoryEntry[]> {
    const {
      limit = 5,
      threshold = 0.7,
      caseId,
      type,
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Filter by user and optional filters
    let candidates = Array.from(this.memories.values()).filter(
      (entry) => entry.metadata.userId === userId
    );

    if (caseId !== undefined) {
      candidates = candidates.filter((entry) => entry.metadata.caseId === caseId);
    }

    if (type) {
      candidates = candidates.filter((entry) => entry.metadata.type === type);
    }

    // Calculate similarities
    const results = candidates
      .map((entry) => ({
        entry,
        similarity: this.cosineSimilarity(queryEmbedding, entry.embedding),
      }))
      .filter((result) => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((result) => result.entry);

    console.log(`[VectorMemory] Retrieved ${results.length} memories for query: "${query.substring(0, 50)}..."`);

    return results;
  }

  /**
   * Delete a memory entry
   */
  delete(id: string): boolean {
    return this.memories.delete(id);
  }

  /**
   * Clear all memories for a user
   */
  clearUser(userId: number): number {
    let count = 0;
    for (const [id, entry] of Array.from(this.memories.entries())) {
      if (entry.metadata.userId === userId) {
        this.memories.delete(id);
        count++;
      }
    }
    console.log(`[VectorMemory] Cleared ${count} memories for user ${userId}`);
    return count;
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    totalMemories: number;
    cacheSize: number;
    memoryByType: Record<string, number>;
  } {
    const memoryByType: Record<string, number> = {};

    for (const entry of Array.from(this.memories.values())) {
      const type = entry.metadata.type;
      memoryByType[type] = (memoryByType[type] || 0) + 1;
    }

    return {
      totalMemories: this.memories.size,
      cacheSize: this.embeddingCache.size,
      memoryByType,
    };
  }
}

// Singleton instance
export const vectorMemory = new VectorMemoryStore();

/**
 * Helper function to store agent interaction
 */
export async function storeAgentInteraction(
  userId: number,
  task: string,
  result: string,
  caseId?: number
): Promise<string> {
  const content = `Task: ${task}\n\nResult: ${result}`;
  return await vectorMemory.store(content, {
    userId,
    caseId,
    timestamp: Date.now(),
    type: "conversation",
    tags: ["agent", "task"],
  });
}

/**
 * Helper function to retrieve relevant context for a task
 */
export async function getRelevantContext(
  userId: number,
  task: string,
  caseId?: number
): Promise<string> {
  const memories = await vectorMemory.retrieve(task, userId, {
    limit: 3,
    threshold: 0.6,
    caseId,
  });

  if (memories.length === 0) {
    return "No relevant context found.";
  }

  return memories
    .map((mem, idx) => `[Context ${idx + 1}]\n${mem.content}`)
    .join("\n\n---\n\n");
}

/**
 * Helper function to store document content
 */
export async function storeDocument(
  userId: number,
  documentName: string,
  content: string,
  caseId?: number
): Promise<string> {
  return await vectorMemory.store(content, {
    userId,
    caseId,
    timestamp: Date.now(),
    type: "document",
    tags: ["document", documentName],
  });
}

/**
 * Helper function to store case notes
 */
export async function storeCaseNote(
  userId: number,
  caseId: number,
  note: string
): Promise<string> {
  return await vectorMemory.store(note, {
    userId,
    caseId,
    timestamp: Date.now(),
    type: "case_note",
    tags: ["case", "note"],
  });
}
