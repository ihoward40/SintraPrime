import { z } from 'zod';
import crypto from 'crypto';
import { router, protectedProcedure } from '../_core/trpc';
import { getSystemHealth, performForensicAnalysis } from '../lib/monitoring';
import { getReceiptChain, verifyReceiptIntegrity } from '../lib/receiptLedger';
import { getSpendingSummary } from '../lib/policyGates';
import { generateCSV, generatePDFHTML, generateChartDataJSON } from '../lib/exportUtils';
import { getTemplateById, applyTemplate } from '../lib/policyTemplates';
import { generateComplianceReportData, generateComplianceReportHTML } from '../lib/complianceReports';

export const governanceRouter = router({
  /**
   * Get system health metrics
   */
  getSystemHealth: protectedProcedure.query(async () => {
    return await getSystemHealth();
  }),
  
  /**
   * Get recent receipts from audit trail
   */
  getRecentReceipts: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      action: z.string().optional(),
      actor: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const receipts = await getReceiptChain({
        action: input.action,
        actor: input.actor,
      });
      
      // Sort by timestamp descending and limit
      return receipts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, input.limit);
    }),
  
  /**
   * Get blocked actions
   */
  getBlockedActions: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const receipts = await getReceiptChain({});
      
      // Filter for blocked actions (action starts with "blocked:")
      const blockedActions = receipts.filter(r => r.action.startsWith('blocked:'));
      
      // Sort by timestamp descending and limit
      return blockedActions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, input.limit);
    }),
  
  /**
   * Get spending summary for current user
   */
  getSpendingSummary: protectedProcedure.query(async ({ ctx }) => {
    return await getSpendingSummary(ctx.user.id);
  }),
  
  /**
   * Run forensic analysis
   */
  runForensicAnalysis: protectedProcedure
    .input(z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }))
    .query(async ({ input }) => {
      return await performForensicAnalysis(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),
  
  /**
   * Get receipt details
   */
  getReceiptDetails: protectedProcedure
    .input(z.object({
      receiptId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const receipts = await getReceiptChain({});
      return receipts.find(r => r.receipt_id === input.receiptId) || null;
    }),
  
  /**
   * Get recent policy violations
   */
  getRecentViolations: protectedProcedure
    .input(z.object({
      minutes: z.number().min(1).max(1440).default(60), // Last 1 hour by default, max 24 hours
    }))
    .query(async ({ input }) => {
      const receipts = await getReceiptChain({});
      const cutoffTime = new Date(Date.now() - input.minutes * 60 * 1000);
      
      // Filter for policy violations (action contains "violation" or "blocked")
      const violations = receipts.filter(r => {
        const timestamp = new Date(r.timestamp);
        const isRecent = timestamp >= cutoffTime;
        const isViolation = r.action.includes('violation') || r.action.startsWith('blocked:');
        return isRecent && isViolation;
      });
      
      // Sort by timestamp descending
      return violations
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map(v => ({
          ...v,
          severity: v.action.includes('critical') ? 'critical' as const : 
                   v.action.includes('high') ? 'high' as const : 
                   v.action.includes('medium') ? 'medium' as const : 'low' as const,
        }));
    }),
  
  /**
   * Verify receipt cryptographically
   */
  verifyReceipt: protectedProcedure
    .input(z.object({
      receiptId: z.string(),
    }))
    .query(async ({ input }) => {
      const receipts = await getReceiptChain({});
      const receipt = receipts.find(r => r.receipt_id === input.receiptId);
      
      if (!receipt) {
        throw new Error('Receipt not found');
      }
      
      // Verify receipt integrity
      const verification = verifyReceiptIntegrity(receipt);
      
      // Calculate expected hash
      const expectedHash = receipt.evidence_hash;
      const actualHash = crypto.createHash('sha256')
        .update(JSON.stringify(receipt.details, Object.keys(receipt.details).sort()))
        .digest('hex');
      
      // Check chain integrity (if previous_hash exists)
      let chainValid = true;
      const receiptWithPrevious = receipt as any;
      if (receiptWithPrevious.previous_hash) {
        // Find previous receipt
        const previousReceipt = receipts.find(r => r.evidence_hash === receiptWithPrevious.previous_hash);
        chainValid = !!previousReceipt;
      }
      
      return {
        isValid: verification.valid,
        hashValid: verification.checks.hashValid,
        signatureValid: verification.checks.signatureValid,
        chainValid,
        expectedHash,
        actualHash,
        errors: verification.errors,
      };
    }),

  /**
   * Export audit log to CSV
   */
  exportAuditLogCSV: protectedProcedure
    .input(z.object({
      action: z.string().optional(),
      actor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const receipts = await getReceiptChain({
        action: input.action,
        actor: input.actor,
      });

      const exportData = receipts.map((receipt: any) => ({
        timestamp: receipt.timestamp,
        action: receipt.action,
        actor: receipt.actor,
        outcome: receipt.outcome,
        severity: receipt.metadata?.severity,
        cost: receipt.details?.cost,
        signature: receipt.signature,
        hash: receipt.hash,
        details: receipt.details,
      }));

      const csv = generateCSV(exportData);
      return { csv, filename: `audit-log-${Date.now()}.csv` };
    }),

  /**
   * Export audit log to PDF HTML
   */
  exportAuditLogPDF: protectedProcedure
    .input(z.object({
      action: z.string().optional(),
      actor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const receipts = await getReceiptChain({
        action: input.action,
        actor: input.actor,
      });

      const exportData = receipts.map((receipt: any) => ({
        timestamp: receipt.timestamp,
        action: receipt.action,
        actor: receipt.actor,
        outcome: receipt.outcome,
        severity: receipt.metadata?.severity,
        cost: receipt.details?.cost,
        signature: receipt.signature,
        hash: receipt.hash,
        details: receipt.details,
      }));

      const html = generatePDFHTML(exportData, 'SintraPrime Audit Log Export');
      return { html, filename: `audit-log-${Date.now()}.pdf` };
    }),

  /**
   * Export chart data as JSON
   */
  exportChartData: protectedProcedure
    .input(z.object({
      chartName: z.string(),
      data: z.any(),
    }))
    .mutation(async ({ input }) => {
      const json = generateChartDataJSON(input.data, input.chartName);
      return { json, filename: `${input.chartName}-${Date.now()}.json` };
    }),

  /**
   * Get available policy templates
   */
  getPolicyTemplates: protectedProcedure.query(async () => {
    const { getAllTemplates } = await import('../lib/policyTemplates');
    return getAllTemplates();
  }),

  /**
   * Activate a policy template
   */
  activateTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const template = getTemplateById(input.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get database connection
      const db = await import('../db').then(m => m.getDb());
      if (!db) {
        throw new Error('Database connection failed');
      }

      // Apply template rules
      const rules = applyTemplate(input.templateId);
      if (!rules) {
        throw new Error('Failed to apply template');
      }

      // Import alert schemas
      const { alertConfigurations } = await import('../../drizzle/schema-alerts');

      // Create alert configurations based on template settings
      const alertConfig = {
        userId: ctx.user.id,
        alertType: 'compliance_threshold' as const,
        complianceMinScore: template.alertSettings.complianceThreshold.toString(),
        violationCountThreshold: template.alertSettings.violationThreshold,
        emailEnabled: false,
        slackEnabled: false,
        enabled: true,
        cooldownMinutes: template.alertSettings.cooldownMinutes,
      };

      // Insert alert configuration
      await db.insert(alertConfigurations).values(alertConfig);

      // Log template activation in receipt ledger
      const { createReceipt } = await import('../lib/receiptLedger');
      await createReceipt({
        action: 'template_activated',
        actor: ctx.user.name || ctx.user.email || 'Unknown',
        outcome: 'success',
        details: {
          templateId: input.templateId,
          templateName: template.name,
          rulesApplied: rules.length,
        },
        metadata: {
          severity: 'medium',
          category: 'governance',
        },
      });

      return {
        success: true,
        template: template.name,
        rulesApplied: rules.length,
        message: `${template.name} activated successfully with ${rules.length} rules`,
      };
    }),

  /**
   * Generate compliance report
   */
  generateComplianceReport: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      const reportData = await generateComplianceReportData(startDate, endDate);
      const html = generateComplianceReportHTML(reportData);

      return {
        html,
        filename: `compliance-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.html`,
        data: reportData,
      };
    }),

  /**
   * Save alert configuration
   */
  saveAlertConfig: protectedProcedure
    .input(z.object({
      complianceEnabled: z.boolean(),
      complianceThreshold: z.number(),
      violationEnabled: z.boolean(),
      violationThreshold: z.number(),
      spendingEnabled: z.boolean(),
      spendingLimit: z.number(),
      emailEnabled: z.boolean(),
      emailAddress: z.string().optional(),
      slackEnabled: z.boolean(),
      slackWebhook: z.string().optional(),
      cooldownMinutes: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await import('../db').then(m => m.getDb());
      if (!db) {
        throw new Error('Database connection failed');
      }

      const { alertConfigurations } = await import('../../drizzle/schema-alerts');
      const { eq } = await import('drizzle-orm');

      // Check if user already has a config
      const existing = await db
        .select()
        .from(alertConfigurations)
        .where(eq(alertConfigurations.userId, ctx.user.id))
        .limit(1);

      const configData = {
        userId: ctx.user.id,
        alertType: 'compliance_threshold' as const,
        complianceMinScore: input.complianceThreshold.toString(),
        violationCountThreshold: input.violationThreshold,
        emailEnabled: input.emailEnabled,
        emailAddress: input.emailAddress || null,
        slackEnabled: input.slackEnabled,
        slackWebhookUrl: input.slackWebhook || null,
        enabled: input.complianceEnabled || input.violationEnabled || input.spendingEnabled,
        cooldownMinutes: input.cooldownMinutes,
      };

      if (existing.length > 0) {
        // Update existing
        await db
          .update(alertConfigurations)
          .set(configData)
          .where(eq(alertConfigurations.id, existing[0].id));
      } else {
        // Insert new
        await db.insert(alertConfigurations).values(configData);
      }

      return { success: true, message: 'Alert configuration saved successfully' };
    }),

  /**
   * Load alert configuration
   */
  loadAlertConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await import('../db').then(m => m.getDb());
    if (!db) {
      return null;
    }

    const { alertConfigurations } = await import('../../drizzle/schema-alerts');
    const { eq } = await import('drizzle-orm');

    const configs = await db
      .select()
      .from(alertConfigurations)
      .where(eq(alertConfigurations.userId, ctx.user.id))
      .limit(1);

    if (configs.length === 0) {
      return null;
    }

    const config = configs[0];
    return {
      complianceEnabled: config.enabled,
      complianceThreshold: parseInt(config.complianceMinScore || '90'),
      violationEnabled: config.enabled,
      violationThreshold: config.violationCountThreshold || 5,
      spendingEnabled: false,
      spendingLimit: 10000,
      emailEnabled: config.emailEnabled,
      emailAddress: config.emailAddress || '',
      slackEnabled: config.slackEnabled,
      slackWebhook: config.slackWebhookUrl || '',
      cooldownMinutes: config.cooldownMinutes || 60,
    };
  }),
});
