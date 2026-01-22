import { casesReceived } from "../cases/received.js";
import { NotionHttpLive } from "../notion/liveHttp.js";
import { NotionLive } from "../notion/live.js";
import { LiveNotionCaseStore } from "../cases/notion/liveNotionCaseStore.js";

export async function runCasesReceivedCommand(args: { rootDir?: string; limit?: number }) {
  const rootDir = args.rootDir ?? process.cwd();
  const casesDbId = process.env.NOTION_CASES_DB_ID;
  if (!casesDbId || !casesDbId.trim()) {
    throw new Error("NOTION_CASES_DB_ID missing (Notion Cases database id)");
  }

  const http = new NotionHttpLive();
  const notion = new NotionLive(http);
  const store = new LiveNotionCaseStore(notion as any, casesDbId.trim());

  return casesReceived({ rootDir, store: store as any, limit: args.limit ?? 25 });
}
