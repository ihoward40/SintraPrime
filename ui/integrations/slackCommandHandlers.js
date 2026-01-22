import { eventBus } from "../core/eventBus.js";
import { SlackClient } from "../services/SlackClient.js";
import { synthesizeAndSendToSlack } from "../services/elevenlabs-speech.js";
import { shouldSendVoice, parseVoiceModeArgs, setVoicePrefForUser, setVoicePrefForChannel } from "../core/voicePrefs.js";
import { searchWorkspace } from "../services/search.service.js";

let _openai = null;
async function getOpenAI() {
  if (_openai) return _openai;
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) return null;
  const mod = await import("openai");
  const OpenAI = mod?.default || mod?.OpenAI;
  _openai = new OpenAI({ apiKey: key });
  return _openai;
}

let slack = null;
function getSlack() {
  if (slack) return slack;
  slack = new SlackClient();
  return slack;
}

function on(eventName, handler) {
  eventBus.on(eventName, (payload) => {
    void (async () => {
      try {
        await handler(payload || {});
      } catch (e) {
        // Never let command handlers crash the process.
        // Slash command HTTP response is already sent; log for operator.
        // eslint-disable-next-line no-console
        console.error(`[slackCommandHandlers] ${eventName} failed:`, e);
      }
    })();
  });
}

function topicHelp(topic) {
  if (topic === "case") {
    return [
      "📘 *Case Command Help*",
      "Usage: `/sintra case <caseId>`",
      "",
      "Retrieves (when wired):",
      "• Case status",
      "• Current stage",
      "• Summary",
      "• Notion/Drive link",
    ].join("\n");
  }

  if (topic === "enforce") {
    return [
      "⚖️ *Enforcement Command Help*",
      "Usage: `/sintra enforce <creditor>`",
      "",
      "Triggers (when wired):",
      "• Enforcement intelligence layer",
      "• Status detection",
      "• Compliance checks",
      "• Slack channel updates",
    ].join("\n");
  }

  if (topic === "voice") {
    return [
      "🎤 *Voice Command Help*",
      "Usage: `/sintra voice <text>`",
      "",
      "Features:",
      "• Mythic voice routing",
      "• ElevenLabs synthesis",
      "• Slack MP3 reply",
    ].join("\n");
  }

  if (topic === "trust") {
    return ["📘 *Trust Command Help*", "Usage: `/sintra trust`", "", "Shows system/trust status (when wired)."].join("\n");
  }

  if (topic === "system") {
    return ["🧠 *System Command Help*", "Usage: `/sintra system`", "", "Shows runtime module status (when wired)."].join(
      "\n",
    );
  }

  if (topic === "governor") {
    return [
      "🛡️ *Governor Command Help*",
      "Usage:",
      "• `/sintra governor-check <type> <summary>`",
      "• `/sintra governor-rules <type>`",
      "• `/sintra governor-override <actionId> <approve|deny|throttle>` (logs a request; apply override in UI)",
    ].join("\n");
  }

  return null;
}

function fullHelp() {
  return [
    "📘 *SintraPrime Command Menu*",
    "Type commands directly in Slack using:",
    "`/sintra <command> <options>`",
    "",
    "• *Case Lookup*",
    "  `/sintra case <caseId>`",
    "  → Retrieves case status, stage, summary.",
    "",
    "• *Creditor Enforcement*",
    "  `/sintra enforce <creditor>`",
    "  → Runs Enforcement Intelligence Layer.",
    "",
    "• *Deadline*",
    "  `/sintra deadline list`",
    "  → Lists tracked deadlines (when wired).",
    "",
    "• *Mythic Voice Briefing*",
    "  `/sintra voice <text>`",
    "  → Narrates your text using mythic routing.",
    "",
    "• *Trust Navigator Status*",
    "  `/sintra trust`",
    "  → Shows Trust system health.",
    "",
    "• *System Diagnostic*",
    "  `/sintra system`",
    "  → Display internal module status.",
    "",
    "• *Autopilot Governor*",
    "  `/sintra governor-check <type> <summary>`",
    "  `/sintra governor-rules <type>`",
    "  `/sintra governor-override <actionId> <approve|deny|throttle>`",
    "  → Safety gate + audit trail for actions.",
    "",
    "• *Help Menu*",
    "  `/sintra help`",
    "  `/sintra help <case|enforce|voice|trust|system|governor>`",
    "  `/sintra brief <issue>`",
    "  `/sintra draft <issue>`",
    "  `/sintra next-step <case ref>`",
    "  → Shows this page.",
    "",
    "───────────────────────────",
    "🧠 *Tip:* Commands can be run in any channel where IkeBot is present.",
  ].join("\n");
}

