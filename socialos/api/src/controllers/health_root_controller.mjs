import { getStore } from "../lib/store_factory.mjs";
import { computeHealthSnapshot, maybeAppendHealthSnapshot } from "../services/health_snapshot.mjs";
import { addClient, removeClient, startKeepalive } from "../services/health_stream.mjs";
import { formatMetrics, incCounterLabeled } from "../services/metrics.mjs";

startKeepalive();

function replayLimitFromEnv() {
  const raw = process.env.HEALTH_REPLAY_LIMIT;
  const n = Number(raw);
  const v = Number.isFinite(n) ? Math.floor(n) : 50;
  return Math.max(1, Math.min(500, v));
}

function logSse(obj) {
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ subsystem: "health_sse", at: new Date().toISOString(), ...obj }));
  } catch {
    // ignore
  }
}

function writeHealthEvent(res, ev) {
  const id = ev?.event_key || "";
  res.write(`id: ${id}\n`);
  res.write(`event: health_event\n`);
  res.write(`data: ${JSON.stringify({ type: "health_event", event: ev })}\n\n`);
}

function writeReset(res, payload) {
  const body = {
    type: "reset",
    reason: payload?.reason || "reset",
    server_cursor: payload?.server_cursor ?? null,
    history_len: payload?.history_len ?? null,
    replay_limit: payload?.replay_limit ?? null
  };
  try {
    incCounterLabeled("health_resets_total", { reason: body.reason }, 1);
    if (body.reason === "replay_window_insufficient" || body.reason === "since_event_key_not_found") {
      incCounterLabeled("health_replay_failures_total", { reason: body.reason }, 1);
    }
  } catch {
    // ignore
  }
  res.write(`event: reset\n`);
  res.write(`data: ${JSON.stringify(body)}\n\n`);
}


