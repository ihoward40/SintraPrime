/**
 * Compliance Report Generator
 * Generates comprehensive PDF reports for governance compliance
 */

import { getDb } from '../db';
import { receiptLedger } from '../../drizzle/schema';
import { desc, sql, and, gte, lte } from 'drizzle-orm';

export interface ComplianceReportData {
  reportDate: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalActions: number;
    violations: number;
    complianceScore: number;
    averageCost: number;
    totalCost: number;
  };
  violationsByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  violationsBySeverity: Array<{
    severity: string;
    count: number;
    percentage: number;
  }>;
  topViolations: Array<{
    action: string;
    actor: string;
    timestamp: Date;
    severity: string;
    details: string;
  }>;
  complianceTrend: Array<{
    date: string;
    score: number;
  }>;
}

/**
 * Generate compliance report data for a given date range
 */
export async function generateComplianceReportData(
  startDate: Date,
  endDate: Date
): Promise<ComplianceReportData> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection failed');
  }

  // Fetch all receipts in date range
  const allReceipts = await db
    .select()
    .from(receiptLedger)
    .where(
      and(
        gte(receiptLedger.timestamp, startDate),
        lte(receiptLedger.timestamp, endDate)
      )
    )
    .orderBy(desc(receiptLedger.timestamp));

  const totalActions = allReceipts.length;

  // Count violations (failure outcomes)
  const violations = allReceipts.filter(
    r => r.outcome === 'failure'
  );
  const violationCount = violations.length;

  // Calculate compliance score
  const complianceScore = totalActions > 0
    ? Math.round(((totalActions - violationCount) / totalActions) * 100)
    : 100;

  // Calculate cost metrics
  const costsArray = allReceipts
    .map(r => {
      try {
        const details = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
        return details?.cost || 0;
      } catch {
        return 0;
      }
    })
    .filter(c => c > 0);

  const totalCost = costsArray.reduce((sum, cost) => sum + cost, 0);
  const averageCost = costsArray.length > 0 ? totalCost / costsArray.length : 0;

  // Violations by type
  const violationTypeMap = new Map<string, number>();
  violations.forEach(v => {
    const action = v.action || 'unknown';
    violationTypeMap.set(action, (violationTypeMap.get(action) || 0) + 1);
  });

  const violationsByType = Array.from(violationTypeMap.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / violationCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Violations by severity
  const severityMap = new Map<string, number>();
  violations.forEach(v => {
    try {
      const metadata = typeof v.metadata === 'string' ? JSON.parse(v.metadata) : v.metadata;
      const severity = metadata?.severity || 'medium';
      severityMap.set(severity, (severityMap.get(severity) || 0) + 1);
    } catch {
      severityMap.set('medium', (severityMap.get('medium') || 0) + 1);
    }
  });

  const violationsBySeverity = Array.from(severityMap.entries())
    .map(([severity, count]) => ({
      severity,
      count,
      percentage: Math.round((count / violationCount) * 100),
    }))
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity as keyof typeof order] || 4) - (order[b.severity as keyof typeof order] || 4);
    });

  // Top violations (most recent critical/high severity)
  const topViolations = violations
    .filter(v => {
      try {
        const metadata = typeof v.metadata === 'string' ? JSON.parse(v.metadata) : v.metadata;
        return metadata?.severity === 'critical' || metadata?.severity === 'high';
      } catch {
        return false;
      }
    })
    .slice(0, 10)
    .map(v => {
      let metadata: any = {};
      try {
        metadata = typeof v.metadata === 'string' ? JSON.parse(v.metadata) : v.metadata;
      } catch {}

      let details: any = {};
      try {
        details = typeof v.details === 'string' ? JSON.parse(v.details) : v.details;
      } catch {}

      return {
        action: v.action || 'Unknown',
        actor: v.actor || 'Unknown',
        timestamp: v.timestamp,
        severity: metadata?.severity || 'medium',
        details: details?.reason || details?.message || 'No details available',
      };
    });

  // Compliance trend (daily scores for the period)
  const complianceTrend: Array<{ date: string; score: number }> = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs);

  for (let i = 0; i < days; i++) {
    const dayStart = new Date(startDate.getTime() + i * dayMs);
    const dayEnd = new Date(dayStart.getTime() + dayMs);

    const dayReceipts = allReceipts.filter(
      r => r.timestamp >= dayStart && r.timestamp < dayEnd
    );

    const dayViolations = dayReceipts.filter(
      r => r.outcome === 'failure'
    );

    const dayScore = dayReceipts.length > 0
      ? Math.round(((dayReceipts.length - dayViolations.length) / dayReceipts.length) * 100)
      : 100;

    complianceTrend.push({
      date: dayStart.toISOString().split('T')[0],
      score: dayScore,
    });
  }

  return {
    reportDate: new Date(),
    dateRange: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalActions,
      violations: violationCount,
      complianceScore,
      averageCost,
      totalCost,
    },
    violationsByType,
    violationsBySeverity,
    topViolations,
    complianceTrend,
  };
}

