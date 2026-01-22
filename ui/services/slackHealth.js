let warnedExpiredOnceAt = 0;

const state = {
  token_present: false,
  token_expired: false,
  disabled_until_ms: 0,
  last_ok_at: null,
  last_error_at: null,
  last_error_code: null,
  last_error_message: null,
  last_error_op: null,
};

export function classifySlackError(err) {
  const code = String(err?.data?.error || err?.code || "").trim() || null;
  const message = String(err?.message || err || "");

  const retryAfterSRaw = err?.data?.retry_after ?? err?.data?.retryAfter ?? null;
  const retry_after_s = Number.isFinite(Number(retryAfterSRaw)) ? Number(retryAfterSRaw) : null;

  const token_expired = code === "token_expired";
  const invalid_auth = code === "invalid_auth";
  const account_inactive = code === "account_inactive";
  const ratelimited = code === "ratelimited";

  return {
    code,
    message,
    retry_after_s,
    token_expired,
    invalid_auth,
    account_inactive,
    ratelimited,
    auth_problem: token_expired || invalid_auth || account_inactive,
  };
}

export function setSlackTokenPresent(present) {
  state.token_present = Boolean(present);
}

export function noteSlackSuccess(op = "unknown") {
  state.last_ok_at = new Date().toISOString();
  state.last_error_op = null;
  state.last_error_at = null;
  state.last_error_code = null;
  state.last_error_message = null;
  state.token_expired = false;

  // If we previously disabled delivery due to transient conditions, allow it again.
  if (Date.now() >= state.disabled_until_ms) {
    state.disabled_until_ms = 0;
  }
}

export function noteSlackFailure(err, op = "unknown") {
  const info = classifySlackError(err);

  state.last_error_at = new Date().toISOString();
  state.last_error_op = String(op || "unknown");
  state.last_error_code = info.code;
  state.last_error_message = info.message;

  if (info.auth_problem) {
    state.token_expired = info.token_expired;
    // Disable delivery for a while to avoid log storms.
    // (In practice you fix this by reinstalling the Slack app / updating SLACK_BOT_TOKEN.)
    state.disabled_until_ms = Date.now() + 30 * 60 * 1000;

    const now = Date.now();
    if (now - warnedExpiredOnceAt > 5 * 60 * 1000) {
      warnedExpiredOnceAt = now;
      console.warn(
        `[Slack] ⚠️ Auth problem (${info.code || "unknown"}). Slack delivery disabled for 30m; update SLACK_BOT_TOKEN and restart.`,
      );
    }

    return;
  }

  if (info.ratelimited && info.retry_after_s) {
    state.disabled_until_ms = Math.max(state.disabled_until_ms, Date.now() + info.retry_after_s * 1000);
  }
}

export function isSlackTemporarilyDisabled() {
  return Date.now() < state.disabled_until_ms;
}

export function getSlackHealth() {
  return {
    ...state,
    disabled: isSlackTemporarilyDisabled(),
    disabled_for_s: state.disabled_until_ms ? Math.max(0, Math.round((state.disabled_until_ms - Date.now()) / 1000)) : 0,
  };
}
