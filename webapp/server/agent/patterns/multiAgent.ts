import { AgentOrchestrator } from "../orchestrator";
import type { AgentContext, AgentResult } from "../types";
import { emitStep } from "../services/agentProgressEmitter";

/**
 * Router Pattern: Route tasks to specialized agents based on task type
 */
export class RouterAgent {
  private agents: Map<string, AgentOrchestrator> = new Map();

  registerAgent(name: string, agent: AgentOrchestrator) {
    this.agents.set(name, agent);
  }

  async route(task: string, context: AgentContext): Promise<AgentResult> {
    const taskId = `router_${context.userId}_${Date.now()}`;

    // Determine which agent should handle this task
    const agentName = await this.determineAgent(task, context);

    emitStep(taskId, "Routing", `Routing task to ${agentName} agent`);

    const agent = this.agents.get(agentName);
    if (!agent) {
      return {
        success: false,
        error: `No agent found for: ${agentName}`,
      };
    }

    return await agent.executeTask(task, context);
  }

  private async determineAgent(task: string, context: AgentContext): Promise<string> {
    // Simple keyword-based routing (in production, use LLM for classification)
    const taskLower = task.toLowerCase();

    if (taskLower.includes("research") || taskLower.includes("find") || taskLower.includes("search")) {
      return "research";
    }

    if (taskLower.includes("draft") || taskLower.includes("write") || taskLower.includes("generate")) {
      return "drafting";
    }

    if (taskLower.includes("file") || taskLower.includes("submit") || taskLower.includes("form")) {
      return "filing";
    }

    if (taskLower.includes("review") || taskLower.includes("check") || taskLower.includes("analyze")) {
      return "review";
    }

    // Default to general agent
    return "general";
  }
}

/**
 * Sequential Pattern: Execute multiple agents in sequence, passing results forward
 */
export class SequentialAgent {
  private agents: AgentOrchestrator[] = [];

  addAgent(agent: AgentOrchestrator) {
    this.agents.push(agent);
  }

  async execute(initialTask: string, context: AgentContext): Promise<AgentResult> {
    const taskId = `sequential_${context.userId}_${Date.now()}`;
    const results: AgentResult[] = [];
    let currentTask = initialTask;

    for (let i = 0; i < this.agents.length; i++) {
      emitStep(taskId, `Agent ${i + 1}/${this.agents.length}`, `Executing agent ${i + 1}`);

      const agent = this.agents[i];
      const result = await agent.executeTask(currentTask, context);
      results.push(result);

      if (!result.success) {
        return {
          success: false,
          error: `Sequential execution failed at agent ${i + 1}: ${result.error}`,
        };
      }

      // Pass result to next agent
      currentTask = `Previous result: ${result.result}\n\nContinue with: ${initialTask}`;
    }

    return {
      success: true,
      result: results[results.length - 1].result,
    };
  }
}

/**
 * Parallel Pattern: Execute multiple agents concurrently and combine results
 */
export class ParallelAgent {
  private agents: Array<{ name: string; agent: AgentOrchestrator; task: string }> = [];

  addAgent(name: string, agent: AgentOrchestrator, task: string) {
    this.agents.push({ name, agent, task });
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const taskId = `parallel_${context.userId}_${Date.now()}`;

    emitStep(taskId, "Parallel Execution", `Executing ${this.agents.length} agents in parallel`);

    // Execute all agents concurrently
    const promises = this.agents.map(({ name, agent, task }) =>
      agent.executeTask(task, context).then((result) => ({ name, result }))
    );

    const results = await Promise.all(promises);

    // Check if all succeeded
    const failures = results.filter((r) => !r.result.success);
    if (failures.length > 0) {
      return {
        success: false,
        error: `${failures.length} agents failed: ${failures.map((f) => f.name).join(", ")}`,
      };
    }

    // Combine results
    const combinedResult = results
      .map((r) => `**${r.name}:**\n${r.result.result}`)
      .join("\n\n---\n\n");

    return {
      success: true,
      result: combinedResult,
    };
  }
}

