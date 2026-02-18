import * as nanobotDb from "../db/nanobot-helpers";
import { updateRepairMetadata, updateRepairStatus } from "../db/nanobot-helpers-extended";
import { repairSystem } from "./repair-system";
import { notifyOwner } from "../_core/notification";

/**
 * Repair approval workflow
 * Manages pending repairs that require human approval
 */
export class ApprovalWorkflow {
  /**
   * Get all pending repair approvals
   */
  async getPendingApprovals() {
    const repairs = await nanobotDb.getRepairHistory(100);
    return repairs.filter((r: any) => 
      r.metadata?.requiresApproval && 
      !r.metadata?.approved && 
      !r.metadata?.rejected
    );
  }

  /**
   * Approve a repair and execute it
   */
  async approveRepair(repairId: number, approvedBy: string) {
    const repair = await this.getRepairById(repairId);
    if (!repair) {
      throw new Error("Repair not found");
    }

    // Mark as approved
    await updateRepairMetadata(repairId, {
      ...repair.metadata,
      approved: true,
      approvedBy,
      approvedAt: new Date().toISOString(),
    });

    // Execute the repair
    try {
      // Get the error log
      const errorLog = await nanobotDb.getErrorById(repair.errorLogId || 0);
      if (!errorLog) {
        throw new Error("Error log not found");
      }

      // Execute repair using repair system
      const result = await repairSystem.repair(errorLog as any);

      // Update repair status
      await updateRepairStatus(repairId, result.success ? "success" : "failed");

      return { success: true, result };
    } catch (err) {
      await updateRepairStatus(repairId, "failed");
      throw err;
    }
  }

  /**
   * Reject a repair
   */
  async rejectRepair(repairId: number, rejectedBy: string, reason?: string) {
    const repair = await this.getRepairById(repairId);
    if (!repair) {
      throw new Error("Repair not found");
    }

    // Mark as rejected
    await updateRepairMetadata(repairId, {
      ...repair.metadata,
      rejected: true,
      rejectedBy,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    });

    await updateRepairStatus(repairId, "rejected");

    return { success: true };
  }

  /**
   * Request approval for a high-risk repair
   */
  async requestApproval(errorLogId: number, repairType: string, description: string, riskLevel: string) {
    // Create repair record with approval flag
    const repair = await nanobotDb.createRepair({
      errorLogId,
      repairType,
      repairDescription: description,
      repairActions: [],
      success: false,
      metadata: {
        requiresApproval: true,
        riskLevel,
        requestedAt: new Date().toISOString(),
      },
    });

    // Notify owner
    await notifyOwner({
      title: "Nanobot: Repair Approval Required",
      content: `A high-risk repair requires your approval:\n\nType: ${repairType}\nRisk Level: ${riskLevel}\nDescription: ${description}\n\nPlease review in the nanobot dashboard.`,
    });

    return repair;
  }

  /**
   * Get repair by ID
   */
  private async getRepairById(id: number) {
    const repairs = await nanobotDb.getRepairHistory(1000);
    return repairs.find((r: any) => r.id === id);
  }
}

// Export singleton instance
export const approvalWorkflow = new ApprovalWorkflow();
