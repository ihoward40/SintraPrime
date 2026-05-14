export type ContextMode = 'full' | 'summarized' | 'retrieval_augmented' | 'compressed' | 'minimal';

export type WorkerTask = {
  taskId: string;
  executionId: string;
  workerName: string;
  capability: string;
  title: string;
  input: Record<string, unknown>;
  status: 'queued' | 'running' | 'blocked' | 'awaiting_approval' | 'completed' | 'failed';
  riskLevel: 'low' | 'medium' | 'high';
  costClass: 'cheap' | 'moderate' | 'expensive';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
};

export type WorkerResult = {
  taskId: string;
  status: 'completed' | 'failed' | 'blocked';
  output?: Record<string, unknown>;
  error?: { code: string; message: string; retryable: boolean };
  metrics: { durationMs: number; memoryMb?: number; tokensIn?: number; tokensOut?: number; costUsd?: number };
};

export type RetrievalJob = {
  jobId: string;
  sourceType: 'email' | 'doc' | 'pdf' | 'transcript' | 'web' | 'artifact';
  sourceId: string;
  priority: 'hot' | 'warm' | 'cold';
  status: 'queued' | 'indexing' | 'refining' | 'completed' | 'failed';
  embeddingModel: string;
  compressionMode: 'none' | 'quantized' | 'compact';
  createdAt: string;
};
