import React, { useMemo } from "react";
import { useHealth } from "../lib/useHealth.js";
import { useHealthLastChange } from "../lib/useHealthLastChange.js";
import { useHealthHistory } from "../lib/useHealthHistory.js";
import { useHealthStream } from "../hooks/useHealthStream.js";
import { RUNBOOKS } from "../lib/runbooks";

function worstToneFromChanges(changes) {
  if (changes.some((c) => c.tone === "bad")) return "bad";
  if (changes.some((c) => c.tone === "warn")) return "warn";
  if (changes.some((c) => c.tone === "good")) return "good";
  return "neutral";
}

function keyState(ev) {
  return {
    ok: ev?.ok ?? null,
    mode: ev?.mode ?? null,
    receipts_ok: ev?.receipts?.ok ?? null,
    receipts_checked: ev?.receipts?.checked ?? null,
    receipts_mismatch: ev?.receipts?.mismatch ?? null,
    worker_stale: ev?.worker?.stale ?? null,
    worker_last_run: ev?.worker?.best_time_last_run ?? null,
    worker_source: ev?.worker?.best_time_last_run_source ?? null,
    schemas_ok: ev?.schemas?.last_lint_ok ?? null,
    schemas_at: ev?.schemas?.last_lint_at ?? null
  };
}

function fmt(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function diffKeyStates(prev, next) {
  const a = keyState(prev);
  const b = keyState(next);

  const fields = [
    ["ok", "Health OK"],
    ["mode", "Store mode"],
    ["receipts_ok", "Receipts OK"],
    ["receipts_checked", "Receipts checked"],
    ["receipts_mismatch", "Receipts mismatch"],
    ["worker_stale", "Worker stale"],
    ["worker_last_run", "Best-time last run"],
    ["worker_source", "Best-time source"],
    ["schemas_ok", "Schemas OK"],
    ["schemas_at", "Schemas lint at"]
  ];

  const changes = [];
  for (const [k, label] of fields) {
    if (a[k] !== b[k]) {
      changes.push({ key: k, label, from: a[k], to: b[k] });
    }
  }
  return changes;
}

function chip(text) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid #eee",
        background: "#fff",
        opacity: 0.9
      }}
    >
      {text}
    </span>
  );
}

function diffTone(key, from, to) {
  const f = from ?? null;
  const t = to ?? null;

  if (key === "ok" && f === true && t === false) return "bad";
  if (key === "schemas_ok" && f === true && t === false) return "bad";
  if (key === "worker_stale" && f === false && t === true) return "bad";
  if (key === "receipts_ok" && f === true && t === false) return "bad";
  if (key === "receipts_mismatch") {
    const nf = Number(f ?? 0);
    const nt = Number(t ?? 0);
    if (nf <= 0 && nt > 0) return "bad";
  }

  if (key === "ok" && f === false && t === true) return "good";
  if (key === "schemas_ok" && f === false && t === true) return "good";
  if (key === "worker_stale" && f === true && t === false) return "good";
  if (key === "receipts_ok" && f === false && t === true) return "good";
  if (key === "receipts_mismatch") {
    const nf = Number(f ?? 0);
    const nt = Number(t ?? 0);
    if (nf > 0 && nt <= 0) return "good";
  }

  return "warn";
}

function toneStyle(tone) {
  if (tone === "bad") return { border: "1px solid #fecaca", background: "#fff1f2" };
  if (tone === "good") return { border: "1px solid #bbf7d0", background: "#f0fdf4" };
  return { border: "1px solid #fde68a", background: "#fffbeb" };
}

function toneRank(tone) {
  if (tone === "bad") return 0;
  if (tone === "warn") return 1;
  if (tone === "good") return 2;
  return 3;
}

function dotColor(tone) {
  if (tone === "bad") return "#ef4444";
  if (tone === "warn") return "#f59e0b";
  if (tone === "good") return "#22c55e";
  return "#cbd5e1";
}

function dotTitle(tone) {
  if (tone === "bad") return "Regression";
  if (tone === "warn") return "Attention";
  if (tone === "good") return "Stable";
  return "Unknown";
}

function semanticToneFromEvent(ev) {
  const mismatch = Number(ev?.receipts?.mismatch ?? 0);
  const schemasOk = ev?.schemas?.last_lint_ok;
  const receiptsOk = ev?.receipts?.ok;
  const workerStale = ev?.worker?.stale;
  const workerLastRun = ev?.worker?.best_time_last_run;

  const isRed =
    ev?.ok === false ||
    schemasOk === false ||
    receiptsOk === false ||
    (Number.isFinite(mismatch) && mismatch > 0);
  if (isRed) return "bad";

  const isAmber =
    workerStale === true ||
    schemasOk == null ||
    receiptsOk == null ||
    workerLastRun == null;
  if (isAmber) return "warn";

  const isGreen =
    ev?.ok === true &&
    workerStale !== true &&
    (!Number.isFinite(mismatch) || mismatch <= 0) &&
    schemasOk !== false;
  if (isGreen) return "good";

  return "neutral";
}

function semanticColorForEvent(ev) {
  const t = semanticToneFromEvent(ev);
  if (t === "bad") return "red";
  if (t === "warn") return "amber";
  if (t === "good") return "green";
  return "gray";
}

function flapLevel(transitions) {
  if (!Number.isFinite(transitions)) return "—";
  if (transitions <= 2) return "low";
  if (transitions <= 6) return "med";
  return "high";
}

function dotEmoji(tone) {
  if (tone === "good") return "🟩";
  if (tone === "warn") return "🟨";
  if (tone === "bad") return "🟥";
  return "⬜";
}

function classifyCause(ev, tone) {
  const mismatch = Number(ev?.receipts?.mismatch ?? 0);
  const schemasOk = ev?.schemas?.last_lint_ok;
  const receiptsOk = ev?.receipts?.ok;
  const workerStale = ev?.worker?.stale;
  const workerLastRun = ev?.worker?.best_time_last_run;

  if (tone === "bad") {
    if (schemasOk === false) return "schema_fail";
    if (receiptsOk === false) return "receipts_fail";
    if (Number.isFinite(mismatch) && mismatch > 0) return "receipt_mismatch";
    if (ev?.ok === false) return "health_fail";
    return "unknown_red";
  }

  if (tone === "warn") {
    if (workerStale === true) return "worker_stale";
    if (workerLastRun == null) return "no_heartbeat";
    if (schemasOk == null) return "schemas_unknown";
    if (receiptsOk == null || ev?.receipts?.mismatch == null) return "receipts_unknown";
    return "unknown_amber";
  }

  return null;
}

function causeLabel(code) {
  return {
    schema_fail: "schema lint failures",
    receipts_fail: "receipts verification failures",
    receipt_mismatch: "receipt drift/mismatch",
    health_fail: "overall health failures",
    unknown_red: "unknown red condition",
    worker_stale: "worker stale",
    no_heartbeat: "no heartbeat",
    schemas_unknown: "schemas unknown",
    receipts_unknown: "receipts unknown",
    unknown_amber: "unknown amber condition"
  }[code] || String(code || "unknown");
}

function fmtAt(iso) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleTimeString();
}

function fmtRemaining(ms) {
  const s = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function colorLabel(c) {
  if (c === "green") return { label: "Stable", paren: "(green)" };
  if (c === "amber") return { label: "Attention", paren: "(amber)" };
  if (c === "red") return { label: "Regression", paren: "(red)" };
  return { label: "Unknown", paren: "(gray)" };
}

function severityForEvent(ev) {
  const s = ev?.severity;
  if (s === "stable" || s === "attention" || s === "incident" || s === "unknown") return s;

  const c = semanticColorForEvent(ev);
  if (c === "green") return "stable";
  if (c === "amber") return "attention";
  if (c === "red") return "incident";
  return "unknown";
}


const PM_KEY = (k) => `socialos:postmortem:${k}`;

function getPostmortem(k) {
  if (!k) return "";
  try {
    return localStorage.getItem(PM_KEY(k)) || "";
  } catch {
    return "";
  }
}

function setPostmortem(k, url) {
  if (!k) return;
  try {
    localStorage.setItem(PM_KEY(k), (url || "").trim());
  } catch {
    // ignore
  }
}

function clearPostmortem(k) {
  if (!k) return;
  try {
    localStorage.removeItem(PM_KEY(k));
  } catch {
    // ignore
  }
}

function normalizeUrl(u) {
  const s = (u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function flapTypeFromDots(dots) {
  let attention = 0;
  let incident = 0;
  let telemetry = 0;

  for (let i = 1; i < dots.length; i += 1) {
    const a = dots[i - 1]?.worst;
    const b = dots[i]?.worst;
    if (!a || !b || a === b) continue;

    const pair = [a, b];
    if (pair.includes("neutral")) telemetry += 1;
    else if (pair.includes("bad")) incident += 1;
    else if (pair.includes("warn") && pair.includes("good")) attention += 1;
  }

  const best = Math.max(attention, incident, telemetry);
  if (best <= 0) return null;
  if (best === telemetry) return "Telemetry gap flapping";
  if (best === incident) return "Incident flapping";
  return "Attention flapping";
}

function flapDiagnosis({ events, dots, flapTransitions }) {
  const level = flapLevel(flapTransitions);
  if (level !== "med" && level !== "high") return null;

  const type = flapTypeFromDots(dots) || "Flapping";

  const counts = new Map();
  let nonGreen = 0;
  for (let i = 0; i < dots.length; i += 1) {
    const ev = events[i];
    const tone = dots[i]?.worst;
    if (!ev || !tone || tone === "good") continue;
    nonGreen += 1;
    const cause = classifyCause(ev, tone) || "unknown";
    counts.set(cause, (counts.get(cause) || 0) + 1);
  }

  const ranked = Array.from(counts.entries()).sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0])));
  const top2 = ranked.slice(0, 2);
  const top2Sum = top2.reduce((acc, [, n]) => acc + n, 0);
  const coverage = nonGreen > 0 ? top2Sum / nonGreen : null;

  const confidence =
    nonGreen === 0 ? "N/A" : coverage >= 0.8 ? "High" : coverage >= 0.5 ? "Medium" : "Low";

  const unknownAmber = counts.get("unknown_amber") || 0;
  const unknownRed = counts.get("unknown_red") || 0;
  const unknownTotal = unknownAmber + unknownRed;
  const unknownShare = nonGreen > 0 ? unknownTotal / nonGreen : 0;

  const parts = top2.map(([c, n]) => `${causeLabel(c)} (${n}/${dots.length})`);
  const hint = parts.length ? `${type}: ${parts.join(", ")}` : `${type}: unknown`;

  return {
    hint,
    basedOn: dots.length,
    nonGreen,
    counts: ranked,
    top2Sum,
    coverage,
    confidence,
    unknownAmber,
    unknownRed,
    unknownTotal,
    unknownShare
  };
}

