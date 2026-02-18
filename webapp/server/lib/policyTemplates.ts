/**
 * Policy Templates Library
 * Pre-configured governance templates for compliance frameworks
 */

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  type: 'spending_limit' | 'approval_required' | 'action_blocked' | 'notification_required';
  parameters: {
    threshold?: number;
    actions?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    requiresApproval?: boolean;
    autoBlock?: boolean;
  };
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  category: 'compliance' | 'security' | 'financial' | 'operational';
  rules: PolicyRule[];
  alertSettings: {
    complianceThreshold: number;
    violationThreshold: number;
    cooldownMinutes: number;
  };
}

/**
 * SOC 2 Compliance Template
 * Focus: Security, Availability, Processing Integrity, Confidentiality, Privacy
 */
export const SOC2_TEMPLATE: PolicyTemplate = {
  id: 'soc2',
  name: 'SOC 2 Compliance',
  description: 'Security and operational controls for service organizations',
  framework: 'SOC 2 Type II',
  category: 'compliance',
  rules: [
    {
      id: 'soc2-access-control',
      name: 'Access Control Monitoring',
      description: 'Monitor and log all access to sensitive systems and data',
      type: 'notification_required',
      parameters: {
        actions: ['database_access', 'admin_action', 'user_data_access'],
        severity: 'high',
        requiresApproval: false,
      },
    },
    {
      id: 'soc2-change-management',
      name: 'Change Management Approval',
      description: 'Require approval for system changes and deployments',
      type: 'approval_required',
      parameters: {
        actions: ['system_deployment', 'config_change', 'schema_migration'],
        severity: 'critical',
        requiresApproval: true,
      },
    },
    {
      id: 'soc2-data-deletion',
      name: 'Data Deletion Protection',
      description: 'Block unauthorized data deletion operations',
      type: 'action_blocked',
      parameters: {
        actions: ['bulk_delete', 'user_data_deletion', 'backup_deletion'],
        severity: 'critical',
        autoBlock: true,
      },
    },
    {
      id: 'soc2-audit-trail',
      name: 'Audit Trail Integrity',
      description: 'Ensure all actions are logged with cryptographic verification',
      type: 'notification_required',
      parameters: {
        actions: ['*'],
        severity: 'medium',
      },
    },
    {
      id: 'soc2-spending-control',
      name: 'Spending Authorization',
      description: 'Require approval for expenditures above threshold',
      type: 'approval_required',
      parameters: {
        threshold: 1000,
        severity: 'high',
        requiresApproval: true,
      },
    },
  ],
  alertSettings: {
    complianceThreshold: 95,
    violationThreshold: 3,
    cooldownMinutes: 30,
  },
};

/**
 * GDPR Compliance Template
 * Focus: Data Protection, Privacy, Consent Management
 */
export const GDPR_TEMPLATE: PolicyTemplate = {
  id: 'gdpr',
  name: 'GDPR Compliance',
  description: 'EU General Data Protection Regulation requirements',
  framework: 'GDPR',
  category: 'compliance',
  rules: [
    {
      id: 'gdpr-data-access',
      name: 'Personal Data Access Control',
      description: 'Monitor and control access to personal data',
      type: 'notification_required',
      parameters: {
        actions: ['user_data_access', 'pii_export', 'data_query'],
        severity: 'high',
      },
    },
    {
      id: 'gdpr-data-deletion',
      name: 'Right to Erasure',
      description: 'Require approval for data deletion requests (Right to be Forgotten)',
      type: 'approval_required',
      parameters: {
        actions: ['user_data_deletion', 'account_deletion'],
        severity: 'critical',
        requiresApproval: true,
      },
    },
    {
      id: 'gdpr-data-export',
      name: 'Data Portability',
      description: 'Log all data export requests (Right to Data Portability)',
      type: 'notification_required',
      parameters: {
        actions: ['data_export', 'user_data_download'],
        severity: 'medium',
      },
    },
    {
      id: 'gdpr-consent-management',
      name: 'Consent Verification',
      description: 'Block actions without valid user consent',
      type: 'action_blocked',
      parameters: {
        actions: ['marketing_email', 'data_sharing', 'third_party_access'],
        severity: 'critical',
        autoBlock: true,
      },
    },
    {
      id: 'gdpr-breach-notification',
      name: 'Data Breach Detection',
      description: 'Alert on potential data breaches within 72 hours',
      type: 'notification_required',
      parameters: {
        actions: ['unauthorized_access', 'data_leak', 'security_incident'],
        severity: 'critical',
      },
    },
  ],
  alertSettings: {
    complianceThreshold: 98,
    violationThreshold: 1,
    cooldownMinutes: 15,
  },
};

