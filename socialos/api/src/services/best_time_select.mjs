export function pickNearestBestTimeWindow({ recs, now = new Date(), horizonDays = 7, minConfidence = 0.4 }) {
  const nowMs = now.getTime();
  const horizonMs = nowMs + horizonDays * 24 * 60 * 60 * 1000;

  const eligible = (recs || [])
    .filter((r) => Number(r.confidence_score ?? 0) >= Number(minConfidence))
    .sort((a, b) => Number(b.confidence_score) - Number(a.confidence_score) || Number(b.score) - Number(a.score));

  if (!eligible.length) return null;

  // Deterministic search forward hour-by-hour.
  for (let t = nowMs; t <= horizonMs; t += 60 * 60 * 1000) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    const hour = d.getUTCHours();

    const match = eligible.find((r) => r.day_of_week === dow && r.hour === hour);
    if (match) {
      const chosen = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, 0, 0));
      return { chosen_when_utc: chosen.toISOString(), selected_rule: match };
    }
  }

  return null;
}