function parseHelpVoice({ topic, args }) {
  const cleaned = Array.isArray(args) ? args.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean) : [];
  const t = String(topic || "").trim().toLowerCase();

  const personas = new Set(["oracle", "scribe", "scholar"]);
  const helpTopics = new Set(["case", "enforce", "voice", "trust", "system", "governor"]);

  let helpTopic = null;
  let persona = null;

  // Primary token can be either a help topic or a persona.
  if (t && personas.has(t)) {
    persona = t;
  } else if (t && helpTopics.has(t)) {
    helpTopic = t;
  }

  // Secondary token can be a persona: `/sintra help voice oracle`
  if (!persona && cleaned.length >= 2) {
    const maybe = cleaned[1];
    if (personas.has(maybe)) persona = maybe;
  }

  // If the first token is a persona and the second token is a topic, support `/sintra help oracle voice`
  if (!helpTopic && cleaned.length >= 2 && personas.has(cleaned[0]) && helpTopics.has(cleaned[1])) {
    helpTopic = cleaned[1];
    persona = cleaned[0];
  }

  return { helpTopic, persona };
}

function helpBriefingText() {
  return [
    "Welcome to SintraPrime, your interactive Howard Trust command console.",
    "",
    "Here is your available command set.",
    "",
    "Slash Sintra Case.",
    "Retrieve case statuses and summaries.",
    "",
    "Slash Sintra Enforce.",
    "Initiate creditor enforcement intelligence.",
    "",
    "Slash Sintra Voice.",
    "Generate mythic voice briefings in your chosen persona.",
    "",
    "Slash Sintra Trust.",
    "Check the operational status of the Howard Trust Navigator.",
    "",
    "Slash Sintra System.",
    "Get diagnostics and module health reports.",
    "",
    "And Slash Sintra Help.",
    "To hear this briefing again.",
    "",
    "SintraPrime is online.",
    "Awaiting your command.",
  ].join("\n");
}

on("cmd.help.show", async ({ channel, topic, args }) => {
  const s = getSlack();
  const { helpTopic, persona } = parseHelpVoice({ topic, args });
  const msg = helpTopic ? topicHelp(helpTopic) : null;

  // 1) TEXT HELP
  const posted = await s.sendText(channel, msg || fullHelp());
  const thread_ts = posted?.ts || null;

  // 2) VOICE HELP (MYTHIC UPGRADE)
  await synthesizeAndSendToSlack({
    text: helpBriefingText(),
    slackChannel: channel,
    title: "SintraPrime — Mythic Help Briefing",
    initial_comment: `🎤 *Mythic Voice Help Briefing (${String(persona || "oracle").toUpperCase()})*`,
    character: persona || "oracle",
    subdir: "help-briefings",
    outputDir: "output/audio",
    ...(thread_ts ? { thread_ts } : {}),
  });
});

on("cmd.case.lookup", async ({ channel, caseId }) => {
  const s = getSlack();
  const id = String(caseId || "").trim();
  if (!id) return s.sendText(channel, "❌ Missing caseId. Try: `/sintra case 1123`.");
  await s.sendText(
    channel,
    [
      `📁 *Case ${id}*`,
      "Status: (not yet wired)",
      "Stage: (not yet wired)",
      "Summary: Case lookup endpoint is installed; wire this handler to your case store next.",
    ].join("\n"),
  );
});

