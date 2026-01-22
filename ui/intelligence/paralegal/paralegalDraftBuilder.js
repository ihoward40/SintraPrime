import { classifyLegalIntent } from "./paralegalIntent.js";

function safeStr(v) {
  return v == null ? "" : String(v);
}

function pickTemplateKey(intent) {
  const d = safeStr(intent?.domain);
  const m = safeStr(intent?.motionType);

  if (d === "creditor-dispute" && m === "billing-dispute") return "notice-of-fault";
  if (m === "debt-validation") return "debt-validation";
  if (d === "consumer-finance" && m === "regulatory-complaint") return "cfpb-complaint";
  if (d === "consumer-reporting" && m === "furnisher-dispute") return "metro2-dispute";

  return "general-memo";
}

function recommendDocGeneratorEvent(templateKey) {
  if (templateKey === "notice-of-fault") return "doc.generate.noticeOfFault";
  if (templateKey === "debt-validation") return "doc.generate.debtValidation";
  return null;
}

export async function buildDraftRequest(text, intentMaybe) {
  const intent = intentMaybe || (await classifyLegalIntent(text));
  const templateKey = pickTemplateKey(intent);

  return {
    issueText: safeStr(text),
    templateKey,
    templateMeta: {
      domain: intent.domain,
      motionType: intent.motionType,
      domainLabel: intent.domainLabel,
    },
    intent,
    docGeneratorEvent: recommendDocGeneratorEvent(templateKey),
  };
}
