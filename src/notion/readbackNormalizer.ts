import crypto from "crypto";
import { stableStringify } from "../utils/stableJson.js";

export interface RunBlocksDigestInput {
  templates: string;
  selfCheck: string;
  provenance: string;
}

export interface RunBlocksPerBlockDigest {
  ordinal: number;
  block_id: string;
  type: string;
  label?: string;
  text_sha256: string;
  text_bytes: number;
}

export interface NotionExtractedCodeBlock {
  heading_block_id: string;
  code_block_id: string;
  language: string;
  text: string;
  last_edited_time?: string;
}

export interface ReadbackPinnedBlockReceipt {
  label: "TEMPLATES" | "SELF_CHECK" | "PROVENANCE";
  heading: "TEMPLATES.json" | "SELF_CHECK.json" | "PROVENANCE.json";
  block_id: string;
  type: "code";
  language: string;
  last_edited_time: string;
  text_sha256: string;
}

export interface NormalizeNotionReadbackResult {
  version: "readback_normalizer.v1";
  required_labels: string[];
  extracted: Record<"TEMPLATES.json" | "SELF_CHECK.json" | "PROVENANCE.json", NotionExtractedCodeBlock>;
  run_blocks_sha256: string;
  run_blocks_bytes: number;
  readback_blocks_sha256: string;
  readback_blocks_bytes: number;
  per_block_digests: RunBlocksPerBlockDigest[];
}

export interface NormalizePinnedNotionBlocksResult {
  version: "readback_pinned_ids.v1";
  pins: {
    templates_block_id: string;
    self_check_block_id: string;
    provenance_block_id: string;
    pin_set_digest_sha256: string;
  };
  extracted: Record<"TEMPLATES.json" | "SELF_CHECK.json" | "PROVENANCE.json", NotionExtractedCodeBlock>;
  run_blocks_sha256: string;
  run_blocks_bytes: number;
  readback_blocks_sha256: string;
  readback_blocks_bytes: number;
  readback_blocks: ReadbackPinnedBlockReceipt[];
  readback_blocks_json_sha256: string;
  per_block_digests: RunBlocksPerBlockDigest[];
}

export interface NormalizeNotionReadbackOptions {
  targetLabels?: string[];
  strictAdjacency?: boolean;
  allowBetweenTypes?: Set<string>;
  maxBetween?: number;
}