function ageSeconds(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

function ageHuman(sec) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export async function rootHealth(req, res, next) {
  try {
    const store = await getStore();

    const { snapshot, receipts, worker, schemas, ok, mode } = await computeHealthSnapshot({ store });

    try {
      await maybeAppendHealthSnapshot({ store, snapshot, source: "poll" });
    } catch {
      // best-effort; never fail /health due to history persistence
    }

    res.status(ok ? 200 : 500).json({
      ok,
      mode,
      severity: snapshot?.severity ?? null,
      status_code: snapshot?.status_code ?? null,
      recommended_action: snapshot?.recommended_action ?? null,
      receipts: {
        ok: receipts.ok,
        checked: receipts.checked,
        mismatch: receipts.mismatch
      },
      worker,
      schemas
    });
  } catch (e) {
    next(e);
  }
}

export async function healthHistory(req, res, next) {
  try {
    const store = await getStore();
    const limit = req.query.limit;

    if (typeof store?.health?.getHealthHistory !== "function") {
      res.json({ ok: true, count: 0, items: [] });
      return;
    }

    const raw = await store.health.getHealthHistory({ limit });
    const items = sortHealthHistoryItems(raw);
    res.json({ ok: true, count: items.length, items });
  } catch (e) {
    next(e);
  }
}

export function sortHealthHistoryItems(items) {
  const arr = Array.isArray(items) ? items.slice() : [];
  arr.sort((a, b) => {
    const ta = Date.parse(a?.at || "");
    const tb = Date.parse(b?.at || "");
    const na = Number.isFinite(ta) ? ta : -Infinity;
    const nb = Number.isFinite(tb) ? tb : -Infinity;
    return nb - na;
  });
  return arr;
}

export async function lastChange(req, res, next) {
  try {
    const store = await getStore();

    const event =
      typeof store?.health?.getLatestHealthSnapshot === "function" ? await store.health.getLatestHealthSnapshot() : null;

    const sec = ageSeconds(event?.at);
    const sinceSecondsRaw = req.query.since_seconds;
    const sinceSeconds = sinceSecondsRaw == null ? null : Number(sinceSecondsRaw);
    const changedRecently =
      sinceSeconds == null || !Number.isFinite(sinceSeconds) || sinceSeconds <= 0 || sec == null
        ? null
        : sec <= Math.floor(sinceSeconds);

    const out = {
      ok: true,
      event: event || null,
      age_seconds: sec,
      age_human: ageHuman(sec)
    };

    if (sinceSecondsRaw != null) {
      out.changed_recently = changedRecently;
      out.since_seconds = Number.isFinite(sinceSeconds) && sinceSeconds > 0 ? Math.floor(sinceSeconds) : null;
    }

    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function healthStream(req, res, next) {
  try {
    const replayLimit = replayLimitFromEnv();

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*"
    });

    // Tell EventSource how long to wait before retrying (ms).
    res.write(`retry: 1000\n\n`);

    res.write(`event: hello\ndata: {"ok":true}\n\n`);

    const store = await getStore();
    const lastId =
      req.headers["last-event-id"] ||
      new URL(req.originalUrl || req.url, "http://localhost").searchParams.get("since_event_key") ||
      null;

    logSse({ event: "connect", since_event_key: lastId ? String(lastId) : null, replay_limit: replayLimit });

    let lastSentKey = null;

    // Optional best-effort replay: if we can locate lastId in recent history,
    // replay only events after it (oldest-first) to catch up.
    if (lastId) {
      if (typeof store?.health?.getHealthHistory !== "function") {
        writeReset(res, {
          reason: "replay_window_insufficient",
          server_cursor: null,
          history_len: null,
          replay_limit: replayLimit
        });
        logSse({ event: "reset", reason: "replay_window_insufficient", replay_limit: replayLimit });
      } else {
        const hist = (await store.health.getHealthHistory({ limit: replayLimit })) || []; // newest-first
        const oldestFirst = Array.isArray(hist) ? hist.slice().reverse() : [];
        const serverCursor = Array.isArray(hist) && hist.length ? (hist[0]?.event_key || null) : null;
        const historyLen = Array.isArray(hist) ? hist.length : null;

        if (!Array.isArray(hist) || hist.length === 0) {
          writeReset(res, {
            reason: "since_event_key_not_found",
            server_cursor: serverCursor,
            history_len: historyLen,
            replay_limit: replayLimit
          });
          logSse({ event: "reset", reason: "since_event_key_not_found", replay_limit: replayLimit, server_cursor: serverCursor, history_len: historyLen });
        } else {
          const idx = oldestFirst.findIndex((e) => e?.event_key === lastId);
          if (idx >= 0) {
            logSse({ event: "replay", status: "hit", since_event_key: String(lastId), replay_limit: replayLimit, server_cursor: serverCursor, history_len: historyLen });
            for (let i = idx + 1; i < oldestFirst.length; i += 1) {
              const ev = oldestFirst[i];
              writeHealthEvent(res, ev);
              lastSentKey = ev?.event_key || lastSentKey;
            }
          } else {
            writeReset(res, {
              reason: "replay_window_insufficient",
              server_cursor: serverCursor,
              history_len: historyLen,
              replay_limit: replayLimit
            });
            logSse({ event: "reset", reason: "replay_window_insufficient", replay_limit: replayLimit, server_cursor: serverCursor, history_len: historyLen });
          }
        }
      }
    }

    // Always send newest event once on connect (instant correct state),
    // but avoid duplicating if replay already sent it.
    const latest =
      typeof store?.health?.getLatestHealthSnapshot === "function" ? await store.health.getLatestHealthSnapshot() : null;
    if (latest && (latest?.event_key || null) !== lastSentKey) {
      writeHealthEvent(res, latest);
    }

    const client = addClient(res);
    req.on("close", () => {
      removeClient(client);
      logSse({ event: "disconnect", client: client?.id || null });
    });
  } catch (e) {
    next?.(e);
  }
}

export async function metrics(_req, res, _next) {
  res.status(200);
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(formatMetrics());
}
