import crypto from "node:crypto";

import { writeSkillLearnArtifacts } from "../artifacts/writeSkillLearnArtifacts.js";

export type SkillsLearnOutputMode = "patch_only" | "apply_patch";
export type SkillsLearnRiskProfile = "read-only" | "writes" | "payments" | "comms";

export type SkillsLearnV1Payload = {
  skill_name: string;
  description: string;
  tools_requested?: string[];
  risk_profile?: SkillsLearnRiskProfile;
  output_mode?: SkillsLearnOutputMode;
};

function sha256Hex(text: string) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function stableSkillId(skillName: string): string {
  const raw = String(skillName || "").trim().toLowerCase();
  const cleaned = raw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 60);
  return cleaned || "unnamed-skill";
}

function normalizeLines(s: string): string {
  return String(s ?? "").replace(/\r\n/g, "\n");
}

function unifiedDiffForNewFile(repoRelPath: string, content: string): string {
  const p = repoRelPath.replace(/^\/+/, "");
  const normalized = normalizeLines(content);
  const ensured = normalized.endsWith("\n") ? normalized : normalized + "\n";

  const lines = ensured.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();

  const hunkHeader = `@@ -0,0 +1,${lines.length} @@`;
  const body = lines.map((l) => `+${l}`).join("\n");

  return [
    `diff --git a/${p} b/${p}`,
    `new file mode 100644`,
    `index 0000000..0000000`,
    `--- /dev/null`,
    `+++ b/${p}`,
    hunkHeader,
    body,
    "",
  ].join("\n");
}

function buildGeneratedFiles(skill_id: string, payload: SkillsLearnV1Payload) {
  const description = String(payload.description ?? "").trim();
  const tools = Array.isArray(payload.tools_requested)
    ? payload.tools_requested.map((t) => String(t).trim()).filter(Boolean)
    : [];

  const indexTs = `export const skill = {\n  id: ${JSON.stringify(skill_id)},\n  name: ${JSON.stringify(String(payload.skill_name || "").trim())},\n  description: ${JSON.stringify(description)},\n  tools_requested: ${JSON.stringify(tools)},\n} as const;\n`;

  const readme = `# ${payload.skill_name}\n\n${description}\n\n## Tools requested\n\n${tools.length ? tools.map((t) => `- ${t}`).join("\n") : "- (none)"}\n`;

  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: `skill.${skill_id}.v1`,
    type: "object",
    additionalProperties: false,
    properties: {
      example_input: { type: "string" },
    },
  };

  const testTs = `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { skill } from "../src/skills/${skill_id}/index.js";\n\ntest("skill ${skill_id}: exports id", () => {\n  assert.equal(skill.id, ${JSON.stringify(skill_id)});\n});\n`;

  return [
    {
      repo_rel_path: `src/skills/${skill_id}/index.ts`,
      content: indexTs,
      mime: "text/plain; charset=utf-8",
    },
    {
      repo_rel_path: `src/skills/${skill_id}/README.md`,
      content: readme,
      mime: "text/markdown; charset=utf-8",
    },
    {
      repo_rel_path: `schemas/skills/${skill_id}.v1.json`,
      content: JSON.stringify(schema, null, 2) + "\n",
      mime: "application/json",
    },
    {
      repo_rel_path: `test/skills-${skill_id}.test.ts`,
      content: testTs,
      mime: "text/plain; charset=utf-8",
    },
  ];
}

function smokeValidatePatch(patch: string, expectedPaths: string[]) {
  const p = normalizeLines(patch);
  for (const path of expectedPaths) {
    const needle = `diff --git a/${path} b/${path}`;
    if (!p.includes(needle)) {
      throw new Error(`patch missing diff header for ${path}`);
    }
    const plus = `+++ b/${path}`;
    if (!p.includes(plus)) {
      throw new Error(`patch missing +++ for ${path}`);
    }
  }
}

export async function skillsLearnV1(input: {
  execution_id: string;
  step_id: string;
  payload: SkillsLearnV1Payload;
}) {
  const skill_name = String(input.payload?.skill_name ?? "").trim();
  const description = String(input.payload?.description ?? "").trim();

  if (!skill_name) throw new Error("skills.learn.v1: skill_name is required");
  if (!description) throw new Error("skills.learn.v1: description is required");

  const output_mode: SkillsLearnOutputMode =
    input.payload?.output_mode === "apply_patch" ? "apply_patch" : "patch_only";
  if (output_mode !== "patch_only") {
    // v1 is patch-only by design; apply_patch is policy-gated and not implemented here.
    throw new Error("skills.learn.v1: output_mode=apply_patch is not implemented (patch_only only)");
  }

  const skill_id = stableSkillId(skill_name);
  const tools_requested = Array.isArray(input.payload.tools_requested)
    ? input.payload.tools_requested.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const risk_profile: SkillsLearnRiskProfile =
    input.payload.risk_profile === "writes" ||
    input.payload.risk_profile === "payments" ||
    input.payload.risk_profile === "comms"
      ? input.payload.risk_profile
      : "read-only";

  const generated_files = buildGeneratedFiles(skill_id, {
    skill_name,
    description,
    tools_requested,
    risk_profile,
    output_mode,
  });

  const repoPaths = generated_files.map((f) => f.repo_rel_path).sort();

  const patch_diff = repoPaths
    .map((p) => {
      const file = generated_files.find((f) => f.repo_rel_path === p)!;
      return unifiedDiffForNewFile(p, file.content);
    })
    .join("\n");

  smokeValidatePatch(patch_diff, repoPaths);

  const skill_manifest = {
    kind: "SkillBundle",
    skill_id,
    skill_name,
    description,
    tools_requested,
    risk_profile,
    output_mode,
    generated_repo_paths: repoPaths,
    patch_sha256: sha256Hex(patch_diff),
    schema_version: "skills.learn.bundle.v1",
  };

  const smoke_results = {
    ok: true,
    checks: {
      patch_has_expected_file_diffs: true,
      patch_sha256: sha256Hex(patch_diff),
    },
  };

  const artifacts = writeSkillLearnArtifacts({
    execution_id: input.execution_id,
    step_id: input.step_id,
    skill_manifest,
    patch_diff,
    smoke_results,
    generated_files,
  });

  const response = {
    kind: "skills.learn.v1",
    skill_id,
    output_mode,
    evidence: artifacts.evidence,
    evidence_rollup_sha256: artifacts.evidence_rollup_sha256,
    outputs: artifacts.outputs,
    artifacts_dir: artifacts.base_dir,
  };

  return { ok: true, status: 200, response, responseJson: response };
}
