// Universal (ESM/CJS) Slack graph builder
//
// Why: Slack export folders often lack package.json {"type":"module"}, so Node treats *.js
// as CommonJS and rejects top-level ESM `import` statements.
//
// This script avoids top-level imports and uses dynamic `import()` from an async entrypoint,
// which works in both CommonJS and ESM execution contexts.

// Compatibility script for Slack export folders that already contain:
// - users.json
// - channels.json
// - slack_analysis/slack_timeline.json (array)
// - slack_analysis/creditor_index.json (object)
//
// Outputs:
// - slack_analysis/slack_graph.json
// - slack_analysis/slack_graph.dot
// - slack_analysis/notion_slack_events.csv
// - slack_analysis/notion_creditor_hits.csv

function parseArgs(argv) {
  const out = { root: process.cwd(), help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i] || "");
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--root") {
      out.root = String(argv[i + 1] || out.root);
      i += 1;
    }
  }
  return out;
}

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(
    [
      "slack_build_graph.js",
      "",
      "Builds slack_analysis/slack_graph.json + DOT + Notion CSVs from an existing Slack export ingest.",
      "",
      "Usage:",
      "  node slack_build_graph.js",
      "  node slack_build_graph.js --root <slack-export-folder>",
      "",
      "Inputs (relative to --root):",
      "  slack_analysis/slack_timeline.json  (required)",
      "  slack_analysis/creditor_index.json  (optional)",
      "  users.json                          (optional)",
      "  channels.json                       (optional)",
      "",
      "Outputs (written under slack_analysis/):",
      "  slack_graph.json",
      "  slack_graph.dot",
      "  notion_slack_events.csv",
      "  notion_creditor_hits.csv",
    ].join("\n"),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const fsMod = await import("node:fs");
  const pathMod = await import("node:path");
  const fs = fsMod?.default ?? fsMod;
  const path = pathMod?.default ?? pathMod;

  const ROOT = path.resolve(String(args.root || process.cwd()));
  const ANALYSIS_DIR = path.join(ROOT, "slack_analysis");

  function ensureDir(absDir) {
    fs.mkdirSync(absDir, { recursive: true });
  }

  function loadJson(absPath) {
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  }

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`;
  return s;
}

function isoFromSlackTs(ts) {
  const n = Number.parseFloat(String(ts || ""));
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(Math.round(n * 1000)).toISOString();
}

function dateFromIso(iso) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function safeLabel(label) {
  return String(label || "").replace(/\"/g, "\\\"");
}

  const timelinePath = path.join(ANALYSIS_DIR, "slack_timeline.json");
  const creditorPath = path.join(ANALYSIS_DIR, "creditor_index.json");
  const usersPath = path.join(ROOT, "users.json");
  const channelsPath = path.join(ROOT, "channels.json");

  if (!fs.existsSync(timelinePath)) {
    throw new Error("slack_analysis/slack_timeline.json not found – run your ingest first.");
  }

  const timeline = loadJson(timelinePath);
  const creditorIdx = fs.existsSync(creditorPath) ? loadJson(creditorPath) : {};
  const users = fs.existsSync(usersPath) ? loadJson(usersPath) : [];
  const channels = fs.existsSync(channelsPath) ? loadJson(channelsPath) : [];

  if (!Array.isArray(timeline)) throw new Error("slack_timeline.json must be an array.");

  const userMap = new Map(
    users.map((u) => [u.id, u?.profile?.real_name || u.real_name || u?.profile?.display_name || u.name || u.id]),
  );
  const channelMap = new Map(channels.map((c) => [c.id, c.name || c.id]));

  const nodes = new Map();
  const edges = [];

  function addNode(id, type, label) {
    if (!id) return;
    if (!nodes.has(id)) nodes.set(id, { id, type, label: label || id });
  }

  function addEdge(from, to, type, meta = {}) {
    if (!from || !to) return;
    edges.push({ from, to, type, ...meta });
  }

  for (const msg of timeline) {
    const user = msg?.user || null;
    const userLabel = msg?.userLabel || (user ? userMap.get(user) : null) || user;

    const channel = msg?.channel || null;
    const channelLabel = msg?.channelLabel || (channel ? channelMap.get(channel) : null) || channel;

    const ts = msg?.ts || null;
    const subtype = msg?.subtype || "message";
    const text = typeof msg?.text === "string" ? msg.text : "";
    const creditorTag = msg?.creditorTag || null;

    if (user) addNode(user, "user", userLabel);
    if (channel) addNode(channel, "channel", channelLabel);

    if (user && channel) {
      addEdge(user, channel, subtype, { ts, text, creditorTag });
    }

    if (creditorTag) {
      const credName = String(creditorTag).trim().toUpperCase();
      const credId = `creditor:${credName}`;
      addNode(credId, "creditor", credName);
      if (user) addEdge(user, credId, "creditor_hit", { ts, channel });
      else if (channel) addEdge(channel, credId, "creditor_channel_hit", { ts });
    }
  }

  for (const [name, entries] of Object.entries(creditorIdx || {})) {
    const credName = String(name || "").trim();
    if (!credName) continue;

    const credId = `creditor:${credName.toUpperCase()}`;
    addNode(credId, "creditor", credName.toUpperCase());

    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      if (e?.user) {
        addEdge(e.user, credId, "creditor_hit", { ts: e.ts, channel: e.channel });
      } else if (e?.channel) {
        addEdge(e.channel, credId, "creditor_channel_hit", { ts: e.ts });
      }
    }
  }

  ensureDir(ANALYSIS_DIR);

  fs.writeFileSync(
    path.join(ANALYSIS_DIR, "slack_graph.json"),
    JSON.stringify({ nodes: [...nodes.values()], edges }, null, 2) + "\n",
    "utf8",
  );

  const dotLines = [];
  dotLines.push("digraph SlackGraph {");
  dotLines.push("  rankdir=LR;");
  for (const node of nodes.values()) {
    let shape = "ellipse";
    if (node.type === "channel") shape = "box";
    if (node.type === "creditor") shape = "diamond";
    dotLines.push(`  \"${node.id}\" [label=\"${safeLabel(node.label)}\" shape=${shape}];`);
  }
  for (const e of edges) {
    const label = e.type === "message" || e.type === "bot_message" ? "" : ` [label=\"${safeLabel(e.type)}\"]`;
    dotLines.push(`  \"${e.from}\" -> \"${e.to}\"${label};`);
  }
  dotLines.push("}");
  fs.writeFileSync(path.join(ANALYSIS_DIR, "slack_graph.dot"), dotLines.join("\n") + "\n", "utf8");

  const eventsHeader = ["Timestamp", "Date", "Channel", "User", "Type", "Text", "CreditorTag"];
  const eventsLines = [eventsHeader.map(csvEscape).join(",")];
  for (const msg of timeline) {
    const iso = isoFromSlackTs(msg?.ts);
    const d = dateFromIso(iso);

    const chLabel = msg?.channelLabel || channelMap.get(msg?.channel) || "";
    const uLabel = msg?.userLabel || userMap.get(msg?.user) || "";

    eventsLines.push(
      [
        iso,
        d,
        chLabel,
        uLabel,
        msg?.subtype || "message",
        msg?.text || "",
        msg?.creditorTag || "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  fs.writeFileSync(path.join(ANALYSIS_DIR, "notion_slack_events.csv"), eventsLines.join("\n") + "\n", "utf8");

  const credHeader = ["Creditor", "Timestamp", "Date", "Channel", "User", "Source", "Context"];
  const credLines = [credHeader.map(csvEscape).join(",")];

  for (const [name, entries] of Object.entries(creditorIdx || {})) {
    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      const iso = isoFromSlackTs(e?.ts);
      const d = dateFromIso(iso);
      const userLabel = e?.userLabel || userMap.get(e?.user) || e?.user || "";
      const channelLabel = e?.channelLabel || channelMap.get(e?.channel) || e?.channel || "";

      credLines.push(
        [
          String(name || "").toUpperCase(),
          iso,
          d,
          channelLabel,
          userLabel,
          e?.source || "",
          e?.context || "",
        ]
          .map(csvEscape)
          .join(","),
      );
    }
  }

  fs.writeFileSync(path.join(ANALYSIS_DIR, "notion_creditor_hits.csv"), credLines.join("\n") + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log("✅ Slack graph + Notion CSVs written to", ANALYSIS_DIR);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ slack_build_graph failed:", err?.stack || String(err));
  process.exitCode = 1;
});
