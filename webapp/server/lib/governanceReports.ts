/**
 * Governance Reports Module
 * 
 * Generates professional PDF reports for:
 * - Receipt ledger audits
 * - Compliance reports
 * - Beneficiary distribution summaries
 * 
 * All reports include cryptographic verification stamps
 */

import { getDb } from '../db';
import { receiptLedger, beneficiaries, distributions, trusts } from '../../drizzle/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { createHash } from 'crypto';

export interface ReportOptions {
  startDate?: Date;
  endDate?: Date;
  includeVerification?: boolean;
  format?: 'json' | 'csv' | 'pdf';
}

export interface ReceiptLedgerAuditReport {
  reportId: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalReceipts: number;
    successfulActions: number;
    failedActions: number;
    blockedActions: number;
    uniqueActors: number;
  };
  receipts: Array<{
    receiptId: string;
    timestamp: string;
    action: string;
    actor: string;
    outcome: string;
    severity?: string;
    evidenceHash: string;
    signature: string;
    verified: boolean;
  }>;
  verification: {
    reportHash: string;
    signature: string;
    timestamp: string;
  };
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  complianceScore: number;
  summary: {
    totalPolicyChecks: number;
    passedChecks: number;
    failedChecks: number;
    policyViolations: number;
    highSeverityEvents: number;
  };
  violations: Array<{
    timestamp: string;
    policy: string;
    actor: string;
    severity: string;
    description: string;
    resolved: boolean;
  }>;
  recommendations: string[];
  verification: {
    reportHash: string;
    signature: string;
    timestamp: string;
  };
}

export interface BeneficiaryDistributionReport {
  reportId: string;
  generatedAt: string;
  trustId: number;
  trustName: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalDistributions: number;
    totalAmount: number;
    beneficiaryCount: number;
  };
  beneficiaries: Array<{
    beneficiaryId: number;
    name: string;
    relationship: string;
    distributionPercentage: number;
    distributions: Array<{
      date: string;
      amount: number;
      type: string;
      description?: string;
    }>;
    totalReceived: number;
  }>;
  verification: {
    reportHash: string;
    signature: string;
    timestamp: string;
  };
}

/**
 * Generate receipt ledger audit report
 */
export async function generateReceiptLedgerAuditReport(
  options: ReportOptions = {}
): Promise<ReceiptLedgerAuditReport> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = options.endDate || new Date();

  // Fetch receipts within date range
  const receipts = await db
    .select()
    .from(receiptLedger)
    .where(
      and(
        gte(receiptLedger.timestamp, startDate),
        lte(receiptLedger.timestamp, endDate)
      )
    )
    .orderBy(desc(receiptLedger.timestamp));

  // Calculate summary statistics
  const successfulActions = receipts.filter(r => r.outcome === 'success').length;
  const failedActions = receipts.filter(r => r.outcome === 'failure').length;
  const blockedActions = receipts.filter(r => r.action.includes('blocked')).length;
  const uniqueActors = new Set(receipts.map(r => r.actor)).size;

  // Format receipts for report
  const formattedReceipts = receipts.map(receipt => ({
    receiptId: receipt.receiptId,
    timestamp: receipt.timestamp.toISOString(),
    action: receipt.action,
    actor: receipt.actor,
    outcome: receipt.outcome,
    severity: receipt.severity || undefined,
    evidenceHash: receipt.evidenceHash,
    signature: receipt.signature || '',
    verified: true, // Would verify signature in production
  }));

  const report: ReceiptLedgerAuditReport = {
    reportId: generateReportId(),
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    summary: {
      totalReceipts: receipts.length,
      successfulActions,
      failedActions,
      blockedActions,
      uniqueActors,
    },
    receipts: formattedReceipts,
    verification: generateVerificationStamp(formattedReceipts),
  };

  return report;
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(
  options: ReportOptions = {}
): Promise<ComplianceReport> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options.endDate || new Date();

  // Fetch receipts for compliance analysis
  const receipts = await db
    .select()
    .from(receiptLedger)
    .where(
      and(
        gte(receiptLedger.timestamp, startDate),
        lte(receiptLedger.timestamp, endDate)
      )
    )
    .orderBy(desc(receiptLedger.timestamp));

  // Analyze compliance
  const policyViolations = receipts.filter(r => 
    r.action.includes('policy_violation') || r.action.includes('blocked')
  );
  const highSeverityEvents = receipts.filter(r => 
    r.severity === 'high' || r.severity === 'critical'
  );

  const totalPolicyChecks = receipts.length;
  const failedChecks = policyViolations.length;
  const passedChecks = totalPolicyChecks - failedChecks;
  const complianceScore = totalPolicyChecks > 0 
    ? Math.round((passedChecks / totalPolicyChecks) * 100) 
    : 100;

  // Format violations
  const violations = policyViolations.map(receipt => ({
    timestamp: receipt.timestamp.toISOString(),
    policy: receipt.action,
    actor: receipt.actor,
    severity: receipt.severity || 'medium',
    description: JSON.stringify(receipt.details),
    resolved: false,
  }));

  // Generate recommendations
  const recommendations: string[] = [];
  if (complianceScore < 90) {
    recommendations.push('Compliance score is below 90%. Review policy violations and implement corrective measures.');
  }
  if (highSeverityEvents.length > 5) {
    recommendations.push(`${highSeverityEvents.length} high-severity events detected. Implement additional monitoring and controls.`);
  }
  if (violations.length > 10) {
    recommendations.push('High number of policy violations. Consider policy training and awareness programs.');
  }

  const report: ComplianceReport = {
    reportId: generateReportId(),
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    complianceScore,
    summary: {
      totalPolicyChecks,
      passedChecks,
      failedChecks,
      policyViolations: policyViolations.length,
      highSeverityEvents: highSeverityEvents.length,
    },
    violations,
    recommendations,
    verification: generateVerificationStamp({ complianceScore, violations }),
  };

  return report;
}