/**
 * Generate HTML for compliance report PDF
 */
export function generateComplianceReportHTML(data: ComplianceReportData): string {
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#84cc16';
      default: return '#6b7280';
    }
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Compliance Report - ${formatDate(data.reportDate)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      padding: 40px;
      background: white;
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 32px;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .header .subtitle {
      font-size: 16px;
      color: #6b7280;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }
    .summary-card .label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .summary-card .value {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
    }
    .summary-card .value.score {
      color: ${getScoreColor(data.summary.complianceScore)};
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    tr:hover {
      background: #f9fafb;
    }
    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }
    .chart-bar {
      height: 30px;
      background: #3b82f6;
      border-radius: 4px;
      display: flex;
      align-items: center;
      padding-left: 10px;
      color: white;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Governance Compliance Report</h1>
    <div class="subtitle">
      ${formatDate(data.dateRange.start)} - ${formatDate(data.dateRange.end)}
      <br>
      Generated: ${formatDate(data.reportDate)}
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Compliance Score</div>
      <div class="value score">${data.summary.complianceScore}%</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Actions</div>
      <div class="value">${data.summary.totalActions.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="label">Violations</div>
      <div class="value">${data.summary.violations.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Cost</div>
      <div class="value">${formatCurrency(data.summary.totalCost)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Average Cost</div>
      <div class="value">${formatCurrency(data.summary.averageCost)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Violation Rate</div>
      <div class="value">${data.summary.totalActions > 0 ? Math.round((data.summary.violations / data.summary.totalActions) * 100) : 0}%</div>
    </div>
  </div>

  <div class="section">
    <h2>Violations by Severity</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${data.violationsBySeverity.map(v => `
          <tr>
            <td>
              <span class="severity-badge" style="background: ${getSeverityColor(v.severity)}">
                ${v.severity.toUpperCase()}
              </span>
            </td>
            <td>${v.count}</td>
            <td>${v.percentage}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Top Violation Types</h2>
    ${data.violationsByType.slice(0, 5).map(v => `
      <div class="chart-bar" style="width: ${Math.max(v.percentage, 10)}%">
        ${v.type}: ${v.count}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Critical & High Severity Violations</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Action</th>
          <th>Actor</th>
          <th>Severity</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${data.topViolations.map(v => `
          <tr>
            <td>${new Date(v.timestamp).toLocaleDateString()}</td>
            <td>${v.action}</td>
            <td>${v.actor}</td>
            <td>
              <span class="severity-badge" style="background: ${getSeverityColor(v.severity)}">
                ${v.severity.toUpperCase()}
              </span>
            </td>
            <td>${v.details}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p><strong>SintraPrime Legal Warfare Platform</strong></p>
    <p>This report is confidential and intended for authorized personnel only.</p>
  </div>
</body>
</html>
  `.trim();
}
