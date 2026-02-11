// scripts/ci/schema-policy-registry-matcher.mjs
// Pure matcher module (no git, no network): determines which schema JSON files
// are governed action schemas and derives the action string from the filename.

export const EXEMPT_LIB_SCHEMA_DIR_PREFIXES = [
  "schemas/_defs/",
  "schemas/common/",
  "schemas/meta/",
];

export function normalizeRepoPath(p) {
  let s = String(p ?? "");
  s = s.replace(/\\/g, "/");
  s = s.replace(/^\.\//, "");
  s = s.replace(/^\//, "");
  return s;
}

export function isGovernedActionSchemaPath(p) {
  const s = normalizeRepoPath(p);
  if (!s.startsWith("schemas/")) return false;
  for (const prefix of EXEMPT_LIB_SCHEMA_DIR_PREFIXES) {
    if (s.startsWith(prefix)) return false;
  }

  const file = s.split("/").pop() || "";
  // Governed schema paths: schemas/**/<action>.v[0-9]+.json
  // Derived action is <action> (including the .vN suffix).
  // Fail-closed: allow only safe lowercase-ish filenames.
  return /^[a-z0-9][a-z0-9._-]*\.v[0-9]+\.json$/.test(file);
}

export function actionFromGovernedSchemaPath(p) {
  if (!isGovernedActionSchemaPath(p)) {
    throw new Error(`Not a governed action schema path: ${p}`);
  }
  const s = normalizeRepoPath(p);
  const file = s.split("/").pop();
  if (!file || !file.endsWith(".json")) {
    throw new Error(`Could not derive action from schema path: ${p}`);
  }
  return file.slice(0, -".json".length);
}
