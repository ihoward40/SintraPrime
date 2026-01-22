import { eventBus } from "../core/eventBus.js";

// Placeholder: wire actual Notion + Drive logic here.
async function attachToNotionAndDrive({ filepath, type, creditor }) {
  // Keep this deterministic-ish for now.
  const safe = encodeURIComponent(String(creditor || "unknown"));
  return {
    notionUrl: `https://notion.so/placeholder/${safe}`,
    driveUrl: `https://drive.google.com/placeholder/${safe}`,
    localPath: filepath,
    type,
  };
}

// Dedupe within a single process to avoid repeated Slack spam on retries.
const recent = new Set();

eventBus.on("doc.generated", async ({ type, creditor, filepath, channel } = {}) => {
  const t = String(type || "").trim();
  const c = String(creditor || "").trim();
  const fp = String(filepath || "").trim();
  if (!t || !c || !fp) return;

  const key = `${t}:${c}:${fp}`;
  if (recent.has(key)) return;
  recent.add(key);

  const links = await attachToNotionAndDrive({ filepath: fp, type: t, creditor: c });

  // Notify Slack via event bus so channel routing stays centralized.
  eventBus.emit("case.update", {
    channel: channel || undefined,
    caseId: c,
    title: `Draft Generated — ${String(t).replace(/_/g, " ").toUpperCase()}`,
    summary: `Local: ${links.localPath}\nNotion: ${links.notionUrl}\nDrive: ${links.driveUrl}`,
    idempotency_key: `draft:${t}:${c}`,
  });

  eventBus.emit("filing.draft.ready", {
    type: t,
    creditor: c,
    filepath: fp,
    links,
    channel: channel || undefined,
  });
});
