/**
 * Export Utilities for Audit Log and Analytics
 * Provides CSV and PDF generation for governance data
 */

export interface ReceiptExportData {
  timestamp: Date;
  action: string;
  actor: string;
  outcome: string;
  severity?: string;
  cost?: number;
  signature?: string;
  hash?: string;
  details?: any;
}

/**
 * Convert receipts to CSV format
 */
export function generateCSV(receipts: ReceiptExportData[]): string {
  if (receipts.length === 0) {
    return 'No data to export';
  }

  // CSV Headers
  const headers = [
    'Timestamp',
    'Action',
    'Actor',
    'Outcome',
    'Severity',
    'Cost',
    'Has Signature',
    'Hash',
    'Details'
  ];

  // CSV Rows
  const rows = receipts.map(receipt => [
    new Date(receipt.timestamp).toISOString(),
    escapeCSV(receipt.action),
    escapeCSV(receipt.actor),
    escapeCSV(receipt.outcome),
    escapeCSV(receipt.severity || 'N/A'),
    receipt.cost?.toString() || '0',
    receipt.signature ? 'Yes' : 'No',
    escapeCSV(receipt.hash || 'N/A'),
    escapeCSV(JSON.stringify(receipt.details || {}))
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

/**
 * Generate simple HTML for PDF conversion
 */
export function generatePDFHTML(receipts: ReceiptExportData[], title: string = 'Audit Log Export'): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      font-size: 12px;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 10px;
    }
    .metadata {
      margin: 20px 0;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #0066cc;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: bold;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .severity-critical { color: #dc2626; font-weight: bold; }
    .severity-high { color: #ea580c; font-weight: bold; }
    .severity-medium { color: #ca8a04; }
    .severity-low { color: #16a34a; }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="metadata">
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total Records:</strong> ${receipts.length}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Action</th>
        <th>Actor</th>
        <th>Outcome</th>
        <th>Severity</th>
        <th>Cost</th>
        <th>Signed</th>
      </tr>
    </thead>
    <tbody>
      ${receipts.map(receipt => `
        <tr>
          <td>${new Date(receipt.timestamp).toLocaleString()}</td>
          <td>${escapeHTML(receipt.action)}</td>
          <td>${escapeHTML(receipt.actor)}</td>
          <td>${escapeHTML(receipt.outcome)}</td>
          <td class="severity-${receipt.severity || 'low'}">${receipt.severity || 'N/A'}</td>
          <td>$${receipt.cost?.toFixed(2) || '0.00'}</td>
          <td>${receipt.signature ? '✓' : '✗'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>SintraPrime Legal AI Platform - Governance Audit Log</p>
    <p>This document is generated automatically and contains cryptographically verified audit trail data.</p>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(value: string): string {
  if (!value) return '';
  
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate chart data export (JSON format)
 */
export function generateChartDataJSON(data: any, chartName: string): string {
  const exportData = {
    chartName,
    exportedAt: new Date().toISOString(),
    data
  };

  return JSON.stringify(exportData, null, 2);
}
