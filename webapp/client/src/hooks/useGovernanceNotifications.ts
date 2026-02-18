import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * Hook to manage real-time governance notifications
 * Displays toast notifications for policy violations, approval requests, and spending warnings
 */
export function useGovernanceNotifications() {
  // Poll for pending approvals
  const { data: pendingApprovals } = trpc.approvals.list.useQuery(
    { status: 'pending' },
    {
      refetchInterval: 30000, // Poll every 30 seconds
    }
  );

  // Poll for recent policy violations (last 5 minutes)
  const { data: recentViolations } = trpc.governance.getRecentViolations.useQuery(
    { minutes: 5 },
    {
      refetchInterval: 60000, // Poll every minute
    }
  );

  // Show toast for new pending approvals
  useEffect(() => {
    if (pendingApprovals && pendingApprovals.length > 0) {
      const highPriority = pendingApprovals.filter((a: any) => a.priority === 'high');
      if (highPriority.length > 0) {
        toast.warning(`${highPriority.length} high-priority approval${highPriority.length > 1 ? 's' : ''} pending`, {
          description: 'Review and approve high-risk operations',
          action: {
            label: 'Review',
            onClick: () => {
              window.location.href = '/governance/approvals';
            },
          },
          duration: 10000,
        });
      }
    }
  }, [pendingApprovals]);

  // Show toast for policy violations
  useEffect(() => {
    if (recentViolations && recentViolations.length > 0) {
      const critical = recentViolations.filter((v: any) => v.severity === 'critical');
      if (critical.length > 0) {
        toast.error(`${critical.length} critical policy violation${critical.length > 1 ? 's' : ''}`, {
          description: 'Immediate action required',
          action: {
            label: 'View Details',
            onClick: () => {
              window.location.href = '/governance';
            },
          },
          duration: 15000,
        });
      }
    }
  }, [recentViolations]);

  return {
    pendingApprovals: pendingApprovals?.length || 0,
    recentViolations: recentViolations?.length || 0,
  };
}
