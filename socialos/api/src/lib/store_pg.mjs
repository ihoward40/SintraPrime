import pkg from "pg";
import { emitHealthSnapshot } from "../services/health_snapshot.mjs";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function ensureWorkerHeartbeatTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS worker_heartbeats (
      worker_id TEXT PRIMARY KEY,
      last_run TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
}

async function pgGetWorkerHeartbeat(worker_id) {
  await ensureWorkerHeartbeatTable();
  const r = await pool.query(`SELECT worker_id, last_run FROM worker_heartbeats WHERE worker_id=$1`, [worker_id]);
  if (!r.rows[0]) return null;
  return { worker_id: r.rows[0].worker_id, last_run: new Date(r.rows[0].last_run).toISOString() };
}

async function pgSetWorkerHeartbeat(worker_id, payload) {
  await ensureWorkerHeartbeatTable();
  const lastRunIso = payload?.last_run || new Date().toISOString();
  await pool.query(
    `INSERT INTO worker_heartbeats (worker_id, last_run, updated_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (worker_id) DO UPDATE SET last_run=EXCLUDED.last_run, updated_at=NOW()` ,
    [worker_id, lastRunIso]
  );
  return { worker_id, last_run: new Date(lastRunIso).toISOString() };
}

async function ensureHealthHistoryTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS health_history (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL
    )`
  );
  await pool.query(`CREATE INDEX IF NOT EXISTS health_history_created_at_idx ON health_history (created_at DESC)`);
}

function clampLimit(n, max = 50, def = 20) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return def;
  return Math.min(Math.floor(x), max);
}

async function pgAppendHealthSnapshot(snapshot) {
  await ensureHealthHistoryTable();
  const at = snapshot?.at ? new Date(snapshot.at) : new Date();
  await pool.query(`INSERT INTO health_history (created_at, payload) VALUES ($1, $2)`, [at, snapshot]);

  // Keep the table small: retain only last 20 snapshots (best-effort).
  await pool.query(
    `DELETE FROM health_history
     WHERE id NOT IN (
       SELECT id FROM health_history ORDER BY created_at DESC LIMIT 20
     )`
  );
  return true;
}

async function pgGetHealthHistory({ limit } = {}) {
  await ensureHealthHistoryTable();
  const lim = clampLimit(limit, 50, 20);
  const r = await pool.query(`SELECT payload FROM health_history ORDER BY created_at DESC LIMIT $1`, [lim]);
  return r.rows.map((x) => x.payload);
}

async function pgGetLatestHealthSnapshot() {
  await ensureHealthHistoryTable();
  const r = await pool.query(`SELECT payload FROM health_history ORDER BY created_at DESC LIMIT 1`);
  return r.rows[0]?.payload ?? null;
}

export const storePg = (() => {
  const store = {
  content: {
    async create(rec) {
      await pool.query(
        `INSERT INTO content
         (id, campaign_id, content_fingerprint, version, status, governance_level, risk_level, tags, canonical_assets)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           campaign_id=EXCLUDED.campaign_id,
           content_fingerprint=EXCLUDED.content_fingerprint,
           version=EXCLUDED.version,
           status=EXCLUDED.status,
           governance_level=EXCLUDED.governance_level,
           risk_level=EXCLUDED.risk_level,
           tags=EXCLUDED.tags,
           canonical_assets=EXCLUDED.canonical_assets,
           updated_at=NOW()`,
        [
          rec.content_id,
          rec.campaign_id,
          rec.content_fingerprint,
          rec.version,
          rec.status,
          rec.governance_level,
          rec.risk_level,
          rec.tags,
          rec.canonical_assets
        ]
      );
    },

    async get(id) {
      const r = await pool.query(`SELECT * FROM content WHERE id=$1`, [id]);
      if (!r.rows[0]) return null;
      return rowToContent(r.rows[0]);
    },

    async update(id, rec) {
      await pool.query(
        `UPDATE content SET
          campaign_id=$2,
          content_fingerprint=$3,
          version=$4,
          status=$5,
          governance_level=$6,
          risk_level=$7,
          tags=$8,
          canonical_assets=$9,
          updated_at=NOW()
         WHERE id=$1`,
        [
          id,
          rec.campaign_id,
          rec.content_fingerprint,
          rec.version,
          rec.status,
          rec.governance_level,
          rec.risk_level,
          rec.tags,
          rec.canonical_assets
        ]
      );
    },

    async list() {
      const r = await pool.query(`SELECT * FROM content ORDER BY created_at DESC LIMIT 500`);
      return r.rows.map(rowToContent);
    }
  },

  schedule: {
    async create(rec) {
      await pool.query(
        `INSERT INTO schedules (id, content_id, platform, scheduled_for, status, queue_id, priority)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
           status=EXCLUDED.status,
           scheduled_for=EXCLUDED.scheduled_for,
           queue_id=EXCLUDED.queue_id,
           priority=EXCLUDED.priority`,
        [rec.schedule_id, rec.content_id, rec.platform, rec.when, rec.status, rec.queue_id || "default", rec.priority ?? 5]
      );
    },

    async list({ from = null, to = null } = {}) {
      const params = [];
      let where = "WHERE 1=1";
      if (from) {
        params.push(from);
        where += ` AND scheduled_for >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        where += ` AND scheduled_for <= $${params.length}`;
      }

      const r = await pool.query(
        `SELECT id, content_id, platform, scheduled_for, status, queue_id, priority
         FROM schedules ${where}
         ORDER BY scheduled_for DESC LIMIT 500`,
        params
      );

      return r.rows.map((x) => ({
        schedule_id: x.id,
        content_id: x.content_id,
        platform: x.platform,
        when: new Date(x.scheduled_for).toISOString(),
        status: x.status,
        queue_id: x.queue_id,
        priority: x.priority
      }));
    }
  },

  receipts: {
    async create(receipt) {
      await pool.query(
        `INSERT INTO publish_receipts
         (id, content_id, platform, published_at, content_hash, signature, receipt_hash, status, result, verifier_link)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          receipt.receipt_id,
          receipt.content_id,
          receipt.platform,
          receipt.timestamp,
          receipt.content_hash,
          receipt.signature,
          receipt.receipt_hash,
          receipt.status,
          receipt.result,
          receipt.verifier_link
        ]
      );

      try {
        await emitHealthSnapshot({ store, source: "receipt" });
      } catch {
        // best-effort
      }
    },

    async get(id) {
      const r = await pool.query(
        `SELECT id, content_id, platform, published_at, content_hash, signature, receipt_hash, status, result, verifier_link
         FROM publish_receipts
         WHERE id=$1`,
        [id]
      );
      if (!r.rows[0]) return null;
      const x = r.rows[0];
      return {
        receipt_id: x.id,
        content_id: x.content_id,
        platform: x.platform,
        timestamp: new Date(x.published_at).toISOString(),
        content_hash: x.content_hash,
        signature: x.signature,
        receipt_hash: x.receipt_hash,
        status: x.status,
        result: x.result,
        verifier_link: x.verifier_link
      };
    },

    async list({ content_id = null, platform = null, limit = 100 } = {}) {
      const params = [];
      let where = "WHERE 1=1";
      if (content_id) {
        params.push(content_id);
        where += ` AND content_id = $${params.length}`;
      }
      if (platform) {
        params.push(platform);
        where += ` AND platform = $${params.length}`;
      }
      params.push(limit);

      const r = await pool.query(
        `SELECT id, content_id, platform, published_at, content_hash, signature, receipt_hash, status, result, verifier_link
         FROM publish_receipts ${where}
         ORDER BY published_at DESC
         LIMIT $${params.length}`,
        params
      );

      return r.rows.map((x) => ({
        receipt_id: x.id,
        content_id: x.content_id,
        platform: x.platform,
        timestamp: new Date(x.published_at).toISOString(),
        content_hash: x.content_hash,
        signature: x.signature,
        receipt_hash: x.receipt_hash,
        status: x.status,
        result: x.result,
        verifier_link: x.verifier_link
      }));
    }
  },

  audit: {
    async append(event) {
      await pool.query(
        `INSERT INTO audit_events
         (id, timestamp, actor, action, entity_type, entity_id, payload_hash, signature)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [
          event.event_id,
          event.timestamp,
          event.actor,
          event.action,
          event.entity_type,
          event.entity_id,
          event.payload_hash,
          event.signature
        ]
      );
    }
  },

  analytics: {
    async list() {
      return [];
    },
    async upsert() {}
  },

  bestTime: {
    async upsert(_key, rec) {
      await pool.query(
        `INSERT INTO best_time_recommendations
         (id, platform, day_of_week, hour, score, confidence_score, sample_size, window_days, evidence, generated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET
           platform=EXCLUDED.platform,
           day_of_week=EXCLUDED.day_of_week,
           hour=EXCLUDED.hour,
           score=EXCLUDED.score,
           confidence_score=EXCLUDED.confidence_score,
           sample_size=EXCLUDED.sample_size,
           window_days=EXCLUDED.window_days,
           evidence=EXCLUDED.evidence,
           generated_at=EXCLUDED.generated_at`,
        [
          rec.id,
          rec.platform,
          rec.day_of_week,
          rec.hour,
          rec.score,
          rec.confidence_score,
          rec.sample_size,
          rec.window_days,
          rec.evidence,
          rec.generated_at
        ]
      );

      // Heartbeat: any successful upsert counts as a worker run.
      await store.health.setWorkerHeartbeat("best_time", { last_run: new Date().toISOString() });
    },

    async list({ platform = null, limit = 50 } = {}) {
      const params = [];
      let where = "WHERE 1=1";
      if (platform) {
        params.push(platform);
        where += ` AND platform=$${params.length}`;
      }
      params.push(limit);

      const r = await pool.query(
        `SELECT id, platform, day_of_week, hour, score, confidence_score, sample_size, window_days, evidence, generated_at
         FROM best_time_recommendations
         ${where}
         ORDER BY confidence_score DESC, score DESC
         LIMIT $${params.length}`,
        params
      );

      return r.rows.map((x) => ({
        id: x.id,
        platform: x.platform,
        day_of_week: x.day_of_week,
        hour: x.hour,
        score: Number(x.score),
        confidence_score: Number(x.confidence_score),
        sample_size: x.sample_size,
        window_days: x.window_days,
        evidence: x.evidence,
        generated_at: new Date(x.generated_at).toISOString()
      }));
    }
  },

  health: {
    async getWorkerHeartbeat(worker_id) {
      return pgGetWorkerHeartbeat(worker_id);
    },
    async setWorkerHeartbeat(worker_id, payload) {
      const out = await pgSetWorkerHeartbeat(worker_id, payload);
      try {
        await emitHealthSnapshot({ store, source: "worker" });
      } catch {
        // best-effort
      }
      return out;
    },
    async appendHealthSnapshot(snapshot) {
      return pgAppendHealthSnapshot(snapshot);
    },
    async getHealthHistory({ limit } = {}) {
      return pgGetHealthHistory({ limit });
    },
    async getLatestHealthSnapshot() {
      return pgGetLatestHealthSnapshot();
    }
  }
  };

  return store;
})();

function rowToContent(r) {
  return {
    content_id: r.id,
    campaign_id: r.campaign_id,
    version: r.version,
    content_fingerprint: r.content_fingerprint,
    status: r.status,
    governance_level: r.governance_level,
    risk_level: r.risk_level,
    canonical_assets: r.canonical_assets,
    tags: r.tags || [],
    created_at: new Date(r.created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString()
  };
}
