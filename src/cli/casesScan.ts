import { casesScan } from "../cases/scan.js";
import { NotionHttpLive } from "../notion/liveHttp.js";
import { NotionLive } from "../notion/live.js";
import { LiveNotionCaseStore } from "../cases/notion/liveNotionCaseStore.js";

export async function runCasesScanCommand(args: {
  rootDir?: string;
  lockMinutes?: number;
}) {
  const rootDir = args.rootDir ?? process.cwd();
  const casesDbId = process.env.NOTION_CASES_DB_ID;
  if (!casesDbId || !casesDbId.trim()) {
    throw new Error("NOTION_CASES_DB_ID missing (Notion Cases database id)");
  }

  const http = new NotionHttpLive();
  const notion = new NotionLive(http);
  const store = new LiveNotionCaseStore(notion as any, casesDbId.trim());

  await casesScan({ rootDir, store: store as any, lockMinutes: args.lockMinutes ?? 15 });
}
