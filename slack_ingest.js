import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appendJsonl, safeWriteJson } from "./ui/services/jsonlStore.js";
import { appendTimelineEvent } from "./ui/core/timelineStore.js";

function usage(exitCode = 0) {
  const msg = `
SintraPrime Slack Export Ingest

Usage:
  node ./slack_ingest.js --root <slack-export-dir> [options]

Options:
  --root <dir>                 Path to UNZIPPED Slack export folder (contains users.json, channels.json)
  --out <file>                 Output JSONL path (default: runs/slack_export_ingest_<ts>.jsonl)
  --timeline <messages|summary|off>
                               Append to runs/timeline.jsonl (default: messages)
  --channels <c1,c2,...>        Only ingest these channel folder names
  --after <YYYY-MM-DD|ISO>      Only include messages on/after this date
  --before <YYYY-MM-DD|ISO>     Only include messages before this date
  --max <n>                     Stop after ingesting n messages (across all channels)
  --dry-run                     Parse + count only; do not write any files
  -h, --help                    Show help

Examples:
  node ./slack_ingest.js --root "C:\\SlackExport"
  node ./slack_ingest.js --root . --timeline summary --max 5000
  npm run -s slack:ingest -- --root "C:\\SlackExport\\all-ikesolutions" --channels "general,random"
`;
  // eslint-disable-next-line no-console
  console.log(msg.trim() + "\n");
  process.exit(exitCode);
}