/**
 * HIPAA Compliance Template
 * Focus: Healthcare Data Protection, PHI Security
 */
export const HIPAA_TEMPLATE: PolicyTemplate = {
  id: 'hipaa',
  name: 'HIPAA Compliance',
  description: 'Health Insurance Portability and Accountability Act requirements',
  framework: 'HIPAA',
  category: 'compliance',
  rules: [
    {
      id: 'hipaa-phi-access',
      name: 'PHI Access Control',
      description: 'Monitor and restrict access to Protected Health Information',
      type: 'approval_required',
      parameters: {
        actions: ['phi_access', 'medical_record_view', 'patient_data_query'],
        severity: 'critical',
        requiresApproval: true,
      },
    },
    {
      id: 'hipaa-encryption',
      name: 'Data Encryption Verification',
      description: 'Ensure all PHI is encrypted at rest and in transit',
      type: 'action_blocked',
      parameters: {
        actions: ['unencrypted_transmission', 'plain_text_storage'],
        severity: 'critical',
        autoBlock: true,
      },
    },
    {
      id: 'hipaa-audit-logs',
      name: 'Audit Log Retention',
      description: 'Maintain audit logs for 6 years as required by HIPAA',
      type: 'notification_required',
      parameters: {
        actions: ['log_deletion', 'audit_trail_modification'],
        severity: 'critical',
      },
    },
    {
      id: 'hipaa-minimum-necessary',
      name: 'Minimum Necessary Rule',
      description: 'Block access to PHI beyond minimum necessary',
      type: 'action_blocked',
      parameters: {
        actions: ['bulk_phi_export', 'unrestricted_query'],
        severity: 'high',
        autoBlock: true,
      },
    },
    {
      id: 'hipaa-breach-notification',
      name: 'Breach Notification',
      description: 'Alert on PHI breaches affecting 500+ individuals',
      type: 'notification_required',
      parameters: {
        actions: ['phi_breach', 'unauthorized_disclosure'],
        severity: 'critical',
      },
    },
  ],
  alertSettings: {
    complianceThreshold: 99,
    violationThreshold: 1,
    cooldownMinutes: 10,
  },
};

/**
 * Financial Controls Template
 * Focus: Spending Limits, Approval Workflows
 */
export const FINANCIAL_CONTROLS_TEMPLATE: PolicyTemplate = {
  id: 'financial',
  name: 'Financial Controls',
  description: 'Spending limits and approval workflows for financial operations',
  framework: 'Internal Controls',
  category: 'financial',
  rules: [
    {
      id: 'fin-small-purchase',
      name: 'Small Purchase Limit',
      description: 'Auto-approve purchases under $100',
      type: 'spending_limit',
      parameters: {
        threshold: 100,
        severity: 'low',
        requiresApproval: false,
      },
    },
    {
      id: 'fin-medium-purchase',
      name: 'Medium Purchase Approval',
      description: 'Require approval for purchases $100-$1000',
      type: 'approval_required',
      parameters: {
        threshold: 1000,
        severity: 'medium',
        requiresApproval: true,
      },
    },
    {
      id: 'fin-large-purchase',
      name: 'Large Purchase Block',
      description: 'Block purchases over $10,000 without executive approval',
      type: 'action_blocked',
      parameters: {
        threshold: 10000,
        severity: 'critical',
        autoBlock: true,
      },
    },
    {
      id: 'fin-daily-limit',
      name: 'Daily Spending Limit',
      description: 'Alert when daily spending exceeds $5,000',
      type: 'notification_required',
      parameters: {
        threshold: 5000,
        severity: 'high',
      },
    },
  ],
  alertSettings: {
    complianceThreshold: 90,
    violationThreshold: 5,
    cooldownMinutes: 60,
  },
};

/**
 * Get all available templates
 */
export function getAllTemplates(): PolicyTemplate[] {
  return [
    SOC2_TEMPLATE,
    GDPR_TEMPLATE,
    HIPAA_TEMPLATE,
    FINANCIAL_CONTROLS_TEMPLATE,
  ];
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PolicyTemplate | undefined {
  return getAllTemplates().find(t => t.id === id);
}

/**
 * Apply template to user's governance settings
 * Returns the rules that should be activated
 */
export function applyTemplate(templateId: string): PolicyRule[] | null {
  const template = getTemplateById(templateId);
  if (!template) return null;
  
  return template.rules;
}
