import fs from "node:fs";
import path from "node:path";

export async function checkOverdueCreditorResponses() {
  // Stub: wire to Notion/DB later.
  return [];
}

export async function scanTikTokLeads() {
  // Stub: wire to TikTok ingestion later.
  return { new: null };
}

export async function runSystemDiagnostics() {
  // Lightweight health check that does not reach external services.
  // Future: add real module checks (Notion/Drive/Make/Gmail connectors).
  try {
    const cwd = process.cwd();
    const runsDir = path.resolve(cwd, "runs");
    const controlDir = path.resolve(cwd, "control");

    const okRuns = fs.existsSync(runsDir);
    const okControl = fs.existsSync(controlDir);

    if (!okRuns) return { ok: false, error: "Missing runs/ directory", context: { runsDir } };
    if (!okControl) return { ok: false, error: "Missing control/ directory", context: { controlDir } };

    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), context: { stack: String(e?.stack || "") } };
  }
}

export function shouldRunDailyBriefing(now = new Date()) {
  const hour = Number(process.env.AUTONOMOUS_BRIEFING_HOUR || 9);
  const minute = Number(process.env.AUTONOMOUS_BRIEFING_MINUTE || 0);
  return now.getHours() === hour && now.getMinutes() >= minute;
}

export async function generateDailyBriefingSummary({ overdueCount = 0, diagnosticsOk = true } = {}) {
  return [
    "Daily Briefing from SintraPrime Autonomous Mode:",
    "",
    `• Enforcement overdue items: ${overdueCount}`,
    "• TikTok leads: scanning",
    "• Gmail disputes: (not yet wired)",
    `• Trust Navigator systems: ${diagnosticsOk ? "operational" : "degraded"}`,
  ].join("\n");
}

export async function computeRiskScore({ overdueItems = [], diagnostics = { ok: true }, leads = null } = {}) {
  const overdueCount = Array.isArray(overdueItems) ? overdueItems.length : 0;
  const diagOk = Boolean(diagnostics?.ok);

  let level = "low";
  const reasons = [];

  if (!diagOk) {
    level = "high";
    reasons.push("system_diagnostics_failed");
  }

  if (overdueCount >= 1 && level !== "high") {
    level = overdueCount >= 3 ? "high" : "medium";
    reasons.push("overdue_creditor_responses");
  }

  if (leads && leads.new && level === "low") {
    level = "medium";
    reasons.push("new_leads_detected");
  }

  const reason = reasons.length ? reasons.join(", ") : "no_material_risk";
  return { level, reason, data: { overdueCount, diagnosticsOk: diagOk } };
}
