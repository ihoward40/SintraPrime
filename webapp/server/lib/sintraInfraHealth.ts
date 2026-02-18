import { resolveSintraHubUrls } from "./sintraHubUrls";

type ProbeResult = { ok: boolean; status?: number; data?: any; error?: string };

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<ProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    const text = await res.text();
    let data: any = undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = text;
      if (typeof data === "string" && data.length > 2000) {
        data = `${data.slice(0, 2000)}\n…(truncated)`;
      }
    }

    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeSintraInfraHealth(timeoutMsPerService: number = 2500) {
  const { apiUrl, brainUrl, airlockUrl, zeroclawUrl } = resolveSintraHubUrls();

  const apiHealthUrl = apiUrl ? `${apiUrl}/health` : undefined;
  const brainHealthUrl = brainUrl ? `${brainUrl}/health` : undefined;
  const airlockHealthUrl = airlockUrl ? `${airlockUrl}/health` : undefined;
  const zeroclawHealthUrl = zeroclawUrl ? `${zeroclawUrl}/health` : undefined;

  const [api, brain, airlock, zeroclaw] = await Promise.all([
    apiHealthUrl ? fetchJsonWithTimeout(apiHealthUrl, timeoutMsPerService) : Promise.resolve({ ok: false, error: "api_url_not_configured" }),
    brainHealthUrl ? fetchJsonWithTimeout(brainHealthUrl, timeoutMsPerService) : Promise.resolve({ ok: false, error: "brain_url_not_configured" }),
    airlockHealthUrl ? fetchJsonWithTimeout(airlockHealthUrl, timeoutMsPerService) : Promise.resolve({ ok: false, error: "airlock_url_not_configured" }),
    zeroclawHealthUrl ? fetchJsonWithTimeout(zeroclawHealthUrl, timeoutMsPerService) : Promise.resolve({ ok: false, error: "zeroclaw_url_not_configured" }),
  ]);

  return {
    urls: {
      apiUrl,
      brainUrl,
      airlockUrl,
      zeroclawUrl,
    },
    checks: {
      api,
      brain,
      airlock,
      zeroclaw,
    },
  };
}

export async function probeSintraInfraHealthFromWebappOrigin(options: {
  webappOrigin: string;
  timeoutMsPerService?: number;
}) {
  const timeoutMsPerService = options.timeoutMsPerService ?? 2500;
  const base = await probeSintraInfraHealth(timeoutMsPerService);

  const webappOrigin = (() => {
    try {
      return new URL(options.webappOrigin).origin;
    } catch {
      return undefined;
    }
  })();

  const isLoopbackHost = (host: string | undefined) => {
    if (!host) return false;
    const h = host.replace(/^\[|\]$/g, "").toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  };

  const parsedWebapp = (() => {
    try {
      return webappOrigin ? new URL(webappOrigin) : undefined;
    } catch {
      return undefined;
    }
  })();

  const parsedAirlock = (() => {
    try {
      return base.urls.airlockUrl ? new URL(base.urls.airlockUrl) : undefined;
    } catch {
      return undefined;
    }
  })();

  const sameOriginOrLoopbackEquivalent =
    parsedWebapp &&
    parsedAirlock &&
    parsedWebapp.protocol === parsedAirlock.protocol &&
    parsedWebapp.port === parsedAirlock.port &&
    (parsedWebapp.hostname === parsedAirlock.hostname || (isLoopbackHost(parsedWebapp.hostname) && isLoopbackHost(parsedAirlock.hostname)));

  if (sameOriginOrLoopbackEquivalent) {
    return {
      ...base,
      checks: {
        ...base.checks,
        airlock: {
          ok: false,
          error: "airlock_url_conflicts_with_webapp_origin",
          data: {
            webappOrigin: parsedWebapp?.origin,
            airlockOrigin: parsedAirlock?.origin,
            hint: "Run Airlock on :3000 and let the webapp choose a different port, or set SINTRA_AIRLOCK_URL to the correct Airlock URL.",
          },
        },
      },
    };
  }

  return base;
}
