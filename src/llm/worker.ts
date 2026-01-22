import type { LlmProvider, LlmToolCall, LlmToolResult, LlmToolSpec } from "./types.js";

export type WorkerLane = "draft" | "live" | "send";

export type ToolHandler = (input: any) => Promise<any>;

export type WorkerTool = {
  spec: LlmToolSpec;
  handler: ToolHandler;
  lanes: WorkerLane[];
};

export function assertToolAllowed(lane: WorkerLane, toolName: string, registry: WorkerTool[]) {
  const t = registry.find((x) => x.spec.name === toolName);
  if (!t) throw new Error(`Tool not found: ${toolName}`);
  if (!t.lanes.includes(lane)) throw new Error(`Tool not allowed in lane '${lane}': ${toolName}`);
}

export async function runClaudeWorker(params: {
  provider: LlmProvider;
  lane: WorkerLane;
  model: string;
  system?: string;
  prompt: string;
  tools: WorkerTool[];
  executeTools?: boolean;
}): Promise<{
  text: string;
  toolCalls: LlmToolCall[];
  toolResults: LlmToolResult[];
}> {
  const tools: LlmToolSpec[] = params.tools.map((t) => t.spec);

  const first = await params.provider.runWithTools({
    system: params.system,
    model: params.model,
    messages: [{ role: "user", content: params.prompt }],
    tools,
    toolChoice: "auto",
    maxTokens: 1024,
    temperature: 0.2,
  });

  const toolResults: LlmToolResult[] = [];

  if (params.executeTools) {
    for (const call of first.toolCalls) {
      assertToolAllowed(params.lane, call.name, params.tools);
      const tool = params.tools.find((t) => t.spec.name === call.name)!;
      try {
        const result = await tool.handler(call.input);
        toolResults.push({ tool_use_id: call.id, content: result, is_error: false });
      } catch (e) {
        toolResults.push({ tool_use_id: call.id, content: { error: String((e as any)?.message ?? e) }, is_error: true });
      }
    }
  }

  return { text: first.text, toolCalls: first.toolCalls, toolResults };
}