on("cmd.enforce.run", async ({ channel, creditor }) => {
  const s = getSlack();
  const c = String(creditor || "").trim();
  if (!c) return s.sendText(channel, "❌ Missing creditor. Try: `/sintra enforce verizon`.");
  await s.sendText(channel, `⚖️ Enforcement requested for *${c}* (handler stub — wire to enforcement engine).`);
  eventBus.emit("enforcement.event", {
    creditor: c,
    status: "Investigation Started",
    details: "Command invoked via Slack.",
  });
});

on("cmd.enforce.start", async ({ channel, creditor, caseId, strategy, initialDoc, user }) => {
  const c = String(creditor || "").trim();
  const id = String(caseId || "").trim();
  if (!c || !id) return;

  eventBus.emit("enforcement.chain.start", {
    creditor: c,
    caseId: id,
    strategy: String(strategy || "default"),
    initialDoc: String(initialDoc || "initial-notice"),
    channel: channel || undefined,
  });

  eventBus.emit("case.update", {
    channel: channel || undefined,
    caseId: id,
    title: "Enforcement Seeded via Slack",
    summary: `Started enforcement chain for ${c} (requested by ${String(user || "unknown")}).`,
  });
});

on("cmd.deadline", async ({ channel, subcommand }) => {
  const s = getSlack();
  const sub = String(subcommand || "list").trim().toLowerCase();
  await s.sendText(channel, `⏳ Deadline command '${sub}' received (handler stub — wire to scheduler/deadline store).`);
});

on("cmd.voice.brief", async ({ channel, text }) => {
  const t = String(text || "");
  if (!t.trim()) {
    const s = getSlack();
    return s.sendText(channel, "❌ Missing text. Try: `/sintra voice Explain today's game plan`.");
  }

  await synthesizeAndSendToSlack({
    text: t,
    slackChannel: channel,
    title: "Commanded Voice Briefing",
    subdir: "command-briefings",
  });
});

on("cmd.trust.status", async ({ channel }) => {
  const s = getSlack();
  await s.sendText(
    channel,
    [
      "📘 *Trust Navigator Status*",
      "Status: ONLINE",
      "Routing: Slack ⇢ SintraPrime ⇢ Everything",
      "Voice Engine: ENABLED (if ElevenLabs configured)",
      "Event Bus: ACTIVE",
    ].join("\n"),
  );
});

on("cmd.governor.rules", async ({ channel, type }) => {
  const s = getSlack();
  const t = String(type || "filing").trim().toLowerCase() || "filing";

  const { getGovernorRules } = await import("../intelligence/governorRules.js");
  const rules = await getGovernorRules(t);

  await s.sendText(
    channel,
    [
      `📜 *Governor Rules* — type: \`${t}\``,
      "```" + "\n" + JSON.stringify(rules, null, 2) + "\n" + "```",
    ].join("\n"),
  );
});

on("cmd.governor.check", async ({ channel, type, summary, user }) => {
  const s = getSlack();
  const t = String(type || "filing").trim().toLowerCase() || "filing";
  const text = String(summary || "").trim();

  const { evaluateGovernorRequest } = await import("../intelligence/governorEvaluate.js");
  const verdict = await evaluateGovernorRequest({ type: t, mode: "standard", payload: { summary: text, source: "slack" } });
  const violations = Array.isArray(verdict?.violations) && verdict.violations.length ? verdict.violations.join(", ") : "(none)";
  const alt = Array.isArray(verdict?.recommendedAlternative) && verdict.recommendedAlternative.length
    ? `\nAlternatives:\n• ${verdict.recommendedAlternative.join("\n• ")}`
    : "";

  await s.sendText(
    channel,
    [
      `🛡️ *Governor Check* — type: \`${t}\``,
      `Final: *${String(verdict?.final || "unknown").toUpperCase()}*`,
      `Reason: ${String(verdict?.reason || "") || "(n/a)"}`,
      `Violations: ${violations}`,
      alt,
    ].join("\n"),
  );
});

