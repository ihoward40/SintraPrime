import test from "node:test";
import assert from "node:assert/strict";

import { checkPolicy } from "../src/policy/checkPolicy.js";

function basePlan(stepUrl: string) {
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
        action: "browser.l0.dom_extract",
        adapter: "WebhookAdapter" as const,
        method: "GET" as const,
        read_only: true,
        url: stepUrl,
        expects: { http_status: [200] },
      },
    ],
  };
}

test("policy: browser.l0 denies http(s) when allowlist missing", () => {
  const env = { ...process.env, AUTONOMY_MODE: "READ_ONLY_AUTONOMY" } as any;
  const plan = basePlan("https://example.com/");
  const res = checkPolicy(plan as any, env, new Date());
  assert.equal(res.allowed, false);
  assert.ok((res as any).denied);
  assert.equal((res as any).denied.code, "HOST_NOT_ALLOWED");
});

test("policy: browser.l0 allows data: URL without host allowlist", () => {
  const env = {
    ...process.env,
    AUTONOMY_MODE: "READ_ONLY_AUTONOMY",
    BROWSER_L0_ALLOW_DATA: "1",
    BROWSER_L0_ALLOW_HTTP: "0",
  } as any;
  const plan = basePlan("data:text/html,<html><title>x</title><body>ok</body></html>");
  const res = checkPolicy(plan as any, env, new Date());
  assert.equal((res as any).allowed, true);
});
