// tools/diff-agent-maps.mjs
// Compare GENERATED vs CANONICAL "code agents" only.
// Transition support: strings count as code ONLY inside bucket "code_agents".

import fs from "node:fs";

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
}

function entryId(e) {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") return e.id ?? e.name ?? e.agent_id ?? e.agentId ?? null;
  return null;
}

function isCodeEntry(bucketName, e) {
  if (typeof e === "string") return bucketName === "code_agents";
  return !!(e && typeof e === "object" && e.scope === "code");
}

function flattenCanonicalCodeOnly(m) {
  const s = new Set();
  for (const [bucketName, arr] of Object.entries(m)) {
    if (!Array.isArray(arr)) continue;
    for (const e of arr) {
      if (!isCodeEntry(bucketName, e)) continue;
      const id = entryId(e);
      if (id) s.add(String(id));
    }
  }
  return s;
}

function flattenGenerated(g) {
  const s = new Set();
  for (const bucket of Object.values(g.buckets ?? {})) {
    for (const item of bucket) s.add(item.name);
  }
  return s;
}

function main() {
  const canonical = readJson("agent_map.json");
  const generated = readJson("audit/agent_map.generated.json");

  const canonCode = flattenCanonicalCodeOnly(canonical);
  const genSet = flattenGenerated(generated);

  const missingInCanonical = [...genSet].filter((x) => !canonCode.has(x)).sort();
  const missingInGenerated = [...canonCode].filter((x) => !genSet.has(x)).sort();

  const out = {
    compared_scope: "code",
    missing_in_canonical: missingInCanonical,
    missing_in_generated: missingInGenerated,
    meta: {
      canonical_code_count: canonCode.size,
      generated_count: genSet.size,
    },
  };

  fs.mkdirSync("audit", { recursive: true });
  fs.writeFileSync("audit/agent_map.diff.json", JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log("[diff-agent-maps] wrote audit/agent_map.diff.json");
  console.log("missing_in_canonical:", missingInCanonical.length);
  console.log("missing_in_generated:", missingInGenerated.length);
}

main();
