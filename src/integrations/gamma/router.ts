import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { gammaGenerateAndWait } from "./generate.js";
import { buildGammaFreeImportPack } from "./free-pack.js";
import type { GammaGenerationCreateRequest } from "./types.js";
import { assertGammaApiAllowed, type GammaBackend } from "./strict.js";

export type GammaDeckRequest = {
  title: string;
  sourceText: string;
  audience?: string;
  tone?: string;
  apiRequest?: Partial<GammaGenerationCreateRequest>;
  requestedBackend?: GammaBackend;
};

export type GammaDeckResult =
  | {
      backend: "gamma_api";
      generationId: string;
      fileUrls: Record<string, string>;
      artifactsDir: string;
    }
  | {
      backend: "gamma_free_pack";
      artifactsDir: string;
      files: {
        gamma_prompt_txt: string;
        gamma_input_md: string;
        notes_txt: string;
      };
    };

export async function runGammaDeck(opts: {
  runDir: string;
  strictAny?: boolean;
  request: GammaDeckRequest;
  env: { GAMMA_API_KEY?: string };
}): Promise<GammaDeckResult> {
  const runDirAbs = path.resolve(process.cwd(), opts.runDir);
  const artifactsDir = path.join(runDirAbs, "gamma");
  await mkdir(artifactsDir, { recursive: true });

  const apiKey = String(opts.env.GAMMA_API_KEY ?? "").trim();
  const hasApiKey = Boolean(apiKey);

  const backend: GammaBackend = hasApiKey ? "gamma_api" : "gamma_free_pack";

  assertGammaApiAllowed({
    strictAny: opts.strictAny,
    requestedBackend: opts.request.requestedBackend,
    hasApiKey,
  });

  await writeFile(
    path.join(artifactsDir, "backend.json"),
    JSON.stringify(
      {
        backend,
        requested_backend: opts.request.requestedBackend ?? null,
        has_api_key: hasApiKey,
        title: opts.request.title,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  if (backend === "gamma_api") {
    const apiPayload: GammaGenerationCreateRequest = {
      inputText: `# ${opts.request.title}\n\n${opts.request.sourceText}`,
      format: "presentation",
      title: opts.request.title,
      ...(opts.request.apiRequest ?? {}),
    };

    const res = await gammaGenerateAndWait({ apiKey, request: apiPayload });

    await writeFile(path.join(artifactsDir, "gamma_api.json"), JSON.stringify(res.final, null, 2) + "\n", "utf8");

    await writeFile(
      path.join(artifactsDir, "exports.json"),
      JSON.stringify({ generationId: res.generationId, fileUrls: res.fileUrls }, null, 2) + "\n",
      "utf8"
    );

    return {
      backend: "gamma_api",
      generationId: res.generationId,
      fileUrls: res.fileUrls,
      artifactsDir,
    };
  }

  const pack = buildGammaFreeImportPack({
    title: opts.request.title,
    tone: opts.request.tone,
    audience: opts.request.audience,
    sections: inferSections(opts.request.sourceText),
  });

  await writeFile(path.join(artifactsDir, "gamma_prompt.txt"), pack.gamma_prompt_txt, "utf8");
  await writeFile(path.join(artifactsDir, "gamma_input.md"), pack.gamma_input_md, "utf8");
  await writeFile(path.join(artifactsDir, "notes.txt"), pack.notes_txt, "utf8");
  await writeFile(path.join(artifactsDir, "free_pack.json"), JSON.stringify(pack, null, 2) + "\n", "utf8");

  return {
    backend: "gamma_free_pack",
    artifactsDir,
    files: pack,
  };
}

function inferSections(sourceText: string): Array<{ heading: string; bullets: string[] }> {
  const chunks = sourceText
    .split(/\n\s*\n/g)
    .map((c) => c.trim())
    .filter(Boolean);

  if (chunks.length === 0) {
    return [{ heading: "Overview", bullets: ["(No source text provided)"] }];
  }

  return chunks.slice(0, 8).map((c, i) => {
    const lines = c
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const heading = (lines[0] ?? "").slice(0, 80) || `Section ${i + 1}`;
    const bullets = lines.slice(1).length ? lines.slice(1).slice(0, 6) : [c.slice(0, 160)];
    return { heading, bullets };
  });
}
