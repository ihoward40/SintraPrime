import dns from "node:dns";
import net from "node:net";

export type PreflightAllowed = true | false | null;

export type PreflightReason =
  | "ALLOWED"
  | "CSP_FRAME_ANCESTORS_NONE"
  | "CSP_FRAME_ANCESTORS_MISMATCH"
  | "CSP_FRAME_ANCESTORS_UNPARSEABLE"
  | "XFO_DENY"
  | "XFO_SAMEORIGIN"
  | "XFO_ALLOW_FROM_UNSUPPORTED"
  | "NO_RELEVANT_HEADERS"
  | "NON_200_STATUS"
  | "FETCH_ERROR"
  | "INVALID_URL"
  | "BLOCKED_SSRF_GUARD";

export type PreflightResult = {
  requestedUrl: string;
  finalUrl: string;
  status: number | null;
  allowed: PreflightAllowed;
  reason: PreflightReason;
  details?: {
    xFrameOptions?: string | null;
    csp?: string | null;
    frameAncestors?: string | null;
  };
  checkedAt: string;
};

export function parseFrameAncestors(csp: string): string | null {
  if (!csp) return null;

  // CSP can appear multiple times; treat this as a single header value.
  const directives = csp
    .split(";")
    .map(d => d.trim())
    .filter(Boolean);

  for (const directive of directives) {
    const lower = directive.toLowerCase();
    if (!lower.startsWith("frame-ancestors")) continue;

    const value = directive.slice("frame-ancestors".length).trim();
    return value.length > 0 ? value : null;
  }

  return null;
}

function tokenizeFrameAncestors(value: string): string[] | null {
  if (!value) return null;
  const tokens = value.split(/\s+/).map(t => t.trim()).filter(Boolean);
  return tokens.length ? tokens : null;
}

function originsEqual(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

function appOriginMatchesSourceExpression(
  source: string,
  appOrigin: string,
  targetOrigin: string
): boolean | null {
  const token = source.trim();
  if (!token) return null;

  if (token === "*") return true;
  if (token === "'none'") return false;

  if (token === "'self'") {
    return originsEqual(appOrigin, targetOrigin);
  }

  // scheme-source
  if (token === "http:" || token === "https:") {
    try {
      const app = new URL(appOrigin);
      return app.protocol === token;
    } catch {
      return null;
    }
  }

  // Host/source expressions; keep this conservative.
  try {
    const app = new URL(appOrigin);

    // scheme + wildcard host
    const wildcardSchemeMatch = token.match(/^(https?:)\/\/\*\.(.+)$/i);
    if (wildcardSchemeMatch) {
      const scheme = wildcardSchemeMatch[1].toLowerCase() + "//";
      const suffix = wildcardSchemeMatch[2].toLowerCase();

      if (app.origin.toLowerCase().startsWith(scheme) === false) return false;

      const host = app.hostname.toLowerCase();
      if (host === suffix) return false;
      return host.endsWith("." + suffix);
    }

    // wildcard host with no scheme
    const wildcardHostMatch = token.match(/^\*\.(.+)$/i);
    if (wildcardHostMatch) {
      const suffix = wildcardHostMatch[1].toLowerCase();
      const host = app.hostname.toLowerCase();
      if (host === suffix) return false;
      return host.endsWith("." + suffix);
    }

    // exact origin
    if (token.startsWith("http://") || token.startsWith("https://")) {
      const origin = new URL(token).origin;
      return origin.toLowerCase() === app.origin.toLowerCase();
    }

    return null;
  } catch {
    return null;
  }
}

export function evaluateEmbeddingPolicy(opts: {
  status: number | null;
  headers: { csp?: string | null; xFrameOptions?: string | null };
  appOrigin: string;
  targetOrigin: string;
}): { allowed: PreflightAllowed; reason: PreflightReason; frameAncestors?: string | null } {
  const { status, headers, appOrigin, targetOrigin } = opts;

  if (status !== null && (status < 200 || status >= 400)) {
    return { allowed: null, reason: "NON_200_STATUS" };
  }

  const csp = headers.csp ?? null;
  const xfo = headers.xFrameOptions ?? null;

  const frameAncestors = csp ? parseFrameAncestors(csp) : null;
  if (frameAncestors) {
    const tokens = tokenizeFrameAncestors(frameAncestors);
    if (!tokens) {
      return { allowed: null, reason: "CSP_FRAME_ANCESTORS_UNPARSEABLE", frameAncestors };
    }

    if (tokens.includes("'none'")) {
      return { allowed: false, reason: "CSP_FRAME_ANCESTORS_NONE", frameAncestors };
    }

    for (const token of tokens) {
      const match = appOriginMatchesSourceExpression(token, appOrigin, targetOrigin);
      if (match === true) {
        return { allowed: true, reason: "ALLOWED", frameAncestors };
      }
      if (match === null) {
        // Can't confidently evaluate this token; keep going.
        continue;
      }
    }

    // We parsed frame-ancestors but didn't find a confident allow.
    return { allowed: false, reason: "CSP_FRAME_ANCESTORS_MISMATCH", frameAncestors };
  }

  // X-Frame-Options only applies when CSP frame-ancestors is not present.
  if (xfo) {
    const first = xfo.split(",")[0]?.trim().toUpperCase() ?? "";
    if (first === "DENY") return { allowed: false, reason: "XFO_DENY" };

    if (first === "SAMEORIGIN") {
      const allowed = originsEqual(appOrigin, targetOrigin);
      return { allowed, reason: allowed ? "ALLOWED" : "XFO_SAMEORIGIN" };
    }

    if (first.startsWith("ALLOW-FROM")) {
      return { allowed: null, reason: "XFO_ALLOW_FROM_UNSUPPORTED" };
    }
  }

  return { allowed: null, reason: "NO_RELEVANT_HEADERS" };
}

export function normalizeUrlForCache(input: string): string | null {
  try {
    const url = new URL(input);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(p => Number(p));
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true;

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT

  if (ip === "169.254.169.254") return true; // metadata

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local

  // ipv4-mapped ipv6
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);

  return false;
}

function isPrivateIp(ip: string): boolean {
  const ipVersion = net.isIP(ip);
  if (ipVersion === 4) return isPrivateIpv4(ip);
  if (ipVersion === 6) return isPrivateIpv6(ip);
  return true;
}

export async function passesSsrfGuard(url: URL): Promise<boolean> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  if (hostname === "127.0.0.1" || hostname === "::1") return false;

  if (net.isIP(hostname)) {
    return !isPrivateIp(hostname);
  }

  try {
    const addrs = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    if (!addrs.length) return false;
    for (const addr of addrs) {
      if (isPrivateIp(addr.address)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
