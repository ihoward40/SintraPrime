import { ClaudeProvider } from "../llm/claude.js";
import { runClaudeWorker } from "../llm/worker.js";
import { buildClaudeWorkerTools, laneSystemPrompt } from "../llm/toolRegistry.js";
import fs from "node:fs";
import path from "node:path";
import { stableHash, stableStringify } from "../utils/stableJson.js";

function mustString(v: unknown, name: string): string {
  if (typeof v !== "string" || v.trim() === "") throw new Error(`${name} must be a non-empty string`);
  return v.trim();
}

export async function runClaudeWorkerCommand(args: {
  rootDir?: string;
  lane: "draft" | "live" | "send";
  prompt: string;
  executeTools?: boolean;
}) {
  const rootDir = args.rootDir ?? process.cwd();
  const model = process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL;
  if (!model || !model.trim()) {
    throw new Error("Missing CLAUDE_MODEL (or ANTHROPIC_MODEL) env var");
  }

  const provider = new ClaudeProvider();
  const tools = buildClaudeWorkerTools({ rootDir });

  const res = await runClaudeWorker({
    provider,
    lane: args.lane,
    model: model.trim(),
    system: laneSystemPrompt(args.lane),
    prompt: mustString(args.prompt, "prompt"),
    tools,
    executeTools: Boolean(args.executeTools),
  });

  // Deterministic proposal artifact (approve-by-hash pattern).
  const proposal = {
    schema_id: "https://sintraprime.local/schemas/claude-worker-proposal.schema.json",
    lane: args.lane,
    model: model.trim(),
    prompt: mustString(args.prompt, "prompt"),
    tool_calls: res.toolCalls.map((c) => ({ id: c.id, name: c.name, input: c.input })),
    notes: res.text,
  };

  const proposal_hash = stableHash(proposal);
  const outDir = path.join(rootDir, "runs", "claude", "proposals");
  fs.mkdirSync(outDir, { recursive: true });
  const proposalPath = path.join(outDir, `${proposal_hash}.proposal.json`);
  fs.writeFileSync(proposalPath, stableStringify({ ...proposal, proposal_hash }, { indent: 2, trailingNewline: true }), "utf8");

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        command: "/claude worker",
        lane: args.lane,
        executeTools: Boolean(args.executeTools),
        proposal_hash,
        proposal_path: proposalPath,
        text: res.text,
        toolCalls: res.toolCalls,
        toolResults: res.toolResults,
      },
      null,
      2
    ) + "\n"
  );
}
