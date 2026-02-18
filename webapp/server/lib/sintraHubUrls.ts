type HubUrls = {
  hubOrigin?: string;
  apiUrl?: string;
  brainUrl?: string;
  airlockUrl?: string;
  zeroclawUrl?: string;
};

function stripTrailingSlashes(value: string): string {
  return String(value || "").replace(/\/+$/, "");
}

function parseOriginMaybe(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = stripTrailingSlashes(value);
  try {
    const u = new URL(v);
    return u.origin;
  } catch {
    return undefined;
  }
}

function joinOriginPort(origin: string, port: number): string {
  const u = new URL(origin);
  u.port = String(port);
  return stripTrailingSlashes(u.toString());
}

export function resolveSintraHubUrls(env: NodeJS.ProcessEnv = process.env): HubUrls {
  const hubOrigin = parseOriginMaybe(env.SINTRA_HUB_URL);

  const apiUrl =
    stripTrailingSlashes(env.SINTRA_API_URL || env.FASTAPI_URL || (hubOrigin ? joinOriginPort(hubOrigin, 8000) : "")) || undefined;

  const brainUrl =
    stripTrailingSlashes(env.SINTRA_BRAIN_URL || env.BRAIN_URL || (hubOrigin ? joinOriginPort(hubOrigin, 8011) : "")) || undefined;

  const airlockUrl =
    stripTrailingSlashes(env.SINTRA_AIRLOCK_URL || env.AIRLOCK_URL || (hubOrigin ? joinOriginPort(hubOrigin, 3000) : "")) || undefined;

  const zeroclawUrl =
    stripTrailingSlashes(env.SINTRA_ZEROCLAW_URL || env.ZEROCLAW_URL || (hubOrigin ? joinOriginPort(hubOrigin, 8080) : "")) || undefined;

  return { hubOrigin, apiUrl, brainUrl, airlockUrl, zeroclawUrl };
}
