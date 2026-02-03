/**
 * Planner - Generates execution plans from task requests
 * 
 * Uses AI to break down complex tasks into executable steps
 */

import { TaskRequest, Plan, PlanStep } from '../types/index.js';

export class Planner {
  private aiClient: any; // AI client for plan generation

  constructor(aiClient: any) {
    this.aiClient = aiClient;
  }

  /**
   * Generate an execution plan from a task request
   */
  async generatePlan(request: TaskRequest): Promise<Plan> {
    const planId = this.generatePlanId();

    // Use AI to generate the plan
    const steps = await this.generateSteps(request);

    const plan: Plan = {
      id: planId,
      taskId: request.id,
      steps,
      constraints: this.extractConstraints(request)
    };

    return plan;
  }

  /**
   * Generate plan steps using AI
   */
  private async generateSteps(request: TaskRequest): Promise<PlanStep[]> {
    const prompt = `
      Task: ${request.prompt}
      Context: ${JSON.stringify(request.context || {})}
      
      Break this task down into a sequence of executable steps.
      Each step should specify:
      - A clear description
      - The tool to use
      - The arguments for that tool
      - Any dependencies on previous steps (by step index)
      
      Available tools:
      - web_search: Search the web for information
      - web_scrape: Extract data from a webpage
      - send_email: Send an email
      - create_document: Create a document
      - run_code: Execute code
      - shopify_api: Interact with Shopify (methods: getProducts, createProduct, updateProduct, getOrders)
      - meta_ads_api: Interact with Meta Ads (methods: getCampaigns, createCampaign, getAdSets, createAdSet)
      - google_drive: Interact with Google Drive (methods: listFiles, getFile, uploadFile, deleteFile)
      - gmail: Send emails via Gmail
      
      Respond ONLY with a valid JSON array of steps in this exact format:
      [
        {
          "description": "Step description",
          "tool": "tool_name",
          "args": {"key": "value"},
          "dependencies": []
        }
      ]
      
      Keep steps atomic and focused. Use dependencies to ensure proper sequencing.
    `;

    try {
      // Try to use AI client if available
      if (this.aiClient && typeof this.aiClient.generatePlan === 'function') {
        const response = await this.aiClient.generatePlan(prompt);
        const steps = this.parseAIResponse(response);
        return steps.map((step, index) => {
          const stepId = this.generateStepId();
          return {
            id: stepId,
            description: step.description,
            tool: step.tool,
            args: step.args,
            dependencies: step.dependencies.map(depIndex => {
              // Convert dependency indices to step IDs
              // Since we're generating IDs sequentially, we can use a temporary mapping
              const allIds = steps.map(() => this.generateStepId());
              return allIds[depIndex] || stepId;
            })
          };
        });
      }
    } catch (error) {
      console.warn('AI plan generation failed, using heuristic fallback:', error);
    }

    // Fallback: Use heuristic-based planning
    return this.generateHeuristicSteps(request);
  }

  /**
   * Parse AI response into steps
   */
  private parseAIResponse(response: string): Array<{description: string, tool: string, args: any, dependencies: number[]}> {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\[([\s\S]*)\]/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Generate steps using heuristics when AI is unavailable
   */
  private generateHeuristicSteps(request: TaskRequest): PlanStep[] {
    const prompt = request.prompt.toLowerCase();
    const steps: PlanStep[] = [];

    // Detect task type and generate appropriate steps
    if (prompt.includes('shopify') || prompt.includes('product') || prompt.includes('order')) {
      steps.push({
        id: this.generateStepId(),
        description: 'Fetch Shopify data',
        tool: 'shopify_api',
        args: { method: 'getProducts', limit: 50 },
        dependencies: []
      });
    }

    if (prompt.includes('email') || prompt.includes('send') || prompt.includes('notify')) {
      const prevStepId = steps.length > 0 ? steps[steps.length - 1]?.id : undefined;
      steps.push({
        id: this.generateStepId(),
        description: 'Send notification email',
        tool: 'send_email',
        args: { subject: 'Task Notification', body: 'Task completed' },
        dependencies: prevStepId ? [prevStepId] : []
      });
    }

    if (prompt.includes('search') || prompt.includes('find') || prompt.includes('research')) {
      steps.push({
        id: this.generateStepId(),
        description: 'Search for information',
        tool: 'web_search',
        args: { query: request.prompt },
        dependencies: []
      });
    }

    if (prompt.includes('report') || prompt.includes('document') || prompt.includes('create')) {
      const prevStepId = steps.length > 0 ? steps[steps.length - 1]?.id : undefined;
      steps.push({
        id: this.generateStepId(),
        description: 'Create report document',
        tool: 'create_document',
        args: { title: 'Task Report', format: 'markdown' },
        dependencies: prevStepId ? [prevStepId] : []
      });
    }

    // If no specific patterns matched, create a generic plan
    if (steps.length === 0) {
      const step1Id = this.generateStepId();
      steps.push({
        id: step1Id,
        description: 'Analyze task requirements',
        tool: 'analyze',
        args: { prompt: request.prompt },
        dependencies: []
      });
      
      steps.push({
        id: this.generateStepId(),
        description: 'Execute task',
        tool: 'execute',
        args: { task: request.prompt },
        dependencies: [step1Id]
      });
    }

    return steps;
  }

  /**
   * Generate verification step
   */
  private generateVerificationStep(): PlanStep {
    return {
      id: this.generateStepId(),
      description: 'Verify task completion',
      tool: 'verify',
      args: { checkResults: true },
      dependencies: []
    };
  }

  /**
   * Extract constraints from the task request
   */
  private extractConstraints(request: TaskRequest): any {
    return {
      maxBudget: 1000,
      maxDuration: 3600, // 1 hour in seconds
      requiresApproval: request.priority === 'high'
    };
  }

  // Helper methods
  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
