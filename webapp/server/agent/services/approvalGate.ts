/**
 * Human-in-the-Loop Approval Gate System
 * 
 * Allows agents to request human approval before executing sensitive actions.
 * Uses WebSocket for real-time approval requests and responses.
 */

interface ApprovalRequest {
  id: string;
  userId: number;
  taskId: string;
  action: string;
  description: string;
  params: any;
  risk: "low" | "medium" | "high";
  timestamp: number;
  status: "pending" | "approved" | "rejected" | "timeout";
  response?: {
    approved: boolean;
    feedback?: string;
    timestamp: number;
  };
}

class ApprovalGateManager {
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalCallbacks: Map<string, (approved: boolean, feedback?: string) => void> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Request approval from user before executing an action
   */
  async requestApproval(
    userId: number,
    taskId: string,
    action: string,
    description: string,
    params: any,
    risk: ApprovalRequest["risk"],
    timeoutMs: number = 60000 // 1 minute default
  ): Promise<{ approved: boolean; feedback?: string }> {
    const id = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: ApprovalRequest = {
      id,
      userId,
      taskId,
      action,
      description,
      params,
      risk,
      timestamp: Date.now(),
      status: "pending",
    };

    this.pendingApprovals.set(id, request);

    // Emit approval request via WebSocket
    this.emitApprovalRequest(request);

    // Wait for approval with timeout
    return new Promise((resolve) => {
      // Set callback for when user responds
      this.approvalCallbacks.set(id, (approved, feedback) => {
        resolve({ approved, feedback });
      });

      // Set timeout
      const timeout = setTimeout(() => {
        const req = this.pendingApprovals.get(id);
        if (req && req.status === "pending") {
          req.status = "timeout";
          this.pendingApprovals.set(id, req);
          
          // Auto-reject on timeout
          const callback = this.approvalCallbacks.get(id);
          if (callback) {
            callback(false, "Approval request timed out");
          }
          
          this.cleanup(id);
        }
      }, timeoutMs);

      this.timeouts.set(id, timeout);
    });
  }

  /**
   * User responds to approval request
   */
  respond(id: string, approved: boolean, feedback?: string): boolean {
    const request = this.pendingApprovals.get(id);
    
    if (!request || request.status !== "pending") {
      return false;
    }

    // Update request
    request.status = approved ? "approved" : "rejected";
    request.response = {
      approved,
      feedback,
      timestamp: Date.now(),
    };
    this.pendingApprovals.set(id, request);

    // Trigger callback
    const callback = this.approvalCallbacks.get(id);
    if (callback) {
      callback(approved, feedback);
    }

    // Cleanup
    this.cleanup(id);

    return true;
  }

  /**
   * Get pending approvals for a user
   */
  getPendingApprovals(userId: number): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values()).filter(
      (req) => req.userId === userId && req.status === "pending"
    );
  }

  /**
   * Get approval history for a task
   */
  getTaskApprovals(taskId: string): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values()).filter(
      (req) => req.taskId === taskId
    );
  }

  /**
   * Cleanup approval request
   */
  private cleanup(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
    this.approvalCallbacks.delete(id);
  }

  /**
   * Emit approval request via WebSocket
   */
  private emitApprovalRequest(request: ApprovalRequest): void {
    // Import dynamically to avoid circular dependency
    import("./agentProgressEmitter").then(({ emitAgentProgress }) => {
      emitAgentProgress({
        taskId: request.taskId,
        type: "step",
        data: {
          step: "Approval Required",
          approvalRequest: {
            id: request.id,
            action: request.action,
            description: request.description,
            risk: request.risk,
            params: request.params,
          },
        },
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    pending: number;
    approved: number;
    rejected: number;
    timeout: number;
  } {
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      timeout: 0,
    };

    for (const request of Array.from(this.pendingApprovals.values())) {
      stats[request.status]++;
    }

    return stats;
  }
}

// Singleton instance
export const approvalGate = new ApprovalGateManager();

/**
 * Approval gate decorator for sensitive actions
 */
export function requiresApproval(
  action: string,
  description: string,
  risk: ApprovalRequest["risk"] = "medium"
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = args[args.length - 1]; // Assume last arg is context

      if (!context || !context.userId) {
        throw new Error("Context with userId required for approval gate");
      }

      // Request approval
      const { approved, feedback } = await approvalGate.requestApproval(
        context.userId,
        `task_${Date.now()}`,
        action,
        description,
        args,
        risk
      );

      if (!approved) {
        throw new Error(`Action rejected by user: ${feedback || "No feedback provided"}`);
      }

      // Execute original method
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Helper function to check if action requires approval
 */
export function shouldRequireApproval(action: string): boolean {
  const sensitiveActions = [
    "file_court_document",
    "send_email",
    "execute_code",
    "browser_fill_form",
    "make_payment",
    "delete_document",
    "update_case_status",
  ];

  return sensitiveActions.includes(action);
}

/**
 * Helper function to determine risk level
 */
export function getRiskLevel(action: string): ApprovalRequest["risk"] {
  const highRisk = ["file_court_document", "make_payment", "delete_document"];
  const mediumRisk = ["send_email", "execute_code", "browser_fill_form"];

  if (highRisk.includes(action)) return "high";
  if (mediumRisk.includes(action)) return "medium";
  return "low";
}
