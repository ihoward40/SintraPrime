import os from "node:os";

const nodes = new Map();

function parseListEnv(name, fallbackCsv) {
  const raw = String(process.env[name] || fallbackCsv || "");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const SELF_NODE_ID =
  String(process.env.NODE_ID || "").trim() ||
  `${os.hostname()}-${process.pid}`;

const DEFAULT_CAPS = parseListEnv("NODE_CAPABILITIES", "router,dashboard,enforcement");
const DEFAULT_ROLE = String(process.env.NODE_ROLE || "primary").trim() || "primary";
const STALE_SECONDS = Number(process.env.CLUSTER_HEARTBEAT_STALE_SECONDS || 60);

function nowIso() {
  return new Date().toISOString();
}

function normalizeNode(rec) {
  const nodeId = String(rec?.nodeId || "").trim();
  if (!nodeId) return null;

  const url = rec?.url ? String(rec.url).trim() : null;
  const role = String(rec?.role || "worker").trim() || "worker";
  const capabilities = Array.isArray(rec?.capabilities) ? rec.capabilities.map((c) => String(c)).filter(Boolean) : [];
  const lastHeartbeat = rec?.lastHeartbeat ? String(rec.lastHeartbeat) : nowIso();

  const lastLatencyMs = typeof rec?.lastLatencyMs === "number" && Number.isFinite(rec.lastLatencyMs) ? rec.lastLatencyMs : undefined;

  return {
    nodeId,
    url: url || null,
    role,
    capabilities,
    lastHeartbeat,
    lastLatencyMs,
  };
}

function computeStatus(lastHeartbeatIso) {
  const t = Date.parse(String(lastHeartbeatIso || ""));
  if (!Number.isFinite(t)) return "unknown";
  const ageSec = (Date.now() - t) / 1000;
  return ageSec <= (Number.isFinite(STALE_SECONDS) ? STALE_SECONDS : 60) ? "online" : "offline";
}

function stableHash32(input) {
  const s = String(input || "");
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function matchNodeToCreditor(node, creditorLower) {
  if (!creditorLower) return false;
  const caps = Array.isArray(node?.capabilities) ? node.capabilities : [];
  for (const cap of caps) {
    const c = String(cap || "").trim().toLowerCase();
    if (!c) continue;
    if (creditorLower.includes(c)) return true;
  }
  return false;
}

export function ensureSelfRegistered() {
  if (nodes.has(SELF_NODE_ID)) return;
  nodes.set(SELF_NODE_ID, {
    nodeId: SELF_NODE_ID,
    url: null,
    role: DEFAULT_ROLE,
    capabilities: DEFAULT_CAPS,
    lastHeartbeat: nowIso(),
    status: "online",
    lastLatencyMs: undefined,
  });
}

export function updateNodeFromHeartbeat(payload) {
  ensureSelfRegistered();

  const rec = normalizeNode(payload);
  if (!rec) return null;

  const prev = nodes.get(rec.nodeId) || {};
  const next = {
    ...prev,
    ...rec,
    lastHeartbeat: nowIso(),
  };

  next.status = computeStatus(next.lastHeartbeat);
  nodes.set(rec.nodeId, next);
  return next;
}

export function setNodeLatency(nodeId, latencyMs) {
  if (!nodeId) return;
  const prev = nodes.get(nodeId);
  if (!prev) return;

  const next = { ...prev };
  if (typeof latencyMs === "number" && Number.isFinite(latencyMs) && latencyMs >= 0) {
    next.lastLatencyMs = latencyMs;
  }
  nodes.set(nodeId, next);
}

export function setSelfUrl(url) {
  ensureSelfRegistered();
  const prev = nodes.get(SELF_NODE_ID);
  if (!prev) return;
  nodes.set(SELF_NODE_ID, { ...prev, url: String(url || "").trim() || null });
}

export function listClusterNodes() {
  ensureSelfRegistered();
  const out = Array.from(nodes.values()).map((n) => ({
    ...n,
    status: n.status || computeStatus(n.lastHeartbeat),
  }));

  out.sort((a, b) => {
    const ap = a.role === "primary" ? 0 : 1;
    const bp = b.role === "primary" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return String(a.nodeId).localeCompare(String(b.nodeId));
  });

  return out;
}

export function getPrimaryCandidate() {
  const all = listClusterNodes();
  const primariesOnline = all.filter((n) => n.role === "primary" && (n.status || "").toLowerCase() === "online");
  if (primariesOnline.length) return primariesOnline[0];

  const anyOnline = all.filter((n) => (n.status || "").toLowerCase() === "online");
  if (anyOnline.length) return anyOnline[0];

  return all[0] || null;
}

export function getSelfNodeId() {
  return SELF_NODE_ID;
}

export function getSelfNode() {
  ensureSelfRegistered();
  return nodes.get(SELF_NODE_ID) || null;
}

export function pickOwnerNodeForCase({ creditor, caseId } = {}) {
  const creditorLower = String(creditor || "").trim().toLowerCase();

  // Prefer online nodes for assignment.
  const online = listClusterNodes().filter((n) => (n.status || "").toLowerCase() === "online");
  let candidates = online;

  // If we can infer a capability match from the creditor name, use only those nodes.
  const matched = online.filter((n) => matchNodeToCreditor(n, creditorLower));
  if (matched.length) candidates = matched;

  // Fall back to whatever is available.
  if (!candidates.length) candidates = listClusterNodes();
  if (!candidates.length) return null;

  // Deterministic order.
  candidates = [...candidates].sort((a, b) => String(a.nodeId).localeCompare(String(b.nodeId)));

  const key = String(caseId || "").trim() || creditorLower || "global";
  const idx = stableHash32(key) % candidates.length;

  // Ensure we always return a valid node.
  return candidates[idx] || candidates[0] || getPrimaryCandidate() || null;
}
