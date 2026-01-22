import os from "node:os";
import { eventBus } from "../core/eventBus.js";

let started = false;

const host = os.hostname();

const state = {
  trading: {
    windowMs: Number(process.env.BLUE_TEAM_TRADING_WINDOW_MS || 5 * 60 * 1000),
    maxEvents: Number(process.env.BLUE_TEAM_TRADING_MAX_EVENTS || 15),
    events: [],
  },
  payouts: {
    windowMs: Number(process.env.BLUE_TEAM_PAYOUT_WINDOW_MS || 10 * 60 * 1000),
    maxAmount: Number(process.env.BLUE_TEAM_PAYOUT_MAX_AMOUNT || 5000),
    events: [],
  },
  auth: {
    windowMs: Number(process.env.BLUE_TEAM_AUTH_WINDOW_MS || 10 * 60 * 1000),
    maxFailures: Number(process.env.BLUE_TEAM_AUTH_MAX_FAILURES || 8),
    failures: [],
    lockout: false,
  },
  slack: {
    windowMs: Number(process.env.BLUE_TEAM_SLACK_WINDOW_MS || 60 * 1000),
    maxCommands: Number(process.env.BLUE_TEAM_SLACK_MAX_COMMANDS || 30),
    commands: [],
  },
  breakers: {
    trading: false,
    payouts: false,
    auth: false,
  },
  anomalies: [],
};

function nowMs() {
  return Date.now();
}

function pruneWindow(arr, windowMs, tsSelector = (x) => x) {
  const cutoff = nowMs() - windowMs;
  return arr.filter((x) => {
    const t = Number(tsSelector(x));
    return Number.isFinite(t) && t >= cutoff;
  });
}

function pushAnomaly({ kind, severity = "medium", breaker = null, payload = {} }) {
  const ev = {
    kind: String(kind || "unknown"),
    severity: String(severity || "medium"),
    breaker: breaker ? String(breaker) : null,
    host,
    ts: new Date().toISOString(),
    payload: payload && typeof payload === "object" ? payload : { value: payload },
  };

  state.anomalies.unshift(ev);
  state.anomalies = state.anomalies.slice(0, 100);

  eventBus.emit("security.blue-team.anomaly", ev);
  return ev;
}

function setBreaker(name, on, details = {}) {
  const key = String(name || "");
  if (!Object.prototype.hasOwnProperty.call(state.breakers, key)) {
    throw new Error(`Unknown breaker '${key}'`);
  }

  const next = Boolean(on);
  const prev = Boolean(state.breakers[key]);
  if (prev === next) return;

  state.breakers[key] = next;

  const ev = {
    breaker: key,
    on: next,
    host,
    ts: new Date().toISOString(),
    details: details && typeof details === "object" ? details : { value: details },
  };

  eventBus.emit(next ? "security.blue-team.breaker.tripped" : "security.blue-team.breaker.reset", ev);
}

function handleTradingEvent(payload) {
  state.trading.events.push(nowMs());
  state.trading.events = pruneWindow(state.trading.events, state.trading.windowMs);

  if (state.breakers.trading) {
    pushAnomaly({ kind: "trading.event.blocked", severity: "high", breaker: "trading", payload });
    return;
  }

  if (state.trading.events.length > state.trading.maxEvents) {
    pushAnomaly({
      kind: "trading.volume.spike",
      severity: "critical",
      breaker: "trading",
      payload: { count: state.trading.events.length, windowMs: state.trading.windowMs },
    });
    setBreaker("trading", true, { count: state.trading.events.length, windowMs: state.trading.windowMs });
  }
}