function parseDateMs(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  // Allow YYYY-MM-DD shorthand
  const d = v.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T00:00:00Z") : new Date(v);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function parseTsMs(ts) {
  // Slack export timestamps are usually strings like "1712345678.123456"
  const n = typeof ts === "number" ? ts : Number.parseFloat(String(ts || ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1000);
}

function pickDisplayName(user) {
  if (!user || typeof user !== "object") return null;
  const profile = user.profile && typeof user.profile === "object" ? user.profile : null;
  const display = profile && typeof profile.display_name === "string" ? profile.display_name.trim() : "";
  if (display) return display;
  const real = profile && typeof profile.real_name === "string" ? profile.real_name.trim() : "";
  if (real) return real;
  const name = typeof user.name === "string" ? user.name.trim() : "";
  if (name) return name;
  return null;
}

function safeReadJson(absFile) {
  try {
    return JSON.parse(fs.readFileSync(absFile, "utf8"));
  } catch {
    return null;
  }
}

function isDirectory(absPath) {
  try {
    return fs.statSync(absPath).isDirectory();
  } catch {
    return false;
  }
}

function listJsonFiles(absDir) {
  try {
    return fs
      .readdirSync(absDir)
      .filter((f) => f.toLowerCase().endsWith(".json"))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function parseArgs(argv) {
  const args = { _pos: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--root") args.root = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--timeline") args.timeline = argv[++i];
    else if (a === "--channels") args.channels = argv[++i];
    else if (a === "--after") args.after = argv[++i];
    else if (a === "--before") args.before = argv[++i];
    else if (a === "--max") args.max = argv[++i];
    else if (a.startsWith("-")) {
      // unknown flag
      args._pos.push(a);
    } else {
      args._pos.push(a);
    }
  }
  return args;
}

function normalizeTimelineMode(mode) {
  const m = String(mode || "messages").trim().toLowerCase();
  if (m === "off" || m === "false" || m === "0" || m === "none") return "off";
  if (m === "summary") return "summary";
  return "messages";
}

function resolveOutPath(repoRoot, outArg) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultRel = path.join("runs", `slack_export_ingest_${stamp}.jsonl`);
  const out = outArg ? String(outArg).trim() : "";
  if (!out) return path.join(repoRoot, defaultRel);
  return path.isAbsolute(out) ? out : path.join(repoRoot, out);
}

function truncateText(text, maxLen = 240) {
  const s = typeof text === "string" ? text : "";
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "…";
}

function main() {
  const repoScriptPath = fileURLToPath(import.meta.url);
  const repoRoot = path.dirname(repoScriptPath);
  const originalCwd = process.cwd();

  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage(0);

  // Allow positional root
  const rootArg = args.root || args._pos[0];
  if (!rootArg) {
    // eslint-disable-next-line no-console
    console.error("Missing --root <slack-export-dir> (or pass as first positional argument).\n");
    usage(2);
  }

  const exportRoot = path.isAbsolute(rootArg) ? rootArg : path.resolve(originalCwd, rootArg);

  // Force writes (timeline + runs) into repo root regardless of invocation directory.
  process.chdir(repoRoot);

  const usersPath = path.join(exportRoot, "users.json");
  const channelsPath = path.join(exportRoot, "channels.json");

  if (!fs.existsSync(usersPath) || !fs.existsSync(channelsPath)) {
    // eslint-disable-next-line no-console
    console.error(
      [
        "Slack export is missing required files:",
        `  users.json: ${usersPath} (${fs.existsSync(usersPath) ? "found" : "MISSING"})`,
        `  channels.json: ${channelsPath} (${fs.existsSync(channelsPath) ? "found" : "MISSING"})`,
        "",
        "Unzip the Slack export and point --root at the folder that contains users.json + channels.json.",
      ].join("\n")
    );
    process.exit(2);
  }

  const users = safeReadJson(usersPath);
  const channels = safeReadJson(channelsPath);
  if (!Array.isArray(users) || !Array.isArray(channels)) {
    // eslint-disable-next-line no-console
    console.error("users.json and channels.json must both be JSON arrays (Slack export format).\n");
    process.exit(2);
  }

  const userById = new Map();
  for (const u of users) {
    if (!u || typeof u !== "object") continue;
    if (typeof u.id !== "string" || !u.id.trim()) continue;
    userById.set(u.id, {
      id: u.id,
      name: typeof u.name === "string" ? u.name : null,
      real_name: u.profile && typeof u.profile.real_name === "string" ? u.profile.real_name : null,
      display_name: u.profile && typeof u.profile.display_name === "string" ? u.profile.display_name : null,
      profile: u.profile ?? null,
    });
  }

  const channelByName = new Map();
  const channelById = new Map();
  for (const c of channels) {
    if (!c || typeof c !== "object") continue;
    if (typeof c.name === "string" && c.name.trim()) channelByName.set(c.name, c);
    if (typeof c.id === "string" && c.id.trim()) channelById.set(c.id, c);
  }

  const channelFilter = new Set(
    String(args.channels || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const afterMs = parseDateMs(args.after);
  const beforeMs = parseDateMs(args.before);
  const maxMessages = args.max != null ? Math.max(1, Math.floor(Number(args.max))) : null;
  const timelineMode = normalizeTimelineMode(args.timeline);

  const outPath = resolveOutPath(repoRoot, args.out);
  const summaryPath = outPath.replace(/\.jsonl$/i, "") + ".summary.json";

  const topLevel = fs.readdirSync(exportRoot, { withFileTypes: true });
  const channelDirs = topLevel
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !name.startsWith("."))
    .filter((name) => (channelFilter.size ? channelFilter.has(name) : true))
    .filter((name) => isDirectory(path.join(exportRoot, name)))
    .sort((a, b) => a.localeCompare(b));

  if (!channelDirs.length) {
    // eslint-disable-next-line no-console
    console.error(
      [
        `No channel folders found under: ${exportRoot}`,
        "Expected Slack export format like:",
        "  <exportRoot>/users.json",
        "  <exportRoot>/channels.json",
        "  <exportRoot>/<channel-name>/*.json",
      ].join("\n")
    );
    process.exit(2);
  }

  const counters = {
    exportRoot,
    outPath,
    summaryPath,
    timelineMode,
    channelsSeen: 0,
    filesSeen: 0,
    messagesSeen: 0,
    messagesWritten: 0,
    messagesSkippedByDate: 0,
    messagesSkippedByLimit: 0,
    unknownUsers: 0,
    unknownUserIds: {},
    perChannel: {},
  };

  const dryRun = Boolean(args.dryRun);

  if (!dryRun && timelineMode !== "off") {
    appendTimelineEvent({
      type: "slack.export.ingest.started",
      title: "Slack export ingest started",
      message: `root=${exportRoot}`,
      data: { exportRoot, outPath, timelineMode },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Ingesting Slack export from: ${exportRoot}`);
  // eslint-disable-next-line no-console
  console.log(`Channels detected: ${channelDirs.length}`);
  // eslint-disable-next-line no-console
  console.log(dryRun ? "Mode: DRY RUN (no writes)" : `Output: ${outPath}`);

  for (const channelFolder of channelDirs) {
    const absChannelDir = path.join(exportRoot, channelFolder);
    const jsonFiles = listJsonFiles(absChannelDir);
    if (!jsonFiles.length) continue;

    counters.channelsSeen += 1;
    counters.perChannel[channelFolder] = counters.perChannel[channelFolder] || { files: 0, messages: 0 };

    for (const jf of jsonFiles) {
      const absFile = path.join(absChannelDir, jf);
      const arr = safeReadJson(absFile);
      counters.filesSeen += 1;
      counters.perChannel[channelFolder].files += 1;

      if (!Array.isArray(arr)) continue;

      for (const rawMsg of arr) {
        counters.messagesSeen += 1;

        if (maxMessages != null && counters.messagesWritten >= maxMessages) {
          counters.messagesSkippedByLimit += 1;
          break;
        }

        const tsMs = parseTsMs(rawMsg && rawMsg.ts);
        if (tsMs != null) {
          if (afterMs != null && tsMs < afterMs) {
            counters.messagesSkippedByDate += 1;
            continue;
          }
          if (beforeMs != null && tsMs >= beforeMs) {
            counters.messagesSkippedByDate += 1;
            continue;
          }
        }

        const userId = rawMsg && typeof rawMsg.user === "string" ? rawMsg.user : null;
        const user = userId ? userById.get(userId) : null;

        if (userId && !user) {
          counters.unknownUsers += 1;
          counters.unknownUserIds[userId] = (counters.unknownUserIds[userId] || 0) + 1;
        }

        const subtype = rawMsg && typeof rawMsg.subtype === "string" ? rawMsg.subtype : null;
        const botId = rawMsg && typeof rawMsg.bot_id === "string" ? rawMsg.bot_id : null;
        const botUsername = rawMsg && typeof rawMsg.username === "string" ? rawMsg.username : null;
        const botProfileName = rawMsg && rawMsg.bot_profile && typeof rawMsg.bot_profile.name === "string" ? rawMsg.bot_profile.name : null;

        const actor = user ? pickDisplayName(user) : botProfileName || botUsername || null;

        const threadTs = rawMsg && typeof rawMsg.thread_ts === "string" ? rawMsg.thread_ts : null;

        const normalized = {
          source: "slack_export",
          exportRoot,
          channel: {
            name: channelFolder,
            id:
              (channelByName.get(channelFolder) && channelByName.get(channelFolder).id) ||
              (rawMsg && typeof rawMsg.channel === "string" ? rawMsg.channel : null) ||
              null,
          },
          message: {
            ts: rawMsg && rawMsg.ts != null ? String(rawMsg.ts) : null,
            ts_ms: tsMs,
            iso: tsMs != null ? new Date(tsMs).toISOString() : null,
            type: rawMsg && typeof rawMsg.type === "string" ? rawMsg.type : null,
            subtype,
            user: user
              ? {
                  id: user.id,
                  name: user.name,
                  display_name: user.display_name,
                  real_name: user.real_name,
                }
              : userId
                ? { id: userId, name: null, display_name: null, real_name: null }
                : null,
            bot: botId || botUsername || botProfileName ? { id: botId, name: botProfileName || botUsername || null } : null,
            actor,
            text: rawMsg && typeof rawMsg.text === "string" ? rawMsg.text : "",
            thread_ts: threadTs,
            reply_count: rawMsg && typeof rawMsg.reply_count === "number" ? rawMsg.reply_count : null,
            reply_users_count: rawMsg && typeof rawMsg.reply_users_count === "number" ? rawMsg.reply_users_count : null,
            client_msg_id: rawMsg && typeof rawMsg.client_msg_id === "string" ? rawMsg.client_msg_id : null,
          },
          raw: {
            // Keep a constrained raw payload to avoid gigantic writes.
            reactions: rawMsg && Array.isArray(rawMsg.reactions) ? rawMsg.reactions : null,
            files: rawMsg && Array.isArray(rawMsg.files) ? rawMsg.files : null,
            blocks: rawMsg && Array.isArray(rawMsg.blocks) ? rawMsg.blocks : null,
          },
        };

        counters.perChannel[channelFolder].messages += 1;

        if (!dryRun) {
          appendJsonl(outPath, normalized);
          counters.messagesWritten += 1;

          if (timelineMode === "messages") {
            appendTimelineEvent({
              ts: tsMs != null ? tsMs : Date.now(),
              type: "slack.export.message",
              title: `#${channelFolder}`,
              message: `${actor || "unknown"}: ${truncateText(normalized.message.text)}`,
              data: {
                channel: normalized.channel,
                message: {
                  ts: normalized.message.ts,
                  ts_ms: normalized.message.ts_ms,
                  iso: normalized.message.iso,
                  subtype: normalized.message.subtype,
                  thread_ts: normalized.message.thread_ts,
                  user: normalized.message.user,
                  bot: normalized.message.bot,
                },
              },
            });
          }
        }
      }

      if (maxMessages != null && counters.messagesWritten >= maxMessages) break;
    }

    if (!dryRun && timelineMode === "summary") {
      const ch = counters.perChannel[channelFolder];
      appendTimelineEvent({
        type: "slack.export.channel.ingested",
        title: `Ingested #${channelFolder}`,
        message: `${ch.messages} messages (${ch.files} files)`,
        data: { channel: channelFolder, ...ch },
      });
    }

    if (maxMessages != null && counters.messagesWritten >= maxMessages) break;
  }

  if (!dryRun) {
    safeWriteJson(summaryPath, counters);

    if (timelineMode !== "off") {
      appendTimelineEvent({
        type: "slack.export.ingest.completed",
        title: "Slack export ingest completed",
        message: `${counters.messagesWritten} messages written`,
        data: {
          exportRoot,
          outPath,
          summaryPath,
          messagesSeen: counters.messagesSeen,
          messagesWritten: counters.messagesWritten,
          channelsSeen: counters.channelsSeen,
          filesSeen: counters.filesSeen,
          unknownUsers: counters.unknownUsers,
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log("\nDone.");
  // eslint-disable-next-line no-console
  console.log(`Messages seen: ${counters.messagesSeen}`);
  // eslint-disable-next-line no-console
  console.log(`Messages written: ${counters.messagesWritten}${dryRun ? " (dry-run)" : ""}`);
  // eslint-disable-next-line no-console
  console.log(`Channels processed: ${counters.channelsSeen}`);
  // eslint-disable-next-line no-console
  console.log(`Unknown user IDs: ${Object.keys(counters.unknownUserIds).length}`);
  if (!dryRun) {
    // eslint-disable-next-line no-console
    console.log(`\nWrote:\n  ${outPath}\n  ${summaryPath}`);
  }
}

main();
