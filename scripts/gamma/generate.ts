import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { gammaGenerateAndWait } from "../../src/integrations/gamma/generate.js";
import { GammaApiError } from "../../src/integrations/gamma/client.js";
import { buildGammaFreeImportPack } from "../../src/integrations/gamma/free-pack.js";
import { GammaStrictError } from "../../src/integrations/gamma/refusals.js";
import { parseStrictAnyFlag } from "../../src/governance/strict-any.js";
import { writeRefusalPack } from "../../src/governance/refusal-pack.js";

function runDirFromEnv() {
  return process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";
}

function parseTitle(argv: string[]): string {
  const raw = argv.join(" ").trim();
  return raw || "Gamma deck";
}

async function writeFreePack(runDir: string, title: string) {
  const pack = buildGammaFreeImportPack({
    title,
    sections: [
      {
        heading: "Overview",
        bullets: [
          "Paste this markdown into Gamma as source content.",
          "Keep cards concise (one idea per card).",
        ],
      },
      {
        heading: "Key Points",
        bullets: [
          "Gamma API requires a paid plan (Pro+/Teams/Business).",
          "Without an API key, use the web app import workflow.",
        ],
      },
    ],
  });

  const gammaDir = path.join(process.cwd(), runDir, "gamma");
  await mkdir(gammaDir, { recursive: true });

  await writeFile(path.join(gammaDir, "gamma_input.md"), pack.gamma_input_md, "utf8");
  await writeFile(path.join(gammaDir, "gamma_prompt.txt"), pack.gamma_prompt_txt, "utf8");
  await writeFile(path.join(gammaDir, "notes.txt"), pack.notes_txt, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "gamma_free_pack",
        out_dir: path.relative(process.cwd(), gammaDir),
      },
      null,
      2
    )
  );
}

async function main() {
  const strictAny = parseStrictAnyFlag(process.argv);
  const apiKey = String(process.env.GAMMA_API_KEY ?? "").trim();
  const runDir = runDirFromEnv();

  const title = parseTitle(process.argv.slice(2));

  if (!apiKey) {
    if (strictAny) {
      const refusal = {
        type: "REFUSE" as const,
        code: "GAMMA_API_KEY_MISSING" as const,
        message: "Missing GAMMA_API_KEY. Gamma API access requires a paid plan.",
        details: { env_var: "GAMMA_API_KEY" },
      };

      console.error(JSON.stringify(refusal, null, 2));
      process.exitCode = 2;

      try {
        await writeRefusalPack({
          runDir,
          refusal,
          exitCode: 2,
          ssal: { state: "REFUSE", code: refusal.code },
          note: "Strict Gamma refusal",
        });
      } catch {
        // best-effort
      }
      return;
    }

    await writeFreePack(runDir, title);
    return;
  }

  try {
    const result = await gammaGenerateAndWait({
      apiKey,
      request: {
        inputText: title,
        format: "presentation",
        numCards: 10,
      },
    });

    const gammaDir = path.join(process.cwd(), runDir, "gamma");
    await mkdir(gammaDir, { recursive: true });

    await writeFile(
      path.join(gammaDir, "gamma_api_result.json"),
      JSON.stringify({ generationId: result.generationId, fileUrls: result.fileUrls, final: result.final }, null, 2) +
        "\n",
      "utf8"
    );

    console.log(JSON.stringify({ ok: true, mode: "gamma_api", generationId: result.generationId, fileUrls: result.fileUrls }, null, 2));
  } catch (e) {
    const status = e instanceof GammaApiError ? e.status : undefined;

    if (strictAny) {
      const code =
        status === 401
          ? "GAMMA_API_UNAUTHORIZED"
          : status === 403
            ? "GAMMA_API_FORBIDDEN"
            : "GAMMA_GENERATION_FAILED";

      const refusal = {
        type: "REFUSE" as const,
        code,
        message: "Gamma generation failed under strict governance.",
        details: {
          status,
          error: String((e as any)?.message ?? e),
        },
      };

      console.error(JSON.stringify(refusal, null, 2));
      process.exitCode = 2;

      try {
        await writeRefusalPack({
          runDir,
          refusal,
          exitCode: 2,
          ssal: { state: "REFUSE", code: refusal.code },
          note: "Strict Gamma refusal",
        });
      } catch {
        // best-effort
      }
      return;
    }

    // Non-strict: surface error and suggest free-pack.
    console.error(String((e as any)?.message ?? e));
    console.error("Tip: unset GAMMA_API_KEY to generate a Gamma Free import pack.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  if (e instanceof GammaStrictError) {
    console.error(JSON.stringify(e.refusal, null, 2));
    process.exitCode = 2;
    return;
  }
  console.error(String((e as any)?.stack ?? (e as any)?.message ?? e));
  process.exitCode = 1;
});
