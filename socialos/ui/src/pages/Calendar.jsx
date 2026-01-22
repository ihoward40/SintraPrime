import React, { useEffect, useMemo, useRef, useState } from "react";

import { verifyReceiptHash, verifyReceiptSignatureHmac } from "../lib/receipt_verify.js";

const API = "http://localhost:8787";
const DEV_VERIFY = import.meta?.env?.DEV ?? true;
const IS_LOCALHOST =
  typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(String(window.location.hostname || ""));

function toIsoLocalInputValue(d) {
  return d.toISOString();
}

function nextOccurrencesUTC(recs, daysForward = 7) {
  const now = new Date();
  const out = [];

  for (let i = 0; i <= daysForward; i++) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i, 0, 0, 0));
    const dow = day.getUTCDay();

    for (const r of recs) {
      if (r.day_of_week !== dow) continue;
      const dt = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), r.hour, 0, 0));
      if (dt.getTime() < now.getTime()) continue;

      out.push({
        whenUtc: dt.toISOString(),
        whenLocal: dt.toLocaleString(),
        confidence: Number(r.confidence_score || 0),
        score: Number(r.score || 0),
        sample: Number(r.sample_size || 0)
      });
    }
  }

  out.sort((a, b) => Date.parse(a.whenUtc) - Date.parse(b.whenUtc) || b.confidence - a.confidence);
  return out;
}

