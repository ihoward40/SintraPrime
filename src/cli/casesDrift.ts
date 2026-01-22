import { casesDriftScan } from "../cases/drift.js";
import { NotionHttpLive } from "../notion/liveHttp.js";
import { NotionLive } from "../notion/live.js";
import { LiveNotionCaseStore } from "../cases/notion/liveNotionCaseStore.js";

export async function runCasesDriftCommand(args: { rootDir?: string }) {
  const rootDir = args.rootDir ?? process.cwd();
  const casesDbId = process.env.NOTION_CASES_DB_ID;
  if (!casesDbId || !casesDbId.trim()) {
    throw new Error("NOTION_CASES_DB_ID missing (Notion Cases database id)");
  }

  const http = new NotionHttpLive();
  const notion = new NotionLive(http);
  const store = new LiveNotionCaseStore(notion as any, casesDbId.trim());

  const res = await casesDriftScan({ rootDir, store: store as any });
  process.stdout.write(JSON.stringify({ ok: true, command: "/cases drift", ...res }, null, 2) + "\n");
}
