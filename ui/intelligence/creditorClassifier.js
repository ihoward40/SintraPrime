import { eventBus } from "../core/eventBus.js";

const RULES = [
  {
    match: /portfolio recovery|midland|lvnv|cavalry|enhanced recovery|spring oaks/i,
    type: "debt_buyer",
    risk: "high",
    tag: "junk_debt_suspected",
  },
  { match: /verizon|comcast|sprint|t-?mobile|at&t/i, type: "telco", risk: "medium", tag: null },
  { match: /experian|equifax|transunion/i, type: "bureau", risk: "medium", tag: null },
  {
    match: /chase|wells fargo|bank of america|citibank|capital one|synchrony/i,
    type: "bank",
    risk: "high",
    tag: null,
  },
  { match: /early warning|chexsystems/i, type: "bank_reporting",
    risk: "high", tag: null },
];

export function classifyCreditor(name = "") {
  const raw = String(name || "").trim();
  const n = raw.toLowerCase();

  for (const rule of RULES) {
    if (rule.match.test(n)) {
      return {
        name: raw,
        type: rule.type,
        risk: rule.risk,
        tag: rule.tag || null,
      };
    }
  }

  return { name: raw, type: "unknown", risk: "unknown", tag: null };
}

// Any module may emit: eventBus.emit('creditor.observed', { name, source, context })
// This classifier normalizes it into: creditor.classified
eventBus.on("creditor.observed", ({ name, source, context } = {}) => {
  const classification = classifyCreditor(name);

  eventBus.emit("creditor.classified", {
    ...classification,
    source: source || "unknown",
    context: context || null,
  });
});
