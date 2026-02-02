/**
 * Executor - Executes individual plan steps using tools and connectors
 */

import { PlanStep } from '../types/index.js';
import { ToolRegistry } from '../tools/toolRegistry.js';
import { ReceiptLedger } from '../audit/receiptLedger.js';

export class Executor {
  private toolRegistry: ToolRegistry;
  private receiptLedger: ReceiptLedger;

  constructor(toolRegistry: ToolRegistry, receiptLedger: ReceiptLedger) {
    this.toolRegistry = toolRegistry;
    this.receiptLedger = receiptLedger;
  }

  /**
   * Execute a single plan step
   */
  async executeStep(step: PlanStep): Promise<any> {
    const startTime = Date.now();

    try {
      // Get the tool from the registry
      const tool = this.toolRegistry.getTool(step.tool);
      if (!tool) {
        throw new Error(`Tool not found: ${step.tool}`);
      }

      // Execute the tool
      const result = await tool.execute(step.args);

      // Record the execution
      await this.receiptLedger.recordAction({
        id: this.generateReceiptId(),
        toolCallId: step.id,
        actor: 'executor',
        action: `tool_executed:${step.tool}`,
        timestamp: new Date().toISOString(),
        result: {
          stepId: step.id,
          tool: step.tool,
          duration: Date.now() - startTime,
          success: true,
          output: result
        },
        hash: this.hashObject({ step, result })
      });

      return result;
    } catch (error) {
      // Record the failure
      await this.receiptLedger.recordAction({
        id: this.generateReceiptId(),
        toolCallId: step.id,
        actor: 'executor',
        action: `tool_failed:${step.tool}`,
        timestamp: new Date().toISOString(),
        result: {
          stepId: step.id,
          tool: step.tool,
          duration: Date.now() - startTime,
          success: false,
          error: String(error)
        },
        hash: this.hashObject({ step, error })
      });

      throw error;
    }
  }

  // Helper methods
  private generateReceiptId(): string {
    return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashObject(obj: any): string {
    return JSON.stringify(obj);
  }
}