/** Deterministic SHA-256 hex (lowercase) over UTF-8 bytes. */
function sha256HexUtf8(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function byteLenUtf8(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

function parseIsoMsOrFail(iso: string, failToken: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    throw new Error(`READBACK_FAIL: ${failToken}`);
  }
  return ms;
}

/** Join Notion rich_text plain_text fragments exactly as returned. */
function joinPlainText(richTextArray: any): string {
  if (!Array.isArray(richTextArray)) return "";
  return richTextArray
    .map((x) => (x && typeof x.plain_text === "string" ? x.plain_text : ""))
    .join("");
}

/**
 * Canonical concatenation used for run_blocks_sha256.
 * IMPORTANT: hashes the post-write readback strings exactly (no trimming/normalization).
 */
function canonicalConcatTriplet({ templates, selfCheck, provenance }: RunBlocksDigestInput): string {
  return (
    "SINTRAPRIME_RUN_BLOCKS_V1\n" +
    "---TEMPLATES.json---\n" +
    templates +
    "\n" +
    "---SELF_CHECK.json---\n" +
    selfCheck +
    "\n" +
    "---PROVENANCE.json---\n" +
    provenance +
    "\n"
  );
}

function isEmptyParagraph(block: any): boolean {
  if (!block || block.type !== "paragraph") return false;
  const text = joinPlainText(block.paragraph?.rich_text);
  return text.length === 0;
}

function recordDigest(
  per_block_digests: RunBlocksPerBlockDigest[],
  ordinal: number,
  block_id: string,
  type: string,
  label: string | null,
  text: string
) {
  const entry: RunBlocksPerBlockDigest = {
    ordinal,
    block_id,
    type,
    text_sha256: sha256HexUtf8(text),
    text_bytes: byteLenUtf8(text),
  };
  if (label) entry.label = label;
  per_block_digests.push(entry);
}

/**
 * Canonical evidence lines digest for “exactly what Notion returned” receipts.
 * Each line format:
 *   {ordinal}|{type}|{label}|{block_id}|{bytes}|{text_sha256}\n
 */
function canonicalizeReadbackEvidence(per_block_digests: RunBlocksPerBlockDigest[]): string {
  return per_block_digests
    .map((e) => {
      const label = e.label ?? "";
      return `${e.ordinal}|${e.type}|${label}|${e.block_id}|${e.text_bytes}|${e.text_sha256}`;
    })
    .join("\n")
    .concat("\n");
}

/**
 * Deterministic digest of the pinned block-id set.
 * Canonical bytes:
 *   TEMPLATES|{id}\nSELF_CHECK|{id}\nPROVENANCE|{id}
 */
export function pinSetDigestSha256(pins: {
  templates_block_id: string;
  self_check_block_id: string;
  provenance_block_id: string;
}): string {
  const canonical =
    "SINTRAPRIME_PIN_SET_V1\n" +
    `templates_block_id=${pins.templates_block_id}\n` +
    `self_check_block_id=${pins.self_check_block_id}\n` +
    `provenance_block_id=${pins.provenance_block_id}\n`;
  return sha256HexUtf8(canonical);
}

function readbackEvidencePinned3(input: {
  templates: { id: string; text: string };
  selfCheck: { id: string; text: string };
  provenance: { id: string; text: string };
}): string {
  const tSha = sha256HexUtf8(input.templates.text);
  const sSha = sha256HexUtf8(input.selfCheck.text);
  const pSha = sha256HexUtf8(input.provenance.text);
  const tBytes = byteLenUtf8(input.templates.text);
  const sBytes = byteLenUtf8(input.selfCheck.text);
  const pBytes = byteLenUtf8(input.provenance.text);

  return (
    `TEMPLATES.json|${input.templates.id}|${tBytes}|${tSha}\n` +
    `SELF_CHECK.json|${input.selfCheck.id}|${sBytes}|${sSha}\n` +
    `PROVENANCE.json|${input.provenance.id}|${pBytes}|${pSha}\n`
  );
}

function extractPinnedCodeBlock(
  block: any,
  expectedId: string,
  label: string,
  opts?: { allowedLanguages?: string[]; enforceNoEditsAfterLockedAt?: boolean; lockedAtIso?: string }
): NotionExtractedCodeBlock {
  const id: string = block?.id || "";
  if (!id || id !== expectedId) {
    throw new Error(`READBACK_FAIL: Pinned block id mismatch for ${label} (expected ${expectedId}, got ${id}).`);
  }
  if (block?.type !== "code") {
    throw new Error(`READBACK_FAIL: Pinned block is not code for ${label} (type=${String(block?.type)}).`);
  }
  const text = joinPlainText(block.code?.rich_text);
  const language = block.code?.language || "";
  const last_edited_time = String(block?.last_edited_time || "");

  if (opts?.allowedLanguages && opts.allowedLanguages.length > 0) {
    const actual = String(language || "").toLowerCase();
    const allowed = opts.allowedLanguages.map((x) => String(x).toLowerCase());
    if (!allowed.includes(actual)) {
      throw new Error(
        `READBACK_FAIL: PIN_BLOCK_LANGUAGE_DRIFT for ${label} (language=${JSON.stringify(language)}, allowed=${JSON.stringify(
          opts.allowedLanguages
        )}).`
      );
    }
  }

  if (opts?.enforceNoEditsAfterLockedAt) {
    if (!opts.lockedAtIso) {
      throw new Error("READBACK_FAIL: LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE");
    }
    if (!last_edited_time) {
      throw new Error("READBACK_FAIL: BLOCK_LAST_EDITED_TIME_INVALID");
    }
    const lockedMs = parseIsoMsOrFail(opts.lockedAtIso, "LOCK_TIMESTAMP_INVALID");
    const editedMs = parseIsoMsOrFail(last_edited_time, "BLOCK_LAST_EDITED_TIME_INVALID");
    if (editedMs > lockedMs) {
      throw new Error(
        `READBACK_FAIL: LOCKED_BLOCK_EDITED_AFTER_LOCK (label=${label}, block_id=${expectedId}, last_edited_time=${last_edited_time}, locked_at=${opts.lockedAtIso})`
      );
    }
  }

  return {
    heading_block_id: "",
    code_block_id: id,
    language,
    text,
    last_edited_time,
  };
}

/**
 * Pinned block-id mode: given three GET /v1/blocks/{id} payloads, compute:
 * - run_blocks_sha256 over the post-write strings
 * - readback_blocks_sha256 over a deterministic 3-entry evidence list
 * - pin_set_digest_sha256 over the pinned ids
 */
export function normalizePinnedNotionBlocks(input: {
  templates: any;
  selfCheck: any;
  provenance: any;
  locked_at_iso?: string;
  stored_pin_set_digest_sha256?: string;
  expected_pin_set_digest_sha256?: string;
  pin_mode?: string;
  pin_mode_locked?: boolean;
  require_pin_mode_locked_when_pins_present?: boolean;
  require_locked_at_when_pin_mode_locked?: boolean;
  enforce_no_edits_after_locked_at?: boolean;
  enforce_page_no_edits_after_locked_at?: boolean;
  page_last_edited_time_iso?: string;
  allowed_languages?: {
    templates?: string[];
    selfCheck?: string[];
    provenance?: string[];
  };
  pins: {
    templates_block_id: string;
    self_check_block_id: string;
    provenance_block_id: string;
  };
}): NormalizePinnedNotionBlocksResult {
  const pinMode = String(input.pin_mode ?? "").trim();
  if (pinMode && pinMode !== "heading_pair" && pinMode !== "pinned_block_id") {
    throw new Error(`READBACK_FAIL: PIN_MODE_INVALID (pin_mode=${JSON.stringify(pinMode)}).`);
  }

  const t = String(input.pins.templates_block_id ?? "").trim();
  const s = String(input.pins.self_check_block_id ?? "").trim();
  const p = String(input.pins.provenance_block_id ?? "").trim();
  const allPinsPresent = !!t && !!s && !!p;
  const anyPinPresent = !!t || !!s || !!p;

  if (input.require_pin_mode_locked_when_pins_present && anyPinPresent && input.pin_mode_locked !== true) {
    throw new Error("READBACK_FAIL: PIN_SET_NOT_LOCKED");
  }

  if (input.require_locked_at_when_pin_mode_locked && pinMode === "pinned_block_id" && input.pin_mode_locked === true) {
    if (!input.locked_at_iso) throw new Error("READBACK_FAIL: LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE");
    parseIsoMsOrFail(String(input.locked_at_iso), "LOCK_TIMESTAMP_INVALID");
  }

  if (input.enforce_page_no_edits_after_locked_at) {
    if (!input.locked_at_iso) throw new Error("READBACK_FAIL: LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE");
    const lockedMs = parseIsoMsOrFail(String(input.locked_at_iso), "LOCK_TIMESTAMP_INVALID");

    const pageLast = String(input.page_last_edited_time_iso ?? "");
    if (!pageLast) throw new Error("READBACK_FAIL: PAGE_LAST_EDITED_TIME_INVALID");
    const pageMs = parseIsoMsOrFail(pageLast, "PAGE_LAST_EDITED_TIME_INVALID");
    if (pageMs > lockedMs) {
      throw new Error(
        `READBACK_FAIL: LOCKED_PAGE_EDITED_AFTER_LOCK (page_last_edited_time=${pageLast}, locked_at=${String(
          input.locked_at_iso
        )})`
      );
    }
  }

  if (pinMode === "pinned_block_id" && !allPinsPresent) {
    throw new Error("READBACK_FAIL: PIN_SET_PARTIAL_REFUSED (PIN_MODE=pinned_block_id but one or more pins missing).");
  }
  if (pinMode !== "pinned_block_id" && anyPinPresent) {
    throw new Error("READBACK_FAIL: PIN_SET_PRESENT_BUT_MODE_NOT_PINNED (pins present but PIN_MODE!=pinned_block_id).");
  }

  const pin_set_digest_sha256 = pinSetDigestSha256(input.pins);

  const extractedTemplates = extractPinnedCodeBlock(
    input.templates,
    input.pins.templates_block_id,
    "TEMPLATES.json",
    {
      allowedLanguages: input.allowed_languages?.templates,
      enforceNoEditsAfterLockedAt: input.enforce_no_edits_after_locked_at,
      lockedAtIso: input.locked_at_iso,
    }
  );
  const extractedSelfCheck = extractPinnedCodeBlock(
    input.selfCheck,
    input.pins.self_check_block_id,
    "SELF_CHECK.json",
    {
      allowedLanguages: input.allowed_languages?.selfCheck,
      enforceNoEditsAfterLockedAt: input.enforce_no_edits_after_locked_at,
      lockedAtIso: input.locked_at_iso,
    }
  );
  const extractedProvenance = extractPinnedCodeBlock(
    input.provenance,
    input.pins.provenance_block_id,
    "PROVENANCE.json",
    {
      allowedLanguages: input.allowed_languages?.provenance,
      enforceNoEditsAfterLockedAt: input.enforce_no_edits_after_locked_at,
      lockedAtIso: input.locked_at_iso,
    }
  );

  // Pin-set digest checks intentionally run AFTER lock checks, so lock integrity failures
  // surface before pin digest mismatch/missing.
  if (input.stored_pin_set_digest_sha256 !== undefined) {
    const stored = String(input.stored_pin_set_digest_sha256 ?? "").trim();
    if (allPinsPresent && !stored) {
      throw new Error("READBACK_FAIL: PIN_SET_DIGEST_MISSING_FOR_PINNED_SET");
    }
    if (stored && stored !== pin_set_digest_sha256) {
      throw new Error(`READBACK_FAIL: PIN_SET_TAMPERED (stored ${stored}, computed ${pin_set_digest_sha256}).`);
    }
  } else if (input.expected_pin_set_digest_sha256) {
    const expected = String(input.expected_pin_set_digest_sha256).trim();
    if (expected && expected !== pin_set_digest_sha256) {
      throw new Error(`READBACK_FAIL: PIN_SET_TAMPERED (expected ${expected}, computed ${pin_set_digest_sha256}).`);
    }
  }

  const canonical = canonicalConcatTriplet({
    templates: extractedTemplates.text,
    selfCheck: extractedSelfCheck.text,
    provenance: extractedProvenance.text,
  });
  const run_blocks_sha256 = sha256HexUtf8(canonical);

  const evidence = readbackEvidencePinned3({
    templates: { id: extractedTemplates.code_block_id, text: extractedTemplates.text },
    selfCheck: { id: extractedSelfCheck.code_block_id, text: extractedSelfCheck.text },
    provenance: { id: extractedProvenance.code_block_id, text: extractedProvenance.text },
  });
  const readback_blocks_sha256 = sha256HexUtf8(evidence);

  const readback_blocks: ReadbackPinnedBlockReceipt[] = [
    {
      label: "TEMPLATES",
      heading: "TEMPLATES.json",
      block_id: extractedTemplates.code_block_id,
      type: "code",
      language: String(extractedTemplates.language ?? ""),
      last_edited_time: extractedTemplates.last_edited_time ?? "",
      text_sha256: sha256HexUtf8(extractedTemplates.text),
    },
    {
      label: "SELF_CHECK",
      heading: "SELF_CHECK.json",
      block_id: extractedSelfCheck.code_block_id,
      type: "code",
      language: String(extractedSelfCheck.language ?? ""),
      last_edited_time: extractedSelfCheck.last_edited_time ?? "",
      text_sha256: sha256HexUtf8(extractedSelfCheck.text),
    },
    {
      label: "PROVENANCE",
      heading: "PROVENANCE.json",
      block_id: extractedProvenance.code_block_id,
      type: "code",
      language: String(extractedProvenance.language ?? ""),
      last_edited_time: extractedProvenance.last_edited_time ?? "",
      text_sha256: sha256HexUtf8(extractedProvenance.text),
    },
  ];
  const readback_blocks_json = stableStringify(readback_blocks, { indent: 0, trailingNewline: false });
  const readback_blocks_json_sha256 = sha256HexUtf8(readback_blocks_json);

  const per_block_digests: RunBlocksPerBlockDigest[] = [];
  recordDigest(per_block_digests, 0, extractedTemplates.code_block_id, "code", "TEMPLATES.json", extractedTemplates.text);
  recordDigest(per_block_digests, 1, extractedSelfCheck.code_block_id, "code", "SELF_CHECK.json", extractedSelfCheck.text);
  recordDigest(per_block_digests, 2, extractedProvenance.code_block_id, "code", "PROVENANCE.json", extractedProvenance.text);

  return {
    version: "readback_pinned_ids.v1",
    pins: {
      templates_block_id: input.pins.templates_block_id,
      self_check_block_id: input.pins.self_check_block_id,
      provenance_block_id: input.pins.provenance_block_id,
      pin_set_digest_sha256,
    },
    extracted: {
      "TEMPLATES.json": extractedTemplates,
      "SELF_CHECK.json": extractedSelfCheck,
      "PROVENANCE.json": extractedProvenance,
    },
    run_blocks_sha256,
    run_blocks_bytes: byteLenUtf8(canonical),
    readback_blocks_sha256,
    readback_blocks_bytes: byteLenUtf8(evidence),
    readback_blocks,
    readback_blocks_json_sha256,
    per_block_digests,
  };
}

/**
 * Normalizes a Notion `blocks.children.list` readback (`results[]`) into:
 * - extracted code blocks keyed by heading_2 label
 * - run_blocks_sha256 (post-write)
 * - per_block_digests list (tamper evidence)
 *
 * Hard gates:
 * - must find exactly one code block for each label
 * - must bind code block to the immediately preceding heading_2 label (target labels only)
 * - ambiguity (duplicate heading label before binding, second code under same label) => FAIL
 * - optional adjacency gate (strictAdjacency=true)
 */
export function normalizeNotionReadback(
  results: any,
  opts: NormalizeNotionReadbackOptions = {}
): NormalizeNotionReadbackResult {
  const {
    targetLabels = ["TEMPLATES.json", "SELF_CHECK.json", "PROVENANCE.json"],
    strictAdjacency = true,
    allowBetweenTypes = new Set(["divider", "paragraph"]),
    maxBetween = 2,
  } = opts;

  const targets = new Set(targetLabels);

  const found: Record<string, NotionExtractedCodeBlock | undefined> = Object.create(null);
  const per_block_digests: RunBlocksPerBlockDigest[] = [];

  let pendingLabel: string | null = null;
  let pendingHeadingBlockId: string | null = null;
  let pendingBetweenCount = 0;

  const seenHeadingLabels = new Set<string>();

  const blocks = Array.isArray(results) ? results : [];
  let ordinal = 0;
  for (const block of blocks) {
    const thisOrdinal = ordinal;
    ordinal += 1;

    const type = block?.type;
    const block_id: string = block?.id || "";

    if (type === "heading_2") {
      const label = joinPlainText(block.heading_2?.rich_text);

      // Digest the heading text itself (proves anchor integrity).
      if (block_id) recordDigest(per_block_digests, thisOrdinal, block_id, "heading_2", label, label);

      if (pendingLabel) {
        throw new Error(
          `READBACK_FAIL: Expected code block after heading "${pendingLabel}" but encountered another heading_2 "${label}".`
        );
      }

      if (targets.has(label)) {
        if (seenHeadingLabels.has(label) && !found[label]) {
          throw new Error(
            `READBACK_FAIL: Duplicate heading_2 "${label}" encountered before binding its code block.`
          );
        }
        seenHeadingLabels.add(label);
        pendingLabel = label;
        pendingHeadingBlockId = block_id;
        pendingBetweenCount = 0;
      } else {
        pendingLabel = null;
        pendingHeadingBlockId = null;
        pendingBetweenCount = 0;
      }
      continue;
    }

    if (type === "code") {
      const codeText = joinPlainText(block.code?.rich_text);
      const lang = block.code?.language || "";

      if (block_id) recordDigest(per_block_digests, thisOrdinal, block_id, "code", pendingLabel, codeText);

      if (pendingLabel) {
        if (found[pendingLabel]) {
          throw new Error(`READBACK_FAIL: Second code block bound to "${pendingLabel}" (block ${block_id}).`);
        }

        if (strictAdjacency && pendingBetweenCount > maxBetween) {
          throw new Error(
            `READBACK_FAIL: Too many blocks (${pendingBetweenCount}) between heading "${pendingLabel}" and its code block.`
          );
        }

        found[pendingLabel] = {
          heading_block_id: pendingHeadingBlockId || "",
          code_block_id: block_id,
          language: lang,
          text: codeText,
          last_edited_time: String(block?.last_edited_time || ""),
        };

        pendingLabel = null;
        pendingHeadingBlockId = null;
        pendingBetweenCount = 0;
      }
      continue;
    }

    if (pendingLabel && strictAdjacency) {
      // Minimal digest of intervening block content (helps detect spacer/rewrites).
      if (block_id) {
        let text = "";
        if (type === "paragraph") text = joinPlainText(block.paragraph?.rich_text);
        else if (type === "heading_2") text = joinPlainText(block.heading_2?.rich_text);
        else if (type === "code") text = joinPlainText(block.code?.rich_text);
        recordDigest(per_block_digests, thisOrdinal, block_id, String(type || ""), null, text);
      }

      const allowed =
        allowBetweenTypes.has(String(type || "")) && (String(type || "") !== "paragraph" || isEmptyParagraph(block));

      if (!allowed) {
        throw new Error(
          `READBACK_FAIL: Non-benign block type "${String(type)}" encountered between heading "${pendingLabel}" and its code block.`
        );
      }

      pendingBetweenCount += 1;
    }

  }

  for (const label of targetLabels) {
    if (!found[label]) throw new Error(`READBACK_FAIL: Missing required code block for "${label}".`);
  }

  const templates = found["TEMPLATES.json"]!.text;
  const selfCheck = found["SELF_CHECK.json"]!.text;
  const provenance = found["PROVENANCE.json"]!.text;

  const canonical = canonicalConcatTriplet({ templates, selfCheck, provenance });
  const run_blocks_sha256 = sha256HexUtf8(canonical);

  const readbackEvidence = canonicalizeReadbackEvidence(per_block_digests);
  const readback_blocks_sha256 = sha256HexUtf8(readbackEvidence);

  return {
    version: "readback_normalizer.v1",
    required_labels: targetLabels,
    extracted: {
      "TEMPLATES.json": found["TEMPLATES.json"]!,
      "SELF_CHECK.json": found["SELF_CHECK.json"]!,
      "PROVENANCE.json": found["PROVENANCE.json"]!,
    },
    run_blocks_sha256,
    run_blocks_bytes: byteLenUtf8(canonical),
    readback_blocks_sha256,
    readback_blocks_bytes: byteLenUtf8(readbackEvidence),
    per_block_digests,
  };
}