on("cmd.governor.override.request", async ({ channel, actionId, final, token, user }) => {
  const s = getSlack();
  const id = String(actionId || "").trim();
  const f = String(final || "").trim().toLowerCase();
  if (!id) return s.sendText(channel, "Usage: `/sintra governor-override <actionId> <approve|deny|throttle>`");
  if (!f || !["approve", "deny", "throttle"].includes(f)) {
    return s.sendText(channel, "Final must be one of: approve, deny, throttle.");
  }

  const overrideToken = String(process.env.SLACK_OVERRIDE_TOKEN || "").trim();
  if (!overrideToken) {
    return s.sendText(
      channel,
      "🧷 Override is admin-gated. Set SLACK_OVERRIDE_TOKEN to allow `/sintra governor-override <id> <final> <token>` to execute overrides from Slack.",
    );
  }
  if (String(token || "").trim() !== overrideToken) {
    return s.sendText(channel, "❌ Invalid override token.");
  }

  const { getPending, setDecision } = await import("../intelligence/governorState.js");
  const { eventBus } = await import("../core/eventBus.js");
  const pending = getPending(id);
  const decision = {
    actionId: id,
    final: f,
    reason: "slack_override",
    violations: [],
    sim: null,
    tribunal: null,
    decidedAt: new Date().toISOString(),
    request: pending?.req ?? null,
    override: { by: "slack", at: new Date().toISOString(), user: String(user || "unknown") },
  };
  setDecision(id, decision);
  eventBus.emit("governor.decision", decision);
  if (f === "approve") eventBus.emit("governor.action.approved", decision);
  else if (f === "deny") eventBus.emit("governor.action.denied", decision);
  else eventBus.emit("governor.action.throttled", decision);

  return s.sendText(channel, `✅ Override applied: \`${id}\` → *${f.toUpperCase()}*`);
});

on("cmd.system.report", async ({ channel }) => {
  const s = getSlack();
  await s.sendText(
    channel,
    [
      "🧠 *SintraPrime System Report*",
      "- UI server: RUNNING",
      "- Slack brainstem: ACTIVE",
      "- Slash commands: ACTIVE",
      "- Voice routes: ACTIVE",
    ].join("\n"),
  );
});

on("cmd.search", async ({ channel, query, user_id }) => {
  const s = getSlack();
  const q = String(query || "").trim();
  if (!q) return s.sendText(channel, "❌ Missing query. Try: `/sintra search ucc 9-102`.");

  const res = await searchWorkspace(q);
  if (!res.ok) return s.sendText(channel, "❌ Search failed.");

  const lines = [`🔎 *Search* — \`${q}\``];
  if (!res.results.length) {
    lines.push("No matches found (scanned docs/src/ui).");
  } else {
    for (const r of res.results) {
      lines.push(`• ${r.file}`);
      for (const m of r.matches || []) {
        lines.push(`  - L${m.line}: ${m.text}`);
      }
    }
  }

  const posted = await s.sendText(channel, lines.join("\n"));

  const vm = shouldSendVoice({ user_id, channel_id: channel });
  if (!vm.ok) return;

  const voiceText = res.results.length
    ? `I found ${res.results.length} matching files for ${q}. I've posted the highlights in this thread.`
    : `No matches found for ${q} in the scanned workspace areas. Try different keywords.`;

  await synthesizeAndSendToSlack({
    text: voiceText,
    slackChannel: channel,
    title: `Search Results — ${q}`,
    initial_comment: "🎤 *Search Results (Voice)*",
    character: vm.persona || "oracle",
    subdir: "search",
    outputDir: "output/audio",
    ...(posted?.ts ? { thread_ts: posted.ts } : {}),
  });
});

