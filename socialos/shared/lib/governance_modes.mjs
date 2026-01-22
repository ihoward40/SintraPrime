export const governanceModes = {
  court_safe: {
    claims_verification: "required",
    language_filter: "conservative",
    disclaimer_injection: "automatic",
    prohibited: ["defamatory", "unverifiable_medical", "incitement"],
  },
  marketing_mode: {
    claims_verification: "optional",
    language_filter: "standard",
    cta_injection: "automatic",
    prohibited: ["false_scarcity", "guarantees"],
  },
};
