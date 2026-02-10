import test from "node:test";
import assert from "node:assert/strict";

import { checkPolicy } from "../src/policy/checkPolicy.js";

function basePlan(payload: any) {
  return {
    kind: "ExecutionPlan" as const,
    execution_id: "exec_test",
    threadId: "t_test",
    dry_run: true,
    goal: "test",
    agent_versions: { validator: "test", planner: "test" },
    assumptions: [],
    required_secrets: [],
    steps: [
      {
        step_id: "s1",
        action: "competitive.brief.v1",
        adapter: "WebhookAdapter" as const,
        method: "GET" as const,
        read_only: true,
        url: "https://local.action/competitive-brief",
        payload,
        expects: { http_status: [200] },
      },
    ],
  };
}

test("policy: competitive.brief.v1 ALLOW: <=3 targets, wideResearch disabled", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOW_DATA: "1",
    BROWSER_L0_ALLOW_HTTP: "0",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan = basePlan({
    targets: ["https://example.com/"],
    screenshot: { enabled: true, mode: "same_origin", maxRequests: 50 },
    wideResearch: { enabled: false },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, true);
});

test("policy: competitive.brief.v1 APPROVAL_REQUIRED: wideResearch enabled", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan = basePlan({
    targets: ["https://example.com/"],
    wideResearch: { enabled: true },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.equal((res as any).requireApproval, true);
  assert.equal((res as any).approval?.code, "COMPETITIVE_BRIEF_WIDE_RESEARCH_REQUIRES_APPROVAL");
});

test("policy: competitive.brief.v1 DENY: crawl fields", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan = basePlan({
    targets: ["https://example.com/"],
    crawl: true,
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_NO_CRAWL");
});

test("policy: competitive.brief.v1 APPROVAL_REQUIRED: targets > 3", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan = basePlan({
    targets: [
      "https://example.com/a",
      "https://example.com/b",
      "https://example.com/c",
      "https://example.com/d",
    ],
    wideResearch: { enabled: false },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.equal((res as any).requireApproval, true);
  assert.equal((res as any).approval?.code, "COMPETITIVE_BRIEF_TOO_MANY_TARGETS");
});

test("policy: competitive.brief.v1 DENY: invalid screenshot mode", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan = basePlan({
    targets: ["https://example.com/"],
    screenshot: { enabled: true, mode: "relaxed" },
    wideResearch: { enabled: false },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_SCREENSHOT_MODE_NOT_ALLOWED");
});
