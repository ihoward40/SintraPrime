// src/watchers/slackTokenWatchdog.js
import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { WebClient } from "@slack/web-api";
import { sharedEventBus as bus } from "../core/eventBus.js";

const TOKEN_CACHE = path.join(process.cwd(), "data/slack_token.json");

function envFlag(name) {
  return String(process.env[name] || "").trim() === "1";
}

const state = {
  started: false,
  token_cache: TOKEN_CACHE,
  cache_loaded: false,
  cache_skipped_reason: null,
  cache_write_enabled: false,
  last_health_check_at: null,
  last_refresh_attempt_at: null,
  last_refresh_ok_at: null,
  last_refresh_error: null,
};

export function getSlackTokenWatchdogStatus() {
  return { ...state };
}

export function startSlackTokenWatchdog(slackClient) {
  if (state.started) return;
  state.started = true;

  console.log("[Watchtower] Slack Token Watchdog activated");

  // IMPORTANT:
  // Never override a freshly-provided env token with a cached token.
  // This is the #1 way teams get stuck on token_expired forever.
  const envToken = String(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN || "").trim();
  const preferCache = envFlag("SLACK_WATCHTOWER_PREFER_CACHE");

  try {
    if (fs.existsSync(TOKEN_CACHE)) {
      if (envToken && !preferCache) {
        state.cache_loaded = false;
        state.cache_skipped_reason = "env_token_present";
      } else {
        const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE, "utf8"));
        if (cached?.token) {
          console.log("[Watchtower] Loaded cached Slack token");
          state.cache_loaded = true;
          state.cache_skipped_reason = null;
          slackClient.token = cached.token;
          if (slackClient?.token) slackClient.client = new WebClient(slackClient.token);
        } else {
          state.cache_loaded = false;
          state.cache_skipped_reason = "cache_empty";
        }
      }
    } else {
      state.cache_loaded = false;
      state.cache_skipped_reason = "cache_missing";
    }
  } catch (err) {
    state.cache_loaded = false;
    state.cache_skipped_reason = "cache_read_error";
    console.log("[Watchtower] Could not load token cache:", err?.message || String(err));
  }

  // Only write a refreshed token to disk when explicitly enabled.
  state.cache_write_enabled = Boolean(String(process.env.SLACK_TOKEN_CACHE_PATH || "").trim()) || envFlag("SLACK_WATCHTOWER_WRITE_CACHE");

  // Listen for Slack errors emitted by Slack layers
  bus.on("slack.error", async (err) => {
    const code = String(err?.data?.error || err?.error || err?.code || "");
    if (code !== "token_expired") return;

    console.log("[Watchtower] ⚠ Token expired — attempting refresh...");
    const newToken = await refreshSlackToken();

    if (!newToken) {
      console.log("[Watchtower] ❌ Token refresh FAILED.");
      state.last_refresh_error = "refresh_failed";
      return;
    }

    console.log("[Watchtower] ✅ Token refreshed!");
    slackClient.token = newToken;
    slackClient.client = new WebClient(newToken);

    // Cache it (optional)
    if (state.cache_write_enabled) {
      try {
        fs.mkdirSync(path.dirname(TOKEN_CACHE), { recursive: true });
        fs.writeFileSync(TOKEN_CACHE, JSON.stringify({ token: newToken }, null, 2));
        console.log("[Watchtower] Token cached");
      } catch (err2) {
        console.log("[Watchtower] Could not write token cache:", err2?.message || String(err2));
      }
    }

    state.last_refresh_ok_at = new Date().toISOString();

    bus.emit("slack.reconnected", {
      time: new Date().toISOString(),
      source: "token_refresh",
    });
  });

  // Periodic proactive health check
  setInterval(async () => {
    try {
      state.last_health_check_at = new Date().toISOString();
      await slackClient.client.auth.test();
    } catch (err) {
      bus.emit("slack.error", err);
    }
  }, 1000 * 60 * 10); // every 10 minutes
}

async function refreshSlackToken() {
  state.last_refresh_attempt_at = new Date().toISOString();
  state.last_refresh_error = null;

  try {
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: process.env.SLACK_REFRESH_TOKEN,
    });

    const res = await axios.post("https://slack.com/api/oauth.v2.access", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      validateStatus: () => true,
    });

    const data = res?.data || {};
    if (!data?.ok) {
      state.last_refresh_error = String(data?.error || "unknown");
      console.log("[Watchtower] Refresh error:", state.last_refresh_error);
      return null;
    }

    return data?.access_token || null;
  } catch (err) {
    state.last_refresh_error = String(err?.message || err);
    console.log("[Watchtower] Refresh error:", state.last_refresh_error);
    return null;
  }
}
