import path from "node:path";
import { safeReadJson, safeWriteJson } from "../services/jsonlStore.js";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const SNAPSHOT_FILE = path.join(RUNS_DIR, "trust-snapshot.json");

export function getCurrentTrustSnapshot() {
  const fallback = {
    asOf: new Date().toISOString(),
    cashBufferMonths: 12,
    cashOnHand: null,
    monthlyBurn: null,
    openCases: 0,
    dailyFilingsCount: 0,
    deadlinesHeavy: false,
    marketVolatilityScore: 0,
    taxExposureScore: 0,
    complianceFlags: [],
  };

  const snap = safeReadJson(SNAPSHOT_FILE, fallback);
  return {
    ...fallback,
    ...(snap || {}),
    asOf: snap?.asOf || fallback.asOf,
  };
}

export function setCurrentTrustSnapshot(snapshot) {
  const next = {
    ...getCurrentTrustSnapshot(),
    ...(snapshot || {}),
    asOf: new Date().toISOString(),
  };
  safeWriteJson(SNAPSHOT_FILE, next);
  return next;
}
