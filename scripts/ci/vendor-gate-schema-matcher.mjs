// scripts/ci/vendor-gate-schema-matcher.mjs
export const LIB_SCHEMA_DIR_PREFIXES = [
  "schemas/_defs/",
  "schemas/common/",
  "schemas/meta/",
];

export function normalizeRepoPath(p) {
  return String(p).replace(/\\/g, "/").replace(/^\.\/+/, "");
}

export function isGovernedActionSchemaPath(p) {
  const n = normalizeRepoPath(p);

  if (!n.startsWith("schemas/")) return false;
  if (LIB_SCHEMA_DIR_PREFIXES.some((pref) => n.startsWith(pref))) return false;

  // Any versioned schema: <action>.vN.json (N >= 0)
  return /\.v\d+\.json$/i.test(n);
}

export function actionFromGovernedSchemaPath(p) {
  if (!isGovernedActionSchemaPath(p)) {
    throw new Error(`Not a governed action schema path: ${p}`);
  }
  const n = normalizeRepoPath(p);
  const base = n.split("/").pop();
  if (!base || !base.toLowerCase().endsWith(".json")) {
    throw new Error(`Unexpected schema filename: ${p}`);
  }
  return base.slice(0, -".json".length);
}
