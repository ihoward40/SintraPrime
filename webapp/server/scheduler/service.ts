/**
 * Task Scheduling Service
 * Manages scheduled task execution using cron and intervals
 */

import { CronJob } from "cron";

interface ScheduledTask {
  id: number;
  userId: number;
  name: string;
  taskType: string;
  taskConfig: string;
  scheduleType: string;
  cronExpression?: string | null;
  intervalSeconds?: number | null;
  scheduledAt?: Date | null;
  enabled: boolean;
}

interface TaskExecutor {
  (taskConfig: any, userId: number): Promise<{ success: boolean; output?: any; error?: string }>;
}

export class TaskScheduler {
  private jobs: Map<number, CronJob | NodeJS.Timeout> = new Map();
  private executors: Map<string, TaskExecutor> = new Map();

  /**
   * Register a task executor
   */
  registerExecutor(taskType: string, executor: TaskExecutor): void {
    this.executors.set(taskType, executor);
  }

  /**
   * Schedule a task
   */
  async scheduleTask(task: ScheduledTask): Promise<void> {
    if (!task.enabled) {
      return;
    }

    // Remove existing job if any
    this.unscheduleTask(task.id);

    try {
      switch (task.scheduleType) {
        case "cron":
          if (task.cronExpression) {
            const cronJob = new CronJob(
              task.cronExpression,
              () => this.executeTask(task),
              null,
              true,
              "America/New_York" // TODO: Use user's timezone
            );
            this.jobs.set(task.id, cronJob);
          }
          break;

        case "interval":
          if (task.intervalSeconds) {
            const intervalId = setInterval(
              () => this.executeTask(task),
              task.intervalSeconds * 1000
            );
            this.jobs.set(task.id, intervalId);
          }
          break;

        case "once":
          if (task.scheduledAt) {
            const delay = task.scheduledAt.getTime() - Date.now();
            if (delay > 0) {
              const timeoutId = setTimeout(() => {
                this.executeTask(task);
                this.unscheduleTask(task.id);
              }, delay);
              this.jobs.set(task.id, timeoutId);
            }
          }
          break;
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to schedule task ${task.id}:`, error);
    }
  }

  /**
   * Unschedule a task
   */
  unscheduleTask(taskId: number): void {
    const job = this.jobs.get(taskId);
    if (job) {
      if (job instanceof CronJob) {
        job.stop();
      } else {
        clearInterval(job);
      }
      this.jobs.delete(taskId);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    console.log(`[Scheduler] Executing task ${task.id}: ${task.name}`);

    const executor = this.executors.get(task.taskType);
    if (!executor) {
      console.error(`[Scheduler] No executor found for task type: ${task.taskType}`);
      return;
    }

    const startTime = Date.now();

    try {
      const taskConfig = JSON.parse(task.taskConfig);
      const result = await executor(taskConfig, task.userId);

      const duration = Date.now() - startTime;

      console.log(`[Scheduler] Task ${task.id} completed in ${duration}ms`);

      // TODO: Save execution to database
      // await db.insertTaskExecution({
      //   taskId: task.id,
      //   userId: task.userId,
      //   status: result.success ? "completed" : "failed",
      //   startedAt: new Date(startTime),
      //   completedAt: new Date(),
      //   duration,
      //   output: result.output ? JSON.stringify(result.output) : null,
      //   error: result.error,
      //   logs: null,
      //   createdAt: new Date()
      // });

      // TODO: Update task statistics
      // await db.updateTaskStats(task.id, result.success);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      console.error(`[Scheduler] Task ${task.id} failed:`, errorMessage);

      // TODO: Save failed execution to database
    }
  }

  /**
   * Load and schedule all active tasks
   */
  async loadTasks(tasks: ScheduledTask[]): Promise<void> {
    for (const task of tasks) {
      await this.scheduleTask(task);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    for (const [taskId, job] of Array.from(this.jobs.entries())) {
      if (job instanceof CronJob) {
        job.stop();
      } else {
        clearInterval(job);
      }
    }
    this.jobs.clear();
  }
}

// Global scheduler instance
export const taskScheduler = new TaskScheduler();

// Register default executors
taskScheduler.registerExecutor("workflow", async (config, userId) => {
  // TODO: Execute workflow
  return { success: true, output: { message: "Workflow executed" } };
});

taskScheduler.registerExecutor("scraping", async (config, userId) => {
  // TODO: Execute scraping task
  return { success: true, output: { message: "Scraping completed" } };
});

taskScheduler.registerExecutor("video", async (config, userId) => {
  // TODO: Execute video generation
  return { success: true, output: { message: "Video generated" } };
});
