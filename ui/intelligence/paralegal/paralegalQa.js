function safeStr(v) {
  return v == null ? "" : String(v);
}

function hasAny(text, needles) {
  const t = safeStr(text).toLowerCase();
  return needles.some((n) => t.includes(String(n).toLowerCase()));
}

export function scoreDraftText(text) {
  const t = safeStr(text);
  const lc = t.toLowerCase();

  const flags = [];
  if (t.length < 600) flags.push("too_short");
  if (t.length > 12_000) flags.push("too_long");
  if (hasAny(lc, ["i am not a lawyer", "not legal advice"])) flags.push("legal_disclaimer_present");
  if (hasAny(lc, ["[insert", "todo", "lorem ipsum"])) flags.push("placeholders_present");
  if (!hasAny(lc, ["facts", "issues", "relief", "requested relief", "exhibits"])) flags.push("missing_structure");

  // Basic 0-100 scoring heuristic.
  let score = 100;
  if (flags.includes("too_short")) score -= 30;
  if (flags.includes("too_long")) score -= 10;
  if (flags.includes("placeholders_present")) score -= 30;
  if (flags.includes("missing_structure")) score -= 20;

  score = Math.max(0, Math.min(100, score));

  return { score, flags };
}
