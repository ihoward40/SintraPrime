import path from "node:path";
import { safeReadJson, safeWriteJson } from "../services/jsonlStore.js";
import { fetchGovernorRulesFromNotion } from "../integrations/notionGovernor.js";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const LOCAL_RULES_FILE = path.join(RUNS_DIR, "governor-rules.json");

function defaultRulesFor(actionType) {
  const t = String(actionType || "unknown").toLowerCase();
  const base = {
    actionType: t,
    allowedModes: ["conservative", "standard"],
    minCashBufferMonths: 2,
    maxOpenCases: 12,
    maxDailyFilings: 8,
    maxTradingAllocationPct: 10,
    volatilityThreshold: 6,
    riskTolerance: 6,
    blockConditions: [],
    overrideAllowed: true,
    overrideRequires: ["Trustee Approval"],
    source: "default",
  };

  if (t === "trade" || t === "investment") {
    return {
      ...base,
      maxDailyFilings: 0,
      maxOpenCases: 9999,
      maxTradingAllocationPct: 5,
      volatilityThreshold: 5,
      riskTolerance: 5,
    };
  }

  if (t === "expense") {
    return {
      ...base,
      maxDailyFilings: 0,
      maxOpenCases: 9999,
      riskTolerance: 7,
    };
  }

  return base;
}

function normalizeRule(raw, actionType) {
  const d = defaultRulesFor(actionType);
  const r = raw || {};
  return {
    ...d,
    ...r,
    actionType: d.actionType,
    allowedModes: Array.isArray(r.allowedModes) ? r.allowedModes : d.allowedModes,
    blockConditions: Array.isArray(r.blockConditions) ? r.blockConditions : d.blockConditions,
    overrideRequires: Array.isArray(r.overrideRequires) ? r.overrideRequires : d.overrideRequires,
  };
}

export function ensureLocalGovernorRulesSeed() {
  const existing = safeReadJson(LOCAL_RULES_FILE, null);
  if (existing) return existing;
  const seed = {
    filing: defaultRulesFor("filing"),
    motion: defaultRulesFor("motion"),
    enforcement: defaultRulesFor("enforcement"),
    trade: defaultRulesFor("trade"),
    expense: defaultRulesFor("expense"),
    investment: defaultRulesFor("investment"),
  };
  safeWriteJson(LOCAL_RULES_FILE, seed);
  return seed;
}

export async function getGovernorRules(actionType) {
  const t = String(actionType || "unknown").toLowerCase();

  try {
    const fromNotion = await fetchGovernorRulesFromNotion({ actionType: t });
    if (fromNotion) {
      return normalizeRule({ ...fromNotion, source: "notion" }, t);
    }
  } catch {
    // fall through
  }

  const local = safeReadJson(LOCAL_RULES_FILE, null);
  if (local && typeof local === "object") {
    const hit = local[t] || null;
    if (hit) return normalizeRule({ ...hit, source: "local" }, t);
  }

  return defaultRulesFor(t);
}
