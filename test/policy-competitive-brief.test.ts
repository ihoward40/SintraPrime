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
    required_capabilities: ["browser:l0"],
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

test("policy: competitive.brief.v1 DENY: missing browser:l0 capability", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan: any = basePlan({ targets: ["https://example.com/"] });
  delete plan.required_capabilities;

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "CAPABILITY_MISSING");
});

test("policy: competitive.brief.v1 DENY: requires read_only=true", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "OFF",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan: any = basePlan({ targets: ["https://example.com/"] });
  plan.steps[0].read_only = false;

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_REQUIRES_READ_ONLY");
});

test("policy: competitive.brief.v1 DENY: method not allowed", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan: any = basePlan({ targets: ["https://example.com/"] });
  plan.steps[0].method = "POST";

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_METHOD_NOT_ALLOWED");
});

test("policy: competitive.brief.v1 DENY: payload invalid", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan: any = basePlan(null);

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_PAYLOAD_INVALID");
});

test("policy: competitive.brief.v1 DENY: targets required", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan: any = basePlan({});

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_TARGETS_REQUIRED");
});

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
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_NO_CRAWL_FIELDS_ALLOWED");
});

test("policy: competitive.brief.v1 DENY: screenshot maxRequests too high vs env", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
    BROWSER_L0_MAX_REQUESTS: "10",
  } as any;

  const plan = basePlan({
    targets: ["https://example.com/"],
    screenshot: { enabled: true, mode: "same_origin", maxRequests: 999 },
    wideResearch: { enabled: false },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_SCREENSHOT_MAX_REQUESTS_TOO_HIGH");
});

test("policy: competitive.brief.v1 DENY: screenshot maxRequests invalid", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan = basePlan({
    targets: ["https://example.com/"],
    screenshot: { enabled: true, mode: "same_origin", maxRequests: 0 },
    wideResearch: { enabled: false },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_SCREENSHOT_MAX_REQUESTS_INVALID");
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

test("policy: competitive.brief.v1 DENY: SCHEME_NOT_ALLOWED (http target)", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOW_HTTP: "0",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan = basePlan({
    targets: ["http://example.com/"],
    wideResearch: { enabled: false },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "SCHEME_NOT_ALLOWED");
});

test("policy: competitive.brief.v1 DENY: HOST_NOT_ALLOWED (target not allowlisted)", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    // Intentionally omit BROWSER_L0_ALLOWED_HOSTS
  } as any;

  const plan = basePlan({
    targets: ["https://example.com/"],
    wideResearch: { enabled: false },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "HOST_NOT_ALLOWED");
});

test("policy: competitive.brief.v1 DENY: SSRF_GUARD_BLOCKED (localhost target)", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "localhost",
  } as any;

  const plan = basePlan({
    targets: ["https://localhost/"],
    wideResearch: { enabled: false },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "SSRF_GUARD_BLOCKED");
});

test("policy: competitive.brief.v1 DENY: bad target URL", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOWED_HOSTS: "example.com",
  } as any;

  const plan = basePlan({
    targets: ["not a url"],
    wideResearch: { enabled: false },
  });

  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied?.code, "COMPETITIVE_BRIEF_BAD_TARGET");
});
