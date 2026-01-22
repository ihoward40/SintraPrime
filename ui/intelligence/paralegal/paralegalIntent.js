const DOMAINS = [
  { key: "verizon", domain: "creditor-dispute", motionType: "billing-dispute", label: "Verizon Billing Dispute" },
  { key: "fios", domain: "creditor-dispute", motionType: "billing-dispute", label: "Verizon Billing Dispute" },
  { key: "dakota", domain: "equipment-finance", motionType: "debt-validation", label: "Dakota Financial Enforcement" },
  { key: "chase", domain: "banking", motionType: "account-closure", label: "Chase/EWS Banking Dispute" },
  { key: "ews", domain: "banking-report", motionType: "file-correction", label: "Early Warning File Dispute" },
  { key: "early warning", domain: "banking-report", motionType: "file-correction", label: "Early Warning File Dispute" },
  { key: "ssa", domain: "benefits", motionType: "administrative-appeal", label: "SSA Appeal" },
  { key: "child support", domain: "family-court", motionType: "modification-relief", label: "Child Support / Family Court" },
  { key: "foreclosure", domain: "real-property", motionType: "stay-injunction", label: "Foreclosure Defense" },
  { key: "irs", domain: "tax", motionType: "offset-challenge", label: "IRS Offset Enforcement" },
  { key: "cfpb", domain: "consumer-finance", motionType: "regulatory-complaint", label: "CFPB Complaint" },
  { key: "metro-2", domain: "consumer-reporting", motionType: "furnisher-dispute", label: "Metro-2 Dispute" },
];

function safeStr(v) {
  return v == null ? "" : String(v);
}

export async function classifyLegalIntent(text = "") {
  const lower = safeStr(text).toLowerCase();
  for (const d of DOMAINS) {
    if (lower.includes(d.key)) {
      return {
        domain: d.domain,
        motionType: d.motionType,
        domainLabel: d.label,
        motionTypeLabel: d.motionType,
        creditorKey: d.key,
      };
    }
  }

  return {
    domain: "general-litigation",
    motionType: "memo-notice",
    domainLabel: "General Litigation",
    motionTypeLabel: "General memo/notice",
    creditorKey: null,
  };
}
