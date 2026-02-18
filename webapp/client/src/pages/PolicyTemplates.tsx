import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Lock, 
  DollarSign, 
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight
} from 'lucide-react';

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  type: string;
  parameters: any;
}

interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  rules: PolicyRule[];
  alertSettings: {
    complianceThreshold: number;
    violationThreshold: number;
    cooldownMinutes: number;
  };
}

const TEMPLATES: PolicyTemplate[] = [
  {
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
        parameters: { severity: 'high' },
      },
      {
        id: 'soc2-change-management',
        name: 'Change Management Approval',
        description: 'Require approval for system changes and deployments',
        type: 'approval_required',
        parameters: { severity: 'critical', requiresApproval: true },
      },
      {
        id: 'soc2-data-deletion',
        name: 'Data Deletion Protection',
        description: 'Block unauthorized data deletion operations',
        type: 'action_blocked',
        parameters: { severity: 'critical', autoBlock: true },
      },
      {
        id: 'soc2-audit-trail',
        name: 'Audit Trail Integrity',
        description: 'Ensure all actions are logged with cryptographic verification',
        type: 'notification_required',
        parameters: { severity: 'medium' },
      },
      {
        id: 'soc2-spending-control',
        name: 'Spending Authorization',
        description: 'Require approval for expenditures above $1,000',
        type: 'approval_required',
        parameters: { threshold: 1000, severity: 'high', requiresApproval: true },
      },
    ],
    alertSettings: {
      complianceThreshold: 95,
      violationThreshold: 3,
      cooldownMinutes: 30,
    },
  },
  {
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
        parameters: { severity: 'high' },
      },
      {
        id: 'gdpr-data-deletion',
        name: 'Right to Erasure',
        description: 'Require approval for data deletion requests (Right to be Forgotten)',
        type: 'approval_required',
        parameters: { severity: 'critical', requiresApproval: true },
      },
      {
        id: 'gdpr-data-export',
        name: 'Data Portability',
        description: 'Log all data export requests (Right to Data Portability)',
        type: 'notification_required',
        parameters: { severity: 'medium' },
      },
      {
        id: 'gdpr-consent-management',
        name: 'Consent Verification',
        description: 'Block actions without valid user consent',
        type: 'action_blocked',
        parameters: { severity: 'critical', autoBlock: true },
      },
      {
        id: 'gdpr-breach-notification',
        name: 'Data Breach Detection',
        description: 'Alert on potential data breaches within 72 hours',
        type: 'notification_required',
        parameters: { severity: 'critical' },
      },
    ],
    alertSettings: {
      complianceThreshold: 98,
      violationThreshold: 1,
      cooldownMinutes: 15,
    },
  },
  {
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
        parameters: { severity: 'critical', requiresApproval: true },
      },
      {
        id: 'hipaa-encryption',
        name: 'Data Encryption Verification',
        description: 'Ensure all PHI is encrypted at rest and in transit',
        type: 'action_blocked',
        parameters: { severity: 'critical', autoBlock: true },
      },
      {
        id: 'hipaa-audit-logs',
        name: 'Audit Log Retention',
        description: 'Maintain audit logs for 6 years as required by HIPAA',
        type: 'notification_required',
        parameters: { severity: 'critical' },
      },
      {
        id: 'hipaa-minimum-necessary',
        name: 'Minimum Necessary Rule',
        description: 'Block access to PHI beyond minimum necessary',
        type: 'action_blocked',
        parameters: { severity: 'high', autoBlock: true },
      },
      {
        id: 'hipaa-breach-notification',
        name: 'Breach Notification',
        description: 'Alert on PHI breaches affecting 500+ individuals',
        type: 'notification_required',
        parameters: { severity: 'critical' },
      },
    ],
    alertSettings: {
      complianceThreshold: 99,
      violationThreshold: 1,
      cooldownMinutes: 10,
    },
  },
  {
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
        parameters: { threshold: 100, severity: 'low', requiresApproval: false },
      },
      {
        id: 'fin-medium-purchase',
        name: 'Medium Purchase Approval',
        description: 'Require approval for purchases $100-$1000',
        type: 'approval_required',
        parameters: { threshold: 1000, severity: 'medium', requiresApproval: true },
      },
      {
        id: 'fin-large-purchase',
        name: 'Large Purchase Block',
        description: 'Block purchases over $10,000 without executive approval',
        type: 'action_blocked',
        parameters: { threshold: 10000, severity: 'critical', autoBlock: true },
      },
      {
        id: 'fin-daily-limit',
        name: 'Daily Spending Limit',
        description: 'Alert when daily spending exceeds $5,000',
        type: 'notification_required',
        parameters: { threshold: 5000, severity: 'high' },
      },
    ],
    alertSettings: {
      complianceThreshold: 90,
      violationThreshold: 5,
      cooldownMinutes: 60,
    },
  },
];

export default function PolicyTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null);

  const getTemplateIcon = (category: string) => {
    switch (category) {
      case 'compliance':
        return <Shield className="h-8 w-8" />;
      case 'security':
        return <Lock className="h-8 w-8" />;
      case 'financial':
        return <DollarSign className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'action_blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'approval_required':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'notification_required':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'spending_limit':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const activateTemplate = trpc.governance.activateTemplate.useMutation({
    onSuccess: (data: any) => {
      alert(`${data.message}`);
    },
    onError: (error: any) => {
      alert(`Failed to activate template: ${error.message}`);
    },
  });

  const handleActivateTemplate = (template: PolicyTemplate) => {
    if (confirm(`Activate ${template.name}? This will apply ${template.rules.length} governance rules to your system.`)) {
      activateTemplate.mutate({ templateId: template.id });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policy Templates Library</h1>
          <p className="text-muted-foreground mt-2">
            Pre-configured governance templates for compliance frameworks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TEMPLATES.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    {getTemplateIcon(template.category)}
                  </div>
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.framework}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline">{template.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{template.description}</p>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Included Rules ({template.rules.length})</h4>
                <div className="space-y-1">
                  {template.rules.slice(0, 3).map((rule) => (
                    <div key={rule.id} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{rule.name}</span>
                    </div>
                  ))}
                  {template.rules.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      +{template.rules.length - 3} more rules
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Alert Settings</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Compliance Threshold:</span>
                    <p className="font-medium">{template.alertSettings.complianceThreshold}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Violation Limit:</span>
                    <p className="font-medium">{template.alertSettings.violationThreshold}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <Info className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleActivateTemplate(template)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Activate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Details Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedTemplate.name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {selectedTemplate.framework}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{selectedTemplate.description}</p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-4">Policy Rules ({selectedTemplate.rules.length})</h3>
                <div className="space-y-4">
                  {selectedTemplate.rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge className={getRuleTypeColor(rule.type)}>
                          {rule.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                      {rule.parameters.threshold && (
                        <p className="text-xs text-muted-foreground">
                          Threshold: ${rule.parameters.threshold}
                        </p>
                      )}
                      {rule.parameters.severity && (
                        <Badge variant="outline" className="text-xs">
                          Severity: {rule.parameters.severity}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Alert Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Compliance Threshold</p>
                    <p className="text-2xl font-bold">{selectedTemplate.alertSettings.complianceThreshold}%</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Violation Limit</p>
                    <p className="text-2xl font-bold">{selectedTemplate.alertSettings.violationThreshold}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Cooldown</p>
                    <p className="text-2xl font-bold">{selectedTemplate.alertSettings.cooldownMinutes}m</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleActivateTemplate(selectedTemplate);
                    setSelectedTemplate(null);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Activate Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
