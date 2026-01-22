// Optional OAuth token refresh support (OFF by default).
//
// Slack bot tokens are often NOT refreshable; many installs require "Reinstall to Workspace".
// If you have token rotation enabled and Slack issued a refresh token, set:
// - SLACK_ENABLE_OAUTH_REFRESH=1
// - SLACK_CLIENT_ID=...
// - SLACK_CLIENT_SECRET=...
// - SLACK_REFRESH_TOKEN=...
//
// This module does NOT write secrets to disk. It only returns refreshed tokens.

export async function tryRefreshSlackTokenIfEnabled() {
  const enabled = String(process.env.SLACK_ENABLE_OAUTH_REFRESH || "").trim() === "1";
  if (!enabled) return { ok: false, reason: "disabled" };

  const client_id = String(process.env.SLACK_CLIENT_ID || "").trim();
  const client_secret = String(process.env.SLACK_CLIENT_SECRET || "").trim();
  const refresh_token = String(process.env.SLACK_REFRESH_TOKEN || "").trim();

  if (!client_id || !client_secret || !refresh_token) {
    return { ok: false, reason: "missing_env", missing: { client_id: !client_id, client_secret: !client_secret, refresh_token: !refresh_token } };
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id,
    client_secret,
    refresh_token,
  });

  const resp = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await resp.json().catch(() => null);
  if (!data || !data.ok) {
    return { ok: false, reason: "slack_error", slack_error: data?.error || "unknown", data };
  }

  // Slack may return tokens nested in different shapes depending on install.
  const access_token = data.access_token || data?.authed_user?.access_token || null;
  const new_refresh_token = data.refresh_token || data?.authed_user?.refresh_token || null;

  return {
    ok: true,
    token_type: data.token_type || null,
    access_token,
    refresh_token: new_refresh_token,
    expires_in: data.expires_in ?? null,
    raw: data,
  };
}
