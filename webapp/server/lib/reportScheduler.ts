/**
 * Report Scheduling Service
 * Handles automated compliance report generation and delivery
 */

import { getDb } from '../db';
import { reportSchedules, reportHistory } from '../../drizzle/schema';
import { eq, and, lte, gte } from 'drizzle-orm';
import { generateComplianceReportData, generateComplianceReportHTML } from './complianceReports';
import { sendAlertEmail } from './alertService';

/**
 * Calculate next run time based on schedule frequency
 */
function calculateNextRun(
  frequency: 'daily' | 'weekly' | 'monthly',
  timeOfDay: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const now = new Date();
  let nextRun = new Date();

  switch (frequency) {
    case 'daily':
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      nextRun.setHours(hours, minutes, 0, 0);
      const targetDay = dayOfWeek || 0;
      const currentDay = nextRun.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= now)) {
        daysUntilTarget += 7;
      }
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;

    case 'monthly':
      nextRun.setHours(hours, minutes, 0, 0);
      const targetDate = dayOfMonth || 1;
      nextRun.setDate(targetDate);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
}

/**
 * Generate and send scheduled report
 */
async function generateScheduledReport(schedule: any): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Create report history entry
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - schedule.dateRangeDays);

    const historyEntry = await db.insert(reportHistory).values({
      scheduleId: schedule.id,
      reportType: schedule.reportType,
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      status: 'generating',
      emailSent: false,
    });

    const historyId = historyEntry[0].insertId;

    // Generate report
    const reportData = await generateComplianceReportData(startDate, endDate);
    const html = generateComplianceReportHTML(reportData);

    // Send email to all recipients
    const recipients = schedule.emailAddresses.split(',').map((e: string) => e.trim());
    const subject = `Scheduled ${schedule.reportType} Compliance Report - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;

    let emailsSent = 0;
    for (const recipient of recipients) {
      try {
        await sendAlertEmail(recipient, subject, `Your scheduled compliance report is attached.\n\nView the full report: ${html.substring(0, 100)}...`);
        emailsSent++;
      } catch (error) {
        console.error(`Failed to send report to ${recipient}:`, error);
      }
    }

    // Update history entry
    await db
      .update(reportHistory)
      .set({
        status: 'completed',
        emailSent: emailsSent > 0,
        emailRecipients: recipients.join(', '),
      })
      .where(eq(reportHistory.id, historyId));

    console.log(`[Report Scheduler] Generated and sent report for schedule ${schedule.id}`);
    return true;
  } catch (error) {
    console.error(`[Report Scheduler] Failed to generate report for schedule ${schedule.id}:`, error);

    // Update history entry with error
    try {
      await db
        .update(reportHistory)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(reportHistory.scheduleId, schedule.id));
    } catch {}

    return false;
  }
}

/**
 * Check and run due scheduled reports
 */
export async function checkScheduledReports(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error('[Report Scheduler] Database connection failed');
    return;
  }

  const now = new Date();

  // Get all enabled schedules that are due
  const dueSchedules = await db
    .select()
    .from(reportSchedules)
    .where(
      and(
        eq(reportSchedules.enabled, true),
        lte(reportSchedules.nextRunAt, now)
      )
    );

  console.log(`[Report Scheduler] Found ${dueSchedules.length} due reports`);

  for (const schedule of dueSchedules) {
    try {
      // Generate and send report
      const success = await generateScheduledReport(schedule);

      if (success) {
        // Calculate next run time
        const nextRun = calculateNextRun(
          schedule.frequency,
          schedule.timeOfDay,
          schedule.dayOfWeek,
          schedule.dayOfMonth
        );

        // Update schedule
        await db
          .update(reportSchedules)
          .set({
            lastRunAt: now,
            nextRunAt: nextRun,
          })
          .where(eq(reportSchedules.id, schedule.id));

        console.log(`[Report Scheduler] Next run for schedule ${schedule.id}: ${nextRun.toISOString()}`);
      }
    } catch (error) {
      console.error(`[Report Scheduler] Error processing schedule ${schedule.id}:`, error);
    }
  }
}

/**
 * Start periodic report scheduler (call this once on server startup)
 */
export function startReportScheduler(intervalMinutes: number = 60): NodeJS.Timeout {
  console.log(`[Report Scheduler] Starting with ${intervalMinutes}-minute interval`);

  // Run immediately on startup
  checkScheduledReports().catch(console.error);

  // Then run periodically
  const intervalMs = intervalMinutes * 60 * 1000;
  return setInterval(() => {
    checkScheduledReports().catch(console.error);
  }, intervalMs);
}

/**
 * Initialize next run time for a new schedule
 */
export function initializeScheduleNextRun(
  frequency: 'daily' | 'weekly' | 'monthly',
  timeOfDay: string,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  return calculateNextRun(frequency, timeOfDay, dayOfWeek, dayOfMonth);
}
