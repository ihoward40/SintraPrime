function includesAny(text, keywords) {
  return keywords.some((k) => text.includes(k));
}

/**
 * Pick which "character" should speak based on text content.
 * Safe default is "isiah".
 */
export function pickVoiceForText(text = "") {
  const t = String(text || "").toLowerCase();

  // Shadow Trustee: ominous, controlled narration
  if (includesAny(t, ["shadow trustee", "trustee voice", "trust automation", "issued by authority", "statutory escalation"])) {
    return "shadow";
  }

  // Supreme Court mode: gravitas for final decisions/escalations
  if (includesAny(t, ["supreme court", "final decision", "formal opinion", "constitutional", "finding", "holding", "it is ordered"])) {
    return "supreme";
  }

  // Stealth / risk / escalation signals (default to judge voice)
  if (includesAny(t, ["fraud", "escalation", "critical", "high risk", "risk signal", "stealth", "anomaly"])) {
    return "judge";
  }

  // Legal / enforcement docs
  if (includesAny(t, ["notice of dishonor", "lien", "ucc", "article 9", "affidavit"])) {
    return "scribe";
  }

  // Aggressive enforcement / breach
  if (includesAny(t, ["default", "breach", "trespass", "violation", "cease and desist"])) {
    return "dragon";
  }

  // Banking / trust / collateral
  if (includesAny(t, ["trust", "secured party", "collateral", "perfection", "deposit account"])) {
    return "guardian";
  }

  // Court / motions / orders
  if (includesAny(t, ["court", "judge", "motion", "order", "docket", "hearing"])) {
    return "judge";
  }

  // Social / educational
  if (includesAny(t, ["tiktok", "caption", "short form", "hook", "script"])) {
    return "scholar";
  }

  // Healing / reassurance
  if (includesAny(t, ["remedy", "healing", "wellness", "support", "don't panic"])) {
    return "angel";
  }

  // Exposing nonsense
  if (includesAny(t, ["scam", "fraud", "lies", "nonsense", "bs"])) {
    return "trickster";
  }

  // High-level narration / strategy summary
  if (includesAny(t, ["overview", "summary", "briefing", "intelligence layer"])) {
    return "oracle";
  }

  return "isiah";
}

/**
 * Pick a voice persona based on an event type (and optionally fall back to text routing).
 * This is intentionally conservative: if an event type is unknown, it falls back to pickVoiceForText().
 */
export function pickVoiceForEventType(eventType, text = "") {
  const e = String(eventType || "").trim().toLowerCase();
  if (!e) return pickVoiceForText(text);

  // Requested mappings
  if (e === "enforcement.notice" || e === "enforcement.event" || e.startsWith("enforcement.")) return "dragon";
  if (e === "litigation.brief.generated" || e === "doc.generated" || e.startsWith("litigation.")) return "judge";
  if (e === "ai.prediction.update" || e === "behavior.predicted" || e.startsWith("ai.")) return "oracle";
  if (e === "paralegal.summary" || e.startsWith("paralegal.")) return "shadow";
  if (e === "supreme.argument.ready" || e === "ai.argument.ready" || e.startsWith("supreme.")) return "supreme";

  return pickVoiceForText(text);
}
