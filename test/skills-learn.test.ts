import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { skillsLearnV1 } from "../src/skills/learnSkill.js";
import { checkPolicy } from "../src/policy/checkPolicy.js";

test("skills.learn.v1: writes artifacts + deterministic patch", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sintraprime-skills-learn-"));
  const prior = process.cwd();
  try {
    process.chdir(tmp);

    const payload = {
      skill_name: "Hello Skill",
      description: "Minimal deterministic skill skeleton",
      tools_requested: ["browser.l0.dom_extract"],
      risk_profile: "read-only" as const,
      output_mode: "patch_only" as const,
    };

    const r1 = await skillsLearnV1({ execution_id: "exec1", step_id: "s1", payload });
    assert.equal(r1.ok, true);

    const out1: any = r1.responseJson;
    assert.equal(out1.kind, "skills.learn.v1");
    assert.ok(typeof out1.skill_id === "string" && out1.skill_id.length > 0);
    assert.ok(Array.isArray(out1.evidence) && out1.evidence.length >= 4);
    assert.ok(typeof out1.evidence_rollup_sha256 === "string" && out1.evidence_rollup_sha256.length === 64);

    // Patch exists and references at least one generated file.
    const patchRef = out1.outputs.find((o: any) => typeof o?.path === "string" && o.path.endsWith("/patch.diff"));
    assert.ok(patchRef && typeof patchRef.path === "string");
    const patchText = fs.readFileSync(path.join(tmp, patchRef.path), "utf8");
    assert.ok(patchText.includes("diff --git a/src/skills/"));

    // Second run with same payload should produce identical patch content.
    const r2 = await skillsLearnV1({ execution_id: "exec1", step_id: "s2", payload });
    const out2: any = r2.responseJson;
    const patchRef2 = out2.outputs.find((o: any) => typeof o?.path === "string" && o.path.endsWith("/patch.diff"));
    const patchText2 = fs.readFileSync(path.join(tmp, patchRef2.path), "utf8");
    assert.equal(patchText2, patchText);
  } finally {
    process.chdir(prior);
  }
});

test("skills.learn.v1 policy: requires skills:learn capability", () => {
  const plan: any = {
    kind: "ExecutionPlan",
    execution_id: "exec_policy",
    threadId: "t1",
    dry_run: false,
    goal: "policy test",
    agent_versions: { validator: "1.2.0", planner: "1.1.3" },
    required_secrets: [],
    required_capabilities: [],
    steps: [
      {
        step_id: "s1",
        action: "skills.learn.v1",
        adapter: "WebhookAdapter",
        method: "GET",
        read_only: true,
        url: "http://localhost:8787/status/200",
        payload: { skill_name: "X", description: "Y", output_mode: "patch_only" },
        expects: { http_status: [200] },
      },
    ],
  };

  const r = checkPolicy(plan, process.env, new Date());
  assert.equal((r as any).allowed, false);
  assert.equal((r as any).denied?.code, "SKILLS_LEARN_CAPABILITY_REQUIRED");
});

test("skills.learn.v1 policy: allows patch_only when capability present", () => {
  const plan: any = {
    kind: "ExecutionPlan",
    execution_id: "exec_policy2",
    threadId: "t1",
    dry_run: false,
    goal: "policy test",
    agent_versions: { validator: "1.2.0", planner: "1.1.3" },
    required_secrets: [],
    required_capabilities: ["skills:learn"],
    steps: [
      {
        step_id: "s1",
        action: "skills.learn.v1",
        adapter: "WebhookAdapter",
        method: "GET",
        read_only: true,
        url: "http://localhost:8787/status/200",
        payload: { skill_name: "X", description: "Y", output_mode: "patch_only" },
        expects: { http_status: [200] },
      },
    ],
  };

  const r = checkPolicy(plan, process.env, new Date());
  assert.equal((r as any).allowed, true);
});
