import fs from "node:fs";
import path from "node:path";
import { eventBus } from "../core/eventBus.js";
import { getSlackHealth, noteSlackSuccess } from "./slackHealth.js";
import { authTestNow, maybeRefreshSlackToken } from "./slack.service.js";

const state = {
  started: false,
  interval_ms: 12 * 60 * 1000,
  last_check_at: null,
  last_refresh_attempt_at: null,
  last_refresh_ok_at: null,
  last_refresh_error: null,
  last_refresh_reason: null,
  token_cache_path: null,
};

function slackOffline() {
  return String(process.env.SLACK_OFFLINE || "").trim() === "1";
}

function hasSlackToken() {
  return Boolean(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN);
}

function getTokenCachePath() {
  const raw = String(process.env.SLACK_TOKEN_CACHE_PATH || "").trim();
  if (!raw) return null;
  return path.resolve(process.cwd(), raw);
}

function readCachedTokenIfAny(absPath) {
  try {
    const txt = fs.readFileSync(absPath, "utf8");
    const data = JSON.parse(txt);
    const token = String(data?.access_token || data?.token || "").trim();
    const refresh = String(data?.refresh_token || "").trim();
    return {
      access_token: token || null,
      refresh_token: refresh || null,
    };
  } catch {
    return null;
  }
}

function writeCachedToken(absPath, payload) {
  try {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, JSON.stringify(payload, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

async function attemptRefresh(reason) {
  // Throttle refresh attempts to avoid storms.
  const now = Date.now();
  if (state.last_refresh_attempt_at && now - state.last_refresh_attempt_at < 60_000) {
    return { ok: false, reason: "throttled" };
  }

  state.last_refresh_attempt_at = new Date(now).toISOString();
  state.last_refresh_reason = String(reason || "unknown");
  state.last_refresh_error = null;

  const refreshed = await maybeRefreshSlackToken({ reason: state.last_refresh_reason });
  if (!refreshed?.ok || !refreshed.access_token) {
    state.last_refresh_error = refreshed?.error || refreshed?.reason || "refresh_failed";
    return { ok: false, reason: state.last_refresh_error };
  }

  state.last_refresh_ok_at = new Date().toISOString();
  noteSlackSuccess("watchdog.refresh");

  if (state.token_cache_path) {
    writeCachedToken(state.token_cache_path, {
      updated_at: new Date().toISOString(),
      access_token: refreshed.access_token,
      ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
    });
  }

  eventBus.emit("slack.token.refreshed", {
    at: state.last_refresh_ok_at,
    reason: state.last_refresh_reason,
  });

  return { ok: true };
}

export function getSlackWatchdogStatus() {
  return {
    ...state,
    slack_health: getSlackHealth(),
    env: {
      offline: slackOffline(),
      has_token: hasSlackToken(),
      oauth_refresh_enabled: String(process.env.SLACK_ENABLE_OAUTH_REFRESH || "").trim() === "1",
    },
  };
}

export function startSlackWatchdog() {
  if (state.started) return;

  // Auto-enable if Slack is configured and not explicitly offline.
  const enabled = String(process.env.SLACK_WATCHDOG || "").trim();
  if (enabled === "0") return;
  if (enabled !== "1" && !hasSlackToken()) return;

  state.started = true;
  state.interval_ms = Math.max(
    30_000,
    Number(process.env.SLACK_WATCHDOG_INTERVAL_MS || state.interval_ms) || state.interval_ms,
  );
  state.token_cache_path = getTokenCachePath();

  // Optional: hydrate token from cache on boot (lets refresh survive reboot).
  if (state.token_cache_path && !hasSlackToken()) {
    const cached = readCachedTokenIfAny(state.token_cache_path);
    if (cached?.access_token) {
      process.env.SLACK_BOT_TOKEN = cached.access_token;
      if (cached.refresh_token) process.env.SLACK_REFRESH_TOKEN = cached.refresh_token;
    }
  }

  console.log(`[SlackWatchdog] online (interval_ms=${state.interval_ms})`);

  // React to auth problems from anywhere.
  eventBus.on("slack.error", async (payload) => {
    const code = String(payload?.code || payload?.info?.code || payload?.error || "").trim();
    if (code !== "token_expired" && code !== "invalid_auth" && code !== "account_inactive") return;
    try {
      await attemptRefresh(`event:${code}`);
    } catch {
      // never throw from event handler
    }
  });

  // Periodic health check.
  setInterval(() => {
    (async () => {
      if (slackOffline()) return;
      state.last_check_at = new Date().toISOString();

      // Always hit Slack (not cached) to detect expirations proactively.
      const res = await authTestNow();
      if (res?.ok) return;

      const code = String(res?.error || "").trim();
      if (code === "token_expired" || code === "invalid_auth" || code === "account_inactive") {
        await attemptRefresh(`auth.test:${code || "auth_problem"}`);
      }
    })().catch(() => {
      // swallow
    });
  }, state.interval_ms);
}

// Side-effect boot (keeps server.js clean).
startSlackWatchdog();
