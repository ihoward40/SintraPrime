import express from "express";
import { eventBus } from "../core/eventBus.js";
import { verifySlackRequest } from "../services/slack-signature.js";
import { getParalegalState } from "../services/paralegalState.js";

const router = express.Router();

// Slack slash commands are sent as application/x-www-form-urlencoded.
// Capture raw body so we can verify signatures.
router.use(
  express.urlencoded({
    extended: false,
    verify: (req, _res, buf) => {
      req.rawBody = buf?.toString("utf8") || "";
    },
  }),
);

const recent = new Map();
const dedupeWindowMs = 2 * 60 * 1000;

function dedupe(key) {
  const k = String(key || "").trim();
  if (!k) return false;

  const now = Date.now();
  for (const [rk, ts] of recent.entries()) {
    if (now - ts > dedupeWindowMs) recent.delete(rk);
  }

  if (recent.has(k)) return true;
  recent.set(k, now);
  return false;
}

function respondEphemeral(res, text) {
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(JSON.stringify({ response_type: "ephemeral", text: String(text || "") }));
}

function parseAction(text) {
  const raw = String(text || "").trim();
  if (!raw) return { action: "help", args: [] };

  // Support quoted args in a minimal way
  const tokens = raw.match(/"[^"]*"|\S+/g) || [];
  const cleaned = tokens.map((t) => (t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t));
  const action = String(cleaned.shift() || "help").toLowerCase();
  return { action, args: cleaned };
}

function formatParalegalSummary() {
  const state = getParalegalState();
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const cases = Array.isArray(state.cases) ? state.cases : [];
  const openTasks = tasks.filter((t) => String(t?.status || "").toLowerCase() !== "done");
  const openCases = cases.filter((c) => String(c?.status || "").toLowerCase() !== "closed");
  return `Paralegal OS: ${openTasks.length} open tasks, ${openCases.length} open cases. Use /paralegal tasks|cases or /case <id>.`;
}

