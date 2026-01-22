import { initPlanState, requiresEgressGuard, updatePlanStateAfterStep } from "../../src/executor/egressPolicy.js";

function die(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(2);
}

function expect(label: string, cond: boolean) {
  if (!cond) die(`Expectation failed: ${label}`);
}

// 1) Cookie GET => requires guard (auth-ish headers)
const cookieGet = {
  step_id: "s1",
  action: "portal.login",
  adapter: "WebhookAdapter",
  method: "GET",
  url: "https://portal.example.com/login",
  headers: { cookie: "a=b" },
  expects: { http_status: [200] },
} as any;

// 2) Send-ish name GET => requires guard (no cookies)
const sendishNameGet = {
  step_id: "s2",
  name: "portal upload init",
  action: "portal.open",
  adapter: "WebhookAdapter",
  method: "GET",
  url: "https://portal.example.com/upload",
  expects: { http_status: [200] },
} as any;

// 4) Chain GET after guarded step => requires guard
const guardedPost = {
  step_id: "s3",
  action: "portal.upload",
  adapter: "WebhookAdapter",
  method: "POST",
  url: "https://portal.example.com/upload",
  headers: { "Content-Type": "application/json" },
  payload: { ok: true },
  expects: { http_status: [200] },
  egress_guard: { case_id: "C-1", notion_page_id: "N-1" },
} as any;

// 3) Public GET => no guard
const publicRead = {
  step_id: "s3",
  action: "docs.capture",
  adapter: "WebhookAdapter",
  method: "GET",
  url: "https://example.com/public.pdf",
  expects: { http_status: [200] },
} as any;

const steps = [cookieGet, sendishNameGet, guardedPost, publicRead];
const state = initPlanState();

const d1 = requiresEgressGuard(cookieGet, state);
expect("cookie GET needs guard", d1.requires_guard);
expect("cookie GET reason is auth", d1.reason === "auth_headers_get");

const d2 = requiresEgressGuard(sendishNameGet, state);
expect("sendish-name GET needs guard", d2.requires_guard);
expect("sendish-name GET reason is sendish", d2.reason === "sendish_get");

const d3 = requiresEgressGuard(publicRead, initPlanState());
expect("public GET no guard", !d3.requires_guard);
expect("public GET reason is public", d3.reason === "public_get");

// After first validated guarded step, subsequent external GET becomes guarded.
const chainState = initPlanState();
const g1 = requiresEgressGuard(guardedPost, chainState);
expect("guarded POST requires guard", g1.requires_guard);
expect("guarded POST reason is non-get", g1.reason === "non_get_non_head");
updatePlanStateAfterStep(guardedPost, chainState, g1);
const chainGet = { ...sendishNameGet, step_id: "s4", name: "portal read after guard", action: "portal.read" };
const d4 = requiresEgressGuard(chainGet, chainState);
expect("chain GET requires guard", d4.requires_guard);
expect("chain GET reason is chain", d4.reason === "egress_chain_get");

process.stdout.write("EGRESS_SMOKE_OK\n");
