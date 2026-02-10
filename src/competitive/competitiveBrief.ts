import fs from "node:fs";
import path from "node:path";

import { browserL0DomExtract, browserL0Navigate, browserL0Screenshot, type BrowserL0ScreenshotMode, type BrowserL0Viewport } from "../browserOperator/l0.js";
import type { BrowserL0ArtifactRef } from "../browserOperator/l0.js";
import { evidenceRollupSha256 } from "../receipts/evidenceRollup.js";
import { writeCompetitiveBriefArtifacts } from "../artifacts/writeCompetitiveBriefArtifacts.js";

type CompetitiveBriefScreenshotInput = {
  enabled: boolean;
  mode?: "same_origin" | "strict";
  maxRequests?: number;
  viewport?: { width?: number; height?: number };
  fullPage?: boolean;
};

type CompetitiveBriefWideResearchInput = {
  enabled: boolean;
  budget?: { maxSubtasks?: number; maxWallSeconds?: number };
};

export type CompetitiveBriefInput = {
  targets: string[];
  screenshot?: CompetitiveBriefScreenshotInput;
  wideResearch?: CompetitiveBriefWideResearchInput;
  depth?: "tight" | "normal";
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function lower(s: unknown): string {
  return String(s ?? "").toLowerCase();
}

function readArtifactUtf8(ref: BrowserL0ArtifactRef): string {
  const p = path.join(process.cwd(), ref.path);
  return fs.readFileSync(p, "utf8");
}

function pickTextFromEvidence(evidence: BrowserL0ArtifactRef[]): { html: string; text: string } {
  const htmlRef = evidence.find((e) => typeof e?.mime === "string" && e.mime.startsWith("text/html"));
  const txtRef = evidence.find((e) => typeof e?.mime === "string" && e.mime.startsWith("text/plain"));
  return {
    html: htmlRef ? readArtifactUtf8(htmlRef) : "",
    text: txtRef ? readArtifactUtf8(txtRef) : "",
  };
}

function extractHeadersFromNavigateEvidence(evidence: BrowserL0ArtifactRef[]): Record<string, string> {
  const metaRef = evidence.find((e) => typeof e?.mime === "string" && e.mime === "application/json" && e.path.endsWith("navigate.meta.json"));
  if (!metaRef) return {};
  try {
    const parsed = JSON.parse(readArtifactUtf8(metaRef));
    const headers = isPlainObject(parsed) && isPlainObject((parsed as any).headers) ? ((parsed as any).headers as any) : null;
    if (!headers) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") out[String(k).toLowerCase()] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function analyzeLightweight(args: { headers: Record<string, string>; html: string; text: string; screenshotIncluded: boolean }) {
  const h = args.headers;
  const htmlLower = lower(args.html);
  const textLower = lower(args.text);

  const stack_hints: string[] = [];
  if (lower(h["server"]).includes("cloudflare")) stack_hints.push("cloudflare");
  if (htmlLower.includes("__next_data__") || htmlLower.includes("next/static")) stack_hints.push("nextjs");
  if (htmlLower.includes("wp-content") || htmlLower.includes("wordpress")) stack_hints.push("wordpress");
  if (htmlLower.includes("cdn.shopify.com") || htmlLower.includes("shopify")) stack_hints.push("shopify");
  if (htmlLower.includes("wixsite") || htmlLower.includes("wix")) stack_hints.push("wix");

  const themes: string[] = [];
  const pushTheme = (cond: boolean, name: string) => {
    if (cond && !themes.includes(name)) themes.push(name);
  };

  pushTheme(textLower.includes("trust") || textLower.includes("beneficiary") || textLower.includes("trustee"), "trust");
  pushTheme(textLower.includes("credit") || textLower.includes("experian") || textLower.includes("equifax") || textLower.includes("transunion"), "credit");
  pushTheme(textLower.includes("dispute") || textLower.includes("fcra") || textLower.includes("metro 2"), "disputes");
  pushTheme(textLower.includes("ucc") || textLower.includes("secured") || textLower.includes("lien"), "ucc");

  const flags: string[] = [];
  const pushFlag = (cond: boolean, name: string) => {
    if (cond && !flags.includes(name)) flags.push(name);
  };

  const ctaWords = ["get started", "start", "download", "subscribe", "join", "claim", "book", "schedule", "contact", "apply"]; 
  const ctaHits = ctaWords.reduce((n, w) => n + (textLower.includes(w) ? 1 : 0), 0);

  pushFlag(ctaHits >= 3, "cta-heavy");
  pushFlag(textLower.includes("pricing") || textLower.includes("checkout") || textLower.includes("add to cart") || textLower.includes("$") , "pricing-or-commerce");
  pushFlag(textLower.includes("resources") || textLower.includes("library") || textLower.includes("learn") || textLower.includes("guides"), "resource-hub-markers");
  pushFlag(textLower.includes("testimonials") || textLower.includes("trusted by") || textLower.includes("reviews") || textLower.includes("case studies"), "social-proof");
  pushFlag(args.screenshotIncluded, "has-screenshot");

  const archetypes: string[] = [];
  const pushArch = (cond: boolean, name: string) => {
    if (cond && !archetypes.includes(name)) archetypes.push(name);
  };

  const headingCount = (args.html.match(/<h[1-3]\b/gi) || []).length;
  const words = args.text.trim().split(/\s+/).filter(Boolean);

  pushArch(flags.includes("cta-heavy"), "cta-heavy");
  pushArch(headingCount >= 8 && words.length >= 1200, "longform-education");
  pushArch(textLower.includes("dashboard") || textLower.includes("sign in") || textLower.includes("log in"), "dashboard-like");
  pushArch(textLower.includes("blog") && (textLower.includes("posts") || textLower.includes("latest") || textLower.includes("categories")), "blog-hub");
  pushArch(textLower.includes("product") || textLower.includes("sku") || textLower.includes("add to cart"), "catalog/product");

  if (archetypes.length === 0) archetypes.push("mixed");

  return {
    stack_hints: stack_hints.sort(),
    themes: themes.sort(),
    ux_flags: flags.sort(),
    archetypes: archetypes.sort(),
    metrics: {
      cta_hits: ctaHits,
      heading_count: headingCount,
      word_count: words.length,
    },
  };
}

function computeLayoutFlags(args: { html: string; text: string; archetypes: string[] }) {
  const htmlLower = lower(args.html);
  const textLower = lower(args.text);

  const heroSignals = ["<h1", "hero", "headline", "above the fold"]; 
  const heroHits = heroSignals.reduce((n, s) => n + (htmlLower.includes(s) ? 1 : 0), 0);

  const ctaWords = ["get started", "start", "download", "subscribe", "join", "claim", "book", "schedule", "contact", "apply"]; 
  const ctaHits = ctaWords.reduce((n, w) => n + (textLower.includes(w) ? 1 : 0), 0);

  const wordCount = args.text.trim().split(/\s+/).filter(Boolean).length;
  const ctaDensity = wordCount > 0 ? Number((ctaHits / wordCount).toFixed(4)) : 0;

  return {
    hero_signals: heroHits,
    cta_hits: ctaHits,
    cta_density: ctaDensity,
    archetypes: args.archetypes,
  };
}

export async function runCompetitiveBriefV1(args: {
  execution_id: string;
  step_id: string;
  timeoutMs: number;
  input: unknown;
}) {
  if (!isPlainObject(args.input)) {
    throw new Error("competitive.brief.v1 requires object payload");
  }

  const input = args.input as CompetitiveBriefInput;
  const targets = Array.isArray(input.targets) ? input.targets.map(String) : [];
  const screenshot: CompetitiveBriefScreenshotInput = isPlainObject(input.screenshot) ? (input.screenshot as any) : { enabled: false };

  const nowIso = new Date().toISOString();

  const perTarget: Array<{
    url: string;
    final_url: string | null;
    http_status: number | null;
    title: string | null;
    analysis: ReturnType<typeof analyzeLightweight>;
    evidence: BrowserL0ArtifactRef[];
    evidence_rollup_sha256: string;
    layout_flags: ReturnType<typeof computeLayoutFlags> | null;
  }> = [];

  const allEvidence: BrowserL0ArtifactRef[] = [];

  for (const [i, url] of targets.entries()) {
    const base = `${args.step_id}.t${i + 1}`;

    const nav = await browserL0Navigate({ execution_id: args.execution_id, step_id: `${base}.navigate`, url, timeoutMs: args.timeoutMs });
    const navJson: any = nav.responseJson;

    const shot =
      screenshot.enabled === true
        ? await browserL0Screenshot({
            execution_id: args.execution_id,
            step_id: `${base}.screenshot`,
            url,
            timeoutMs: args.timeoutMs,
            fullPage: typeof screenshot.fullPage === "boolean" ? screenshot.fullPage : false,
            mode: (screenshot.mode === "strict" ? "strict" : "same_origin") as BrowserL0ScreenshotMode,
            viewport:
              screenshot.viewport && (typeof screenshot.viewport === "object")
                ? ({
                    width: Number((screenshot.viewport as any).width ?? 1280) || 1280,
                    height: Number((screenshot.viewport as any).height ?? 720) || 720,
                  } satisfies BrowserL0Viewport)
                : undefined,
            maxRequests: typeof screenshot.maxRequests === "number" ? screenshot.maxRequests : undefined,
          })
        : null;

    const dom = await browserL0DomExtract({ execution_id: args.execution_id, step_id: `${base}.dom_extract`, url, timeoutMs: args.timeoutMs });
    const domJson: any = dom.responseJson;

    const navEvidence: BrowserL0ArtifactRef[] = Array.isArray(navJson?.evidence) ? navJson.evidence : [];
    const shotEvidence: BrowserL0ArtifactRef[] = shot && (shot as any).responseJson && Array.isArray((shot as any).responseJson.evidence) ? (shot as any).responseJson.evidence : [];
    const domEvidence: BrowserL0ArtifactRef[] = Array.isArray(domJson?.evidence) ? domJson.evidence : [];

    const combinedEvidence = [...navEvidence, ...shotEvidence, ...domEvidence];
    for (const e of combinedEvidence) allEvidence.push(e);

    const { html, text } = pickTextFromEvidence(domEvidence.length ? domEvidence : navEvidence);
    const headers = extractHeadersFromNavigateEvidence(navEvidence);

    const analysis = analyzeLightweight({ headers, html, text, screenshotIncluded: !!shot });
    const layout_flags = screenshot.enabled === true ? computeLayoutFlags({ html, text, archetypes: analysis.archetypes }) : null;

    perTarget.push({
      url: String(url),
      final_url: String(navJson?.final_url ?? domJson?.final_url ?? null),
      http_status: typeof navJson?.http_status === "number" ? navJson.http_status : null,
      title: typeof navJson?.title === "string" ? navJson.title : typeof domJson?.title === "string" ? domJson.title : null,
      analysis,
      evidence: combinedEvidence,
      evidence_rollup_sha256: evidenceRollupSha256(combinedEvidence),
      layout_flags,
    });
  }

  const evidence_manifest = {
    kind: "competitive.brief.evidence_manifest.v1",
    generated_at: nowIso,
    targets: perTarget.map((t) => ({
      url: t.url,
      evidence: t.evidence,
      evidence_rollup_sha256: t.evidence_rollup_sha256,
    })),
    evidence_rollup_sha256: evidenceRollupSha256(allEvidence),
  };

  const brief_json = {
    kind: "competitive.brief.result.v1",
    generated_at: nowIso,
    targets: targets,
    screenshot: screenshot.enabled === true ? { enabled: true, mode: screenshot.mode === "strict" ? "strict" : "same_origin" } : { enabled: false },
    wideResearch: isPlainObject(input.wideResearch) ? input.wideResearch : { enabled: false },
    results: perTarget.map((t) => ({
      url: t.url,
      final_url: t.final_url,
      http_status: t.http_status,
      title: t.title,
      analysis: t.analysis,
      evidence_rollup_sha256: t.evidence_rollup_sha256,
    })),
    evidence_rollup_sha256: (evidence_manifest as any).evidence_rollup_sha256,
  };

  const brief_md = [
    "# Competitive Brief",
    "",
    `Generated: ${nowIso}`,
    "",
    ...perTarget.flatMap((t) => {
      const a = t.analysis;
      return [
        `## ${t.url}`,
        `- Final: ${t.final_url ?? "(unknown)"}`,
        `- Status: ${t.http_status ?? "(unknown)"}`,
        `- Stack hints: ${a.stack_hints.join(", ") || "none"}`,
        `- Themes: ${a.themes.join(", ") || "none"}`,
        `- UX flags: ${a.ux_flags.join(", ") || "none"}`,
        `- Layout archetypes: ${a.archetypes.join(", ") || "mixed"}`,
        "",
      ];
    }),
  ].join("\n");

  const layout_flags_json = screenshot.enabled === true
    ? {
        kind: "competitive.brief.layout_flags.v1",
        generated_at: nowIso,
        targets: perTarget.map((t) => ({
          url: t.url,
          final_url: t.final_url,
          flags: t.layout_flags,
        })),
      }
    : null;

  const written = await writeCompetitiveBriefArtifacts({
    execution_id: args.execution_id,
    step_id: args.step_id,
    briefMd: brief_md,
    briefJson: brief_json,
    evidenceManifest: evidence_manifest,
    layoutFlagsJson: layout_flags_json,
  });

  const response = {
    execution_id: args.execution_id,
    step_id: args.step_id,
    evidence: written.evidence,
    evidence_rollup_sha256: written.evidence_rollup_sha256,
  };

  return { ok: true, status: 200, response, responseJson: response };
}