export default function Calendar() {
  const [items, setItems] = useState([]);
  const [actor, setActor] = useState("operator");
  const [contentId, setContentId] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [when, setWhen] = useState(toIsoLocalInputValue(new Date(Date.now() + 60_000)));

  const [bestTimeRaw, setBestTimeRaw] = useState([]);
  const [bestTimeLoading, setBestTimeLoading] = useState(false);

  const [latestDecisionReceipt, setLatestDecisionReceipt] = useState(null);
  const [decisionReceiptLoading, setDecisionReceiptLoading] = useState(false);
  const [decisionReceiptError, setDecisionReceiptError] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const [adminMode, setAdminMode] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [sigVerifyResult, setSigVerifyResult] = useState(null);

  const [serverVerify, setServerVerify] = useState(null);

  const verifyTokenRef = useRef(0);
  const serverVerifyCacheRef = useRef(new Map());

  async function loadCalendar() {
    const res = await fetch(`${API}/calendar`);
    const json = await res.json();
    setItems(json.items || []);
  }

  async function loadBestTime(p) {
    setBestTimeLoading(true);
    try {
      const res = await fetch(`${API}/best-time?platform=${encodeURIComponent(p)}&limit=50`);
      const json = await res.json();
      setBestTimeRaw(json.items || []);
    } finally {
      setBestTimeLoading(false);
    }
  }

  async function schedule() {
    const res = await fetch(`${API}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor, content_id: contentId, platform, when })
    });
    const json = await res.json();
    setItems([json, ...items]);
  }

  async function scheduleBestTime() {
    const res = await fetch(`${API}/schedule/best-time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actor,
        content_id: contentId,
        platform,
        min_confidence: 0.4,
        horizon_days: 7
      })
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json?.error || "Best-time scheduling failed");
      return;
    }
    setItems([json.schedule, ...items]);

    // Refresh credibility panel after a decision is made.
    setLatestDecisionReceipt(json.receipt || null);
    setDecisionReceiptError("");
    setVerifyResult(null);
    setSigVerifyResult(null);
    setServerVerify(null);

    if (json.receipt?.receipt_id) {
      const token = ++verifyTokenRef.current;
      await verifyClient(json.receipt, token);
      await verifyServer(json.receipt, token);
    }

    alert(
      `Scheduled on best-time: ${json.schedule.when}\nReceipt: ${String(json.receipt.receipt_hash).slice(0, 16)}…`
    );
  }

  async function loadLatestScheduleDecisionReceipt() {
    if (!contentId.trim()) {
      setLatestDecisionReceipt(null);
      setDecisionReceiptError("Content ID required");
      return;
    }

    setDecisionReceiptLoading(true);
    setDecisionReceiptError("");
    const token = ++verifyTokenRef.current;
    try {
      const url = `${API}/receipts?content_id=${encodeURIComponent(contentId.trim())}&platform=${encodeURIComponent(
        platform
      )}&limit=50`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        setLatestDecisionReceipt(null);
        setDecisionReceiptError(json?.error || "Failed to load receipts");
        return;
      }

      const items = Array.isArray(json?.items) ? json.items : [];
      const latest = items.find((r) => r?.result?.kind === "schedule_decision") || null;
      setLatestDecisionReceipt(latest);
      setVerifyResult(null);
      setSigVerifyResult(null);
      setServerVerify(null);
      if (!latest) setDecisionReceiptError("No schedule-decision receipt found");

      if (latest?.receipt_id) {
        await verifyClient(latest, token);
        await verifyServer(latest, token);
      }
    } catch (e) {
      setLatestDecisionReceipt(null);
      setDecisionReceiptError(e?.message || String(e));
    } finally {
      setDecisionReceiptLoading(false);
    }
  }

  async function verifyClient(receipt, token) {
    if (!receipt) return null;
    setVerifying(true);
    try {
      const r = await verifyReceiptHash(receipt);
      if (token !== verifyTokenRef.current) return null;
      setVerifyResult(r);

      if (DEV_VERIFY && IS_LOCALHOST && adminMode && adminSecret.trim()) {
        const sr = await verifyReceiptSignatureHmac(receipt, adminSecret.trim());
        if (token !== verifyTokenRef.current) return null;
        setSigVerifyResult(sr);
      } else {
        setSigVerifyResult(null);
      }

      return r;
    } finally {
      if (token === verifyTokenRef.current) setVerifying(false);
    }
  }

  async function verifyServer(receipt, token) {
    if (!receipt?.receipt_id) return null;

    const cached = serverVerifyCacheRef.current.get(receipt.receipt_id);
    if (cached) {
      setServerVerify(cached);
      return cached;
    }

    setServerVerify(null);
    try {
      const res = await fetch(`${API}/receipts/${encodeURIComponent(receipt.receipt_id)}/verify`);
      const json = await res.json();
      if (token !== verifyTokenRef.current) return null;
      // Cache successful responses to avoid re-hitting the API for the same receipt.
      if (json && typeof json === "object" && typeof json.ok === "boolean") {
        serverVerifyCacheRef.current.set(receipt.receipt_id, json);
      }
      setServerVerify(json);
      return json;
    } catch (e) {
      if (token !== verifyTokenRef.current) return null;
      const json = { ok: false, error: e?.message || String(e) };
      setServerVerify(json);
      return json;
    }
  }

  async function verifyCurrentReceipt() {
    if (!latestDecisionReceipt) return;
    const token = ++verifyTokenRef.current;
    await verifyClient(latestDecisionReceipt, token);
  }

  async function serverVerifyReceipt() {
    if (!latestDecisionReceipt?.receipt_id) return;
    const token = ++verifyTokenRef.current;
    await verifyServer(latestDecisionReceipt, token);
  }

  useEffect(() => {
    loadCalendar();
    loadBestTime(platform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadBestTime(platform);
  }, [platform]);

  const overlays = useMemo(() => nextOccurrencesUTC(bestTimeRaw, 7), [bestTimeRaw]);

  return (
    <div>
      <h3>Calendar</h3>

      {DEV_VERIFY ? (
        <label style={{ fontSize: 12, opacity: 0.8, display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={adminMode} onChange={(e) => setAdminMode(e.target.checked)} /> Admin mode
        </label>
      ) : null}

      <div style={{ display: "grid", gap: 8, maxWidth: 750 }}>
        <label>
          Actor
          <input value={actor} onChange={(e) => setActor(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          Platform (also drives Best-Time overlays)
          <input value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          Content ID
          <input value={contentId} onChange={(e) => setContentId(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          When (ISO)
          <input value={when} onChange={(e) => setWhen(e.target.value)} style={{ width: "100%" }} />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={schedule} disabled={!contentId.trim()}>
            Schedule
          </button>
          <button onClick={scheduleBestTime} disabled={!contentId.trim()}>
            Schedule on Best-Time
          </button>
          <button onClick={loadCalendar}>Refresh Calendar</button>
          <button onClick={() => loadBestTime(platform)} disabled={bestTimeLoading}>
            {bestTimeLoading ? "Loading…" : "Refresh Best-Time"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h4 style={{ margin: 0 }}>Recommended Windows (next 7 days)</h4>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            platform: <b>{platform}</b> • UTC-based model
          </div>
        </div>

        {overlays.length === 0 ? (
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
            No recommendations yet. (Populates once analytics ingestion is feeding engagement_rate snapshots.)
          </div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {overlays.slice(0, 12).map((o, idx) => (
              <div key={idx} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <b>{o.whenLocal}</b>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    conf: {o.confidence.toFixed(2)} • score: {o.score.toFixed(4)} • n={o.sample}
                  </div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>UTC: {o.whenUtc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h4 style={{ margin: 0 }}>Latest Schedule Decision Receipt</h4>
          <button onClick={loadLatestScheduleDecisionReceipt} disabled={decisionReceiptLoading || !contentId.trim()}>
            {decisionReceiptLoading ? "Loading…" : "Why did it schedule there?"}
          </button>
        </div>

        {decisionReceiptError ? (
          <div style={{ marginTop: 8, fontSize: 13, color: "#8a1f11" }}>{decisionReceiptError}</div>
        ) : null}

        {!latestDecisionReceipt ? (
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
            No receipt loaded yet. Pick a Content ID and click “Why did it schedule there?”
          </div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13 }}>
              <b>{latestDecisionReceipt.platform}</b> • chosen: {latestDecisionReceipt?.result?.chosen_when_utc}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              receipt_id: {latestDecisionReceipt.receipt_id} • hash: {String(latestDecisionReceipt.receipt_hash).slice(0, 24)}…
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              rule: dow={latestDecisionReceipt?.result?.selected_rule?.day_of_week} hour={latestDecisionReceipt?.result?.selected_rule?.hour} • conf=
              {Number(latestDecisionReceipt?.result?.selected_rule?.confidence_score || 0).toFixed(2)} • n=
              {Number(latestDecisionReceipt?.result?.selected_rule?.sample_size || 0)}
            </div>
            <details>
              <summary style={{ cursor: "pointer" }}>Raw receipt JSON</summary>
              <pre style={{ marginTop: 8, background: "#fafafa", border: "1px solid #eee", padding: 10, borderRadius: 10, overflowX: "auto" }}>
                {JSON.stringify(latestDecisionReceipt, null, 2)}
              </pre>
            </details>

            {DEV_VERIFY ? (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {adminMode && IS_LOCALHOST ? (
                  <label style={{ fontSize: 12, opacity: 0.8 }}>
                    Dev HMAC secret (optional)
                    <input
                      type="password"
                      value={adminSecret}
                      onChange={(e) => setAdminSecret(e.target.value)}
                      placeholder="dev secret (localhost only)"
                      style={{ width: "100%" }}
                    />
                  </label>
                ) : null}

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={verifyCurrentReceipt} disabled={verifying}>
                    {verifying ? "Verifying…" : "Verify Receipt (Client)"}
                  </button>

                  <button onClick={serverVerifyReceipt}>Verify Receipt (Server)</button>

                  {verifyResult ? (
                    <span style={{ fontSize: 13 }}>
                      Client: {verifyResult.ok ? "✅" : "❌"}
                      {!verifyResult.ok ? (
                        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.75 }}>
                          expected {String(verifyResult.expected).slice(0, 12)}… got {String(verifyResult.actual).slice(0, 12)}…
                        </span>
                      ) : null}
                    </span>
                  ) : null}

                  {serverVerify ? (
                    <span style={{ fontSize: 13 }}>Server: {serverVerify.ok ? "✅" : "❌"}</span>
                  ) : null}
                </div>

                {verifyResult && serverVerify ? (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    {verifyResult.ok === serverVerify.ok
                      ? "Client/server agree ✅"
                      : "Client/server disagree ⚠️ (canonicalization or field-scope drift)"}
                  </div>
                ) : null}

                {latestDecisionReceipt && (verifyResult === null || serverVerify === null) ? (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    ⏳ verifying…{verifyResult ? ` client:${verifyResult.ok ? "✅" : "❌"}` : ""}
                    {serverVerify ? ` server:${serverVerify.ok ? "✅" : "❌"}` : ""}
                  </div>
                ) : null}

                {verifyResult && serverVerify && verifyResult.ok !== serverVerify.ok ? (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                    receipt_id {String(latestDecisionReceipt.receipt_id).slice(0, 12)}… • client expected {String(
                      verifyResult.expected
                    ).slice(0, 12)}… got {String(verifyResult.actual).slice(0, 12)}… • server recomputed {String(
                      serverVerify.recomputed_hash
                    ).slice(0, 12)}… stored {String(serverVerify.receipt_hash).slice(0, 12)}…
                  </div>
                ) : null}

                {adminMode && IS_LOCALHOST && adminSecret.trim() && sigVerifyResult ? (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    signature: {sigVerifyResult.ok ? "✅ valid" : "❌ invalid"}
                  </div>
                ) : null}

                {adminMode && !IS_LOCALHOST ? (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Signature verification disabled (not localhost).
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {items.map((x) => (
          <div key={x.schedule_id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div>
              <b>{x.platform}</b> • {x.when}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {x.status} • {x.schedule_id}
            </div>
            <div style={{ fontSize: 12 }}>content_id: {x.content_id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