function handlePayoutEvent(payload) {
  const amount = Number(payload?.amount ?? payload?.total ?? 0);
  state.payouts.events.push({ ts: nowMs(), amount });
  state.payouts.events = pruneWindow(state.payouts.events, state.payouts.windowMs, (x) => x.ts);

  if (state.breakers.payouts) {
    pushAnomaly({ kind: "payout.event.blocked", severity: "high", breaker: "payouts", payload });
    return;
  }

  const total = state.payouts.events.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  if (total > state.payouts.maxAmount) {
    pushAnomaly({
      kind: "payout.amount.spike",
      severity: "critical",
      breaker: "payouts",
      payload: { total, windowMs: state.payouts.windowMs, maxAmount: state.payouts.maxAmount },
    });
    setBreaker("payouts", true, { total, windowMs: state.payouts.windowMs, maxAmount: state.payouts.maxAmount });
  }
}

function handleAuthFailure(payload) {
  state.auth.failures.push({ ts: nowMs(), ip: payload?.ip || null, user: payload?.user || payload?.user_id || null });
  state.auth.failures = pruneWindow(state.auth.failures, state.auth.windowMs, (x) => x.ts);

  if (state.breakers.auth) {
    pushAnomaly({ kind: "auth.failure.during.breaker", severity: "high", breaker: "auth", payload });
    return;
  }

  if (state.auth.failures.length > state.auth.maxFailures) {
    pushAnomaly({
      kind: "auth.bruteforce.suspected",
      severity: "critical",
      breaker: "auth",
      payload: { count: state.auth.failures.length, windowMs: state.auth.windowMs, maxFailures: state.auth.maxFailures },
    });
    setBreaker("auth", true, { count: state.auth.failures.length, windowMs: state.auth.windowMs });
  }
}

function handleSlackCommand(payload) {
  state.slack.commands.push({ ts: nowMs(), action: payload?.action || null, user_id: payload?.user_id || null });
  state.slack.commands = pruneWindow(state.slack.commands, state.slack.windowMs, (x) => x.ts);

  if (state.slack.commands.length > state.slack.maxCommands) {
    pushAnomaly({
      kind: "slack.command.spam",
      severity: "medium",
      payload: { count: state.slack.commands.length, windowMs: state.slack.windowMs, maxCommands: state.slack.maxCommands },
    });
  }
}

export function getBlueTeamStatus() {
  const payoutTotal = state.payouts.events.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  return {
    ok: true,
    host,
    breakers: { ...state.breakers },
    trading: {
      windowMs: state.trading.windowMs,
      maxEvents: state.trading.maxEvents,
      recent: state.trading.events.length,
    },
    payouts: {
      windowMs: state.payouts.windowMs,
      maxAmount: state.payouts.maxAmount,
      recent: state.payouts.events.length,
      recentTotal: payoutTotal,
    },
    auth: {
      windowMs: state.auth.windowMs,
      maxFailures: state.auth.maxFailures,
      recentFailures: state.auth.failures.length,
    },
    slack: {
      windowMs: state.slack.windowMs,
      maxCommands: state.slack.maxCommands,
      recentCommands: state.slack.commands.length,
    },
    anomalies: state.anomalies,
  };
}

export function resetBlueTeamBreaker(breaker) {
  setBreaker(breaker, false, { reason: "manual" });
}

export function startBlueTeamEngine() {
  if (started) return;
  started = true;

  const enabled = String(process.env.SECURITY_BLUE_TEAM || "1").trim() === "1";
  if (!enabled) return;

  // These event names are intentionally broad so Blue-Team can attach even if
  // individual subsystems are missing.
  eventBus.on("trading.order.executed", handleTradingEvent);
  eventBus.on("wallet.payout.executed", handlePayoutEvent);

  // Already used by threat engine & incident logger.
  eventBus.on("security.auth.failure", handleAuthFailure);

  // Emitted by slack.commands.routes.js (added by Blue-Team wiring).
  eventBus.on("slack.command.received", handleSlackCommand);

  // Sentinel (optional)
  eventBus.on("sentinel.service.unreachable", (payload) => {
    pushAnomaly({ kind: "dependency.unreachable", severity: "medium", payload });
  });

  eventBus.emit("security.blue-team.online", { host, ts: new Date().toISOString() });
}