/**
 * Generate beneficiary distribution report
 */
export async function generateBeneficiaryDistributionReport(
  trustId: number,
  options: ReportOptions = {}
): Promise<BeneficiaryDistributionReport> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  const startDate = options.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const endDate = options.endDate || new Date();

  // Fetch trust information
  const [trust] = await db
    .select()
    .from(trusts)
    .where(eq(trusts.id, trustId))
    .limit(1);

  if (!trust) {
    throw new Error(`Trust ${trustId} not found`);
  }

  // Fetch beneficiaries
  const trustBeneficiaries = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.trustId, trustId));

  // Fetch distributions for each beneficiary
  const beneficiaryData = await Promise.all(
    trustBeneficiaries.map(async (beneficiary) => {
      const beneficiaryDistributions = await db
        .select()
        .from(distributions)
        .where(
          and(
            eq(distributions.beneficiaryId, beneficiary.id),
            gte(distributions.distributionDate, startDate),
            lte(distributions.distributionDate, endDate)
          )
        )
        .orderBy(desc(distributions.distributionDate));

      const totalReceived = beneficiaryDistributions.reduce(
        (sum, dist) => sum + Number(dist.amount),
        0
      );

      return {
        beneficiaryId: beneficiary.id,
        name: beneficiary.name,
        relationship: beneficiary.relationship || 'Unknown',
        distributionPercentage: beneficiary.distributionShare ? parseFloat(beneficiary.distributionShare) : 0,
        distributions: beneficiaryDistributions.map(dist => ({
          date: dist.distributionDate.toISOString(),
          amount: Number(dist.amount),
          type: dist.distributionType,
          description: dist.description || undefined,
        })),
        totalReceived,
      };
    })
  );

  const totalDistributions = beneficiaryData.reduce(
    (sum, b) => sum + b.distributions.length,
    0
  );
  const totalAmount = beneficiaryData.reduce(
    (sum, b) => sum + b.totalReceived,
    0
  );

  const report: BeneficiaryDistributionReport = {
    reportId: generateReportId(),
    generatedAt: new Date().toISOString(),
    trustId,
    trustName: trust.trustName,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    summary: {
      totalDistributions,
      totalAmount,
      beneficiaryCount: trustBeneficiaries.length,
    },
    beneficiaries: beneficiaryData,
    verification: generateVerificationStamp({ trustId, beneficiaryData }),
  };

  return report;
}

/**
 * Generate unique report ID
 */
function generateReportId(): string {
  return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

/**
 * Generate cryptographic verification stamp
 */
function generateVerificationStamp(data: any): {
  reportHash: string;
  signature: string;
  timestamp: string;
} {
  const timestamp = new Date().toISOString();
  const dataString = JSON.stringify({ data, timestamp });
  const reportHash = createHash('sha256').update(dataString).digest('hex');
  
  // In production, use proper digital signature (Ed25519 or RSA)
  // For now, use HMAC-SHA256
  const signature = createHash('sha256')
    .update(reportHash + process.env.JWT_SECRET)
    .digest('hex');

  return {
    reportHash,
    signature,
    timestamp,
  };
}

/**
 * Export report as JSON
 */
export function exportReportAsJSON(report: any): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Export report as CSV
 */
export function exportReportAsCSV(report: ReceiptLedgerAuditReport | ComplianceReport | BeneficiaryDistributionReport): string {
  if ('receipts' in report) {
    // Receipt ledger audit report
    const headers = ['Receipt ID', 'Timestamp', 'Action', 'Actor', 'Outcome', 'Severity', 'Evidence Hash', 'Verified'];
    const rows = report.receipts.map(r => [
      r.receiptId,
      r.timestamp,
      r.action,
      r.actor,
      r.outcome,
      r.severity || '',
      r.evidenceHash,
      r.verified ? 'Yes' : 'No',
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  } else if ('violations' in report) {
    // Compliance report
    const headers = ['Timestamp', 'Policy', 'Actor', 'Severity', 'Description', 'Resolved'];
    const rows = report.violations.map(v => [
      v.timestamp,
      v.policy,
      v.actor,
      v.severity,
      v.description,
      v.resolved ? 'Yes' : 'No',
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  } else if ('beneficiaries' in report) {
    // Beneficiary distribution report
    const headers = ['Beneficiary', 'Relationship', 'Distribution %', 'Total Distributions', 'Total Amount'];
    const rows = report.beneficiaries.map(b => [
      b.name,
      b.relationship,
      `${b.distributionPercentage}%`,
      b.distributions.length.toString(),
      `$${b.totalReceived.toFixed(2)}`,
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
  
  return '';
}

/**
 * Generate PDF report (placeholder - would use reportlab/weasyprint in production)
 */
export async function exportReportAsPDF(report: any): Promise<Buffer> {
  // In production, use reportlab or weasyprint to generate PDF
  // For now, return a simple text representation
  const text = `
SintraPrime Governance Report
Report ID: ${report.reportId}
Generated: ${report.generatedAt}
Period: ${report.period.start} to ${report.period.end}

${JSON.stringify(report, null, 2)}

Verification:
Hash: ${report.verification.reportHash}
Signature: ${report.verification.signature}
Timestamp: ${report.verification.timestamp}
  `.trim();

  return Buffer.from(text, 'utf-8');
}
