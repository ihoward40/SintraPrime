import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { safeWriteJson } from "../ui/services/jsonlStore.js";
import { appendTimelineEvent } from "../ui/core/timelineStore.js";
import { classifyCreditor } from "../ui/intelligence/creditorClassifier.js";

function usage(exitCode = 0) {
  const msg = `
Phase 2: Slack Knowledge Graph Build

Usage:
  node ./scripts/slack-graph-build.mjs --in <slack_ingest.jsonl> [options]

Options:
  --in <file>                  Input JSONL from slack_ingest.js (or any compatible JSONL)
  --out <dir>                  Output directory (default: runs/slack_graph/<timestamp>)
  --top <n>                    Top-N edges for DOT rendering (default: 200)
  --min-edge <n>               Minimum edge weight included in DOT (default: 2)
  --timeline <summary|off>      Append summary to runs/timeline.jsonl (default: summary)
  --creditor-threshold <n>      Minimum hits to include creditor nodes in DOT (default: 3)
  --max <n>                    Stop after processing n messages
  --dry-run                    Parse only; do not write outputs
  -h, --help                   Show help

Examples:
  node ./scripts/slack-graph-build.mjs --in runs/slack_export_ingest_2026-01-21T00-00-00-000Z.jsonl
  node ./scripts/slack-graph-build.mjs --in runs/slack_export_ingest_latest.jsonl --top 150 --min-edge 3
`;
  // eslint-disable-next-line no-console
  console.log(msg.trim() + "\n");
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { _pos: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--in") args.in = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--top") args.top = argv[++i];
    else if (a === "--min-edge") args.minEdge = argv[++i];
    else if (a === "--timeline") args.timeline = argv[++i];
    else if (a === "--creditor-threshold") args.creditorThreshold = argv[++i];
    else if (a === "--max") args.max = argv[++i];
    else if (a.startsWith("-")) args._pos.push(a);
    else args._pos.push(a);
  }
  return args;
}

function normalizeTimelineMode(mode) {
  const m = String(mode || "summary").trim().toLowerCase();
  if (m === "off" || m === "false" || m === "0" || m === "none") return "off";
  return "summary";
}

function ensureDir(absDir) {
  fs.mkdirSync(absDir, { recursive: true });
}

function stampDirName() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function toDayKey(tsMs) {
  const ms = Number.isFinite(tsMs) ? tsMs : Date.now();
  return new Date(ms).toISOString().slice(0, 10);
}

function isBotMessage(msg) {
  if (!msg || typeof msg !== "object") return false;
  if (msg.bot && typeof msg.bot === "object") return true;
  if (msg.user && typeof msg.user === "object" && msg.user.name && String(msg.user.name).startsWith("wf_bot_")) return true;
  return false;
}

function addCount(map, key, inc = 1) {
  map.set(key, (map.get(key) || 0) + inc);
}

function addNestedCount(nested, a, b, inc = 1) {
  const m = nested.get(a) || new Map();
  m.set(b, (m.get(b) || 0) + inc);
  nested.set(a, m);
}

function mapToObject(map) {
  const obj = {};
  for (const [k, v] of map.entries()) obj[k] = v;
  return obj;
}

