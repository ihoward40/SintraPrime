import path from "node:path";
import { eventBus } from "../core/eventBus.js";
import { appendJsonl, readJsonl } from "../services/jsonlStore.js";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const INCIDENTS_LOG = path.join(RUNS_DIR, "security-incidents.jsonl");

function recordIncident(type, payload) {
  const entry = {
    id: `${String(type)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: String(type),
    ts: new Date().toISOString(),
    payload: payload || {},
  };

  appendJsonl(INCIDENTS_LOG, entry);
  eventBus.emit("security.incident.recorded", entry);
}

export function startSecurityIncidentLogger() {
  const enabled = String(process.env.SECURITY_INCIDENT_LOGGER || "1").trim() === "1";
  if (!enabled) return;

  eventBus.on("security.threat.bump", (ev) => recordIncident("threat.bump", ev));
  eventBus.on("security.ip.blocked.hit", (ev) => recordIncident("ip.blocked.hit", ev));
  eventBus.on("security.auth.failure", (ev) => recordIncident("auth.failure", ev));
  eventBus.on("security.rate-limit.triggered", (ev) => recordIncident("rate-limit.triggered", ev));
  eventBus.on("security.config.drift", (ev) => recordIncident("config.drift", ev));
  eventBus.on("security.integrity.violation", (ev) => recordIncident("integrity.violation", ev));
  eventBus.on("vision.perimeter.suspicious", (ev) => recordIncident("vision.perimeter.suspicious", ev));
  eventBus.on("vision.network.traffic-spike", (ev) => recordIncident("vision.network.traffic-spike", ev));

  eventBus.on("security.blue-team.anomaly", (ev) => recordIncident("blue-team.anomaly", ev));
  eventBus.on("security.blue-team.breaker.tripped", (ev) => recordIncident("blue-team.breaker.tripped", ev));
  eventBus.on("security.blue-team.breaker.reset", (ev) => recordIncident("blue-team.breaker.reset", ev));
}

export function getIncidents({ limit = 100 } = {}) {
  const n = Math.max(1, Math.min(500, Number(limit || 100)));
  return readJsonl(INCIDENTS_LOG, { limit: n, newestFirst: true });
}
