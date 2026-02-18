/**
 * Batch Processing System
 * Process multiple items in parallel with progress tracking
 */

export interface BatchJob<T, R> {
  id: string;
  items: T[];
  processor: (item: T, index: number) => Promise<R>;
  concurrency?: number;
  onProgress?: (completed: number, total: number, result: R) => void;
  onComplete?: (results: Array<{ success: boolean; result?: R; error?: string }>) => void;
}

export interface BatchResult<R> {
  success: boolean;
  result?: R;
  error?: string;
  index: number;
  duration: number;
}

export class BatchProcessor {
  private activeJobs: Map<string, {
    total: number;
    completed: number;
    results: Array<BatchResult<any>>;
    status: "running" | "completed" | "cancelled";
  }> = new Map();

  /**
   * Process items in batch with concurrency control
   */
  async processBatch<T, R>(job: BatchJob<T, R>): Promise<Array<BatchResult<R>>> {
    const { id, items, processor, concurrency = 5, onProgress, onComplete } = job;

    // Initialize job tracking
    this.activeJobs.set(id, {
      total: items.length,
      completed: 0,
      results: [],
      status: "running"
    });

    const results: Array<BatchResult<R>> = [];
    const queue = [...items];
    let activeCount = 0;
    let completedCount = 0;

    return new Promise((resolve) => {
      const processNext = async () => {
        // Check if job was cancelled
        const jobStatus = this.activeJobs.get(id);
        if (jobStatus?.status === "cancelled") {
          resolve(results);
          return;
        }

        if (queue.length === 0 && activeCount === 0) {
          // All items processed
          this.activeJobs.set(id, {
            ...this.activeJobs.get(id)!,
            status: "completed"
          });

          if (onComplete) {
            onComplete(results);
          }

          resolve(results);
          return;
        }

        while (queue.length > 0 && activeCount < concurrency) {
          const item = queue.shift()!;
          const index = items.indexOf(item);

          activeCount++;

          (async () => {
            const startTime = Date.now();

            try {
              const result = await processor(item, index);
              const duration = Date.now() - startTime;

              const batchResult: BatchResult<R> = {
                success: true,
                result,
                index,
                duration
              };

              results.push(batchResult);
              completedCount++;

              // Update job tracking
              const jobStatus = this.activeJobs.get(id);
              if (jobStatus) {
                jobStatus.completed = completedCount;
                jobStatus.results.push(batchResult);
              }

              if (onProgress) {
                onProgress(completedCount, items.length, result);
              }
            } catch (error) {
              const duration = Date.now() - startTime;
              const errorMessage = error instanceof Error ? error.message : "Unknown error";

              const batchResult: BatchResult<R> = {
                success: false,
                error: errorMessage,
                index,
                duration
              };

              results.push(batchResult);
              completedCount++;

              // Update job tracking
              const jobStatus = this.activeJobs.get(id);
              if (jobStatus) {
                jobStatus.completed = completedCount;
                jobStatus.results.push(batchResult);
              }

              if (onProgress) {
                onProgress(completedCount, items.length, undefined as any);
              }
            } finally {
              activeCount--;
              processNext();
            }
          })();
        }
      };

      // Start processing
      processNext();
    });
  }

  /**
   * Get batch job status
   */
  getJobStatus(jobId: string): {
    total: number;
    completed: number;
    progress: number;
    status: string;
    results: Array<BatchResult<any>>;
  } | null {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      total: job.total,
      completed: job.completed,
      progress: job.total > 0 ? (job.completed / job.total) * 100 : 0,
      status: job.status,
      results: job.results
    };
  }

  /**
   * Cancel a batch job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status !== "running") {
      return false;
    }

    job.status = "cancelled";
    return true;
  }

  /**
   * Clear completed job
   */
  clearJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status === "running") {
      return false;
    }

    this.activeJobs.delete(jobId);
    return true;
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): Array<{ id: string; total: number; completed: number; status: string }> {
    return Array.from(this.activeJobs.entries()).map(([id, job]) => ({
      id,
      total: job.total,
      completed: job.completed,
      status: job.status
    }));
  }
}

// Global batch processor instance
export const batchProcessor = new BatchProcessor();

/**
 * Batch scraping helper
 */
export async function batchScrape(
  items: Array<{ url: string; template: string; params: Record<string, any> }>,
  concurrency = 3
): Promise<Array<BatchResult<any>>> {
  const jobId = `scrape_${Date.now()}`;

  return batchProcessor.processBatch({
    id: jobId,
    items,
    concurrency,
    processor: async (item) => {
      // TODO: Call browser automation service
      return {
        url: item.url,
        template: item.template,
        data: {}
      };
    },
    onProgress: (completed, total) => {
      console.log(`[Batch Scraping] Progress: ${completed}/${total}`);
    }
  });
}

/**
 * Batch video generation helper
 */
export async function batchGenerateVideos(
  items: Array<{ templateKey: string; customizations: Record<string, any> }>,
  concurrency = 2
): Promise<Array<BatchResult<any>>> {
  const jobId = `video_${Date.now()}`;

  return batchProcessor.processBatch({
    id: jobId,
    items,
    concurrency,
    processor: async (item) => {
      // TODO: Call InVideo service
      return {
        templateKey: item.templateKey,
        videoId: `video_${Date.now()}`,
        videoUrl: "https://example.com/video.mp4"
      };
    },
    onProgress: (completed, total) => {
      console.log(`[Batch Video Generation] Progress: ${completed}/${total}`);
    }
  });
}
