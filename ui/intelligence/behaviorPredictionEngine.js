import fs from "node:fs/promises";
import path from "node:path";
import { eventBus } from "../core/eventBus.js";

function isEnabled() {
  return String(process.env.BEHAVIOR_PREDICTION_ENABLED || "").trim() === "1";
}

function getModel() {
  return String(process.env.BEHAVIOR_PREDICTION_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini").trim() || "gpt-4.1-mini";
}

function getHistoryPath() {
  return path.resolve(process.env.BEHAVIOR_HISTORY_PATH || "output/data/behaviorHistory.json");
}

function getDefaultChannel() {
  return String(process.env.BEHAVIOR_PREDICTION_CHANNEL || process.env.AUTONOMOUS_CHANNEL || "#all-ikesolutions").trim() || "#all-ikesolutions";
}

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

// Seed profiles (can be expanded over time)
const BEHAVIOR_PROFILES = {
  verizon: {
    industry: "telecom",
    common_violations: [
      "billing error handling failures",
      "failure to acknowledge disputes",
      "autopay / payment application issues",
      "communications/process failures",
    ],
    aggressiveness: "medium",
    response_speed: "slow",
    stall_tactics: true,
  },
  lvnv: {
    industry: "junk_debt_buyer",
    common_violations: [
      "lack of original contract",
      "no chain of title",
      "validation failures",
      "attempting to collect invalid or time-barred debt",
    ],
    aggressiveness: "low",
    response_speed: "very slow",
    stall_tactics: false,
  },
  chase: {
    industry: "major_bank",
    common_violations: [
      "adverse action notice failures",
      "unlawful account closures",
      "reporting inaccuracies",
      "UDAAP-style process failures",
    ],
    aggressiveness: "high",
    response_speed: "fast",
    stall_tactics: false,
  },
  "dakota financial": {
    industry: "secured_lender",
    common_violations: [
      "failure to credit payments properly",
      "misapplication of interest",
      "contract ambiguity",
      "unlawful deficiency claims",
    ],
    aggressiveness: "medium",
    response_speed: "medium",
    stall_tactics: false,
  },
};

const PROFILE_MATCHERS = [
  { key: "verizon", match: /verizon/i },
  { key: "lvnv", match: /lvnv|portfolio recovery|midland|cavalry/i },
  { key: "chase", match: /chase|jpmorgan|early warning|ews/i },
  { key: "dakota financial", match: /dakota financial/i },
];

function normalizeCreditorKey(name) {
  return String(name || "").trim().toLowerCase();
}

function pickProfile(name) {
  const n = String(name || "");
  for (const m of PROFILE_MATCHERS) {
    if (m.match.test(n)) return { key: m.key, profile: BEHAVIOR_PROFILES[m.key] };
  }

  const key = normalizeCreditorKey(name);
  const hit = BEHAVIOR_PROFILES[key];
  if (hit) return { key, profile: hit };

  return {
    key,
    profile: {
      industry: "unknown",
      common_violations: [],
      aggressiveness: "unknown",
      response_speed: "unknown",
      stall_tactics: false,
    },
  };
}

async function loadHistory() {
  const abs = getHistoryPath();
  try {
    const raw = await fs.readFile(abs, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveHistory(obj) {
  const abs = getHistoryPath();
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, JSON.stringify(obj, null, 2), "utf8");
}

async function appendHistory({ creditorKey, entry, maxEntriesPerCreditor = 30 }) {
  const db = await loadHistory();
  const k = String(creditorKey || "").trim();
  if (!k) return;

  const arr = Array.isArray(db[k]) ? db[k] : [];
  arr.push(entry);
  while (arr.length > maxEntriesPerCreditor) arr.shift();
  db[k] = arr;
  await saveHistory(db);
}

function safeJson(v) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function summarizePrediction(pred) {
  if (!pred || typeof pred !== "object") return "No prediction available.";

  const parts = [];
  if (typeof pred.responseProbability30d === "number") parts.push(`Respond ≤30d: ${pred.responseProbability30d}%`);
  if (typeof pred.violationProbability === "number") parts.push(`Violation prob: ${pred.violationProbability}%`);
  if (typeof pred.riskScore === "number") parts.push(`Risk: ${pred.riskScore}/10`);
  if (pred.likelyNextMistake) parts.push(`Next likely mistake: ${pred.likelyNextMistake}`);
  if (pred.recommendedCounterMove) parts.push(`Counter-move: ${pred.recommendedCounterMove}`);
  if (pred.suggestedEnforcementPath) parts.push(`Path: ${pred.suggestedEnforcementPath}`);

  return parts.join("\n");
}

function voiceSummary(pred, creditorName) {
  const name = String(creditorName || "the creditor");
  const risk = typeof pred?.riskScore === "number" ? pred.riskScore : null;
  const respond = typeof pred?.responseProbability30d === "number" ? pred.responseProbability30d : null;

  const lines = [`Behavior prediction summary for ${name}.`];
  if (risk !== null) lines.push(`Risk score ${risk} out of ten.`);
  if (respond !== null) lines.push(`Estimated response likelihood within thirty days: ${respond} percent.`);
  if (pred?.likelyNextMistake) lines.push(`Most likely next mistake: ${pred.likelyNextMistake}.`);
  if (pred?.recommendedCounterMove) lines.push(`Recommended counter move: ${pred.recommendedCounterMove}.`);
  return lines.join(" ");
}

async function generatePrediction({ creditorName, classification, profile, history }) {
  const client = await getOpenAI();
  if (!client) throw new Error("OPENAI_API_KEY is not set");

  const prompt = [
    `Creditor Name: ${creditorName}`,
    `Type: ${classification?.type || "unknown"}`,
    `Risk (current): ${classification?.risk || "unknown"}`,
    `Profile: ${safeJson(profile)}`,
    `Recent history (if any): ${safeJson(history || [])}`,
    "",
    "Return a single JSON object with these keys:",
    "- responseProbability30d (number 0-100)",
    "- violationProbability (number 0-100)",
    "- likelyBehavior (one of: escalate|ignore|stall|comply|unknown)",
    "- likelyNextMistake (string)",
    "- recommendedCounterMove (string)",
    "- riskScore (number 1-10)",
    "- suggestedEnforcementPath (string)",
    "Keep values short and actionable.",
  ].join("\n");

  const res = await client.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: "system",
        content:
          "You are a legal/financial analytics assistant. You output ONLY valid JSON. No markdown, no extra text.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = String(res?.choices?.[0]?.message?.content || "").trim();
  if (!raw) throw new Error("Empty prediction response");

  // Best-effort JSON parse; if model violates format, wrap as text.
  try {
    const obj = JSON.parse(raw);
    return { ok: true, prediction: obj, raw };
  } catch {
    return {
      ok: false,
      prediction: {
        responseProbability30d: null,
        violationProbability: null,
        likelyBehavior: "unknown",
        likelyNextMistake: raw.slice(0, 2400),
        recommendedCounterMove: "Review and decide.",
        riskScore: 5,
        suggestedEnforcementPath: "manual_review",
      },
      raw,
    };
  }
}

// In-process dedupe so we don't spam repeated classifications
const recentByCreditor = new Map();
const dedupeWindowMs = 6 * 60 * 60 * 1000; // 6h

function shouldDedupe(creditorKey) {
  const k = String(creditorKey || "").trim();
  if (!k) return false;

  const now = Date.now();
  for (const [rk, ts] of recentByCreditor.entries()) {
    if (now - ts > dedupeWindowMs) recentByCreditor.delete(rk);
  }

  if (recentByCreditor.has(k)) return true;
  recentByCreditor.set(k, now);
  return false;
}

function personaFor(prediction, classification) {
  const riskScore = typeof prediction?.riskScore === "number" ? prediction.riskScore : null;
  const riskTag = String(classification?.risk || "").toLowerCase();
  if (riskTag === "high" || (riskScore !== null && riskScore >= 8)) return "judge";
  if (riskScore !== null && riskScore >= 6) return "oracle";
  return "oracle";
}

async function handleCreditorClassified(classification = {}) {
  if (!isEnabled()) return;

  const creditorName = String(classification?.name || "").trim();
  if (!creditorName) return;

  const { key: profileKey, profile } = pickProfile(creditorName);
  const creditorKey = profileKey || normalizeCreditorKey(creditorName);
  if (!creditorKey) return;

  if (shouldDedupe(creditorKey)) return;

  const channel = classification?.context?.channel || getDefaultChannel();
  const caseId = classification?.context?.caseId || classification?.context?.case_id || null;

  const db = await loadHistory();
  const history = Array.isArray(db[creditorKey]) ? db[creditorKey].slice(-6) : [];

  const generatedAt = new Date().toISOString();

  const out = await generatePrediction({ creditorName, classification, profile, history });
  const pred = out.prediction;

  await appendHistory({
    creditorKey,
    entry: {
      timestamp: Date.now(),
      generatedAt,
      creditorName,
      classification: { type: classification?.type, risk: classification?.risk, tag: classification?.tag },
      profileKey,
      prediction: pred,
      raw: out.raw,
    },
  });

  const summary = summarizePrediction(pred);

  eventBus.emit("case.update", {
    channel,
    caseId: caseId || creditorName,
    title: `🔮 Behavior Prediction — ${creditorName}`,
    summary,
    idempotency_key: `behavior:${creditorKey}:${generatedAt.slice(0, 10)}`,
  });

  const persona = personaFor(pred, classification);
  eventBus.emit("briefing.voice", {
    channel,
    character: persona,
    subdir: "autonomous/predictions",
    outputDir: "output/audio",
    title: `Behavior Prediction — ${creditorName}`,
    initial_comment: `🎤 *Behavior Prediction (${String(persona).toUpperCase()})*`,
    text: voiceSummary(pred, creditorName),
  });

  eventBus.emit("behavior.predicted", {
    creditor: creditorName,
    creditorKey,
    channel,
    caseId: caseId || undefined,
    prediction: pred,
    predictionRaw: out.raw,
    classification,
    profile,
    generatedAt,
  });
}

// Register only once.
let registered = false;
export function registerBehaviorPredictionEngine() {
  if (registered) return;
  registered = true;
  eventBus.on("creditor.classified", (c) => {
    void handleCreditorClassified(c);
  });
}

// Auto-register (engine is env-gated at runtime)
registerBehaviorPredictionEngine();
