import { readArtifactIndex } from "../cases/artifactIndex.js";
import { NotionHttpLive } from "../notion/liveHttp.js";
import { NotionLive } from "../notion/live.js";
import { LiveNotionCaseStore } from "../cases/notion/liveNotionCaseStore.js";
import type { WorkerLane, WorkerTool } from "./worker.js";

export function buildClaudeWorkerTools(ctx: { rootDir: string }): WorkerTool[] {
  const tools: WorkerTool[] = [];

  tools.push({
    spec: {
      name: "cases.read_artifact_index",
      description: "Read the local deterministic artifacts index for a case (no network).",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          case_id: { type: "string" },
        },
        required: ["case_id"],
      },
    },
    lanes: ["draft", "live"],
    handler: async (input: any) => {
      const caseId = String(input?.case_id ?? "").trim();
      if (!caseId) throw new Error("case_id required");
      return readArtifactIndex(ctx.rootDir, caseId);
    },
  });

  tools.push({
    spec: {
      name: "cases.query_due",
      description: "Query due cases from Notion Cases DB (live lane; read-only).",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          before_iso: { type: "string" },
        },
        required: ["before_iso"],
      },
    },
    lanes: ["live"],
    handler: async (input: any) => {
      const beforeIso = String(input?.before_iso ?? "").trim();
      if (!beforeIso) throw new Error("before_iso required");

      const casesDbId = process.env.NOTION_CASES_DB_ID;
      if (!casesDbId || !casesDbId.trim()) throw new Error("NOTION_CASES_DB_ID missing");

      const http = new NotionHttpLive();
      const notion = new NotionLive(http);
      const store = new LiveNotionCaseStore(notion as any, casesDbId.trim());

      const rows = await store.queryDueCases({ beforeIso });
      return rows.slice(0, 50).map((r) => ({
        caseId: r.caseId,
        notionPageId: r.notionPageId,
        status: r.status,
        stage: r.stage,
        dueDate: r.dueDate,
        nextAction: r.nextAction,
      }));
    },
  });

  return tools;
}

export function laneSystemPrompt(lane: WorkerLane): string {
  if (lane === "draft") {
    return [
      "You are a drafting and planning assistant.",
      "You may propose tool calls, but assume tools are NOT executed automatically.",
      "Prefer deterministic, audit-friendly outputs.",
    ].join("\n");
  }

  if (lane === "live") {
    return [
      "You are operating in LIVE lane under strict governance.",
      "Only call tools when necessary and only the minimum required.",
      "Never invent data. Prefer read-only queries and local verification.",
    ].join("\n");
  }

  return [
    "You are operating in SEND lane.",
    "Do not attempt outbound actions; they require explicit approval-by-hash verification.",
  ].join("\n");
}
