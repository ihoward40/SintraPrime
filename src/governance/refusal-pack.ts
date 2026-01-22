import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SSALState = "ALLOW" | "REFUSE";

export type RefusalPackInput = {
  runDir: string; // absolute or cwd-relative ok
  refusal: unknown; // your ArchRefusal (or any refusal object)
  exitCode: number; // recommend 2
  arch?: { arch_id?: string; arch_version?: string } | { archId?: string; archVersion?: string };
  ssal?: {
    state: SSALState; // "REFUSE"
    code?: string; // e.g. ARCH_UNKNOWN / ARCH_MISSING
  };
  note?: string; // optional operator-friendly note
};

function nowISO() {
  return new Date().toISOString();
}

function nextFixHints(code: string): string[] {
  switch (String(code || "").trim()) {
    case "STITCH_EXPORT_MISSING":
      return [
        "Drop exports into `runs/<id>/stitch/import` or run `tools/stitch-import.ps1 -RunDir <runDir> -From <export.zip|folder>`.",
        "Optionally provide a source directory via `--stitch-import <dir>` or set `SINTRAPRIME_STITCH_IMPORT_DIR`.",
        "If strict governance is enabled, the export must exist before running `/ui stitch`.",
      ];
    case "STITCH_UNSUPPORTED_EXPORT":
      return [
        "Re-export from Stitch as web assets (HTML/CSS/JS) or a ZIP pack.",
        "Or disable `--strict-stitch` / `--strict-any` to ingest best-effort.",
      ];
    case "STITCH_AUTOMATION_BLOCKED":
      return [
        "Default is human-in-the-loop ingest: drop exports into `runs/<id>/stitch/import` or run `tools/stitch-import.ps1`.",
        "To allow automation, set `SINTRAPRIME_STITCH_AUTOMATE=1` (then re-run).",
      ];
    case "STITCH_UNKNOWN_BACKEND":
      return [
        "Use `--stitch-backend stitch_web_ingest` (or unset `SINTRAPRIME_STITCH_BACKEND`).",
        "Supported: `stitch_web_ingest`, `stitch_auto_playwright`.",
      ];
    case "STITCH_RENDER_FAILED":
      return [
        "Re-run without `--stitch-render` to keep ingest-only artifacts.",
        "Or run `/slides --in runs/<id>/stitch/pitch.md --format html,pptx` to reproduce the render in isolation.",
        "If PDF is required, install Playwright (`npm i -D playwright && npx playwright install`).",
      ];
    case "ARCH_MISSING":
      return [
        "Add `--arch synergy-7` (or set `SINTRAPRIME_ARCH`).",
        "If strict mode is enabled, an explicit architecture id is required.",
      ];
    case "ARCH_UNKNOWN":
      return [
        "Verify `governance/architectures/<id>.json` exists.",
        "Ensure the JSON includes `system_prompt.text`.",
      ];
    case "MODE_MISSING":
      return ["Add `--mode <id>` (e.g., `--mode legal`) or set your default mode selection."];
    case "MODE_UNKNOWN":
      return [
        "Verify `governance/modes/<id>.json` exists.",
        "Ensure the JSON includes `system_prompt.text` (or use a valid known mode id).",
      ];
    case "TURBOSPARSE_EMPTY":
      return [
        "Try `--no-turbosparse`, or rephrase the request to include keywords for the intended expert (slides/devops/legal/evidence).",
        "Or disable `--strict-turbosparse` / `--strict-any`.",
      ];
    case "GAMMA_API_KEY_MISSING":
      return ["Set `GAMMA_API_KEY` (Gamma API requires a paid plan with API access)."];
    case "GAMMA_API_FORBIDDEN":
      return ["Gamma denied access. Verify your plan includes API access and credits are available."];
    case "GAMMA_API_UNAUTHORIZED":
      return ["Gamma rejected the API key. Verify `GAMMA_API_KEY` is valid and active."];
    case "GAMMA_GENERATION_FAILED":
      return ["Retry the request, then inspect refusal details for the Gamma status/error payload."];
    case "FORMAT_UNKNOWN":
      return ["Use `--format pptx,html,pdf` (allowed: pptx, html, pdf) or omit invalid formats."];
    case "PDF_RENDERER_UNAVAILABLE":
      return ["Install Playwright (`npm i -D playwright && npx playwright install`) or render HTML/PPTX only."];
    case "BRANDKIT_MISSING":
      return [
        "Verify `governance/brandkits/<id>.json` exists (or pass a valid `--brand <id>` / `--brand path/to.json`).",
      ];
    default:
      return ["Review the refusal code/details and re-run with corrected inputs."];
  }
}

