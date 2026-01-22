import crypto from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StitchAsset, StitchPack, StitchBackendId } from "./schema.js";
import { StitchStrictError, stitchRefusal } from "./refusals.js";
import { sha256Text, toStableStitchPack } from "./stable.js";

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function copyFileAbs(srcAbs: string, dstAbs: string): Promise<void> {
  const buf = await readFile(srcAbs);
  await mkdir(path.dirname(dstAbs), { recursive: true });
  await writeFile(dstAbs, buf);
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];

  const visit = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));

    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await visit(full);
        continue;
      }
      if (e.isFile()) {
        out.push(full);
      }
    }
  };

  await visit(root);
  out.sort((a, b) => a.localeCompare(b, "en"));
  return out;
}

const IGNORE_BASENAMES = new Set([".ds_store", "thumbs.db", "desktop.ini", ".gitkeep"]);

function isIgnoredExportFile(absPath: string): boolean {
  const base = path.basename(absPath).trim().toLowerCase();
  return IGNORE_BASENAMES.has(base);
}

export function getIgnoredStitchBasenames(): string[] {
  return Array.from(IGNORE_BASENAMES.values()).sort();
}

function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function classifyAsset(relPosix: string): StitchAsset["kind"] {
  const lower = relPosix.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "js";
  if (lower.endsWith(".zip")) return "zip";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".svg")) {
    return "image";
  }
  return "other";
}

function isSupportedExportPath(relPosix: string): boolean {
  // Keep permissive: Stitch exports vary; flag truly unknown types for strict mode.
  const kind = classifyAsset(relPosix);
  if (kind !== "other") return true;
  const lower = relPosix.toLowerCase();
  return lower.endsWith(".json") || lower.endsWith(".md") || lower.endsWith(".txt");
}

export async function ingestStitchExport(input: {
  runDir: string;
  backend: StitchBackendId;
  promptText: string;
  strict: boolean;
  sourceImportDir?: string | null;
  notes?: string[];
}): Promise<{ pack: StitchPack; ignoredFilesCount: number }> {
  const runDirAbs = path.resolve(process.cwd(), input.runDir);
  const stitchDirAbs = path.join(runDirAbs, "stitch");
  const importDirAbs = path.join(stitchDirAbs, "import");
  await mkdir(importDirAbs, { recursive: true });

  // Optional: copy a user-provided export into runDir/stitch/import.
  if (typeof input.sourceImportDir === "string" && input.sourceImportDir.trim()) {
    const srcAbs = path.resolve(process.cwd(), input.sourceImportDir);
    const srcExists = await pathExists(srcAbs);
    if (!srcExists) {
      const refusal = stitchRefusal(
        "STITCH_EXPORT_MISSING",
        "Strict Stitch mode: no Stitch export directory was found.",
        { sourceImportDir: toPosix(path.relative(process.cwd(), srcAbs) || input.sourceImportDir) }
      );
      if (input.strict) throw new StitchStrictError(refusal);
    } else {
      const abs = await walkFiles(srcAbs);
      for (const f of abs) {
        const rel = path.relative(srcAbs, f);
        const dst = path.join(importDirAbs, rel);
        await copyFileAbs(f, dst);
      }
    }
  }

  const absFilesAll = (await pathExists(importDirAbs)) ? await walkFiles(importDirAbs) : [];
  const ignoredFilesCount = absFilesAll.filter(isIgnoredExportFile).length;
  const absFiles = absFilesAll.filter((p) => !isIgnoredExportFile(p));
  const unsupported: string[] = [];

  const assets: StitchAsset[] = [];
  for (const abs of absFiles) {
    const rel = path.relative(importDirAbs, abs);
    const relPosix = toPosix(rel);
    const kind = classifyAsset(relPosix);
    if (!isSupportedExportPath(relPosix)) unsupported.push(relPosix);

    const buf = await readFile(abs);
    const digest = sha256(buf);
    assets.push({ kind, path: `stitch/import/${relPosix}`, sha256: digest } as any);
  }

  assets.sort((a, b) => a.path.localeCompare(b.path, "en"));
  unsupported.sort((a, b) => a.localeCompare(b, "en"));

  if (unsupported.length) {
    const refusal = stitchRefusal(
      "STITCH_UNSUPPORTED_EXPORT",
      "Stitch export contains unsupported file types.",
      { unsupported, tip: "Export web assets (HTML/CSS/JS) or a ZIP pack." }
    );
    if (input.strict) throw new StitchStrictError(refusal);
  }

  if (input.strict && assets.length === 0) {
    const refusal = stitchRefusal(
      "STITCH_EXPORT_MISSING",
      "Strict Stitch mode: no usable Stitch export files were found (empty export or ignored-only files).",
      {
        importDir: "stitch/import",
        ignoredFilesCount,
        ignoredBasenames: getIgnoredStitchBasenames(),
        tip: "Export from Stitch (web assets) and place files under runs/<id>/stitch/import.",
      }
    );
    throw new StitchStrictError(refusal);
  }

  const runId = path.basename(runDirAbs);

  const pack: StitchPack = {
    version: 1,
    runId,
    createdAt: new Date().toISOString(),
    backend: input.backend,
    prompt: { text: input.promptText, platform: "unknown" },
    import: {
      dir: "stitch/import",
      found: assets.length > 0,
      assets,
    },
    notes: Array.isArray(input.notes) && input.notes.length ? input.notes : undefined,
  };

  await mkdir(stitchDirAbs, { recursive: true });
  await writeFile(path.join(stitchDirAbs, "stitchpack.json"), JSON.stringify(pack, null, 2) + "\n", "utf8");

  // Deterministic stable view + hash (for CI / audit comparisons).
  const stableObj = toStableStitchPack(pack, runDirAbs);
  const stableText = JSON.stringify(stableObj, null, 2) + "\n";
  await writeFile(path.join(stitchDirAbs, "stitchpack.stable.json"), stableText, "utf8");
  await writeFile(path.join(stitchDirAbs, "stitchpack.stable.sha256"), sha256Text(stableText) + "\n", "utf8");

  return { pack, ignoredFilesCount };
}

export function stitchInventoryToMarkdown(pack: StitchPack & { title?: string; subtitle?: string }): string {
  const title = String(pack.title ?? "Stitch UI Export").trim() || "Stitch UI Export";
  const subtitle = typeof pack.subtitle === "string" && pack.subtitle.trim() ? pack.subtitle.trim() : undefined;

  const lines: string[] = [];
  lines.push(`# ${title}`);
  if (subtitle) lines.push(`\n${subtitle}`);

  lines.push("\n## Stitch Prompt");
  lines.push(`- backend: ${pack.backend}`);
  lines.push(`- import_dir: ${pack.import.dir}`);
  if (pack.prompt?.text?.trim()) lines.push(`- prompt: ${pack.prompt.text.trim()}`);

  lines.push("\n## Assets");
  if (!pack.import.assets.length) {
    lines.push("(none)");
    return lines.join("\n") + "\n";
  }

  for (const a of pack.import.assets) {
    const short = typeof a.sha256 === "string" ? a.sha256.slice(0, 12) + "…" : "";
    lines.push(`- ${a.path} (${a.kind}${short ? `, sha256:${short}` : ""})`);
  }

  lines.push("\n## Notes");
  lines.push("This is a local ingest of a Stitch export. No external services are called by `/ui stitch`.");
  return lines.join("\n") + "\n";
}
