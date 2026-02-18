import type { Tool } from "../types";
import { webSearchTool } from "./webSearch";
import { browserNavigateTool } from "./browserNavigate";
import { browserFillFormTool } from "./browserFillForm";
import { documentGeneratorTool } from "./documentGenerator";
import { emailSenderTool } from "./emailSender";
import { codeExecutorTool } from "./codeExecutor";
import { deadlineCalculatorTool } from "./deadlineCalculator";
import { citationCheckerTool } from "./citationChecker";

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // Register core tools
    this.register(webSearchTool);
    this.register(browserNavigateTool);
    this.register(browserFillFormTool);
    this.register(documentGeneratorTool);
    this.register(emailSenderTool);
    this.register(codeExecutorTool);
    this.register(deadlineCalculatorTool);
    this.register(citationCheckerTool);
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getDescriptions(): string {
    return this.getAll()
      .map(
        (t) =>
          `- ${t.name}: ${t.description}\n  Parameters: ${t.parameters.map((p) => `${p.name} (${p.type}${p.required ? ", required" : ""})`).join(", ")}`
      )
      .join("\n");
  }
}

export const toolRegistry = new ToolRegistry();
