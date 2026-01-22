import { eventBus } from "../core/eventBus.js";
import { registerPlaybooks } from "../playbooks/playbookLoader.js";
import "../intelligence/behaviorPredictionEngine.js";
import "../enforcement/adaptiveEnforcementAI.js";
// Side-effect imports: register additional autonomous subsystems
import "../intelligence/discoveryEngine.js";
import "../intelligence/creditorClassifier.js";
import "../documents/docGenerator.js";
import "../filings/draftFilingEngine.js";
import "../enforcement/enforcementChain.js";
import {
  checkOverdueCreditorResponses,
  scanTikTokLeads,
  runSystemDiagnostics,
  shouldRunDailyBriefing,
  generateDailyBriefingSummary,
  computeRiskScore,
} from "./autonomousChecks.js";

function enabled() {
  return String(process.env.AUTONOMOUS_ENABLED || process.env.SINTRA_AUTONOMOUS || "").trim() === "1";
}

function intervalMs() {
  const v = Number(process.env.AUTONOMOUS_INTERVAL_MS || "300000");
  if (!Number.isFinite(v) || v < 10_000) return 300_000;
  return v;
}

function defaultChannel() {
  return String(process.env.AUTONOMOUS_CHANNEL || "#all-ikesolutions").trim() || "#all-ikesolutions";
}

let started = false;
let lastDailyKey = null;

function dailyKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function tick() {
  const now = new Date();

  try {
    const overdue = await checkOverdueCreditorResponses();
    if (Array.isArray(overdue) && overdue.length) {
      for (const item of overdue) {
        eventBus.emit("enforcement.event", {
          channel: item?.channel || defaultChannel(),
          creditor: item?.creditor,
          status: "Overdue Response",
          details: "Creditor has exceeded statutory response time (autonomous detection).",
          link: item?.link,
        });

        eventBus.emit("briefing.voice", {
          channel: item?.channel || defaultChannel(),
          character: "judge",
          subdir: "autonomous/overdue",
          outputDir: "output/audio",
          title: "Autonomous Alert — Overdue Creditor Response",
          initial_comment: "🎤 *Autonomous Alert (Judge)*",
          text: `Creditor ${String(item?.creditor || "(unknown)")} failed to respond on time. Recommended action: Notice of Fault.`,
        });
      }
    }

    const leads = await scanTikTokLeads();
    if (leads && leads.new) {
      eventBus.emit("tiktok.lead", leads.new);
    }

    const diagnostics = await runSystemDiagnostics();
    if (!diagnostics?.ok) {
      eventBus.emit("system.error", {
        channel: defaultChannel(),
        source: "Autonomous Engine",
        error: diagnostics?.error || "diagnostics_failed",
        context: diagnostics?.context || null,
      });
    }

    // Daily briefing (once per day)
    const key = dailyKey(now);
    if (shouldRunDailyBriefing(now) && lastDailyKey !== key) {
      lastDailyKey = key;
      const briefingText = await generateDailyBriefingSummary({
        overdueCount: Array.isArray(overdue) ? overdue.length : 0,
        diagnosticsOk: Boolean(diagnostics?.ok),
      });

      eventBus.emit("case.update", {
        channel: defaultChannel(),
        caseId: "DAILY",
        title: "SintraPrime Daily Autonomous Briefing",
        summary: briefingText,
      });

      eventBus.emit("briefing.voice", {
        channel: defaultChannel(),
        character: "oracle",
        subdir: "autonomous/daily",
        outputDir: "output/audio",
        title: "Daily Briefing — SintraPrime Autonomous Mode",
        initial_comment: "🎤 *Daily Briefing (Oracle)*",
        text: briefingText,
      });
    }

    // Risk detector
    const risk = await computeRiskScore({ overdueItems: overdue, diagnostics, leads });
    if (risk.level === "high") {
      eventBus.emit("system.error", {
        channel: defaultChannel(),
        source: "Risk Detector",
        error: `High-risk event detected: ${risk.reason}`,
        context: risk.data,
      });

      eventBus.emit("briefing.voice", {
        channel: defaultChannel(),
        character: "dragon",
        subdir: "autonomous/risk",
        outputDir: "output/audio",
        title: "High Risk Detected — SintraPrime",
        initial_comment: "🎤 *High Risk Detected (Dragon)*",
        text: `High risk detected: ${risk.reason}. Immediate action recommended.`,
      });
    }
  } catch (err) {
    eventBus.emit("system.error", {
      channel: defaultChannel(),
      source: "Autonomous Engine Failure",
      error: String(err?.message || err),
      context: String(err?.stack || ""),
    });
  }
}

function start() {
  if (started) return;
  started = true;

  const ms = intervalMs();

  // Immediate tick so you know it's alive, then interval.
  eventBus.emit("autonomous.tick", { timestamp: Date.now(), boot: true });
  void tick();

  setInterval(() => {
    eventBus.emit("autonomous.tick", { timestamp: Date.now() });
    void tick();
  }, ms);

  eventBus.emit("case.update", {
    channel: defaultChannel(),
    caseId: "AUTO",
    title: "Autonomous Mode Enabled",
    summary: `Heartbeat: every ${Math.round(ms / 1000)}s`,
  });
}

// Register engine only when enabled.
if (enabled()) {
  // Register creditor-specific APPs (Autonomous Playbook Packs)
  registerPlaybooks(eventBus);
  start();
}

export const autonomousEngine = { start };