function normalizeDetailsForMd(details: unknown): unknown {
  if (!details || typeof details !== "object") return details;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details as Record<string, unknown>)) {
    if (typeof v === "string") {
      // Operator-safe: prefer relative paths when possible.
      try {
        if (path.isAbsolute(v)) {
          out[k] = path.relative(process.cwd(), v) || v;
          continue;
        }
      } catch {
        // ignore
      }
    }
    out[k] = v;
  }
  return out;
}

async function safeReadJson(filePath: string): Promise<any | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Writes a refusal pack suitable for audit + deterministic run receipts.
 *
 * Output:
 *   <runDir>/refusal/refusal.json
 *   <runDir>/receipt.json                    (updated or created)
 *   <runDir>/events.jsonl                    (appended)
 */
export async function writeRefusalPack(input: RefusalPackInput): Promise<{
  refusalJsonPath: string;
  receiptPath: string;
  eventsPath: string;
}> {
  const runDir = path.resolve(process.cwd(), input.runDir);
  const refusalDir = path.join(runDir, "refusal");

  await mkdir(refusalDir, { recursive: true });

  // 1) refusal.json
  const refusalJsonPath = path.join(refusalDir, "refusal.json");
  await writeFile(
    refusalJsonPath,
    JSON.stringify(
      {
        ts: nowISO(),
        ...(
          typeof input.refusal === "object" && input.refusal !== null
            ? input.refusal
            : { refusal: input.refusal }
        ),
        ssal_state: input.ssal?.state ?? "REFUSE",
        exit_code: input.exitCode,
        note: input.note ?? undefined,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  // 1b) refusal.md (operator-safe)
  const refusalMdPath = path.join(refusalDir, "refusal.md");
  const r: any =
    typeof input.refusal === "object" && input.refusal !== null ? input.refusal : { refusal: input.refusal };
  const code = input.ssal?.code ?? r.code ?? "REFUSE";
  const msg = r.message ?? input.note ?? "Request refused under governance.";
  const detailsObj = normalizeDetailsForMd(r.details);
  const details = detailsObj ? JSON.stringify(detailsObj, null, 2) : "{}";
  const hints = nextFixHints(code);

  const md =
    `# Refusal Notice (SSAL)\n\n` +
    `**State:** ${input.ssal?.state ?? "REFUSE"}  \n` +
    `**Code:** ${code}  \n` +
    `**Exit Code:** ${input.exitCode}  \n` +
    // Intentionally omit timestamps for stability/determinism; see refusal.json for machine time.
    "\n" +
    `## Summary\n` +
    `${msg}\n\n` +
    `## Next Fix\n` +
    hints.map((h) => `- ${h}\n`).join("") +
    "\n" +
    `## Operator Notes\n` +
    `- This refusal is deterministic and logged with run artifacts.\n\n` +
    `## Details (for troubleshooting)\n` +
    `\`\`\`json\n` +
    `${details}\n` +
    `\`\`\`\n`;

  await writeFile(refusalMdPath, md, "utf8");

  // Normalize arch fields whether you pass ArchSelection or your own shape
  const arch_id =
    (input.arch as any)?.arch_id ??
    (input.arch as any)?.archId ??
    undefined;

  const arch_version =
    (input.arch as any)?.arch_version ??
    (input.arch as any)?.archVersion ??
    undefined;

  // 2) deterministic receipt update
  const receiptPath = path.join(runDir, "receipt.json");
  const existingReceipt = (await safeReadJson(receiptPath)) ?? {};
  const nextReceipt = {
    ...existingReceipt,
    ts: existingReceipt.ts ?? nowISO(),
    updated_ts: nowISO(),

    // Governance fields (audit anchors)
    ssal_state: input.ssal?.state ?? "REFUSE",
    refusal_code: input.ssal?.code ?? (existingReceipt.refusal_code ?? undefined),
    exit_code: input.exitCode,

    // Architecture audit fields
    arch_id: arch_id ?? existingReceipt.arch_id,
    arch_version: arch_version ?? existingReceipt.arch_version,

    // Pointer to pack output
    refusal_pack: {
      dir: "refusal",
      refusal_json: path.relative(runDir, refusalJsonPath),
    },
  };

  await writeFile(receiptPath, JSON.stringify(nextReceipt, null, 2) + "\n", "utf8");

  // 3) machine logs (jsonl append)
  const eventsPath = path.join(runDir, "events.jsonl");
  const eventLine = {
    ts: nowISO(),
    level: "refusal",
    ssal_state: input.ssal?.state ?? "REFUSE",
    refusal_code: input.ssal?.code ?? undefined,
    exit_code: input.exitCode,
    arch_id,
    arch_version,
    refusal_ref: path.relative(runDir, refusalJsonPath),
  };

  await appendFile(eventsPath, JSON.stringify(eventLine) + "\n", "utf8");

  return { refusalJsonPath, receiptPath, eventsPath };
}