router.post("/command", async (req, res) => {
  try {
    const signingSecret = process.env.SLACK_SIGNING_SECRET || "";
    const allowUnverified = String(process.env.SLACK_ALLOW_UNVERIFIED || "").trim() === "1";

    const ts = req.get("X-Slack-Request-Timestamp");
    const sig = req.get("X-Slack-Signature");
    const rawBody = req.rawBody || "";

    if (signingSecret) {
      const v = verifySlackRequest({
        signingSecret,
        rawBody,
        timestamp: ts,
        signature: sig,
      });
      if (!v.ok) return res.status(401).json({ ok: false, error: "invalid_slack_signature", reason: v.reason });
    } else if (!allowUnverified) {
      return res.status(503).json({
        ok: false,
        error: "missing_SLACK_SIGNING_SECRET",
        hint: "Set SLACK_SIGNING_SECRET or set SLACK_ALLOW_UNVERIFIED=1 for local testing.",
      });
    }

    // Slack retries if we don't respond fast enough.
    const retryNum = req.get("X-Slack-Retry-Num");
    if (retryNum) return respondEphemeral(res, "Retry ignored.");

    const body = req.body || {};
    const command = String(body.command || "/sintra");
    const text = String(body.text || "");
    const user_name = String(body.user_name || body.user_id || "unknown");
    const user_id = String(body.user_id || "");
    const channel_id = String(body.channel_id || "");
    const trigger_id = String(body.trigger_id || "");

    const { action, args } = parseAction(text);

    eventBus.emit("slack.command.received", {
      command,
      action,
      args,
      text,
      user: user_name,
      user_id,
      channel: channel_id,
      ts: new Date().toISOString(),
    });

    const dedupeKey = `${body.trigger_id || ""}:${channel_id}:${user_id}:${command}:${text}`;
    if (dedupe(dedupeKey)) return respondEphemeral(res, "Duplicate command ignored.");

    // Support multiple Slack slash commands mapped to the same endpoint.
    // For these, we treat the command itself as the primary router.
    if (command === "/paralegal") {
      const sub = action;
      if (sub === "help") return respondEphemeral(res, "Usage: /paralegal [summary|tasks|cases|case <id>]");
      if (sub === "summary") return respondEphemeral(res, formatParalegalSummary());
      if (sub === "tasks") {
        eventBus.emit("paralegal.tasks.list.requested", { channel: channel_id, user: user_name, user_id, args });
        return respondEphemeral(res, "Listing tasks… (see UI /api/paralegal/tasks)");
      }
      if (sub === "cases") {
        eventBus.emit("paralegal.cases.list.requested", { channel: channel_id, user: user_name, user_id, args });
        return respondEphemeral(res, "Listing cases… (see UI /api/paralegal/cases)");
      }
      if (sub === "case") {
        const caseId = String(args[0] || "").trim();
        if (!caseId) return respondEphemeral(res, "Usage: /paralegal case <caseId>");
        eventBus.emit("cmd.case.lookup", { channel: channel_id, caseId, user: user_name, user_id });
        return respondEphemeral(res, `Looking up case: ${caseId}`);
      }
      return respondEphemeral(res, formatParalegalSummary());
    }

    if (command === "/case") {
      // /case <caseId>
      // /case packet <caseId>
      // /case <caseId> packet
      const first = String(action || "").trim().toLowerCase();
      const second = String(args[0] || "").trim();
      if (first === "packet") {
        const caseKey = String(second || "").trim();
        if (!caseKey) return respondEphemeral(res, "Usage: /case packet <caseId>");
        eventBus.emit("paralegal.case.packet.requested", {
          caseKey,
          requestedAt: new Date().toISOString(),
          requestedBy: user_id || user_name,
          source: "slack",
          channel: channel_id,
        });
        return respondEphemeral(res, `Packet requested for case: ${caseKey}`);
      }

      const caseKey = first;
      const maybePacket = String(args[0] || "").trim().toLowerCase();
      if (!caseKey) return respondEphemeral(res, "Usage: /case <caseId> [packet]");
      if (maybePacket === "packet") {
        eventBus.emit("paralegal.case.packet.requested", {
          caseKey,
          requestedAt: new Date().toISOString(),
          requestedBy: user_id || user_name,
          source: "slack",
          channel: channel_id,
        });
        return respondEphemeral(res, `Packet requested for case: ${caseKey}`);
      }

      eventBus.emit("cmd.case.lookup", { channel: channel_id, caseId: caseKey, user: user_name, user_id });
      return respondEphemeral(res, `Looking up case: ${caseKey}`);
    }

    switch (action) {
      case "help": {
        const topic = String(args[0] || "").trim().toLowerCase() || null;
        eventBus.emit("cmd.help.show", { channel: channel_id, topic, args, user: user_name, user_id });
        return respondEphemeral(res, "📘 Pulling SintraPrime Help Menu…");
      }
      case "search": {
        const query = args.join(" ").trim();
        eventBus.emit("cmd.search", { channel: channel_id, query, user: user_name, user_id });
        return respondEphemeral(res, `🔎 Searching for: ${query || "(missing query)"}`);
      }
      case "explain": {
        const msg = args.join(" ").trim();
        eventBus.emit("cmd.explain", { channel: channel_id, text: msg, user: user_name, user_id });
        return respondEphemeral(res, "📘 Explaining…");
      }
      case "file": {
        // NOTE: Slack slash commands don't include file uploads. This is a stub hook.
        // Future: wire to Slack Events (file_shared) or accept a Slack file permalink.
        const raw = args.join(" ").trim();
        eventBus.emit("cmd.file.ingest", { channel: channel_id, user: user_name, user_id, input: raw, body: req.body });
        return respondEphemeral(res, "📁 Ready to process file input…");
      }
      case "voice-mode": {
        const mode = String(args[0] || "").trim().toLowerCase() || null;
        const scope = String(args[1] || "").trim().toLowerCase() || null;
        eventBus.emit("cmd.voice.mode", { channel: channel_id, user: user_name, user_id, mode, args, scope });
        return respondEphemeral(res, "🎤 Updating voice mode…");
      }
      case "case": {
        const caseId = args[0];
        eventBus.emit("cmd.case.lookup", { channel: channel_id, caseId, user: user_name, user_id });
        return respondEphemeral(res, `🔍 Looking up case \`${caseId || "(missing)"}\`…`);
      }
      case "enforce": {
        const creditor = args[0];
        eventBus.emit("cmd.enforce.run", { channel: channel_id, creditor, user: user_name, user_id });
        return respondEphemeral(res, `⚖️ Running enforcement query for *${creditor || "(missing)"}*…`);
      }
      case "enforce-start": {
        const creditor = String(args[0] || "").trim();
        const caseId = String(args[1] || "").trim();
        const strategy = String(args[2] || "").trim() || "default";
        const initialDoc = String(args[3] || "").trim() || "initial-notice";

        if (!creditor || !caseId) {
          return respondEphemeral(res, "Usage: `/sintra enforce-start <CreditorName> <CaseId> [strategy] [initialDoc]` ");
        }

        eventBus.emit("cmd.enforce.start", {
          channel: channel_id,
          creditor,
          caseId,
          strategy,
          initialDoc,
          user: user_name,
          user_id,
        });

        return respondEphemeral(res, `🚀 Enforcement chain initiated for *${creditor}* / *${caseId}*`);
      }
      case "deadline": {
        const sub = args[0] || "list";
        eventBus.emit("cmd.deadline", { channel: channel_id, subcommand: sub, args: args.slice(1), user: user_name, user_id });
        return respondEphemeral(res, `⏳ Deadline command received: *${sub}*…`);
      }
      case "voice": {
        const msg = args.join(" ");
        eventBus.emit("cmd.voice.brief", { channel: channel_id, text: msg, user: user_name, user_id });
        return respondEphemeral(res, "🎤 Generating mythic voice briefing…");
      }
      case "brief": {
        const body = args.join(" ").trim();
        eventBus.emit("paralegal.brief.requested", {
          body,
          text,
          user_name,
          user_id,
          channel_id,
          trigger_id,
          source: "slack",
        });
        return respondEphemeral(res, "📚 Legal brief requested. I’ll post results here shortly.");
      }
      case "draft": {
        const body = args.join(" ").trim();
        eventBus.emit("paralegal.draft.requested", {
          body,
          text,
          user_name,
          user_id,
          channel_id,
          trigger_id,
          source: "slack",
        });
        return respondEphemeral(res, "📝 Draft requested. I’ll return a proposed motion/notice.");
      }
      case "next-step": {
        const body = args.join(" ").trim();
        eventBus.emit("paralegal.nextstep.requested", {
          body,
          text,
          user_name,
          user_id,
          channel_id,
          trigger_id,
          source: "slack",
        });
        return respondEphemeral(res, "🧭 Next step requested. I’ll analyze and respond.");
      }
      case "trust": {
        eventBus.emit("cmd.trust.status", { channel: channel_id, user: user_name, user_id });
        return respondEphemeral(res, "📘 Retrieving Trust status…");
      }
      case "governor-check": {
        const known = new Set(["filing", "motion", "enforcement", "trade", "expense", "investment", "deadline"]);
        const first = String(args[0] || "").trim().toLowerCase();
        const type = known.has(first) ? first : "filing";
        const summary = known.has(first) ? args.slice(1).join(" ").trim() : args.join(" ").trim();
        eventBus.emit("cmd.governor.check", { channel: channel_id, type, summary, args, user: user_name, user_id });
        return respondEphemeral(res, `🛡️ Governor check submitted for type: *${type}*`);
      }
      case "governor-rules": {
        const type = String(args[0] || "filing").trim().toLowerCase() || "filing";
        eventBus.emit("cmd.governor.rules", { channel: channel_id, type, args, user: user_name, user_id });
        return respondEphemeral(res, `📜 Fetching Governor rules for: *${type}*…`);
      }
      case "governor-override": {
        const actionId = String(args[0] || "").trim();
        const final = String(args[1] || "approve").trim().toLowerCase() || "approve";
        const token = String(args[2] || "").trim();
        eventBus.emit("cmd.governor.override.request", { channel: channel_id, actionId, final, token, args, user: user_name, user_id });
        return respondEphemeral(res, `🧷 Override request queued for: \`${actionId || "(missing)"}\``);
      }
      case "system": {
        eventBus.emit("cmd.system.report", { channel: channel_id, user: user_name, user_id });
        return respondEphemeral(res, "🧠 Pulling SintraPrime system intel…");
      }
      default: {
        eventBus.emit("cmd.help.show", { channel: channel_id, topic: null, user: user_name, user_id });
        return respondEphemeral(res, `❓ Unknown command: '${action}'. Showing help…`);
      }
    }
  } catch (err) {
    return respondEphemeral(res, `❌ Error processing command: ${String(err?.message ?? err)}`);
  }
});

export default router;
