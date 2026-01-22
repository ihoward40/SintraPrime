import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function defaultStorePath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "../../.data/socialos_store.json");
}

async function ensureDirFor(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJsonOrDefault(filePath, defaultValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return defaultValue;
    throw e;
  }
}

async function atomicWriteJson(filePath, obj) {
  await ensureDirFor(filePath);
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

export function createDevStore(options = {}) {
  const storePath = options.storePath || process.env.SOCIALOS_STORE_PATH || defaultStorePath();

  function clampLimit(n, max = 50, def = 20) {
    const x = Number(n);
    if (!Number.isFinite(x) || x <= 0) return def;
    return Math.min(Math.floor(x), max);
  }

  async function load() {
    const s = await readJsonOrDefault(storePath, {
      content_by_id: {},
      schedules_by_id: {},
      receipts_by_id: {},
      audit_events: [],
      best_time_by_key: {},
      analytics_events: [],
      worker_heartbeats: {}
    });

    // Back-compat with older store snapshots.
    if (!s.worker_heartbeats || typeof s.worker_heartbeats !== "object") s.worker_heartbeats = {};
    if (!Array.isArray(s.health_history)) s.health_history = [];
    return s;
  }

  async function save(next) {
    await atomicWriteJson(storePath, next);
  }

  return {
    async putContent(contentRecord) {
      const s = await load();
      s.content_by_id[contentRecord.content_id] = contentRecord;
      await save(s);
      return contentRecord;
    },

    async getContent(content_id) {
      const s = await load();
      return s.content_by_id[content_id] || null;
    },

    async listContent() {
      const s = await load();
      return Object.values(s.content_by_id);
    },

    async putSchedule(scheduleRecord) {
      const s = await load();
      s.schedules_by_id[scheduleRecord.schedule_id] = scheduleRecord;
      await save(s);
      return scheduleRecord;
    },

    async listSchedules({ from, to } = {}) {
      const s = await load();
      let items = Object.values(s.schedules_by_id);
      if (from) items = items.filter((x) => new Date(x.when).getTime() >= new Date(from).getTime());
      if (to) items = items.filter((x) => new Date(x.when).getTime() <= new Date(to).getTime());
      items.sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());
      return items;
    },

    async putReceipt(receiptRecord) {
      const s = await load();
      s.receipts_by_id[receiptRecord.receipt_id] = receiptRecord;
      await save(s);
      return receiptRecord;
    },

    async getReceipt(receipt_id) {
      const s = await load();
      return s.receipts_by_id[receipt_id] || null;
    },

    async listReceipts({ content_id = null, platform = null, limit = 100 } = {}) {
      const s = await load();
      const all = Object.values(s.receipts_by_id);
      const filtered = all.filter(
        (x) => (!content_id || x.content_id === content_id) && (!platform || x.platform === platform)
      );
      filtered.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      return filtered.slice(0, limit);
    },

    async appendAuditEvent(event) {
      const s = await load();
      s.audit_events.push(event);
      await save(s);
      return event;
    },

    async listAuditEvents() {
      const s = await load();
      return s.audit_events.slice();
    },

    async upsertBestTime(key, rec) {
      const s = await load();
      s.best_time_by_key[key] = rec;
      await save(s);
      return rec;
    },

    async listBestTime({ platform = null, limit = 100 } = {}) {
      const s = await load();
      const all = Object.values(s.best_time_by_key);
      const filtered = all.filter((x) => (!platform ? true : x.platform === platform));
      filtered.sort((a, b) => Number(b.confidence_score || 0) - Number(a.confidence_score || 0));
      return filtered.slice(0, limit);
    },

    async upsertAnalytics(event) {
      const s = await load();
      s.analytics_events.push(event);
      await save(s);
      return event;
    },

    async listAnalytics({ content_id = null, platform = null } = {}) {
      const s = await load();
      return s.analytics_events.filter(
        (x) => (!content_id || x.content_id === content_id) && (!platform || x.platform === platform)
      );
    },

    async getWorkerHeartbeat(worker_id) {
      const s = await load();
      const hb = s.worker_heartbeats[worker_id];
      return hb || null;
    },

    async setWorkerHeartbeat(worker_id, payload) {
      const s = await load();
      const last_run = payload?.last_run || new Date().toISOString();
      s.worker_heartbeats[worker_id] = { worker_id, last_run };
      await save(s);
      return s.worker_heartbeats[worker_id];
    },

    async appendHealthSnapshot(snapshot) {
      const s = await load();
      const arr = Array.isArray(s.health_history) ? s.health_history : [];
      arr.push(snapshot);
      s.health_history = arr.slice(-20);
      await save(s);
      return true;
    },

    async getHealthHistory({ limit } = {}) {
      const s = await load();
      const arr = Array.isArray(s.health_history) ? s.health_history : [];
      const lim = clampLimit(limit, 50, 20);
      return arr.slice(-lim).reverse();
    },

    async getLatestHealthSnapshot() {
      const s = await load();
      const arr = Array.isArray(s.health_history) ? s.health_history : [];
      return arr.length ? arr[arr.length - 1] : null;
    }
  };
}
