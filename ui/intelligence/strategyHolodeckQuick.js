// Lightweight "quick sim" used by Governor + Tribunal.
// Intentionally heuristic: it provides a safety signal, not a market/court oracle.

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export async function runHolodeckQuickSim(req, trustSnapshot, rules, options = {}) {
  const horizonDays = Math.max(5, Math.min(30, Number(options.horizonDays || 10)));

  const snap = trustSnapshot || {};
  const payload = req?.payload || {};

  const explicitRisk = payload?.riskScore;
  const explicitCashBuffer = payload?.cashBufferMonths;

  let cashBufferMonths = Number.isFinite(Number(explicitCashBuffer))
    ? Number(explicitCashBuffer)
    : Number.isFinite(Number(snap.cashBufferMonths))
      ? Number(snap.cashBufferMonths)
      : 0;

  // If we can infer cash buffer from cash+burn, do so.
  if (!Number.isFinite(cashBufferMonths) || cashBufferMonths <= 0) {
    const cash = Number(snap.cashOnHand);
    const burn = Number(snap.monthlyBurn);
    if (Number.isFinite(cash) && Number.isFinite(burn) && burn > 0) {
      cashBufferMonths = Math.max(0, cash / burn);
    }
  }

  let riskScore = Number.isFinite(Number(explicitRisk)) ? Number(explicitRisk) : 0.42;

  // Risk bumps from system posture
  if (snap.deadlinesHeavy) riskScore += 0.12;
  if (Number(snap.openCases) > Number(rules?.maxOpenCases || 9999)) riskScore += 0.08;
  if (Number(snap.marketVolatilityScore) > Number(rules?.volatilityThreshold ?? 10)) riskScore += 0.12;
  if (Number(snap.taxExposureScore) > 7) riskScore += 0.08;

  // Action-type bumping
  const t = String(req?.type || "").toLowerCase();
  if (t === "trade" || t === "investment") {
    riskScore += 0.08;
  }
  if (t === "filing" || t === "motion" || t === "enforcement") {
    riskScore += snap.deadlinesHeavy ? 0.05 : 0.02;
  }

  riskScore = clamp01(riskScore);

  return {
    horizonDays,
    riskScore,
    cashBufferMonths,
    notes: ["Heuristic quick sim (safety signal)", `horizon=${horizonDays}d`],
  };
}
