/**
 * Pure wiring-scope logic used by both CI workflow and micro-tests.
 * Intentionally dependency-free (no git/gh/network).
 */

/**
 * @typedef {Object} PrFile
 * @property {string} filename
 * @property {string=} status
 * @property {string=} previous_filename
 */

/**
 * @typedef {{ allowPrefixes: string[], denyPrefixes: string[] }} WiringScopeConfig
 */

/**
 * @typedef {{ allow: string[], deny: { file: string, reason: string }[] }} WiringScopeResult
 */

/**
 * @param {string} p
 * @returns {string}
 */
export function normalizeRepoPath(p) {
  const norm = String(p).replaceAll("\\", "/").trim();
  // fail-closed: no absolute, no traversal
  if (!norm || norm.startsWith("/") || /^[A-Za-z]:\//.test(norm)) return "";
  if (norm.includes("..")) return "";
  return norm;
}

/**
 * @param {unknown} input
 * @returns {string[]}
 */
export function extractChangedFilesFromPrFilesJson(input) {
  if (!Array.isArray(input)) return [];
  /** @type {string[]} */
  const out = [];
  for (const item of input) {
    /** @type {Partial<PrFile> | null} */
    // @ts-ignore
    const f = item;
    if (!f || typeof f.filename !== "string") continue;
    const norm = normalizeRepoPath(f.filename);
    if (norm) out.push(norm);
  }
  // stable order helps determinism
  return Array.from(new Set(out)).sort();
}

/**
 * @param {string} file
 * @param {string[]} prefixes
 * @returns {boolean}
 */
export function matchesAnyPrefix(file, prefixes) {
  for (const pref of prefixes) {
    const p = String(pref).replaceAll("\\", "/").trim().replace(/\/+$/, "");
    if (!p) continue;
    if (file === p || file.startsWith(p + "/")) return true;
  }
  return false;
}

/**
 * @param {string[]} changedFiles
 * @param {string[]} prefixes
 * @returns {{ match: string[], rest: string[] }}
 */
export function partitionByPrefixes(changedFiles, prefixes) {
  /** @type {string[]} */
  const match = [];
  /** @type {string[]} */
  const rest = [];

  for (const raw of changedFiles) {
    const file = normalizeRepoPath(raw);
    if (!file) {
      rest.push(raw);
      continue;
    }
    if (matchesAnyPrefix(file, prefixes)) match.push(file);
    else rest.push(file);
  }

  return {
    match: Array.from(new Set(match)).sort(),
    rest: Array.from(new Set(rest)).sort(),
  };
}

/**
 * Decision model:
 * - DENY wins if a file matches any denyPrefixes.
 * - Otherwise ALLOW if it matches allowPrefixes.
 * - Otherwise DENY (fail-closed) with "NOT_IN_ALLOWLIST".
 *
 * @param {string[]} changedFiles
 * @param {WiringScopeConfig} cfg
 * @returns {WiringScopeResult}
 */
export function computeWiringScope(changedFiles, cfg) {
  /** @type {string[]} */
  const allow = [];
  /** @type {{ file: string, reason: string }[]} */
  const deny = [];

  for (const raw of changedFiles) {
    const file = normalizeRepoPath(raw);
    if (!file) {
      deny.push({ file: raw, reason: "INVALID_PATH" });
      continue;
    }

    if (matchesAnyPrefix(file, cfg.denyPrefixes)) {
      deny.push({ file, reason: "DENYLIST" });
      continue;
    }

    if (matchesAnyPrefix(file, cfg.allowPrefixes)) {
      allow.push(file);
      continue;
    }

    deny.push({ file, reason: "NOT_IN_ALLOWLIST" });
  }

  return { allow, deny };
}
