import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runtimeSkillGate } from "../src/skills/runtime-skill-gate.js";

function mkTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sintraprime-skillgate-"));
}

function writeLock(rootDir: string, lock: unknown) {
  fs.writeFileSync(path.join(rootDir, "skills.lock.json"), JSON.stringify(lock, null, 2), "utf8");
}

test("runtimeSkillGate: revoked skill -> DENY", () => {
  const rootDir = mkTmpRoot();
  writeLock(rootDir, {
    skills: [{ name: "notion-write-agent", status: "revoked" }],
  });

  const out = runtimeSkillGate({
    rootDir,
    required_capabilities: ["notion.write"],
    resolved_capabilities: { "notion.write": "notion-write-agent" },
    is_approved_execution: false,
  });

  assert.equal(out.decision, "DENY");
  assert.deepEqual(out.checked, ["notion-write-agent"]);
  assert.ok(out.reasons.some((r) => r.code === "SKILL_REVOKED" && r.skill === "notion-write-agent"));
  assert.ok(typeof out.skills_lock_sha256 === "string" && out.skills_lock_sha256.length > 0);
});

test("runtimeSkillGate: experimental skill pre-approval -> APPROVAL_REQUIRED", () => {
  const rootDir = mkTmpRoot();
  writeLock(rootDir, {
    skills: [{ name: "planner-agent", status: "experimental" }],
  });

  const out = runtimeSkillGate({
    rootDir,
    required_capabilities: ["plan"],
    resolved_capabilities: { plan: "planner-agent" },
    is_approved_execution: false,
  });

  assert.equal(out.decision, "APPROVAL_REQUIRED");
  assert.deepEqual(out.checked, ["planner-agent"]);
  assert.ok(out.reasons.some((r) => r.code === "SKILL_EXPERIMENTAL" && r.skill === "planner-agent"));
});

test("runtimeSkillGate: approved then revoked -> resume blocks (DENY)", () => {
  const rootDir = mkTmpRoot();

  // Initial plan uses an experimental skill, requiring approval.
  writeLock(rootDir, {
    skills: [{ name: "notion-write-agent", status: "experimental" }],
  });

  const pre = runtimeSkillGate({
    rootDir,
    required_capabilities: ["notion.write"],
    resolved_capabilities: { "notion.write": "notion-write-agent" },
    is_approved_execution: false,
  });
  assert.equal(pre.decision, "APPROVAL_REQUIRED");

  // After approval, experimental may run.
  const approved = runtimeSkillGate({
    rootDir,
    required_capabilities: ["notion.write"],
    resolved_capabilities: { "notion.write": "notion-write-agent" },
    is_approved_execution: true,
  });
  assert.equal(approved.decision, "ALLOW");

  // Governance changes: revoke the skill after approval.
  writeLock(rootDir, {
    skills: [{ name: "notion-write-agent", status: "revoked" }],
  });

  // Resume must re-check live lock and block.
  const resumed = runtimeSkillGate({
    rootDir,
    required_capabilities: ["notion.write"],
    resolved_capabilities: { "notion.write": "notion-write-agent" },
    is_approved_execution: true,
  });
  assert.equal(resumed.decision, "DENY");
  assert.ok(resumed.reasons.some((r) => r.code === "SKILL_REVOKED" && r.skill === "notion-write-agent"));
});
