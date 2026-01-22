export type StitchBackendId = "stitch_web_ingest" | "stitch_auto_playwright";

function truthy(v: string | undefined): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export function isStitchAutomationEnabled(env: NodeJS.ProcessEnv): boolean {
  return truthy(env.SINTRAPRIME_STITCH_AUTOMATE);
}

export function selectStitchBackend(env: NodeJS.ProcessEnv): StitchBackendId {
  // Governance-safe default: human export ingest.
  if (isStitchAutomationEnabled(env)) return "stitch_auto_playwright";
  return "stitch_web_ingest";
}