function nestedToObject(nested) {
  const obj = {};
  for (const [a, m] of nested.entries()) obj[a] = mapToObject(m);
  return obj;
}

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`;
  return s;
}

function writeCsv(absFile, header, rows) {
  ensureDir(path.dirname(absFile));
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) lines.push(r.map(csvEscape).join(","));
  fs.writeFileSync(absFile, lines.join("\n") + "\n", "utf8");
}

function topEntries(map, { top = 50, min = 1 } = {}) {
  const entries = [...map.entries()].filter(([, v]) => v >= min);
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, top);
}

function buildDot({ userChannel, userUserMentions, channelCreditor, users, channels, creditors, top, minEdge, creditorThreshold }) {
  const lines = [];
  lines.push("digraph SlackGraph {");
  lines.push('  graph [rankdir=LR, bgcolor="white"];');
  lines.push('  node [shape=box, style="rounded,filled", fillcolor="#f8fafc", color="#94a3b8", fontname="Inter"];');
  lines.push('  edge [color="#94a3b8", fontname="Inter"];');

  // Nodes: channels
  lines.push("\n  // Channels");
  for (const [name, ch] of channels.entries()) {
    const id = `ch_${name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    lines.push(`  ${id} [label="#${name}", fillcolor="#eef2ff"];`);
    ch._dotId = id;
  }

  // Nodes: users
  lines.push("\n  // Users");
  for (const [uid, u] of users.entries()) {
    const id = `u_${uid.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    const label = u.display || u.name || uid;
    const fill = u.isBot ? "#ecfeff" : "#f0fdf4";
    lines.push(`  ${id} [label=${JSON.stringify(label)}, fillcolor="${fill}"];`);
    u._dotId = id;
  }

  // Nodes: creditors (only those with enough hits)
  const creditorHits = new Map();
  for (const [, m] of channelCreditor.entries()) {
    for (const [c, v] of m.entries()) addCount(creditorHits, c, v);
  }
  const eligibleCreditors = topEntries(creditorHits, { top: 1000, min: creditorThreshold }).map(([c]) => c);
  const creditorSet = new Set(eligibleCreditors);

  if (creditorSet.size) {
    lines.push("\n  // Creditors");
    for (const c of eligibleCreditors) {
      const id = `cr_${c.replace(/[^a-zA-Z0-9_]/g, "_")}`;
      const label = creditors.get(c)?.label || c;
      lines.push(`  ${id} [label=${JSON.stringify(label)}, fillcolor="#fff7ed"];`);
      creditors.get(c)._dotId = id;
    }
  }

  // Edges: user -> channel
  lines.push("\n  // User -> Channel posting");
  const userChannelFlat = new Map();
  for (const [u, m] of userChannel.entries()) {
    for (const [ch, v] of m.entries()) userChannelFlat.set(`${u}::${ch}`, v);
  }
  for (const [k, v] of topEntries(userChannelFlat, { top, min: minEdge })) {
    const [uid, ch] = k.split("::");
    const u = users.get(uid);
    const c = channels.get(ch);
    if (!u || !c) continue;
    lines.push(`  ${u._dotId} -> ${c._dotId} [label="${v}"];`);
  }

  // Edges: user -> user (mentions)
  lines.push("\n  // User -> User mentions");
  const mentionFlat = new Map();
  for (const [u, m] of userUserMentions.entries()) {
    for (const [u2, v] of m.entries()) mentionFlat.set(`${u}::${u2}`, v);
  }
  for (const [k, v] of topEntries(mentionFlat, { top: Math.floor(top / 2), min: Math.max(2, minEdge) })) {
    const [from, to] = k.split("::");
    const u = users.get(from);
    const vU = users.get(to);
    if (!u || !vU) continue;
    lines.push(`  ${u._dotId} -> ${vU._dotId} [label="@${v}", color="#64748b"];`);
  }

  // Edges: channel -> creditor
  if (creditorSet.size) {
    lines.push("\n  // Channel -> Creditor mentions");
    const ccFlat = new Map();
    for (const [ch, m] of channelCreditor.entries()) {
      for (const [cred, v] of m.entries()) {
        if (!creditorSet.has(cred)) continue;
        ccFlat.set(`${ch}::${cred}`, v);
      }
    }

    for (const [k, v] of topEntries(ccFlat, { top: Math.floor(top / 2), min: minEdge })) {
      const [ch, cred] = k.split("::");
      const c = channels.get(ch);
      const cr = creditors.get(cred);
      if (!c || !cr) continue;
      lines.push(`  ${c._dotId} -> ${cr._dotId} [label="${v}", color="#f97316"];`);
    }
  }

  lines.push("}");
  return lines.join("\n") + "\n";
}

function pickActorKey(msg) {
  const actor = msg?.actor || null;
  const user = msg?.user?.id || null;
  const bot = msg?.bot?.id || null;
  if (user) return `user:${user}`;
  if (bot) return `bot:${bot}`;
  if (actor) return `name:${actor}`;
  return "unknown";
}

function normalizeCreditorKey(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function extractMentions(text) {
  const s = String(text || "");
  const out = new Set();
  const re = /<@([A-Z0-9]+)>/g;
  let m;
  while ((m = re.exec(s))) out.add(m[1]);
  return [...out];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage(0);

  const inArg = args.in || args._pos[0];
  if (!inArg) {
    // eslint-disable-next-line no-console
    console.error("Missing --in <slack_ingest.jsonl>\n");
    usage(2);
  }

  const inputPath = path.isAbsolute(inArg) ? inArg : path.resolve(process.cwd(), inArg);
  if (!fs.existsSync(inputPath)) {
    // eslint-disable-next-line no-console
    console.error(`Input file not found: ${inputPath}`);
    process.exit(2);
  }

  const top = args.top != null ? Math.max(20, Math.floor(Number(args.top))) : 200;
  const minEdge = args.minEdge != null ? Math.max(1, Math.floor(Number(args.minEdge))) : 2;
  const creditorThreshold = args.creditorThreshold != null ? Math.max(1, Math.floor(Number(args.creditorThreshold))) : 3;
  const timelineMode = normalizeTimelineMode(args.timeline);
  const max = args.max != null ? Math.max(1, Math.floor(Number(args.max))) : null;
  const dryRun = Boolean(args.dryRun);

  const outDir = (() => {
    const o = args.out ? String(args.out).trim() : "";
    if (!o) return path.join(process.cwd(), "runs", "slack_graph", stampDirName());
    return path.isAbsolute(o) ? o : path.resolve(process.cwd(), o);
  })();

  const latestDir = path.join(process.cwd(), "runs", "slack_graph", "latest");

  const users = new Map(); // key is user-id string
  const channels = new Map(); // key is channel-name
  const creditors = new Map(); // key is normalized creditor name

  const userChannel = new Map(); // userId -> (channelName -> count)
  const userUserMentions = new Map(); // userId -> (userId -> count)
  const channelDay = new Map(); // channelName -> (YYYY-MM-DD -> count)
  const actorDay = new Map(); // actorKey -> (YYYY-MM-DD -> count)
  const botMatrix = new Map(); // botOrHumanKey -> (channelName -> count)
  const channelCreditor = new Map(); // channelName -> (creditorKey -> count)
  const creditorDay = new Map(); // creditorKey -> (YYYY-MM-DD -> count)

  const evidenceNeedles = [
    /cfpb/i,
    /fcc/i,
    /dispute/i,
    /billing/i,
    /executive\s+relations/i,
    /suspend|suspension|disconnect|interruption/i,
    /payment|paid|charge|refund/i,
    /notice of fault/i,
    /debt validation/i,
  ];

  const evidenceIndex = [];

  let messagesProcessed = 0;
  let messagesWithActor = 0;
  let messagesFlaggedEvidence = 0;
  let minTs = null;
  let maxTs = null;

  if (!dryRun && timelineMode !== "off") {
    appendTimelineEvent({
      type: "slack.graph.build.started",
      title: "Slack graph build started",
      message: path.relative(process.cwd(), inputPath),
      data: { input: inputPath, outDir },
    });
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const row = safeJsonParse(line);
    if (!row) continue;

    const msg = row.message || {};
    const channelName = row.channel?.name ? String(row.channel.name) : null;
    if (!channelName) continue;

    channels.set(channelName, channels.get(channelName) || { name: channelName });

    const tsMs = Number.isFinite(msg.ts_ms) ? msg.ts_ms : null;
    if (tsMs != null) {
      minTs = minTs == null ? tsMs : Math.min(minTs, tsMs);
      maxTs = maxTs == null ? tsMs : Math.max(maxTs, tsMs);
    }

    const dayKey = toDayKey(tsMs);
    addNestedCount(channelDay, channelName, dayKey, 1);

    const actorKey = pickActorKey(msg);
    addNestedCount(actorDay, actorKey, dayKey, 1);

    const isBot = isBotMessage(msg);

    // Build user map: only for actual Slack user IDs.
    const userId = msg.user?.id ? String(msg.user.id) : null;
    const userName = msg.user?.display_name || msg.user?.real_name || msg.user?.name || null;

    if (userId) {
      users.set(
        userId,
        users.get(userId) || {
          id: userId,
          name: msg.user?.name || null,
          display: userName,
          isBot: false,
        }
      );

      addNestedCount(userChannel, userId, channelName, 1);

      const mentions = extractMentions(msg.text);
      for (const mId of mentions) {
        if (!mId || mId === userId) continue;
        users.set(users.get(mId)?.id || mId, users.get(mId) || { id: mId, name: null, display: null, isBot: false });
        addNestedCount(userUserMentions, userId, mId, 1);
      }

      messagesWithActor += 1;
    }

    // Bot behavior matrix: key on actor string.
    const actorLabel = msg.actor || msg.user?.display_name || msg.user?.real_name || msg.user?.name || msg.bot?.name || null;
    const actorMatrixKey = isBot ? `bot:${actorLabel || actorKey}` : `human:${actorLabel || actorKey}`;
    addNestedCount(botMatrix, actorMatrixKey, channelName, 1);

    // Creditor hits
    const text = String(msg.text || "");
    const classification = classifyCreditor(text);
    const creditorName = classification?.name ? String(classification.name).trim() : null;
    if (creditorName) {
      const credKey = normalizeCreditorKey(creditorName);
      const label = creditorName;
      creditors.set(credKey, creditors.get(credKey) || { key: credKey, label, type: classification.type || null, risk: classification.risk || null });
      addNestedCount(channelCreditor, channelName, credKey, 1);
      addNestedCount(creditorDay, credKey, dayKey, 1);
    }

    // Evidence pack
    const isEvidence = evidenceNeedles.some((re) => re.test(text)) || Boolean(creditorName);
    if (isEvidence) {
      messagesFlaggedEvidence += 1;
      evidenceIndex.push({
        ts_ms: tsMs,
        iso: msg.iso || (tsMs != null ? new Date(tsMs).toISOString() : null),
        channel: channelName,
        actor: actorLabel,
        creditor: creditorName,
        text: text.length > 240 ? text.slice(0, 239) + "…" : text,
        thread_ts: msg.thread_ts || null,
        message_ts: msg.ts || null,
      });
    }

    messagesProcessed += 1;
    if (max != null && messagesProcessed >= max) break;
  }

  // Summaries
  const dateRange = {
    minTs,
    maxTs,
    minIso: minTs != null ? new Date(minTs).toISOString() : null,
    maxIso: maxTs != null ? new Date(maxTs).toISOString() : null,
  };

  const channelTotals = new Map();
  for (const [ch, m] of channelDay.entries()) {
    let total = 0;
    for (const v of m.values()) total += v;
    channelTotals.set(ch, total);
  }

  const creditorTotals = new Map();
  for (const [c, m] of creditorDay.entries()) {
    let total = 0;
    for (const v of m.values()) total += v;
    creditorTotals.set(c, total);
  }

  evidenceIndex.sort((a, b) => (a.ts_ms || 0) - (b.ts_ms || 0));

  const graph = {
    ok: true,
    generatedAt: new Date().toISOString(),
    input: {
      path: path.relative(process.cwd(), inputPath),
      messagesProcessed,
      dateRange,
    },
    nodes: {
      users: [...users.values()].map(({ id, name, display, isBot: b }) => ({ id, name, display, isBot: b })),
      channels: [...channels.values()].map(({ name }) => ({ name })),
      creditors: [...creditors.values()],
    },
    edges: {
      userChannel: nestedToObject(userChannel),
      userUserMentions: nestedToObject(userUserMentions),
      channelCreditor: nestedToObject(channelCreditor),
    },
    metrics: {
      channels: { count: channels.size, totals: mapToObject(channelTotals) },
      creditors: { count: creditors.size, totals: mapToObject(creditorTotals) },
      evidence: { count: evidenceIndex.length },
    },
  };

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ok: true, dryRun: true, messagesProcessed, dateRange, channels: channels.size, users: users.size, creditors: creditors.size }, null, 2));
    return;
  }

  ensureDir(outDir);

  const graphJsonPath = path.join(outDir, "graph.json");
  const graphDotPath = path.join(outDir, "graph.dot");

  const outCreditorsJson = path.join(outDir, "credit_hit_intensity.json");
  const outCreditorsCsv = path.join(outDir, "credit_hit_intensity.csv");

  const outHeatmapCsv = path.join(outDir, "channel_activity_heatmap.csv");
  const outBotCsv = path.join(outDir, "bot_behavior_matrix.csv");

  const outEvidenceCsv = path.join(outDir, "paralegal_evidence_index.csv");
  const outEvidenceJsonl = path.join(outDir, "paralegal_evidence_pack.jsonl");

  safeWriteJson(graphJsonPath, graph);
  fs.writeFileSync(
    graphDotPath,
    buildDot({ userChannel, userUserMentions, channelCreditor, users, channels, creditors, top, minEdge, creditorThreshold }),
    "utf8"
  );

  // Credit hit intensity CSV/JSON
  const creditorRows = [];
  for (const [credKey, total] of topEntries(creditorTotals, { top: 1000, min: 1 })) {
    const cred = creditors.get(credKey);
    creditorRows.push([cred?.label || credKey, credKey, cred?.type || "", cred?.risk || "", total]);
  }
  safeWriteJson(outCreditorsJson, {
    ok: true,
    generatedAt: graph.generatedAt,
    dateRange,
    totals: mapToObject(creditorTotals),
    creditors: graph.nodes.creditors,
  });
  writeCsv(outCreditorsCsv, ["creditor", "key", "type", "risk", "hits"], creditorRows);

  // Channel activity heatmap
  const heatRows = [];
  const channelDayObj = nestedToObject(channelDay);
  for (const [ch, days] of Object.entries(channelDayObj)) {
    for (const [day, count] of Object.entries(days)) heatRows.push([day, ch, count]);
  }
  heatRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])));
  writeCsv(outHeatmapCsv, ["day", "channel", "messages"], heatRows);

  // Bot behavior matrix
  const botRows = [];
  const botObj = nestedToObject(botMatrix);
  for (const [actor, channelsObj] of Object.entries(botObj)) {
    for (const [ch, count] of Object.entries(channelsObj)) botRows.push([actor, ch, count]);
  }
  botRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])));
  writeCsv(outBotCsv, ["actor", "channel", "messages"], botRows);

  // Paralegal evidence pack
  writeCsv(outEvidenceCsv, ["iso", "channel", "actor", "creditor", "text", "thread_ts", "message_ts"], evidenceIndex.map((e) => [e.iso || "", e.channel, e.actor || "", e.creditor || "", e.text || "", e.thread_ts || "", e.message_ts || ""]));
  ensureDir(path.dirname(outEvidenceJsonl));
  fs.writeFileSync(outEvidenceJsonl, evidenceIndex.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");

  // Update runs/slack_graph/latest/*
  ensureDir(latestDir);
  for (const file of [
    [graphJsonPath, path.join(latestDir, "graph.json")],
    [graphDotPath, path.join(latestDir, "graph.dot")],
    [outCreditorsJson, path.join(latestDir, "credit_hit_intensity.json")],
    [outCreditorsCsv, path.join(latestDir, "credit_hit_intensity.csv")],
    [outHeatmapCsv, path.join(latestDir, "channel_activity_heatmap.csv")],
    [outBotCsv, path.join(latestDir, "bot_behavior_matrix.csv")],
    [outEvidenceCsv, path.join(latestDir, "paralegal_evidence_index.csv")],
    [outEvidenceJsonl, path.join(latestDir, "paralegal_evidence_pack.jsonl")],
  ]) {
    fs.copyFileSync(file[0], file[1]);
  }

  if (timelineMode !== "off") {
    appendTimelineEvent({
      type: "slack.graph.build.completed",
      title: "Slack graph build completed",
      message: `${messagesProcessed} messages processed`,
      data: {
        input: path.relative(process.cwd(), inputPath),
        outDir: path.relative(process.cwd(), outDir),
        users: users.size,
        channels: channels.size,
        creditors: creditors.size,
        evidence: evidenceIndex.length,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        outDir: path.relative(process.cwd(), outDir),
        latestDir: path.relative(process.cwd(), latestDir),
        messagesProcessed,
        users: users.size,
        channels: channels.size,
        creditors: creditors.size,
        evidence: evidenceIndex.length,
      },
      null,
      2
    )
  );
}

main();