on("cmd.explain", async ({ channel, text, user_id }) => {
  const s = getSlack();
  const prompt = String(text || "").trim();
  if (!prompt) return s.sendText(channel, "❌ Missing text. Try: `/sintra explain UCC 3-603(b)`.");

  const client = await getOpenAI();
  if (!client) {
    return s.sendText(
      channel,
      "❌ OPENAI_API_KEY is not configured. Set it to enable `/sintra explain`, or I can wire this to a local model next.",
    );
  }

  const posted = await s.sendText(channel, "📘 Working…");

  const ai = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You are SintraPrime, an expert legal/financial AI for The Howard Trust. Be clear, concise, and action-oriented." },
      { role: "user", content: prompt },
    ],
  });

  const explanation = String(ai?.choices?.[0]?.message?.content || "").trim() || "(No explanation returned.)";

  const header = `📘 *Explanation*\nQuery: \`${prompt}\``;
  const msg = `${header}\n\n${explanation}`;
  const final = await s.sendText(channel, msg);

  const vm = shouldSendVoice({ user_id, channel_id: channel });
  if (!vm.ok) return;

  await synthesizeAndSendToSlack({
    text: explanation,
    slackChannel: channel,
    title: "Explanation (Voice)",
    initial_comment: "🎤 *Explanation (Voice)*",
    character: vm.persona || "scribe",
    subdir: "explain",
    outputDir: "output/audio",
    ...(final?.ts ? { thread_ts: final.ts } : posted?.ts ? { thread_ts: posted.ts } : {}),
  });
});

on("cmd.file.ingest", async ({ channel, input, user_id }) => {
  const s = getSlack();
  const raw = String(input || "").trim();

  const help = [
    "📁 *File Ingest*",
    "Slack slash commands cannot directly include file uploads.",
    "",
    "For now, do one of these:",
    "• Paste a file permalink or URL: `/sintra file <url>`",
    "• Or paste text describing what you uploaded and where it lives.",
    "",
    "Next upgrade (recommended): wire Slack Events `file_shared` so SintraPrime can auto-ingest uploads.",
  ].join("\n");

  const posted = await s.sendText(channel, raw ? `${help}\n\nInput: ${raw}` : help);

  const vm = shouldSendVoice({ user_id, channel_id: channel });
  if (!vm.ok) return;

  await synthesizeAndSendToSlack({
    text: "File ingest is ready. Send a file link and I will route it for classification when the ingest pipeline is wired.",
    slackChannel: channel,
    title: "File Ingest (Voice)",
    initial_comment: "🎤 *File Ingest (Voice)*",
    character: vm.persona || "oracle",
    subdir: "file-ingest",
    outputDir: "output/audio",
    ...(posted?.ts ? { thread_ts: posted.ts } : {}),
  });
});

on("cmd.voice.mode", async ({ channel, user, user_id, mode, args }) => {
  const s = getSlack();
  const parsed = parseVoiceModeArgs(args);

  // status
  if (parsed.mode === "status" || !parsed.mode) {
    const pref = shouldSendVoice({ user_id, channel_id: channel });
    return s.sendText(
      channel,
      `🎤 *Voice Mode*\nScope: *${pref.scope}*\nEnabled: *${pref.ok ? "on" : "off"}*\nPersona: *${pref.persona || "(auto)"}*`,
    );
  }

  let updated;
  if (parsed.scope === "channel") {
    updated = setVoicePrefForChannel(channel, parsed.mode);
  } else {
    updated = setVoicePrefForUser(user_id, parsed.mode);
  }

  await s.sendText(
    channel,
    `🎤 Voice mode set (*${updated.scope}*): *${updated.enabled ? "on" : "off"}*${updated.persona ? ` — persona: *${updated.persona}*` : ""}`,
  );

  if (updated.enabled) {
    await synthesizeAndSendToSlack({
      text: `Voice mode for ${String(user || "user")} is now set to ${updated.persona ? updated.persona : "on"}.`,
      slackChannel: channel,
      title: "Voice Mode Updated",
      initial_comment: "🎤 *Voice Mode Updated*",
      character: updated.persona || "oracle",
      subdir: "voice-mode",
      outputDir: "output/audio",
    });
  }
});
