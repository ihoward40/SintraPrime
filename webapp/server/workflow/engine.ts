/**
 * Workflow Execution Engine
 * Executes user-defined automation workflows
 */

export interface WorkflowNode {
  id: string;
  type: "start" | "scraping" | "video" | "condition" | "transform" | "end";
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ExecutionContext {
  workflowId: number;
  executionId: number;
  userId: number;
  variables: Record<string, any>;
  logs: Array<{ timestamp: Date; level: string; message: string; nodeId?: string }>;
}

export class WorkflowEngine {
  private context: ExecutionContext;

  constructor(context: ExecutionContext) {
    this.context = context;
  }

  /**
   * Execute a workflow
   */
  async execute(workflow: WorkflowDefinition, input: Record<string, any> = {}): Promise<{
    success: boolean;
    output?: Record<string, any>;
    error?: string;
    logs: ExecutionContext["logs"];
  }> {
    try {
      this.log("info", "Workflow execution started");
      
      // Initialize variables with input
      this.context.variables = { ...input };

      // Find start node
      const startNode = workflow.nodes.find(n => n.type === "start");
      if (!startNode) {
        throw new Error("Workflow must have a start node");
      }

      // Execute workflow from start node
      const result = await this.executeNode(startNode, workflow);

      this.log("info", "Workflow execution completed successfully");

      return {
        success: true,
        output: result,
        logs: this.context.logs
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.log("error", `Workflow execution failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        logs: this.context.logs
      };
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    workflow: WorkflowDefinition
  ): Promise<any> {
    this.log("info", `Executing node: ${node.type}`, node.id);

    let result: any;

    switch (node.type) {
      case "start":
        result = this.context.variables;
        break;

      case "scraping":
        result = await this.executeScraping(node);
        break;

      case "video":
        result = await this.executeVideo(node);
        break;

      case "condition":
        result = await this.executeCondition(node, workflow);
        return result; // Condition handles its own flow

      case "transform":
        result = await this.executeTransform(node);
        break;

      case "end":
        return this.context.variables;

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    // Store result in variables
    if (node.data.outputVariable) {
      this.context.variables[node.data.outputVariable] = result;
    }

    // Find next node(s)
    const nextEdges = workflow.edges.filter(e => e.source === node.id);
    
    if (nextEdges.length === 0) {
      // No next node, return current result
      return result;
    }

    if (nextEdges.length === 1) {
      // Single next node
      const nextNode = workflow.nodes.find(n => n.id === nextEdges[0].target);
      if (!nextNode) {
        throw new Error(`Next node not found: ${nextEdges[0].target}`);
      }
      return await this.executeNode(nextNode, workflow);
    }

    // Multiple next nodes (parallel execution)
    const results = await Promise.all(
      nextEdges.map(async edge => {
        const nextNode = workflow.nodes.find(n => n.id === edge.target);
        if (!nextNode) {
          throw new Error(`Next node not found: ${edge.target}`);
        }
        return await this.executeNode(nextNode, workflow);
      })
    );

    return results;
  }

  /**
   * Execute scraping node
   */
  private async executeScraping(node: WorkflowNode): Promise<any> {
    const { templateId, parameters } = node.data;

    this.log("info", `Executing scraping with template: ${templateId}`, node.id);

    // Replace variables in parameters
    const resolvedParams = this.resolveVariables(parameters);

    // TODO: Call Agent Zero or browser automation service
    // For now, return mock data
    return {
      success: true,
      data: {
        templateId,
        parameters: resolvedParams,
        results: []
      }
    };
  }

  /**
   * Execute video generation node
   */
  private async executeVideo(node: WorkflowNode): Promise<any> {
    const { templateKey, customizations } = node.data;

    this.log("info", `Executing video generation with template: ${templateKey}`, node.id);

    // Replace variables in customizations
    const resolvedCustomizations = this.resolveVariables(customizations);

    // TODO: Call InVideo service
    // For now, return mock data
    return {
      success: true,
      videoId: `video_${Date.now()}`,
      videoUrl: "https://example.com/video.mp4"
    };
  }

  /**
   * Execute condition node
   */
  private async executeCondition(
    node: WorkflowNode,
    workflow: WorkflowDefinition
  ): Promise<any> {
    const { condition, trueEdge, falseEdge } = node.data;

    // Evaluate condition
    const result = this.evaluateCondition(condition);

    this.log("info", `Condition evaluated to: ${result}`, node.id);

    // Find appropriate edge
    const edgeId = result ? trueEdge : falseEdge;
    const edge = workflow.edges.find(e => e.id === edgeId);

    if (!edge) {
      throw new Error(`Edge not found: ${edgeId}`);
    }

    const nextNode = workflow.nodes.find(n => n.id === edge.target);
    if (!nextNode) {
      throw new Error(`Next node not found: ${edge.target}`);
    }

    return await this.executeNode(nextNode, workflow);
  }

  /**
   * Execute transform node
   */
  private async executeTransform(node: WorkflowNode): Promise<any> {
    const { operation, input, output } = node.data;

    this.log("info", `Executing transform: ${operation}`, node.id);

    const inputValue = this.resolveVariable(input);

    let result: any;

    switch (operation) {
      case "map":
        result = Array.isArray(inputValue) 
          ? inputValue.map((item: any) => this.resolveVariables(node.data.mapping, { item }))
          : inputValue;
        break;

      case "filter":
        result = Array.isArray(inputValue)
          ? inputValue.filter((item: any) => this.evaluateCondition(node.data.condition, { item }))
          : inputValue;
        break;

      case "merge":
        result = { ...inputValue, ...this.resolveVariables(node.data.mergeData) };
        break;

      case "extract":
        result = inputValue?.[node.data.field];
        break;

      default:
        result = inputValue;
    }

    return result;
  }

  /**
   * Resolve variables in a value
   */
  private resolveVariables(value: any, additionalContext: Record<string, any> = {}): any {
    const context = { ...this.context.variables, ...additionalContext };

    if (typeof value === "string") {
      return value.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
        return context[key.trim()] ?? "";
      });
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveVariables(item, additionalContext));
    }

    if (typeof value === "object" && value !== null) {
      const resolved: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveVariables(val, additionalContext);
      }
      return resolved;
    }

    return value;
  }

  /**
   * Resolve a single variable
   */
  private resolveVariable(key: string): any {
    return this.context.variables[key];
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: string, additionalContext: Record<string, any> = {}): boolean {
    const context = { ...this.context.variables, ...additionalContext };

    try {
      // Simple condition evaluation (can be enhanced)
      // Format: "variable operator value" (e.g., "count > 10")
      const match = condition.match(/^(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+)$/);
      
      if (!match) {
        return false;
      }

      const [, variable, operator, value] = match;
      const leftValue = context[variable];
      const rightValue = value.startsWith('"') ? value.slice(1, -1) : parseFloat(value);

      switch (operator) {
        case "==": return leftValue == rightValue;
        case "!=": return leftValue != rightValue;
        case ">": return leftValue > rightValue;
        case "<": return leftValue < rightValue;
        case ">=": return leftValue >= rightValue;
        case "<=": return leftValue <= rightValue;
        default: return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Log a message
   */
  private log(level: string, message: string, nodeId?: string): void {
    this.context.logs.push({
      timestamp: new Date(),
      level,
      message,
      nodeId
    });
  }
}