function severityChip(tone) {
  if (tone === "bad") {
    return (
      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, border: "1px solid #fecaca", background: "#fff1f2" }}>
        REGRESSION
      </span>
    );
  }
  if (tone === "good") {
    return (
      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, border: "1px solid #bbf7d0", background: "#f0fdf4" }}>
        RECOVERY
      </span>
    );
  }
  if (tone === "warn") {
    return (
      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, border: "1px solid #fde68a", background: "#fffbeb" }}>
        CHANGED
      </span>
    );
  }
  return null;
}

function minutesAgo(iso) {
  if (!iso) return null;
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 60000));
}

function secondsSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

function ageHumanShort(sec) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function incidentKeyPrefix(ev, n = 16) {
  if (!ev?.event_key) return "—";
  const s = String(ev.event_key);
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function buildIncidentSummary({ apiBase, ev, diffs }) {
  const at = ev?.at || "—";
  const key = incidentKeyPrefix(ev);
  const status = ev?.ok === true ? "OK" : ev?.ok === false ? "BAD" : "—";
  const reasons = Array.isArray(ev?.event_reason) && ev.event_reason.length ? ev.event_reason.join(", ") : "—";

  const items = (Array.isArray(diffs) ? diffs : [])
    .map((d) => ({ ...d, tone: d.key === "first" ? "neutral" : diffTone(d.key, d.from, d.to) }))
    .filter((d) => d.key !== "first")
    .sort((a, b) => toneRank(a.tone) - toneRank(b.tone))
    .slice(0, 12)
    .map((d) => {
      const tag = d.tone === "bad" ? "REGRESSION" : d.tone === "good" ? "RECOVERY" : "CHANGED";
      return `- [${tag}] ${d.label}: ${fmt(d.from)} -> ${fmt(d.to)}`;
    });

  const lines = [
    "SocialOS Health Incident",
    `Time: ${at}`,
    `Event: ${key}`,
    `Status: ${status}`,
    `Reason: ${reasons}`,
    apiBase ? `Health: ${apiBase}/health` : null,
    "",
    "Changes:",
    items.length ? items.join("\n") : "- (no diffs available)",
    ""
  ].filter((x) => x != null);

  return lines.join("\n");
}

function describeDiff(d) {
  const f = d.from ?? null;
  const t = d.to ?? null;

  if (d.key === "schemas_ok") return t === false ? "schemas lint failed" : t === true ? "schemas lint restored" : "schemas lint changed";
  if (d.key === "worker_stale") return t === true ? "worker went stale" : t === false ? "worker recovered" : "worker stale state changed";
  if (d.key === "ok") return t === false ? "system health went bad" : t === true ? "system OK restored" : "system health changed";
  if (d.key === "receipts_ok") return t === false ? "receipts verification failed" : t === true ? "receipts verification restored" : "receipts OK changed";
  if (d.key === "receipts_mismatch") {
    const nf = Number(f ?? 0);
    const nt = Number(t ?? 0);
    if (nf <= 0 && nt > 0) return "receipts mismatch appeared";
    if (nf > 0 && nt <= 0) return "receipts mismatch cleared";
    if (nt > nf) return "receipts mismatch increased";
    if (nt < nf) return "receipts mismatch decreased";
    return "receipts mismatch changed";
  }
  if (d.key === "worker_last_run") return "best-time ran";
  if (d.key === "receipts_checked") return "receipts checked changed";
  if (d.key === "mode") return t ? `store mode changed to ${String(t)}` : "store mode changed";
  if (d.key === "worker_source") return t ? `best-time source changed to ${String(t)}` : "best-time source changed";
  if (d.key === "schemas_at") return "schemas lint timestamp updated";

  return d.label ? `${d.label} changed` : "state changed";
}

function joinPhrases(phrases, max = 3) {
  const uniq = Array.from(new Set((phrases || []).filter(Boolean)));
  const head = uniq.slice(0, max);
  const rest = uniq.length - head.length;
  const core = head.join(" and ");
  return rest > 0 ? `${core} +${rest} more` : core;
}

function explainChange(changes) {
  if (!Array.isArray(changes) || !changes.length) return null;
  if (changes.some((c) => c.key === "first")) return "First recorded event.";

  const reds = changes.filter((c) => c.tone === "bad").map(describeDiff);
  const greens = changes.filter((c) => c.tone === "good").map(describeDiff);
  const ambers = changes.filter((c) => c.tone === "warn").map(describeDiff);

  if (reds.length) return `Regression: ${joinPhrases(reds)}.`;
  if (greens.length) return `Recovery: ${joinPhrases(greens)}.`;
  if (ambers.length) return `Change: ${joinPhrases(ambers)}.`;
  return "Change: state updated.";
}

function shortKeyName(key) {
  if (key === "ok") return "health.ok";
  if (key === "schemas_ok") return "schemas.lint_ok";
  if (key === "schemas_at") return "schemas.lint_at";
  if (key === "worker_stale") return "worker.stale";
  if (key === "worker_last_run") return "worker.last_run";
  if (key === "worker_source") return "worker.source";
  if (key === "receipts_ok") return "receipts.ok";
  if (key === "receipts_checked") return "receipts.checked";
  if (key === "receipts_mismatch") return "receipts.mismatch";
  if (key === "mode") return "store.mode";
  return key;
}

function buildRecentTimelineMarkdown({ events, max = 5 }) {
  const items = (Array.isArray(events) ? events : []).slice(0, max);
  if (!items.length) return "";

  const lines = [];
  for (let i = 0; i < items.length; i += 1) {
    const ev = items[i];
    const older = items[i + 1] || null;
    const diffs = older ? diffKeyStates(older, ev) : [{ key: "first", label: "First snapshot", from: null, to: null }];

    const changes = diffs
      .map((d) => ({ ...d, tone: d.key === "first" ? "neutral" : diffTone(d.key, d.from, d.to) }))
      .sort((a, b) => toneRank(a.tone) - toneRank(b.tone));

    const worst = worstToneFromChanges(changes);
    const sev = dotTitle(worst);
    const at = ev?.at ? new Date(ev.at).toLocaleTimeString() : "—";

    const top = changes.find((c) => c.key !== "first") || null;
    const detail = top ? `${shortKeyName(top.key)} ${fmt(top.from)}→${fmt(top.to)}` : "(no diffs)";
    const extra = changes.filter((c) => c.key !== "first").length - (top ? 1 : 0);
    const tail = extra > 0 ? ` +${extra} more` : "";
    lines.push(`- ${at} — ${sev} — ${detail}${tail}`);
  }

  return ["### Recent timeline (last 5)", ...lines, ""].join("\n");
}

function buildIncidentMarkdown({ apiBase, ev, incidentText }) {
  const at = ev?.at || "—";
  const key = incidentKeyPrefix(ev);
  const status = ev?.ok === true ? "OK" : ev?.ok === false ? "BAD" : "—";
  const reasons = Array.isArray(ev?.event_reason) && ev.event_reason.length ? ev.event_reason.join(", ") : "—";

  const links = apiBase
    ? [
        `- Health: ${apiBase}/health`,
        `- Last change: ${apiBase}/health/history/last-change?since_seconds=300`,
        `- History (5): ${apiBase}/health/history?limit=5`
      ].join("\n")
    : "- (apiBase not configured)";

  return [
    "## SocialOS Health Incident",
    "",
    `**Time:** ${at}`,
    `**Event:** ${key}`,
    `**Status:** ${status}`,
    `**Reason:** ${reasons}`,
    "",
    "### Impact",
    "- (describe user-facing impact, if any)",
    "",
    "### What changed",
    "```text",
    incidentText || "",
    "```",
    "",
    "### Links",
    links,
    "",
    "### Suspected cause",
    "- (hypothesis)",
    "",
    "### Next actions",
    "- [ ] Triage",
    "- [ ] Reproduce",
    "- [ ] Fix",
    "- [ ] Add guardrail/test",
    ""
  ].join("\n");
}

function githubIssueUrl({ issuesNewUrl, title, body }) {
  if (!issuesNewUrl) return null;
  try {
    const u = new URL(issuesNewUrl);
    u.searchParams.set("title", title || "");
    u.searchParams.set("body", body || "");
    return u.toString();
  } catch {
    return null;
  }
}

async function writeClipboardText(text) {
  if (!text) return;
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function pill(text, tone = "neutral") {
  const styles = {
    neutral: { border: "1px solid #ddd", background: "#fafafa" },
    ok: { border: "1px solid #cfe9d7", background: "#f3fbf6" },
    warn: { border: "1px solid #ffe0b2", background: "#fff8e6" },
    bad: { border: "1px solid #f5c2c7", background: "#fff5f5" }
  }[tone];

  return (
    <span style={{ ...styles, padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>
      {text}
    </span>
  );
}

export default function HealthStatusCard({ apiBase }) {
  const { health, error, loading, refresh } = useHealth({ apiBase, intervalMs: 120000 });
  const last = useHealthLastChange({ apiBase, sinceSeconds: 300, intervalMs: 120000 });
  const [flapWindow, setFlapWindow] = React.useState(20);
  const [historyPollEnabled, setHistoryPollEnabled] = React.useState(false);
  const historyPollTimerRef = React.useRef(null);
  const history = useHealthHistory({ apiBase, limit: flapWindow, intervalMs: historyPollEnabled ? 30000 : 0 });
  const [expandedEventKey, setExpandedEventKey] = React.useState(null);
  const newestRef = React.useRef(null);
  const lastAutoOpenedKeyRef = React.useRef(null);
  const lastPagerActedKeyRef = React.useRef(null);
  const pagerMuteTimeoutRef = React.useRef(null);
  const [includeLast5InIssue, setIncludeLast5InIssue] = React.useState(true);
  const [showAttributionBreakdown, setShowAttributionBreakdown] = React.useState(false);
  const [selectedBucket, setSelectedBucket] = React.useState(null);
  const [scopeFilter, setScopeFilter] = React.useState("all");
  const [severityFilter, setSeverityFilter] = React.useState("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [pagerMode, setPagerMode] = React.useState(false);
  const [focusedPagerKey, setFocusedPagerKey] = React.useState(null);
  const [acknowledgedPagerKey, setAcknowledgedPagerKey] = React.useState(() => {
    try {
      const k = window?.localStorage?.getItem("socialos_pager_ack_key") || "";
      return k ? String(k) : null;
    } catch {
      return null;
    }
  });
  const [pagerMuteUntilStable, setPagerMuteUntilStable] = React.useState(() => {
    try {
      return window?.localStorage?.getItem("socialos_pager_mute_until_stable") === "1";
    } catch {
      return false;
    }
  });
  const [pagerSnoozeUntilNextRed, setPagerSnoozeUntilNextRed] = React.useState(() => {
    try {
      return window?.localStorage?.getItem("socialos_pager_snooze_until_next_red") === "1";
    } catch {
      return false;
    }
  });
  const [pagerMuteUntilMs, setPagerMuteUntilMs] = React.useState(() => {
    try {
      const raw = window?.localStorage?.getItem("socialos_pager_mute_until_ms");
      const v = Number(raw);
      return Number.isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  });

  const [muteTick, setMuteTick] = React.useState(0);

  const [postmortemUrl, setPostmortemUrl] = React.useState("");
  const postmortemInputRef = React.useRef(null);
  const [postmortemHint, setPostmortemHint] = React.useState("");
  const [postmortemSavedToast, setPostmortemSavedToast] = React.useState(false);
  const toastTimerRef = React.useRef(null);

  const [streamStatus, setStreamStatus] = React.useState("connecting");
  const [streamEvents, setStreamEvents] = React.useState([]);
  const streamEnabled = typeof EventSource !== "undefined";

  const IS_LOCALHOST = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const DEV_ONLY = IS_LOCALHOST;

  const [liveResetNote, setLiveResetNote] = React.useState(null);
  const liveResetTimerRef = React.useRef(null);

  const [liveStreamNote, setLiveStreamNote] = React.useState(null);
  const liveStreamTimerRef = React.useRef(null);

  const [eventsPerMin, setEventsPerMin] = React.useState(0);
  const [lastStreamEventAt, setLastStreamEventAt] = React.useState(null);
  const streamTimesRef = React.useRef([]);

  function showLiveReset(payload) {
    const p = payload && typeof payload === "object" ? payload : { reason: String(payload || "reset") };
    const reason = String(p?.reason || "reset");
    const cursor = p?.server_cursor ? String(p.server_cursor).slice(0, 8) : null;
    const historyLen = Number.isFinite(Number(p?.history_len)) ? String(p.history_len) : null;
    const replayLimit = Number.isFinite(Number(p?.replay_limit)) ? String(p.replay_limit) : null;

    const extra = [
      cursor ? `server_cursor=${cursor}` : null,
      historyLen ? `history=${historyLen}` : null,
      replayLimit ? `replay_limit=${replayLimit}` : null
    ].filter(Boolean).join(", ");

    const msg = `Live sync reset (${reason.replaceAll("_", " ")}).${extra ? ` ${extra}` : ""} → history refreshed`;
    setLiveResetNote(msg);
    if (liveResetTimerRef.current) clearTimeout(liveResetTimerRef.current);
    liveResetTimerRef.current = setTimeout(() => setLiveResetNote(null), 8000);
  }

  function showLiveStreamNote(msg, ttlMs = 4000) {
    setLiveStreamNote(String(msg || ""));
    if (liveStreamTimerRef.current) clearTimeout(liveStreamTimerRef.current);
    liveStreamTimerRef.current = setTimeout(() => setLiveStreamNote(null), Math.max(500, Number(ttlMs || 0)));
  }

  const clearHistoryPollFallbackTimer = React.useCallback(() => {
    if (historyPollTimerRef.current) {
      clearTimeout(historyPollTimerRef.current);
      historyPollTimerRef.current = null;
    }
  }, []);

  const scheduleHistoryPollFallback = React.useCallback(() => {
    clearHistoryPollFallbackTimer();
    historyPollTimerRef.current = setTimeout(() => setHistoryPollEnabled(true), 30000);
  }, [clearHistoryPollFallbackTimer]);

  const onStreamEvent = React.useCallback((ev) => {
    if (!ev) return;
    const now = Date.now();
    setLastStreamEventAt(now);
    try {
      const next = Array.isArray(streamTimesRef.current) ? streamTimesRef.current.slice() : [];
      next.push(now);
      const cutoff = now - 60_000;
      const filtered = next.filter((t) => Number.isFinite(t) && t >= cutoff);
      streamTimesRef.current = filtered;
      setEventsPerMin(filtered.length);
    } catch {
      // ignore
    }
    setStreamEvents((prev) => {
      const key = ev?.event_key || ev?.at || null;
      const next = [ev, ...(Array.isArray(prev) ? prev.filter((x) => (x?.event_key || x?.at || null) !== key) : [])];
      return next.slice(0, 100);
    });
    setHistoryPollEnabled(false);
    clearHistoryPollFallbackTimer();
    setStreamStatus("connected");
  }, [clearHistoryPollFallbackTimer]);

  const lastStreamStatusRef = React.useRef(null);
  const onStreamStatus = React.useCallback((s) => {
    setStreamStatus(s);
    const prev = lastStreamStatusRef.current;
    lastStreamStatusRef.current = s;

    if (s === "reconnecting") {
      showLiveStreamNote("Live sync reconnecting…");
    }
    if (s === "connected" && prev && prev !== "connected") {
      showLiveStreamNote("Live sync reconnected");
    }
    if (s === "paused") {
      showLiveStreamNote("Live sync paused");
    }

    if (s === "connected") {
      setHistoryPollEnabled(false);
      clearHistoryPollFallbackTimer();
    } else if (s === "reconnecting") {
      setHistoryPollEnabled(false);
      scheduleHistoryPollFallback();
    }
  }, [clearHistoryPollFallbackTimer, scheduleHistoryPollFallback]);

  const resetInFlightRef = React.useRef(false);

  const onStreamReset = React.useCallback(async (reason) => {
    showLiveReset(reason || "reset");
    if (resetInFlightRef.current) return;
    resetInFlightRef.current = true;
    try {
      await history.refresh();
    } catch {
      // ignore
    } finally {
      resetInFlightRef.current = false;
    }
  }, [history]);

  const { cursor, coldConnect, reconnect: reconnectSse, pause: pauseSse, resume: resumeSse, paused: ssePaused } = useHealthStream({
    baseUrl: apiBase,
    onEvent: onStreamEvent,
    onReset: onStreamReset,
    onStatus: onStreamStatus,
    enabled: streamEnabled
  });

  function showPostmortemSavedToast() {
    setPostmortemSavedToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setPostmortemSavedToast(false), 1500);
  }

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (liveResetTimerRef.current) clearTimeout(liveResetTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (liveStreamTimerRef.current) clearTimeout(liveStreamTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    return () => {
      clearHistoryPollFallbackTimer();
    };
  }, [clearHistoryPollFallbackTimer]);

  React.useEffect(() => {
    if (!historyPollEnabled) return;
    try {
      history.refresh();
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPollEnabled]);

  const pagerIsMuted = React.useMemo(() => {
    return Number.isFinite(pagerMuteUntilMs) && pagerMuteUntilMs > Date.now();
  }, [pagerMuteUntilMs]);

  const pagerIsMutedAny = React.useMemo(() => {
    return pagerIsMuted || pagerMuteUntilStable;
  }, [pagerIsMuted, pagerMuteUntilStable]);

  function schedulePagerUnmute(untilMs) {
    if (pagerMuteTimeoutRef.current) {
      clearTimeout(pagerMuteTimeoutRef.current);
      pagerMuteTimeoutRef.current = null;
    }
    const delay = Math.max(0, Number(untilMs || 0) - Date.now());
    if (delay <= 0) return;
    pagerMuteTimeoutRef.current = setTimeout(() => {
      setPagerMuteUntilMs(0);
      try {
        window?.localStorage?.removeItem("socialos_pager_mute_until_ms");
      } catch {
        // ignore
      }
    }, delay);
  }

  function setPagerMuteFor(ms) {
    const until = Date.now() + Math.max(0, Number(ms || 0));
    setPagerMuteUntilMs(until);
    try {
      window?.localStorage?.setItem("socialos_pager_mute_until_ms", String(until));
    } catch {
      // ignore
    }
    schedulePagerUnmute(until);
  }

  function clearPagerMute() {
    setPagerMuteUntilMs(0);
    if (pagerMuteTimeoutRef.current) {
      clearTimeout(pagerMuteTimeoutRef.current);
      pagerMuteTimeoutRef.current = null;
    }
    try {
      window?.localStorage?.removeItem("socialos_pager_mute_until_ms");
    } catch {
      // ignore
    }
  }

  function enableMuteUntilStable() {
    setPagerMuteUntilStable(true);
    try {
      window?.localStorage?.setItem("socialos_pager_mute_until_stable", "1");
    } catch {
      // ignore
    }
    // optional: avoid overlapping states
    clearPagerMute();
  }

  function disableMuteUntilStable() {
    setPagerMuteUntilStable(false);
    try {
      window?.localStorage?.removeItem("socialos_pager_mute_until_stable");
    } catch {
      // ignore
    }
  }

  const snoozeSawNonRedRef = React.useRef(false);

  function enableSnoozeUntilNextRed() {
    setPagerSnoozeUntilNextRed(true);
    snoozeSawNonRedRef.current = false;
    try {
      window?.localStorage?.setItem("socialos_pager_snooze_until_next_red", "1");
    } catch {
      // ignore
    }
    if (pagerHit?.rowKey) lastPagerActedKeyRef.current = String(pagerHit.rowKey);
    showLiveStreamNote("Pager snoozed until next red");
  }

  function disableSnoozeUntilNextRed({ silent = false } = {}) {
    setPagerSnoozeUntilNextRed(false);
    snoozeSawNonRedRef.current = false;
    try {
      window?.localStorage?.removeItem("socialos_pager_snooze_until_next_red");
    } catch {
      // ignore
    }
    if (!silent) showLiveStreamNote("Pager snooze cleared");
  }

  async function refreshAll() {
    await Promise.allSettled([refresh(), last.refresh(), history.refresh()]);
  }

  React.useEffect(() => {
    refreshAll();
    const t = setInterval(refreshAll, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  React.useEffect(() => {
    if (pagerMuteUntilMs > Date.now()) schedulePagerUnmute(pagerMuteUntilMs);
    return () => {
      if (pagerMuteTimeoutRef.current) {
        clearTimeout(pagerMuteTimeoutRef.current);
        pagerMuteTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!pagerIsMutedAny) return;
    const t = setInterval(() => setMuteTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [pagerIsMutedAny]);

  const derived = useMemo(() => {
    const mode = health?.mode ?? "—";
    const receiptsOk = health?.receipts?.ok;
    const checked = health?.receipts?.checked ?? null;

    const lastRun = health?.worker?.best_time_last_run ?? null;
    const mins = minutesAgo(lastRun);
    const stale = health?.worker?.stale;

    const schemasOk = health?.schemas?.last_lint_ok;

    const overallOk = health?.ok;
    const statusCode = health?.status_code || null;
    const recommendedAction = health?.recommended_action || null;
    const severity = health?.severity || null;

    return {
      mode,
      receiptsOk,
      checked,
      mins,
      stale,
      schemasOk,
      overallOk,
      statusCode,
      recommendedAction,
      severity
    };
  }, [health]);

  const statusCode = health?.status_code || "";
  const rb = RUNBOOKS[statusCode] || RUNBOOKS.DEFAULT;
  const rbVersion = RUNBOOKS?._meta?.version || "unknown";
  const missingRunbook = DEV_ONLY && statusCode && !RUNBOOKS[statusCode];
  const tooltip = `Runbook map v${rbVersion}${statusCode ? ` · ${statusCode}` : ""}`;

  const overallTone =
    loading ? "neutral" : error ? "bad" : derived.overallOk === true ? "ok" : derived.overallOk === false ? "bad" : "neutral";

  const receiptsTone = derived.receiptsOk === true ? "ok" : derived.receiptsOk === false ? "bad" : "neutral";

  const workerTone = derived.stale === true ? "warn" : derived.stale === false ? "ok" : "neutral";

  const schemasTone = derived.schemasOk === true ? "ok" : derived.schemasOk === false ? "bad" : "neutral";

  const lastEvent = last.data?.event || null;
  const ageHuman = last.data?.age_human || null;
  const changedRecently = last.data?.changed_recently;
  const ageSec = last.data?.age_seconds ?? null;
  const stableAfterSec = 15 * 60;
  const isStable = typeof ageSec === "number" && ageSec >= stableAfterSec;
  const reason = Array.isArray(lastEvent?.event_reason) && lastEvent.event_reason.length ? lastEvent.event_reason[0] : null;

  const baseEvents = Array.isArray(history.data?.items) ? history.data.items : [];
  const events = useMemo(() => {
    if (!streamEvents.length) return baseEvents.slice(0, flapWindow);

    const seen = new Set();
    const out = [];

    for (const ev of streamEvents) {
      const k = ev?.event_key || ev?.at || null;
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(ev);
    }

    for (const ev of baseEvents) {
      const k = ev?.event_key || ev?.at || null;
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(ev);
    }

    return out.slice(0, flapWindow);
  }, [baseEvents, flapWindow, streamEvents]);

  const newestRaw = events[0] || null;
  const newestColor = newestRaw ? semanticColorForEvent(newestRaw) : "gray";
  const newestHuman = colorLabel(newestColor);
  const newestSeverity = newestRaw ? severityForEvent(newestRaw) : "unknown";
  const newestScopes = Array.isArray(newestRaw?.event_scope)
    ? newestRaw.event_scope
    : newestRaw?.event_scope
      ? [newestRaw.event_scope]
      : [];

  const pagerIncidentActive = pagerMode && newestRaw && newestSeverity === "incident" && newestScopes.includes("receipts");
  const pinnedPagerEvent = pagerIncidentActive ? newestRaw : null;
  const pinnedKey = pinnedPagerEvent?.event_key || pinnedPagerEvent?.at || null;

  React.useEffect(() => {
    setPostmortemUrl(getPostmortem(pinnedKey));
  }, [pinnedKey]);

  const pagerPinnedReason = useMemo(() => {
    if (!pagerIncidentActive || !newestRaw) return null;
    if (newestRaw?.status_code) return String(newestRaw.status_code);
    const mismatch = Number(newestRaw?.receipts?.mismatch ?? 0);
    if (newestRaw?.receipts?.ok === false) return "receipts.ok=false";
    if (Number.isFinite(mismatch) && mismatch > 0) return "mismatch detected";
    if (newestRaw?.ok === false) return "health.ok=false";
    return "receipt regression";
  }, [pagerIncidentActive, newestRaw?.ok, newestRaw?.receipts?.ok, newestRaw?.receipts?.mismatch]);

  const pagerIsAcknowledged = Boolean(pinnedKey && acknowledgedPagerKey === pinnedKey);

  const timelineDots = useMemo(() => {
    const dots = [];
    const n = Math.min(flapWindow, events.length);
    for (let i = 0; i < n; i += 1) {
      const ev = events[i];
      const worst = semanticToneFromEvent(ev);
      const rowKey = ev?.event_key || ev?.at || String(i);
      dots.push({ rowKey, worst, at: ev?.at || null });
    }
    return dots;
  }, [events, flapWindow]);

  const flapTransitions = useMemo(() => {
    if (!timelineDots.length) return 0;
    let count = 0;
    for (let i = 1; i < timelineDots.length; i += 1) {
      if (timelineDots[i].worst !== timelineDots[i - 1].worst) count += 1;
    }
    return count;
  }, [timelineDots]);

  const stability = useMemo(() => {
    const dots = timelineDots;
    let stableStreak = 0;
    for (const d of dots) {
      if (d.worst === "good") stableStreak += 1;
      else break;
    }

    let longestStable = 0;
    let longestChurn = 0;
    let runStable = 0;
    let runChurn = 0;
    for (const d of dots) {
      if (d.worst === "good") {
        runStable += 1;
        longestStable = Math.max(longestStable, runStable);
        runChurn = 0;
      } else if (d.worst === "bad" || d.worst === "warn") {
        runChurn += 1;
        longestChurn = Math.max(longestChurn, runChurn);
        runStable = 0;
      } else {
        runStable = 0;
        runChurn = 0;
      }
    }

    const lastStable = dots.find((d) => d.worst === "good") || null;
    const lastStableHuman = ageHumanShort(secondsSince(lastStable?.at || null));
    return { stableStreak, longestStable, longestChurn, lastStableHuman };
  }, [timelineDots]);

  const flapDiag = useMemo(() => flapDiagnosis({ events, dots: timelineDots, flapTransitions }), [events, timelineDots, flapTransitions]);

  const lastStreamAgoSec = React.useMemo(() => {
    if (!lastStreamEventAt) return null;
    const ms = Date.now() - Number(lastStreamEventAt);
    if (!Number.isFinite(ms)) return null;
    return Math.max(0, Math.floor(ms / 1000));
  }, [lastStreamEventAt, streamStatus, eventsPerMin]);

  const bucketContrib = useMemo(() => {
    const byCause = new Map();
    const n = Math.min(events.length, timelineDots.length);
    for (let i = 0; i < n; i += 1) {
      const ev = events[i];
      const tone = timelineDots[i]?.worst;
      if (!ev || !tone || tone === "good") continue;

      const cause = classifyCause(ev, tone) || "unknown";
      const at = ev?.at || null;
      const when = fmtAt(at);
      const key = incidentKeyPrefix(ev, 12);
      const reasonShort = Array.isArray(ev?.event_reason) && ev.event_reason.length ? ev.event_reason[0] : "—";

      const source = String(ev?.source || "poll");
      const scopeArr = Array.isArray(ev?.event_scope)
        ? ev.event_scope.slice()
        : ev?.event_scope
          ? [ev.event_scope]
          : [];
      scopeArr.sort((a, b) => String(a).localeCompare(String(b)));

      if (!byCause.has(cause)) byCause.set(cause, []);
      byCause.get(cause).push({ at, when, key, reasonShort, tone, source, scope: scopeArr });
    }
    return byCause;
  }, [events, timelineDots]);

  const breakdownBySource = useMemo(() => {
    const out = new Map();
    const n = Math.min(events.length, timelineDots.length);
    for (let i = 0; i < n; i += 1) {
      const ev = events[i];
      const tone = timelineDots[i]?.worst;
      if (!ev || !tone || tone === "good") continue;
      const src = String(ev?.source || "poll");
      const cause = classifyCause(ev, tone) || "unknown";
      if (!out.has(src)) out.set(src, new Map());
      const m = out.get(src);
      m.set(cause, (m.get(cause) || 0) + 1);
    }

    const rows = Array.from(out.entries()).map(([src, m]) => {
      const ranked = Array.from(m.entries()).sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0])));
      return { src, ranked };
    });
    rows.sort((a, b) => String(a.src).localeCompare(String(b.src)));
    return rows;
  }, [events, timelineDots]);

  const pagerHit = useMemo(() => {
    const newest = events[0] || null;
    const older = events[1] || null;
    if (!newest || !older) {
      return { hit: false, rowKey: null, incidentText: null, issueUrl: null, body: null, rowReason: null };
    }

    const rowKey = newest?.event_key || newest?.at || null;
    if (!rowKey) {
      return { hit: false, rowKey: null, incidentText: null, issueUrl: null, body: null, rowReason: null };
    }

    const changesRaw = diffKeyStates(older, newest);
    const changes = changesRaw
      .map((c) => ({ ...c, tone: diffTone(c.key, c.from, c.to) }))
      .sort((a, b) => toneRank(a.tone) - toneRank(b.tone));
    const worstTone = worstToneFromChanges(changes);

    const scopes = Array.isArray(newest?.event_scope)
      ? newest.event_scope
      : newest?.event_scope
        ? [newest.event_scope]
        : [];
    const hasReceiptsScope = scopes.includes("receipts");

    if (worstTone !== "bad" || !hasReceiptsScope) {
      return { hit: false, rowKey, incidentText: null, issueUrl: null, body: null, rowReason: null };
    }

    const rowReason = Array.isArray(newest?.event_reason) && newest.event_reason.length ? newest.event_reason.join(", ") : "—";
    const incidentText = buildIncidentSummary({ apiBase, ev: newest, diffs: changesRaw });
    const issuesNewUrl = import.meta.env?.VITE_GITHUB_ISSUES_NEW_URL || "https://github.com/ihoward40/SintraPrime/issues/new";
    const title = `SocialOS incident: REGRESSION — ${rowReason}`;
    const timeline = includeLast5InIssue ? buildRecentTimelineMarkdown({ events, max: 5 }) : "";
    const body = buildIncidentMarkdown({ apiBase, ev: newest, incidentText }) + (timeline ? `\n${timeline}` : "");
    const issueUrl = githubIssueUrl({ issuesNewUrl, title, body });
    return { hit: true, rowKey, incidentText, issueUrl, body, rowReason };
  }, [events, apiBase, includeLast5InIssue]);

  const filteredEvents = useMemo(() => {
    const out = [];
    for (let idx = 0; idx < events.length; idx += 1) {
      const ev = events[idx];
      const older = events[idx + 1] || null;
      const changesRaw = older
        ? diffKeyStates(older, ev)
        : [{ key: "first", label: "First snapshot", from: null, to: null }];

      const changes = changesRaw
        .map((c) => ({ ...c, tone: c.key === "first" ? "neutral" : diffTone(c.key, c.from, c.to) }))
        .sort((a, b) => toneRank(a.tone) - toneRank(b.tone));

      const worstTone = worstToneFromChanges(changes);
      const src = String(ev?.source || "poll");
      const scopes = Array.isArray(ev?.event_scope)
        ? ev.event_scope.slice()
        : ev?.event_scope
          ? [ev.event_scope]
          : [];
      scopes.sort((a, b) => String(a).localeCompare(String(b)));

      const matchesSeverity =
        severityFilter === "all"
          ? true
          : severityFilter === "regression"
            ? worstTone === "bad"
            : severityFilter === "attention"
              ? worstTone === "warn"
              : severityFilter === "stable"
                ? worstTone === "good"
                : true;

      const matchesScope = scopeFilter === "all" ? true : scopes.includes(scopeFilter);
      const matchesSource = sourceFilter === "all" ? true : src === sourceFilter;

      const rowKey = ev?.event_key || ev?.at || String(idx);

      if (matchesSeverity && matchesScope && matchesSource) {
        out.push({ ev, idx, rowKey, older, changesRaw, changes, worstTone, src, scopes });
      }
    }
    return out;
  }, [events, scopeFilter, severityFilter, sourceFilter]);

  const sourceOptions = useMemo(() => {
    const set = new Set();
    for (const ev of events) set.add(String(ev?.source || "poll"));
    const arr = Array.from(set);
    arr.sort((a, b) => String(a).localeCompare(String(b)));
    return arr;
  }, [events]);

  const lastGreen = useMemo(() => {
    if (!events.length) return null;
    for (let i = 1; i < events.length; i += 1) {
      const ev = events[i];
      if (semanticColorForEvent(ev) === "green") return ev;
    }
    return null;
  }, [events]);

  const triDiff = useMemo(() => {
    const newest = events[0] || null;
    const prev = events[1] || null;
    if (!newest || !prev) return null;
    const justChanged = diffKeyStates(prev, newest);
    const sinceStable = lastGreen ? diffKeyStates(lastGreen, newest) : null;
    return { newest, prev, lastGreen, justChanged, sinceStable };
  }, [events, lastGreen]);

  const pinnedRow = useMemo(() => {
    if (!pinnedPagerEvent || !pinnedKey) return null;
    const idx = 0;
    const ev = pinnedPagerEvent;
    const older = events[1] || null;
    const changesRaw = older
      ? diffKeyStates(older, ev)
      : [{ key: "first", label: "First snapshot", from: null, to: null }];
    const changes = changesRaw
      .map((c) => ({ ...c, tone: c.key === "first" ? "neutral" : diffTone(c.key, c.from, c.to) }))
      .sort((a, b) => toneRank(a.tone) - toneRank(b.tone));
    const worstTone = worstToneFromChanges(changes);
    const src = String(ev?.source || "poll");
    const scopes = Array.isArray(ev?.event_scope) ? ev.event_scope.slice() : ev?.event_scope ? [ev.event_scope] : [];
    scopes.sort((a, b) => String(a).localeCompare(String(b)));
    return { ev, idx, rowKey: pinnedKey, older, changesRaw, changes, worstTone, src, scopes };
  }, [pinnedPagerEvent, pinnedKey, events]);

  const filteredEventsNoPinned = useMemo(() => {
    if (!filteredEvents.length || !pinnedKey) return filteredEvents;
    return filteredEvents.filter((r) => r.rowKey !== pinnedKey);
  }, [filteredEvents, pinnedKey]);

  function renderHistoryRow(row, { pinned = false } = {}) {
    const { ev, idx, rowKey, changesRaw, changes, worstTone, src, scopes } = row;
    const isExpanded = expandedEventKey === rowKey;

    const at = ev?.at ? new Date(ev.at).toLocaleTimeString() : "—";
    const okTxt = ev?.ok === true ? "OK" : ev?.ok === false ? "BAD" : "—";
    const rowReason = Array.isArray(ev?.event_reason) && ev.event_reason.length ? ev.event_reason.join(", ") : "—";

    const summary =
      changes
        .slice(0, 3)
        .map((c) => c.label)
        .join(", ") + (changes.length > 3 ? ` +${changes.length - 3}` : "");

    return (
      <div
        ref={idx === 0 ? newestRef : undefined}
        key={rowKey}
        data-event-row={rowKey}
        style={{
          fontSize: 12,
          padding: "8px 10px",
          border: pinned ? "1px solid #fecaca" : "1px solid #eee",
          borderRadius: 12,
          background: pinned ? "#fff1f2" : "#fafafa"
        }}
      >
        {pinned ? (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
            <span style={{ fontWeight: 900 }}>Pinned incident (pager)</span>
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {getPostmortem(pinnedKey) ? (
                <a
                  href={getPostmortem(pinnedKey)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, fontWeight: 900, textDecoration: "none" }}
                  title={getPostmortem(pinnedKey)}
                >
                  🔗 Postmortem
                </a>
              ) : null}
              <span style={{ opacity: 0.8 }}>{chip("always visible")}</span>
            </span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setExpandedEventKey(isExpanded ? null : rowKey)}
          style={{
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer"
          }}
          title={ev?.event_key ? `event_key: ${String(ev.event_key).slice(0, 16)}…` : ""}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <span style={{ fontWeight: 800 }}>{at}</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {severityChip(worstTone)}
              <span style={{ opacity: 0.75 }}>{okTxt}</span>
            </span>
          </div>

          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {chip(`src: ${src || "—"}`)}
            {(Array.isArray(scopes) && scopes.length ? scopes : ["system"]).map((s) => (
              <span key={String(s)}>{chip(String(s))}</span>
            ))}
          </div>

          <div style={{ marginTop: 3, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ opacity: 0.9 }}>{rowReason}</span>
            <span style={{ opacity: 0.7 }}>{isExpanded ? "▾" : "▸"}</span>
          </div>

          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>{chip(`Δ ${summary}`)}</div>
        </button>

        {isExpanded ? (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <div style={{ marginTop: 2, fontSize: 12, fontWeight: 800 }}>{explainChange(changes)}</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={async () => {
                  const incidentText = buildIncidentSummary({ apiBase, ev, diffs: changesRaw });
                  try {
                    await writeClipboardText(incidentText);
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 800
                }}
                title="Copy a compact incident summary to clipboard"
              >
                Copy incident summary
              </button>

              {(() => {
                const issuesNewUrl = import.meta.env?.VITE_GITHUB_ISSUES_NEW_URL || "https://github.com/ihoward40/SintraPrime/issues/new";

                const incidentText = buildIncidentSummary({ apiBase, ev, diffs: changesRaw });
                const title = `SocialOS incident: ${worstTone === "bad" ? "REGRESSION" : "CHANGE"} — ${rowReason}`;
                const timeline = includeLast5InIssue ? buildRecentTimelineMarkdown({ events, max: 5 }) : "";
                const body = buildIncidentMarkdown({ apiBase, ev, incidentText }) + (timeline ? `\n${timeline}` : "");
                const url = githubIssueUrl({ issuesNewUrl, title, body });

                if (!url) return null;
                return (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await writeClipboardText(incidentText);
                      } catch {
                        // ignore
                      }
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#111827",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 800
                    }}
                    title="Open a prefilled GitHub Issue (incident template); also copies summary"
                  >
                    File GitHub issue
                  </button>
                );
              })()}

              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, opacity: 0.9, marginLeft: 6 }}>
                <input type="checkbox" checked={includeLast5InIssue} onChange={(e) => setIncludeLast5InIssue(Boolean(e.target.checked))} />
                Include last 5 events
              </label>
            </div>

            {changes.map((c) =>
              (() => {
                const box = c.tone === "neutral" ? { border: "1px solid #eee", background: "#fff" } : toneStyle(c.tone);
                return (
                  <div
                    key={c.key}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 10,
                      ...box
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{c.label}</div>
                    {c.key === "first" ? (
                      <div style={{ opacity: 0.75, marginTop: 2 }}>First recorded event.</div>
                    ) : (
                      <div style={{ marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {chip(`from: ${fmt(c.from)}`)}
                        <span style={{ opacity: 0.6 }}>→</span>
                        {chip(`to: ${fmt(c.to)}`)}
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        ) : null}
      </div>
    );
  }

  React.useEffect(() => {
    if (!pagerMuteUntilStable) return;
    const newest = events[0] || null;
    if (!newest) return;
    const c = semanticColorForEvent(newest);
    if (c === "green") disableMuteUntilStable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagerMuteUntilStable, events.length, events[0]?.event_key, muteTick]);

  React.useEffect(() => {
    if (!pagerSnoozeUntilNextRed) return;

    if (newestColor !== "red") {
      snoozeSawNonRedRef.current = true;
      return;
    }

    if (snoozeSawNonRedRef.current && newestColor === "red") {
      disableSnoozeUntilNextRed({ silent: true });
      showLiveStreamNote("Pager snooze ended (new red)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagerSnoozeUntilNextRed, newestColor, events.length, events[0]?.event_key]);

  function buildIncidentExportMarkdown() {
    const now = new Date().toLocaleString();

    const summaryBits = [];
    summaryBits.push(`Time: ${now}`);
    summaryBits.push(`Overall: ${derived.overallOk === true ? "OK" : derived.overallOk === false ? "BAD" : "—"}`);
    summaryBits.push(`Mode: ${derived.mode || "—"}`);
    summaryBits.push(`Receipts: ${derived.receiptsOk === true ? "OK" : derived.receiptsOk === false ? "BAD" : "—"}`);
    summaryBits.push(`Worker stale: ${derived.stale === true ? "true" : derived.stale === false ? "false" : "—"}`);
    summaryBits.push(`Schemas: ${derived.schemasOk === true ? "OK" : derived.schemasOk === false ? "BAD" : "—"}`);

    const lines = [];
    lines.push("## Incident (SocialOS health)");
    lines.push("");
    lines.push("### Summary");
    for (const s of summaryBits) lines.push(`- ${s}`);
    if (ageHuman) lines.push(`- Last change: ${ageHuman} ago${reason ? ` (${reason})` : ""}`);
    if (apiBase) lines.push(`- Health URL: ${apiBase}/health`);
    {
      const pm = getPostmortem(pinnedKey);
      if (pm) lines.push(`\n**Postmortem:** ${pm}`);
    }
    lines.push("");

    lines.push("### Attribution");
    if (!flapDiag) {
      lines.push(`- Window: last ${timelineDots.length}`);
      lines.push("- (no flap diagnosis available)");
    } else if (flapDiag.nonGreen === 0) {
      lines.push(`- Window: last ${flapDiag.basedOn}`);
      lines.push("- No non-green events in window · Confidence: N/A");
    } else {
      lines.push(`- Window: last ${flapDiag.basedOn}`);
      lines.push(
        `- Top causes cover ${Math.round((flapDiag.coverage || 0) * 100)}% of non-green events (top 2) · Confidence: ${flapDiag.confidence}`
      );
      if (flapDiag.confidence === "Low") {
        lines.push(
          flapDiag.unknownShare >= 0.4
            ? `- Nudge: Telemetry gaps likely (unknown_* ${flapDiag.unknownTotal}/${flapDiag.nonGreen})`
            : `- Nudge: Low attribution coverage (${Math.round((flapDiag.coverage || 0) * 100)}%) — mixed causes or missing telemetry.`
        );
      }
      if (flapDiag.hint) lines.push(`- Hint: ${flapDiag.hint}`);
    }
    lines.push("");

    lines.push("### Top buckets (top 8)");
    const buckets = (flapDiag?.counts || []).slice(0, 8);
    if (!buckets.length) {
      lines.push("- (none)");
    } else {
      for (const [code, n] of buckets) lines.push(`- \`${code}\`: ${n}`);
    }
    lines.push("");

    lines.push("### Last 5 events (newest-first)");
    const last5 = (Array.isArray(events) ? events : []).slice(0, 5);
    if (!last5.length) {
      lines.push("- (none)");
    } else {
      for (const ev of last5) {
        const at = ev?.at || null;
        const t = fmtAt(at);
        const key = incidentKeyPrefix(ev, 12);
        const tone = semanticToneFromEvent(ev);
        const sev = dotTitle(tone);
        const reasonShort = Array.isArray(ev?.event_reason) && ev.event_reason.length ? ev.event_reason[0] : "—";
        lines.push(`- ${t} \`${key}\` — ${sev} — ${reasonShort}`);
      }
    }
    lines.push("");

    return lines.join("\n");
  }

  React.useEffect(() => {
    if (expandedEventKey == null) return;
    const exists = events.some((e) => (e?.event_key || e?.at || null) === expandedEventKey);
    if (exists) return;

    const red = timelineDots.find((d) => d.worst === "bad") || null;
    const fallback = red?.rowKey || (events[0]?.event_key || events[0]?.at || null);
    if (fallback) setExpandedEventKey(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flapWindow, events.length]);

  function scrollToRow(rowKey) {
    if (!rowKey) return;
    const nodes = document.querySelectorAll("[data-event-row]");
    for (const n of nodes) {
      if (n.getAttribute("data-event-row") === String(rowKey)) {
        n.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
    }
  }

  React.useEffect(() => {
    if (changedRecently !== true) return;
    if (expandedEventKey != null) return;
    const newest = events[0];
    const key = newest?.event_key || newest?.at || null;
    if (key) setExpandedEventKey(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedRecently, events.length]);

  React.useEffect(() => {
    const newest = events[0] || null;
    const older = events[1] || null;
    if (!newest || !older) return;

    const rowKey = newest?.event_key || newest?.at || null;
    if (!rowKey) return;
    if (lastAutoOpenedKeyRef.current === rowKey) return;

    const changes = diffKeyStates(older, newest)
      .map((c) => ({ ...c, tone: diffTone(c.key, c.from, c.to) }))
      .sort((a, b) => toneRank(a.tone) - toneRank(b.tone));

    const worstTone = worstToneFromChanges(changes);
    if (worstTone !== "bad") return;

    lastAutoOpenedKeyRef.current = rowKey;
    setExpandedEventKey(rowKey);

    setTimeout(() => {
      newestRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  React.useEffect(() => {
    if (!pagerMode) return;
    if (!pagerHit.hit) return;
    const rowKey = pagerHit.rowKey;
    if (!rowKey) return;
    if (lastPagerActedKeyRef.current === rowKey) return;

    if (acknowledgedPagerKey && acknowledgedPagerKey === rowKey) return;
    if (pagerIsMutedAny) return;
    if (pagerSnoozeUntilNextRed) return;

    lastPagerActedKeyRef.current = rowKey;
    setExpandedEventKey(rowKey);

    setTimeout(() => {
      newestRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);

    (async () => {
      try {
        if (pagerHit.body) await writeClipboardText(pagerHit.body);
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagerMode, pagerHit.hit, pagerHit.rowKey, pagerIsMutedAny, acknowledgedPagerKey, pagerSnoozeUntilNextRed]);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 10,
        minWidth: 320,
        background: "#fff"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b style={{ fontSize: 13 }}>System Health</b>
          {pill(loading ? "Checking…" : derived.overallOk ? "OK" : "Attention", overallTone)}
        </div>
        <button onClick={refreshAll} style={{ fontSize: 12 }}>
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
          {pill("API error", "bad")} <span style={{ marginLeft: 6 }}>{error}</span>
        </div>
      )}

      <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span style={{ opacity: 0.8 }}>Store</span>
          <span>{pill(`mode: ${derived.mode}`, "neutral")}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span style={{ opacity: 0.8 }}>Receipts</span>
          <span>
            {pill(
              derived.receiptsOk === true
                ? `OK (${derived.checked ?? 0} checked)`
                : derived.receiptsOk === false
                  ? `Mismatch (${derived.checked ?? 0} checked)`
                  : "—",
              receiptsTone
            )}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span style={{ opacity: 0.8 }}>Best-time</span>
          <span>
            {pill(
              derived.mins == null ? "no heartbeat" : derived.stale ? `stale (${derived.mins}m ago)` : `last ran ${derived.mins}m ago`,
              workerTone
            )}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span style={{ opacity: 0.8 }}>Schemas</span>
          <span>{pill(derived.schemasOk === true ? "OK" : derived.schemasOk === false ? "FAIL" : "unknown", schemasTone)}</span>
        </div>
      </div>

      {(derived.statusCode || derived.recommendedAction) ? (
        <div style={{ marginTop: 8, fontSize: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {derived.statusCode ? pill(`status: ${derived.statusCode}`, "neutral") : null}
          {derived.recommendedAction ? pill(`action: ${derived.recommendedAction}`, "neutral") : null}
          {(() => {
            const canCopy = DEV_ONLY && rb?.cmd;
            const canOpen = !!rb?.url;
            if (!canCopy && !canOpen) return null;

            const label = canCopy ? "Copy command" : "Runbook";

            return (
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (canCopy) {
                      await navigator.clipboard.writeText(String(rb.cmd));
                      showLiveStreamNote("Runbook command copied");
                    } else {
                      window.open(String(rb.url), "_blank", "noopener,noreferrer");
                    }
                  } catch {
                    showLiveStreamNote("Runbook action failed");
                  }
                }}
                title={tooltip}
                style={{
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 900
                }}
              >
                {label}
              </button>
            );
          })()}
          {missingRunbook ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#fee2e2",
                color: "#991b1b"
              }}
            >
              Missing runbook: {statusCode}
            </span>
          ) : null}
          {derived.severity ? pill(`severity: ${derived.severity}`, "neutral") : null}
        </div>
      ) : null}

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9, display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span style={{ opacity: 0.75 }}>Last change</span>

        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ageHuman ? (
            <>
              <span>{ageHuman} ago</span>
              {reason ? <span style={{ opacity: 0.7 }}>({reason})</span> : null}
              {changedRecently === true ? (
                <span
                  title="State changed recently"
                  style={{
                    fontWeight: 800,
                    color: "#b45309",
                    filter: "drop-shadow(0 0 2px rgba(180,83,9,0.25))"
                  }}
                >
                  ⚡
                </span>
              ) : null}

              {isStable ? (
                <span
                  title={`No state changes in ${Math.floor(ageSec / 60)} minutes`}
                  style={{
                    marginLeft: 8,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 12,
                    border: "1px solid #cfe9d7",
                    background: "#f3fbf6"
                  }}
                >
                  stable
                </span>
              ) : null}
            </>
          ) : (
            <span style={{ opacity: 0.7 }}>—</span>
          )}
        </span>
      </div>

      {last.error && (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          <span style={{ opacity: 0.7 }}>Last-change error:</span> <span>{last.error}</span>
        </div>
      )}

      {history.error && (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          <span style={{ opacity: 0.7 }}>History error:</span> <span>{history.error}</span>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ opacity: 0.75 }}>Recent changes</span>
          <span style={{ display: "flex", gap: 10, alignItems: "center", opacity: 0.7 }}>
            {streamEnabled ? (
              streamStatus === "connected" ? (
                <span style={{ fontWeight: 900, color: "#166534" }}>Live</span>
              ) : (
                <span style={{ fontWeight: 900, color: "#92400e" }}>
                  Live: reconnecting…{historyPollEnabled ? " (polling fallback)" : ""}
                </span>
              )
            ) : (
              <span style={{ fontWeight: 900, color: "#6b7280" }}>Live: unsupported</span>
            )}

            {cursor ? (
              <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
                SSE cursor: {cursor.slice(0, 12)}
              </span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
                SSE cursor: —
              </span>
            )}

            {IS_LOCALHOST ? (
              <button
                onClick={coldConnect}
                style={{ fontSize: 12, fontWeight: 900, textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer" }}
                title="Clears socialos_health_last_id and reconnects SSE"
              >
                Cold connect
              </button>
            ) : null}

            <button
              onClick={async () => {
                try {
                  const top = Array.isArray(flapDiag?.counts) ? flapDiag.counts.slice(0, 3).map(([c, n]) => ({ cause: c, count: n })) : [];
                  const blob = {
                    timestamp: new Date().toISOString(),
                    apiBase: apiBase || null,
                    cursor: cursor || "",
                    latest_event_key: newestRaw?.event_key || null,
                    last_change: {
                      event_key: lastEvent?.event_key || null,
                      at: lastEvent?.at || null,
                      age_seconds: ageSec ?? null,
                      age_human: ageHuman || null
                    },
                    flap: {
                      transitions: flapTransitions,
                      level: flapLevel(flapTransitions),
                      hint: flapDiag?.hint || null,
                      confidence: flapDiag?.confidence || null,
                      top_causes: top
                    },
                    stream: {
                      status: streamStatus,
                      paused: Boolean(ssePaused),
                      events_per_min: eventsPerMin,
                      last_event_ago_seconds: lastStreamAgoSec
                    }
                  };
                  await writeClipboardText(JSON.stringify(blob, null, 2));
                  showLiveStreamNote("Copied live debug blob");
                } catch {
                  // ignore
                }
              }}
              style={{ fontSize: 12, fontWeight: 900, textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer" }}
              title="Copy cursor + last-change + flap + latest key + apiBase"
            >
              Copy Live Debug Blob
            </button>

            <button
              onClick={() => reconnectSse?.()}
              style={{ fontSize: 12, fontWeight: 900, textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer" }}
              title="Reconnect SSE (keeps cursor)"
            >
              Reconnect SSE
            </button>

            {!ssePaused ? (
              <button
                onClick={() => pauseSse?.()}
                style={{ fontSize: 12, fontWeight: 900, textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer" }}
                title="Pause stream (closes EventSource)"
              >
                Pause stream
              </button>
            ) : (
              <button
                onClick={() => resumeSse?.()}
                style={{ fontSize: 12, fontWeight: 900, textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer" }}
                title="Resume stream"
              >
                Resume
              </button>
            )}

            <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }} title="Live receive rate (last 60s)">
              {eventsPerMin} ev/min
            </span>
            <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
              last: {lastStreamAgoSec == null ? "—" : ageHumanShort(lastStreamAgoSec)} ago
            </span>

            <span>{events.length ? `${events.length} events` : "—"}</span>
          </span>
        </div>

        {liveResetNote ? (
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#92400e" }}>
            {liveResetNote}
          </div>
        ) : null}

        {liveStreamNote ? (
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#374151" }}>
            {liveStreamNote}
          </div>
        ) : null}

        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>Scope</span>
            {[
              ["all", "All"],
              ["receipts", "Receipts"],
              ["worker", "Worker"],
              ["schemas", "Schemas"]
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setScopeFilter(k)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: scopeFilter === k ? "#111827" : "#fff",
                  color: scopeFilter === k ? "#fff" : "#111827",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 800
                }}
              >
                {label}
              </button>
            ))}

            <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.85, marginLeft: 6 }}>Severity</span>
            {[
              ["all", "All"],
              ["regression", "Regression"],
              ["attention", "Attention"],
              ["stable", "Stable"]
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSeverityFilter(k)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: severityFilter === k ? "#111827" : "#fff",
                  color: severityFilter === k ? "#fff" : "#111827",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 800
                }}
              >
                {label}
              </button>
            ))}

            <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.85, marginLeft: 6 }}>Source</span>
            {[["all", "All"], ...sourceOptions.map((s) => [s, s])].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSourceFilter(k)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: sourceFilter === k ? "#111827" : "#fff",
                  color: sourceFilter === k ? "#fff" : "#111827",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 800
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 900 }}>
            <input type="checkbox" checked={pagerMode} onChange={(e) => setPagerMode(Boolean(e.target.checked))} />
            Pager mode (incident+receipts)
          </label>
        </div>

        {pagerIncidentActive && pagerHit.hit ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>PAGER MODE: receipts regression detected</div>
            <div style={{ opacity: 0.95, fontSize: 12, fontWeight: 900 }}>
              Receipts regression{pagerPinnedReason ? ` · ${pagerPinnedReason}` : ""}
            </div>
            <div style={{ opacity: 0.85, fontSize: 12 }}>{pagerHit.rowReason}</div>

            {triDiff ? (
              <div style={{ marginTop: 8, padding: 10, borderRadius: 12, border: "1px solid #fecaca", background: "#fff" }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Tri-diff (diagnosis)</div>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                  Just changed: {explainChange(triDiff.justChanged)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                  Since last stable:{" "}
                  {triDiff.sinceStable
                    ? explainChange(triDiff.sinceStable)
                    : `Last-green not in window (${flapWindow}). Increase history limit to improve tri-diff.`}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ padding: 8, borderRadius: 10, border: "1px solid #eee", background: "#fafafa" }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Newest vs Previous</div>
                    {(triDiff.justChanged || []).map((c) => {
                      const tone = c.key === "first" ? "neutral" : diffTone(c.key, c.from, c.to);
                      const box = tone === "neutral" ? { border: "1px solid #eee", background: "#fff" } : toneStyle(tone);
                      return (
                        <div key={`p-${c.key}`} style={{ padding: "6px 8px", borderRadius: 10, marginBottom: 6, ...box }}>
                          <div style={{ fontWeight: 800 }}>{c.label}</div>
                          {c.key === "first" ? (
                            <div style={{ opacity: 0.75, marginTop: 2 }}>First recorded event.</div>
                          ) : (
                            <div style={{ marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              {chip(`from: ${fmt(c.from)}`)}
                              <span style={{ opacity: 0.6 }}>→</span>
                              {chip(`to: ${fmt(c.to)}`)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ padding: 8, borderRadius: 10, border: "1px solid #eee", background: "#fafafa" }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Newest vs Last Green</div>
                    {triDiff.sinceStable ? (
                      triDiff.sinceStable.map((c) => {
                        const tone = c.key === "first" ? "neutral" : diffTone(c.key, c.from, c.to);
                        const box = tone === "neutral" ? { border: "1px solid #eee", background: "#fff" } : toneStyle(tone);
                        return (
                          <div key={`g-${c.key}`} style={{ padding: "6px 8px", borderRadius: 10, marginBottom: 6, ...box }}>
                            <div style={{ fontWeight: 800 }}>{c.label}</div>
                            {c.key === "first" ? (
                              <div style={{ opacity: 0.75, marginTop: 2 }}>First recorded event.</div>
                            ) : (
                              <div style={{ marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                {chip(`from: ${fmt(c.from)}`)}
                                <span style={{ opacity: 0.6 }}>→</span>
                                {chip(`to: ${fmt(c.to)}`)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.8 }}>
                        Last-green not in window ({flapWindow}). Increase history limit to improve tri-diff.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 900 }}>Postmortem</span>
              <div style={{ display: "grid", gap: 4 }}>
                <input
                  ref={postmortemInputRef}
                  value={postmortemUrl}
                  onChange={(e) => {
                    setPostmortemUrl(e.target.value);
                    if (postmortemHint) setPostmortemHint("");
                  }}
                  placeholder="Paste GitHub issue URL…"
                  style={{ minWidth: 260, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                />

                {postmortemHint ? (
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#92400e" }}>
                    {postmortemHint}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  const normalized = normalizeUrl(postmortemUrl);
                  setPostmortem(pinnedKey, normalized);
                  setPostmortemUrl(normalized);
                  showPostmortemSavedToast();
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 900
                }}
              >
                Save
              </button>
              {getPostmortem(pinnedKey) ? (
                <>
                  <button
                    type="button"
                    onClick={() => window.open(getPostmortem(pinnedKey), "_blank", "noopener,noreferrer")}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 900
                    }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearPostmortem(pinnedKey);
                      setPostmortemUrl("");
                      showPostmortemSavedToast();
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 900
                    }}
                  >
                    Clear
                  </button>
                </>
              ) : null}

              {postmortemSavedToast ? (
                <span style={{ fontSize: 12, fontWeight: 900, color: "#166534" }}>
                  Saved ✓
                </span>
              ) : null}
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {(() => {
                const isFocused = pinnedKey && focusedPagerKey === pinnedKey;
                return (
                  <>
                    {!pagerIsAcknowledged ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!pinnedKey) return;
                          try {
                            window?.localStorage?.setItem("socialos_pager_ack_key", String(pinnedKey));
                          } catch {
                            // ignore
                          }
                          setAcknowledgedPagerKey(String(pinnedKey));
                          // stop auto-open/copy for this incident key immediately
                          lastPagerActedKeyRef.current = String(pinnedKey);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "#111827",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 900
                        }}
                        title="Acknowledge this incident (suppresses auto-open/auto-copy for this event key only)"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>Acknowledged ✓</span>
                    )}

                    {!isFocused ? (
                      <button
                        type="button"
                        onClick={() => {
                          setScopeFilter("receipts");
                          setSeverityFilter("regression");
                          if (pinnedKey) setFocusedPagerKey(pinnedKey);
                          if (pinnedKey) {
                            setExpandedEventKey(pinnedKey);
                            setTimeout(() => scrollToRow(pinnedKey), 0);
                          }
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 900
                        }}
                        title="Set Scope=Receipts and Severity=Regression (non-destructive; pager stays pinned)"
                      >
                        Focus view
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>Focused ✓</span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setScopeFilter("all");
                        setSeverityFilter("all");
                        setFocusedPagerKey(null);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 900
                      }}
                      title="Reset filters to All"
                    >
                      Reset filters
                    </button>
                  </>
                );
              })()}

              {!pagerIsMutedAny ? (
                <button
                  type="button"
                  onClick={() => setPagerMuteFor(10 * 60 * 1000)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 900
                  }}
                  title="Suppress auto-open/auto-copy for 10 minutes"
                >
                  Mute pager (10m)
                </button>
              ) : null}

              {pagerIsMuted ? (
                <>
                  <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>
                    Muted ({fmtRemaining((pagerMuteUntilMs || 0) - Date.now())} left)
                  </span>
                  <button
                    type="button"
                    onClick={clearPagerMute}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 900
                    }}
                    title="Unmute"
                  >
                    Unmute
                  </button>
                </>
              ) : null}

              {!pagerMuteUntilStable ? (
                <button
                  type="button"
                  onClick={enableMuteUntilStable}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 900
                  }}
                  title="Suppress auto-open/auto-copy until newest returns to Stable (green)"
                >
                  Mute until stable
                </button>
              ) : (
                <>
                  <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>Muted until stable</span>
                  <button
                    type="button"
                    onClick={disableMuteUntilStable}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 900
                    }}
                    title="Unmute"
                  >
                    Unmute
                  </button>
                </>
              )}

              {!pagerSnoozeUntilNextRed ? (
                <button
                  type="button"
                  onClick={enableSnoozeUntilNextRed}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 900
                  }}
                  title="Suppress pager auto-open/auto-copy until it goes non-red and then red again"
                >
                  Snooze until next red
                </button>
              ) : (
                <>
                  <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>Snoozed until next red</span>
                  <button
                    type="button"
                    onClick={() => disableSnoozeUntilNextRed()}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 900
                    }}
                    title="Clear snooze"
                  >
                    Un-snooze
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={async () => {
                  try {
                    if (pagerHit.body) await writeClipboardText(pagerHit.body);
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 900
                }}
                title="Copy incident Markdown"
              >
                Auto-copied (click to re-copy)
              </button>

              {pagerHit.issueUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    window.open(pagerHit.issueUrl, "_blank", "noopener,noreferrer");
                    setPostmortemHint("Paste the created issue URL here");
                    setTimeout(() => postmortemInputRef.current?.focus(), 0);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 900
                  }}
                  title="Open a prefilled GitHub issue"
                >
                  File GitHub issue
                </button>
              ) : null}
            </div>

            {pagerMuteUntilStable ? (
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900 }}>
                Waiting for <span style={{ color: "#166534" }}>Stable (green)</span>… current:{" "}
                <span
                  style={{
                    color:
                      newestColor === "red"
                        ? "#9f1239"
                        : newestColor === "amber"
                          ? "#92400e"
                          : newestColor === "green"
                            ? "#166534"
                            : "#374151"
                  }}
                >
                  {newestHuman.label} {newestHuman.paren}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {timelineDots.length ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
              {timelineDots.map((d) => (
                <button
                  key={d.rowKey}
                  type="button"
                  onClick={() => {
                    setExpandedEventKey(d.rowKey);
                    setTimeout(() => scrollToRow(d.rowKey), 0);
                  }}
                  title={dotTitle(d.worst) + (d.at ? " — " + (Number.isFinite(Date.parse(d.at)) ? new Date(d.at).toLocaleString() : "—") : "")}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: dotColor(d.worst),
                    padding: 0,
                    cursor: "pointer"
                  }}
                />
              ))}
            </div>
            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span style={{ opacity: 0.75 }}>Timeline: red=Regression, amber=Attention, green=Stable, gray=Unknown</span>
              <span style={{ opacity: 0.85 }}>
                Flap: {flapLevel(flapTransitions)} ({flapTransitions})
                {flapDiag?.hint ? <span style={{ marginLeft: 8, opacity: 0.8 }}>· hint: {flapDiag.hint}</span> : null}
              </span>
            </div>

            {flapDiag ? (
              <div style={{ marginTop: 6, opacity: 0.75 }}>
                {flapDiag.nonGreen === 0 ? (
                  <span>No non-green events in window</span>
                ) : (
                  <span>
                    Top causes cover {Math.round((flapDiag.coverage || 0) * 100)}% of non-green events (top 2) · Confidence: {flapDiag.confidence}
                  </span>
                )}
              </div>
            ) : null}

            {flapDiag ? (
              <div style={{ marginTop: 4, opacity: 0.7 }}>
                Based on last {flapDiag.basedOn} events
              </div>
            ) : (
              <div style={{ marginTop: 4, opacity: 0.7 }}>Based on last {timelineDots.length} events</div>
            )}

            {flapDiag && flapDiag.confidence === "Low" && flapDiag.nonGreen > 0 ? (
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                {flapDiag.unknownShare >= 0.4 ? (
                  <div style={{ fontWeight: 800 }}>
                    Telemetry gaps likely: unknown_* accounts for {flapDiag.unknownTotal}/{flapDiag.nonGreen} non-green events.
                  </div>
                ) : (
                  <div style={{ fontWeight: 800 }}>
                    Low attribution coverage ({Math.round((flapDiag.coverage || 0) * 100)}%) — mixed causes or missing telemetry.
                  </div>
                )}

                <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {flapDiag.unknownAmber > 0 ? <span>{chip(`unknown_amber: ${flapDiag.unknownAmber}`)}</span> : null}
                  {flapDiag.unknownRed > 0 ? <span>{chip(`unknown_red: ${flapDiag.unknownRed}`)}</span> : null}
                </div>
              </div>
            ) : null}

            {flapDiag ? (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAttributionBreakdown((v) => !v)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800
                  }}
                >
                  {showAttributionBreakdown ? "Hide breakdown" : "Show breakdown"}
                </button>

                {showAttributionBreakdown ? (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      borderRadius: 12,
                      border: "1px solid #eee",
                      background: "#fff",
                      maxWidth: 520
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                      {(() => {
                        const entries = flapDiag.counts || [];
                        const shown = entries.slice(0, 8);
                        const extra = entries.length - shown.length;

                        function toneForCause(code) {
                          if (String(code).includes("unknown")) return "neutral";
                          if (String(code).endsWith("_fail") || String(code) === "receipt_mismatch" || String(code) === "health_fail") return "bad";
                          return "warn";
                        }

                        const rows = shown.map(([code, n]) => {
                          const t = toneForCause(code);
                          const box =
                            t === "bad"
                              ? { border: "1px solid #fecaca", background: "#fff1f2" }
                              : t === "warn"
                                ? { border: "1px solid #fde68a", background: "#fffbeb" }
                                : { border: "1px solid #e5e7eb", background: "#f8fafc" };
                          const isSelected = selectedBucket === code;
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() => setSelectedBucket((cur) => (cur === code ? null : code))}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 10,
                                width: "100%",
                                textAlign: "left",
                                cursor: "pointer",
                                outline: "none",
                                ...(isSelected ? { boxShadow: "0 0 0 2px rgba(17,24,39,0.15)" } : null),
                                ...box
                              }}
                              title="Click to drill down"
                            >
                              <span style={{ opacity: 0.9 }}>{code}</span>
                              <span style={{ fontWeight: 900 }}>{n}</span>
                            </button>
                          );
                        });

                        if (extra > 0) {
                          rows.push(
                            <div key="more" style={{ opacity: 0.7, padding: "4px 6px" }}>
                              +{extra} more
                            </div>
                          );
                        }

                        return rows;
                      })()}
                    </div>

                    {selectedBucket ? (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e5e7eb" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                          <div style={{ fontSize: 12, fontWeight: 900 }}>Reason drilldown: {selectedBucket}</div>
                          <button
                            type="button"
                            onClick={() => setSelectedBucket(null)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 10,
                              border: "1px solid #e5e7eb",
                              background: "#fff",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 800
                            }}
                            title="Close"
                          >
                            Close
                          </button>
                        </div>

                        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                          {(() => {
                            const items = bucketContrib.get(selectedBucket) || [];
                            if (!items.length) {
                              return <div style={{ opacity: 0.7, fontSize: 12 }}>No matching events in this window.</div>;
                            }
                            return items.slice(0, 12).map((it, idx) => (
                              <div
                                key={`${it.at || "—"}:${idx}`}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 10,
                                  border: "1px solid #eee",
                                  background: "#fafafa",
                                  fontSize: 12,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  alignItems: "center"
                                }}
                                title={it.at || ""}
                              >
                                <span style={{ fontWeight: 900 }}>{it.when}</span>
                                <span style={{ opacity: 0.9, flex: 1 }}>{it.reasonShort}</span>
                                <span style={{ opacity: 0.7, whiteSpace: "nowrap" }}>{it.key}</span>
                              </div>
                            ));
                          })()}
                          {(bucketContrib.get(selectedBucket) || []).length > 12 ? (
                            <div style={{ opacity: 0.7, fontSize: 12 }}>+{(bucketContrib.get(selectedBucket) || []).length - 12} more</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {breakdownBySource.length ? (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e5e7eb" }}>
                        <div style={{ fontSize: 12, fontWeight: 900 }}>Grouped by source</div>
                        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                          {breakdownBySource.map((g) => (
                            <div key={g.src} style={{ padding: 8, borderRadius: 12, border: "1px solid #eee", background: "#fafafa" }}>
                              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>source: {g.src}</div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {g.ranked.slice(0, 6).map(([code, n]) => (
                                  <span key={code}>{chip(`${code}: ${n}`)}</span>
                                ))}
                                {g.ranked.length > 6 ? <span style={{ opacity: 0.7, fontSize: 12 }}>+{g.ranked.length - 6} more</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", opacity: 0.85 }}>
              <span>
                Stable streak: {stability.stableStreak} · Longest stable: {stability.longestStable} · Worst churn: {stability.longestChurn}
              </span>
              <span>Last stable: {stability.lastStableHuman ? `${stability.lastStableHuman} ago` : "—"}</span>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ opacity: 0.8 }}>Window</span>
              <select
                value={flapWindow}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFlapWindow(Number.isFinite(v) ? v : 20);
                }}
                style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                title="Flap window (history fetch limit)"
              >
                <option value={10}>last 10</option>
                <option value={20}>last 20</option>
                <option value={50}>last 50</option>
              </select>

              {timelineDots.some((d) => d.worst === "bad") ? (
                <button
                  type="button"
                  onClick={() => {
                    const red = timelineDots.find((d) => d.worst === "bad") || null;
                    if (!red) return;
                    setExpandedEventKey(red.rowKey);
                    setTimeout(() => scrollToRow(red.rowKey), 0);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800
                  }}
                  title="Open the most recent regression in the last 20 events"
                >
                  Open last regression
                </button>
              ) : null}

              <button
                type="button"
                onClick={async () => {
                  const strip = timelineDots.map((d) => dotEmoji(d.worst)).join("");
                  const lines = [];
                  lines.push(`Timeline: ${strip}`);
                  lines.push(`Flap: ${flapLevel(flapTransitions)} (${flapTransitions})`);
                  if (flapDiag?.hint) lines.push(`Hint: ${flapDiag.hint}`);
                  if (flapDiag) {
                    if (flapDiag.nonGreen === 0) {
                      lines.push("Attribution: No non-green events in window");
                    } else {
                      lines.push(
                        `Attribution: Top causes cover ${Math.round((flapDiag.coverage || 0) * 100)}% of non-green events (top 2) · Confidence: ${flapDiag.confidence}`
                      );
                      if (flapDiag.confidence === "Low") {
                        lines.push(
                          flapDiag.unknownShare >= 0.4
                            ? `Nudge: Telemetry gaps likely (unknown_* ${flapDiag.unknownTotal}/${flapDiag.nonGreen})`
                            : `Nudge: Low attribution coverage (${Math.round((flapDiag.coverage || 0) * 100)}%) — mixed causes or missing telemetry.`
                        );
                        if (flapDiag.unknownAmber > 0) lines.push(`unknown_amber: ${flapDiag.unknownAmber}`);
                        if (flapDiag.unknownRed > 0) lines.push(`unknown_red: ${flapDiag.unknownRed}`);
                      }
                    }
                  }
                  lines.push(
                    `Stable streak: ${stability.stableStreak}; Longest stable: ${stability.longestStable}; Worst churn: ${stability.longestChurn}`
                  );
                  lines.push(`Last stable: ${stability.lastStableHuman ? `${stability.lastStableHuman} ago` : "—"}`);
                  if (ageHuman) lines.push(`Last change: ${ageHuman} ago${reason ? ` (${reason})` : ""}`);
                  lines.push("");
                  lines.push(`Events (newest-first, last ${timelineDots.length}):`);
                  for (const d of timelineDots) {
                    const t = fmtAt(d.at);
                    lines.push(`- ${t} — ${dotTitle(d.worst)}`);
                  }
                  try {
                    await writeClipboardText(lines.join("\n"));
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 800
                }}
                title="Copy a compact timeline + flap score for Slack"
              >
                Export timeline
              </button>

              <button
                type="button"
                onClick={async () => {
                  const md = buildIncidentExportMarkdown();
                  try {
                    await writeClipboardText(md);
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 800
                }}
                title="Copy a clean incident Markdown block for GitHub/Slack"
              >
                Export incident (Markdown)
              </button>
            </div>
          </div>
        ) : null}

        {events.length ? (
          <div style={{ marginTop: 8, display: "grid", gap: 8, maxHeight: 260, overflow: "auto" }}>
            {pinnedRow ? renderHistoryRow(pinnedRow, { pinned: true }) : null}
            {filteredEventsNoPinned.slice(0, 10).map((row) => renderHistoryRow(row))}
          </div>
        ) : (
          <div style={{ marginTop: 6, opacity: 0.7 }}>—</div>
        )}
      </div>
    </div>
  );
}
