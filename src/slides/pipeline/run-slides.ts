import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { compileOutlineToDeck } from "../outline/compile.js";
import { optimizeDeck } from "../outline/optimize.js";
import { loadBrandKit } from "../brandkit/load.js";
import { renderPptx } from "../render/pptx.js";
import { renderHtml } from "../render/html.js";
import { renderPdfFromHtml, PdfRendererUnavailable } from "../render/pdf.js";
import { sha256Hex, stableJson } from "../util/hash.js";

export type SlidesFormat = "pptx" | "html" | "pdf";

export type SlidesRunResult = {
  deckPath: string;
  brandPath: string;
  outputs: Record<string, string>;
};

export class SlidesStrictError extends Error {
  refusal: { type: "REFUSE"; code: string; message: string; details?: Record<string, unknown> };
  constructor(refusal: { type: "REFUSE"; code: string; message: string; details?: Record<string, unknown> }) {
    super(refusal.message);
    this.name = "SlidesStrictError";
    this.refusal = refusal;
  }
}

export async function runSlidesPipeline(opts: {
  runDir: string;
  outSubdir?: string;
  strictAny?: boolean;
  title: string;
  subtitle?: string;
  sourceText: string;
  brandIdOrPath: string;
  formats: SlidesFormat[];
}): Promise<SlidesRunResult> {
  const runDirAbs = path.resolve(process.cwd(), opts.runDir);
  const slidesDirAbs = path.join(runDirAbs, opts.outSubdir ?? "slides");
  await mkdir(slidesDirAbs, { recursive: true });

  let brand;
  try {
    brand = await loadBrandKit({ brandIdOrPath: opts.brandIdOrPath });
  } catch (e) {
    if (opts.strictAny) {
      throw new SlidesStrictError({
        type: "REFUSE",
        code: "BRANDKIT_MISSING",
        message: "Strict-any enabled: brandkit file/id is missing or unreadable.",
        details: { brandIdOrPath: opts.brandIdOrPath, error: String((e as any)?.message ?? e) },
      });
    }
    throw e;
  }

  const brandPathAbs = path.join(slidesDirAbs, "brandkit.json");
  const brandJson = stableJson(brand);
  await writeFile(brandPathAbs, brandJson, "utf8");

  const deck = compileOutlineToDeck({
    title: opts.title,
    subtitle: opts.subtitle,
    sourceText: opts.sourceText,
    maxBullets: brand.layout.max_bullets ?? 6,
    sourceType: "text",
  });

  const optimized = optimizeDeck(deck, brand, {
    maxBullets: brand.layout.max_bullets ?? 6,
    sectionEvery: 5,
    maxBulletChars: 140,
    maxMonoChars: 1800,
  });

  const deckPathAbs = path.join(slidesDirAbs, "deck.json");
  const deckJson = stableJson(optimized);
  await writeFile(deckPathAbs, deckJson, "utf8");

  const outputs: Record<string, string> = {};

  const pptxAbs = path.join(slidesDirAbs, "deck.pptx");
  const htmlAbs = path.join(slidesDirAbs, "deck.html");
  const pdfAbs = path.join(slidesDirAbs, "deck.pdf");

  const formats = [...new Set(opts.formats)].sort();

  for (const f of formats) {
    if (f === "pptx") {
      await renderPptx({ deck: optimized, brand, outPath: pptxAbs });
      outputs.pptx = path.relative(runDirAbs, pptxAbs);
      continue;
    }

    if (f === "html") {
      await renderHtml({ deck: optimized, brand, outPath: htmlAbs });
      outputs.html = path.relative(runDirAbs, htmlAbs);
      continue;
    }

    if (f === "pdf") {
      if (!outputs.html) {
        await renderHtml({ deck: optimized, brand, outPath: htmlAbs });
        outputs.html = path.relative(runDirAbs, htmlAbs);
      }

      try {
        await renderPdfFromHtml({ htmlPath: htmlAbs, outPath: pdfAbs });
        outputs.pdf = path.relative(runDirAbs, pdfAbs);
      } catch (e) {
        if (e instanceof PdfRendererUnavailable) {
          if (opts.strictAny) {
            throw new SlidesStrictError({
              type: "REFUSE",
              code: "PDF_RENDERER_UNAVAILABLE",
              message: "Strict-any enabled: PDF requested but Playwright is not installed.",
              details: { hint: "npm i -D playwright && npx playwright install" },
            });
          }
          // Non-strict fallback: keep HTML only.
          continue;
        }
        throw e;
      }
      continue;
    }

    if (opts.strictAny) {
      throw new SlidesStrictError({
        type: "REFUSE",
        code: "FORMAT_UNKNOWN",
        message: `Strict-any enabled: unknown format "${String(f)}".`,
        details: { allowed: ["pptx", "html", "pdf"] },
      });
    }
  }

  const renderPathAbs = path.join(slidesDirAbs, "render.json");
  await writeFile(
    renderPathAbs,
    stableJson({
      formats,
      outputs,
      provenance: {
        deck_sha256: sha256Hex(deckJson),
        brandkit_sha256: sha256Hex(brandJson),
      },
    }),
    "utf8"
  );

  return {
    deckPath: path.relative(runDirAbs, deckPathAbs),
    brandPath: path.relative(runDirAbs, brandPathAbs),
    outputs,
  };
}
