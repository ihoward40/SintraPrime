import { createDevStore } from "../store/dev_store.mjs";
import { emitHealthSnapshot } from "../services/health_snapshot.mjs";

const base = createDevStore();

export const storeDev = (() => {
  const store = {
  content: {
    async create(rec) {
      return base.putContent(rec);
    },
    async get(id) {
      return base.getContent(id);
    },
    async update(id, rec) {
      // id is included in rec.content_id, but keep signature compatible.
      return base.putContent({ ...rec, content_id: id });
    },
    async list() {
      const items = await base.listContent();
      items.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      return items;
    }
  },

  schedule: {
    async create(rec) {
      return base.putSchedule(rec);
    },
    async list({ from = null, to = null } = {}) {
      return base.listSchedules({ from, to });
    }
  },

  receipts: {
    async create(receipt) {
      const out = await base.putReceipt(receipt);
      try {
        await emitHealthSnapshot({ store, source: "receipt" });
      } catch {
        // best-effort
      }
      return out;
    },
    async get(id) {
      return base.getReceipt(id);
    },
    async list({ content_id = null, platform = null, limit = 100 } = {}) {
      return base.listReceipts({ content_id, platform, limit });
    }
  },

  audit: {
    async append(event) {
      return base.appendAuditEvent(event);
    }
  },

  analytics: {
    async list({ content_id = null, platform = null } = {}) {
      return base.listAnalytics({ content_id, platform });
    },
    async upsert(event) {
      return base.upsertAnalytics(event);
    }
  },

  bestTime: {
    async upsert(key, rec) {
      const out = await base.upsertBestTime(key, rec);
      if (typeof base.setWorkerHeartbeat === "function") {
        await store.health.setWorkerHeartbeat("best_time", { last_run: new Date().toISOString() });
      }
      return out;
    },
    async list({ platform = null, limit = 100 } = {}) {
      return base.listBestTime({ platform, limit });
    }
  },

  health: {
    async getWorkerHeartbeat(worker_id) {
      return base.getWorkerHeartbeat(worker_id);
    },
    async setWorkerHeartbeat(worker_id, payload) {
      const out = await base.setWorkerHeartbeat(worker_id, payload);
      try {
        await emitHealthSnapshot({ store, source: "worker" });
      } catch {
        // best-effort
      }
      return out;
    },
    async appendHealthSnapshot(snapshot) {
      return base.appendHealthSnapshot(snapshot);
    },
    async getHealthHistory({ limit } = {}) {
      return base.getHealthHistory({ limit });
    },
    async getLatestHealthSnapshot() {
      return base.getLatestHealthSnapshot();
    }
  }
  };

  return store;
})();
