export type LlmRole = "user" | "assistant" | "system";

export type LlmMessage = {
  role: Exclude<LlmRole, "system">;
  content: string;
};

export type LlmToolSpec = {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
};

export type LlmToolCall = {
  id: string;
  name: string;
  input: unknown;
};

export type LlmToolResult = {
  tool_use_id: string;
  content: unknown;
  is_error?: boolean;
};

export type LlmRunResult = {
  text: string;
  toolCalls: LlmToolCall[];
  raw: unknown;
};

export interface LlmProvider {
  generate(params: {
    system?: string;
    messages: LlmMessage[];
    model: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<LlmRunResult>;

  runWithTools(params: {
    system?: string;
    messages: LlmMessage[];
    model: string;
    maxTokens?: number;
    temperature?: number;
    tools: LlmToolSpec[];
    toolChoice?: "auto" | { type: "tool"; name: string };
  }): Promise<LlmRunResult>;
}
