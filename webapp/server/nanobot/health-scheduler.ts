import * as nanobotDb from "../db/nanobot-helpers";
import { diagnosisEngine } from "./diagnosis-engine";
import { repairSystem } from "./repair-system";
import { notifyOwner } from "../_core/notification";

/**
 * Background health check scheduler
 * Runs periodic system health checks and auto-repairs
 */
export class HealthScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkInterval = 5 * 60 * 1000; // 5 minutes

  /**
   * Start the background health checker
   */
  start() {
    if (this.isRunning) {
      console.log("[Nanobot] Health scheduler already running");
      return;
    }

    console.log("[Nanobot] Starting background health checks (every 5 minutes)");
    this.isRunning = true;

    // Run immediately on start
    this.runHealthCheck();

    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.runHealthCheck();
    }, this.checkInterval);
  }

  /**
   * Stop the background health checker
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[Nanobot] Health scheduler stopped");
  }

  /**
   * Run a complete health check cycle
   */
  private async runHealthCheck() {
    try {
      console.log("[Nanobot] Running scheduled health check...");

      // 1. Check system health
      const healthStatus = await this.checkSystemHealth();

      // 2. Log health check
      await nanobotDb.createHealthCheck({
        checkType: "scheduled",
        status: healthStatus.status,
        metadata: {
          metrics: healthStatus.metrics,
          issues: healthStatus.issues,
        },
      });

      // 3. If issues found, attempt auto-repair
      if (healthStatus.issues.length > 0) {
        console.log(`[Nanobot] Found ${healthStatus.issues.length} issues, attempting auto-repair...`);
        
        for (const issue of healthStatus.issues) {
          await this.handleIssue(issue);
        }
      } else {
        console.log("[Nanobot] System health check passed - no issues found");
      }

    } catch (error) {
      console.error("[Nanobot] Health check failed:", error);
      
      // Log the health check failure
      await nanobotDb.createHealthCheck({
        checkType: "scheduled",
        status: "error",
        metadata: {
          error: String(error),
          issues: ["Health check failed"],
        },
      });
    }
  }

  /**
   * Check system health across multiple components
   */
  private async checkSystemHealth(): Promise<{
    status: string;
    metrics: Record<string, any>;
    issues: string[];
  }> {
    const metrics: Record<string, any> = {};
    const issues: string[] = [];

    // Check 1: Database connectivity
    try {
      const dbCheck = await this.checkDatabase();
      metrics.database = dbCheck;
      if (!dbCheck.connected) {
        issues.push("Database connection failed");
      }
    } catch (err) {
      metrics.database = { error: String(err) };
      issues.push("Database health check error");
    }

    // Check 2: Recent error rate
    try {
      const errorRate = await this.checkErrorRate();
      metrics.errorRate = errorRate;
      if (errorRate.recentErrors > 10) {
        issues.push(`High error rate: ${errorRate.recentErrors} errors in last hour`);
      }
    } catch (err) {
      metrics.errorRate = { error: String(err) };
    }

    // Check 3: Repair success rate
    try {
      const repairRate = await this.checkRepairSuccessRate();
      metrics.repairSuccessRate = repairRate;
      if (repairRate.successRate < 0.5 && repairRate.totalRepairs > 5) {
        issues.push(`Low repair success rate: ${(repairRate.successRate * 100).toFixed(1)}%`);
      }
    } catch (err) {
      metrics.repairSuccessRate = { error: String(err) };
    }

    // Check 4: System resources (memory usage)
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      metrics.memory = {
        heapUsedMB,
        heapTotalMB,
        usage: (heapUsedMB / heapTotalMB * 100).toFixed(1) + "%",
      };
      
      if (heapUsedMB > 500) {
        issues.push(`High memory usage: ${heapUsedMB}MB`);
      }
    } catch (err) {
      metrics.memory = { error: String(err) };
    }

    const status = issues.length === 0 ? "healthy" : "degraded";

    return { status, metrics, issues };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<{ connected: boolean; latencyMs?: number }> {
    const startTime = Date.now();
    try {
      // Try a simple query
      await nanobotDb.getRecentHealthChecks(1);
      const latencyMs = Date.now() - startTime;
      return { connected: true, latencyMs };
    } catch (err) {
      return { connected: false };
    }
  }

  /**
   * Check recent error rate
   */
  private async checkErrorRate(): Promise<{ recentErrors: number; lastHour: number }> {
    const errors = await nanobotDb.getUnresolvedErrors(100);
    // Filter to last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = errors.filter((e: any) => new Date(e.createdAt).getTime() > oneHourAgo);
    return {
      recentErrors: recentErrors.length,
      lastHour: 60,
    };
  }

  /**
   * Check repair success rate
   */
  private async checkRepairSuccessRate(): Promise<{
    successRate: number;
    totalRepairs: number;
    successful: number;
  }> {
    const recentRepairs = await nanobotDb.getRepairHistory(50);
    const successful = recentRepairs.filter((r: any) => r.status === "success").length;
    const totalRepairs = recentRepairs.length;
    const successRate = totalRepairs > 0 ? successful / totalRepairs : 1;

    return { successRate, totalRepairs, successful };
  }

  /**
   * Handle a detected issue
   */
  private async handleIssue(issue: string) {
    try {
      console.log(`[Nanobot] Handling issue: ${issue}`);

      // Create an error log for the issue
      await nanobotDb.createErrorLog({
        errorType: "health_check",
        errorMessage: issue,
        severity: "medium",
        source: "health_scheduler",
        context: { detectedAt: new Date().toISOString() },
      });

      // Get the error log we just created
      const errors = await nanobotDb.getUnresolvedErrors(1);
      if (errors.length === 0) {
        console.error("[Nanobot] Failed to create error log");
        return;
      }
      const errorLog = errors[0];
      const diagnosis = await diagnosisEngine.diagnose(errorLog as any);

      // Attempt auto-repair if confidence is high and automated
      if (diagnosis.confidence > 70 && !diagnosis.requiresHumanIntervention) {
        const autoRepairableFixes = diagnosis.suggestedFixes.filter(
          (fix) => fix.automated && fix.riskLevel !== "high"
        );

        if (autoRepairableFixes.length > 0) {
          console.log(`[Nanobot] Attempting ${autoRepairableFixes.length} automated fixes...`);
          
          for (const fix of autoRepairableFixes) {
            // Log the repair attempt
            await nanobotDb.createRepair({
              errorLogId: (errorLog as any).id,
              repairType: fix.type,
              repairDescription: fix.description,
              repairActions: [fix.command || fix.description],
              success: false,
            });
          }
        }
      } else if (diagnosis.requiresHumanIntervention) {
        // Notify owner for manual intervention
        await notifyOwner({
          title: `Nanobot: Manual Intervention Required`,
          content: `Issue detected: ${issue}\n\nDiagnosis: ${diagnosis.rootCause}\n\nPlease review the nanobot dashboard for details.`,
        });
      }

    } catch (err) {
      console.error(`[Nanobot] Failed to handle issue "${issue}":`, err);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheckIn: this.intervalId ? this.checkInterval : null,
    };
  }
}

// Export singleton instance
export const healthScheduler = new HealthScheduler();

// Auto-start the scheduler when the module is loaded
if (process.env.NODE_ENV !== "test") {
  healthScheduler.start();
}