/**
 * Hierarchical Pattern: Supervisor agent delegates to worker agents
 */
export class HierarchicalAgent {
  private supervisor: AgentOrchestrator;
  private workers: Map<string, AgentOrchestrator> = new Map();

  constructor(supervisor: AgentOrchestrator) {
    this.supervisor = supervisor;
  }

  registerWorker(name: string, agent: AgentOrchestrator) {
    this.workers.set(name, agent);
  }

  async execute(task: string, context: AgentContext): Promise<AgentResult> {
    const taskId = `hierarchical_${context.userId}_${Date.now()}`;

    // Supervisor creates plan and delegates
    emitStep(taskId, "Supervisor Planning", "Supervisor analyzing task and delegating to workers");

    // In production, supervisor would use LLM to break down task and assign to workers
    // For now, use simple delegation
    const supervisorResult = await this.supervisor.executeTask(task, context);

    if (!supervisorResult.success) {
      return supervisorResult;
    }

    // Supervisor's result contains instructions for workers
    // In production, parse and delegate to appropriate workers
    return supervisorResult;
  }
}

/**
 * Reflect & Critique Pattern: Agent executes, then another agent reviews and improves
 */
export class ReflectCritiqueAgent {
  private executor: AgentOrchestrator;
  private critic: AgentOrchestrator;
  private maxIterations: number;

  constructor(executor: AgentOrchestrator, critic: AgentOrchestrator, maxIterations: number = 3) {
    this.executor = executor;
    this.critic = critic;
    this.maxIterations = maxIterations;
  }

  async execute(task: string, context: AgentContext): Promise<AgentResult> {
    const taskId = `reflect_${context.userId}_${Date.now()}`;
    let currentResult: AgentResult;
    let iteration = 0;

    do {
      iteration++;
      emitStep(taskId, `Iteration ${iteration}`, `Executing and critiquing (iteration ${iteration}/${this.maxIterations})`);

      // Execute task
      currentResult = await this.executor.executeTask(task, context);

      if (!currentResult.success) {
        return currentResult;
      }

      // Critic reviews
      const critiqueTask = `Review the following result and suggest improvements:\n\n${currentResult.result}\n\nOriginal task: ${task}`;
      const critiqueResult = await this.critic.executeTask(critiqueTask, context);

      if (!critiqueResult.success) {
        // If critique fails, return original result
        return currentResult;
      }

      // Check if critique suggests improvements
      const critiqueText = critiqueResult.result || "";
      const needsImprovement = critiqueText.toLowerCase().includes("improve") ||
                              critiqueText.toLowerCase().includes("suggest") ||
                              critiqueText.toLowerCase().includes("better");

      if (!needsImprovement || iteration >= this.maxIterations) {
        break;
      }

      // Refine task with critique feedback
      task = `${task}\n\nPrevious attempt: ${currentResult.result}\n\nFeedback: ${critiqueResult.result}`;
    } while (iteration < this.maxIterations);

    return currentResult;
  }
}

/**
 * Consensus Pattern: Multiple agents vote on the best solution
 */
export class ConsensusAgent {
  private agents: AgentOrchestrator[] = [];
  private votingThreshold: number;

  constructor(votingThreshold: number = 0.5) {
    this.votingThreshold = votingThreshold;
  }

  addAgent(agent: AgentOrchestrator) {
    this.agents.push(agent);
  }

  async execute(task: string, context: AgentContext): Promise<AgentResult> {
    const taskId = `consensus_${context.userId}_${Date.now()}`;

    emitStep(taskId, "Consensus Building", `${this.agents.length} agents generating solutions`);

    // All agents execute the same task
    const promises = this.agents.map((agent) => agent.executeTask(task, context));
    const results = await Promise.all(promises);

    // Filter successful results
    const successfulResults = results.filter((r) => r.success);

    if (successfulResults.length === 0) {
      return {
        success: false,
        error: "All agents failed to produce results",
      };
    }

    // In production, use LLM to evaluate and vote on best result
    // For now, return the most common result or the first one
    return successfulResults[0];
  }
}
