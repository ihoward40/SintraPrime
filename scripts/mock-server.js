import http from "node:http";

const port = Number(process.env.MOCK_PORT || 8787);

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error(`Invalid JSON body: ${raw.slice(0, 200)}`));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(String(text ?? ""));
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function hasArtifactInputs(body, phaseId) {
  if (!isObject(body)) return false;
  const artifacts = body.artifacts;
  if (!isObject(artifacts)) return false;
  const phase = artifacts[phaseId];
  if (!isObject(phase)) return false;
  const outputs = phase.outputs;
  return isObject(outputs);
}

function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
  res.end("not found");
}

function requireSecret(req, res) {
  const expected = process.env.WEBHOOK_SECRET;
  const got = req.headers["x-webhook-secret"];

  if (!expected || String(expected).trim() === "") {
    sendJson(res, 500, { error: "Server misconfigured: WEBHOOK_SECRET not set" });
    return false;
  }
  if (!got || String(got).trim() === "") {
    sendJson(res, 401, { error: "Missing X-Webhook-Secret" });
    return false;
  }
  if (String(got) !== String(expected)) {
    sendJson(res, 403, { error: "Invalid X-Webhook-Secret" });
    return false;
  }
  return true;
}

function wrapAgentResponse(threadId, responseObj) {
  return {
    response: JSON.stringify(responseObj),
    threadId,
    error: null,
  };
}

function parseTrailingJsonObject(message) {
  // Minimal parser: locate last {...} and parse as JSON.
  const text = String(message ?? "").trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  const candidate = text.slice(first, last + 1);
  try {
    const obj = JSON.parse(candidate);
    return isObject(obj) ? obj : null;
  } catch {
    return null;
  }
}

function matchPathParam(pathname, prefix) {
  if (typeof pathname !== "string") return null;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  if (!rest) return null;
  if (rest.includes("/")) return null;
  try {
    return decodeURIComponent(rest);
  } catch {
    return null;
  }
}

// Clean mock server implementation (Tier 5.2 + Tier 6.0/6.1/6.2). Tier 7 is intentionally not implemented yet.
const liveNotionPages = new Map();
const flipStatusToDoneAfterRead = new Set();

function getLiveNotionPage(pageId) {
  const status = liveNotionPages.get(pageId) || "Todo";

  const emptyRichText = (content) => ({
    type: "rich_text",
    rich_text: [{ text: { content: String(content ?? "") } }],
  });

  return {
    object: "page",
    id: pageId,
    title: "Sensitive Page Title",
    name: "Sensitive Page Name",
    properties: {
      Status: emptyRichText(status),
      "Missing Docs": emptyRichText(""),
      "Next Action": emptyRichText(""),
      "Agent Summary (CPA-Ready)": emptyRichText(""),
      "Professional Judgment Required?": emptyRichText(""),
      "Last Agent Review": emptyRichText(""),
      Reason: emptyRichText(""),
    },
    last_edited_time: "2024-01-01T00:00:00Z",
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    // Local httpbin-ish endpoints for executor testing
    if (req.method === "GET" && url.pathname === "/status/200") {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === "GET" && url.pathname === "/status/500") {
      sendJson(res, 500, { ok: false });
      return;
    }

    // Deterministic vendor docs endpoint for /docs capture smoke vectors
    if (req.method === "GET" && url.pathname === "/vendor/docs") {
      const body =
        "<!doctype html>\n" +
        "<html><head><meta charset=\"utf-8\"><title>Vendor Docs</title></head>\n" +
        "<body><h1>Vendor Docs</h1><p>Deterministic mock content.</p></body></html>\n";
      sendText(res, 200, body, "text/html; charset=utf-8");
      return;
    }

    // Notion mock read endpoints (Tier 6.0)
    const notionLiveDbId = matchPathParam(url.pathname, "/v1/databases/");
    if (req.method === "GET" && notionLiveDbId) {
      sendJson(res, 200, {
        object: "database",
        id: notionLiveDbId,
        title: "Sensitive Database Title",
        name: "Sensitive Database Name",
        properties: {
          Name: { type: "title" },
          Status: { type: "select" },
        },
        last_edited_time: "2024-01-01T00:00:00Z",
      });
      return;
    }

    // Tier-10.2: Live Notion pages (GET/PATCH)
    const notionLivePageId = matchPathParam(url.pathname, "/v1/pages/");
    if (req.method === "GET" && notionLivePageId) {
      sendJson(res, 200, getLiveNotionPage(notionLivePageId));

      // Tier-10.4: deterministically flip Status after the first prestate read
      // for guard vectors (so resume sees Status=Done).
      if (flipStatusToDoneAfterRead.has(notionLivePageId)) {
        flipStatusToDoneAfterRead.delete(notionLivePageId);
        liveNotionPages.set(notionLivePageId, "Done");
      }
      return;
    }
    if (req.method === "PATCH" && notionLivePageId) {
      const body = await readJson(req);
      const statusFromSelect = body?.properties?.Status?.select?.name;
      const statusFromRichText =
        body?.properties?.Status?.rich_text?.[0]?.text?.content;
      const nextStatus =
        typeof statusFromRichText === "string" && statusFromRichText.trim()
          ? statusFromRichText.trim()
          : typeof statusFromSelect === "string" && statusFromSelect.trim()
            ? statusFromSelect.trim()
            : null;

      if (nextStatus) liveNotionPages.set(notionLivePageId, nextStatus);
      sendJson(res, 200, getLiveNotionPage(notionLivePageId));
      return;
    }

    const notionDbId = matchPathParam(url.pathname, "/notion/database/");
    if (req.method === "GET" && notionDbId) {
      sendJson(res, 200, {
        object: "database",
        id: notionDbId,
        properties: {
          Name: { type: "title" },
          Status: { type: "select" },
          Created: { type: "created_time" },
        },
        last_edited_time: "2024-01-01T00:00:00Z",
      });
      return;
    }

    const notionPageId = matchPathParam(url.pathname, "/notion/page/");
    if (req.method === "GET" && notionPageId) {
      sendJson(res, 200, {
        object: "page",
        id: notionPageId,
        properties: {
          Name: { type: "title", title: [{ plain_text: "Mock Page" }] },
          Status: { type: "select", select: { name: "Open" } },
        },
        last_edited_time: "2024-01-01T00:00:00Z",
      });
      return;
    }

    // Tier 6.2: Notion mock title write endpoint (approval-scoped)
    const titlePathMatch = url.pathname.match(/^\/notion\/page\/([^/]+)\/title$/);
    if (req.method === "PATCH" && titlePathMatch) {
      const body = await readJson(req);
      const title = body?.title;
      if (typeof title !== "string" || !title.length) {
        sendJson(res, 400, { error: "title required" });
        return;
      }
      sendJson(res, 200, {
        object: "page",
        id: titlePathMatch[1],
        updated: true,
        title,
        last_edited_time: "2024-01-01T00:00:00Z",
      });
      return;
    }

    // Tier 6.1: Notion mock write endpoint (approval-scoped)
    if (req.method === "PATCH" && notionPageId) {
      const body = await readJson(req);
      const properties = body?.properties;
      if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
        sendJson(res, 400, { error: "Missing properties" });
        return;
      }
      const entries = Object.entries(properties).filter(([k]) => typeof k === "string" && k.trim());
      if (!entries.length) {
        sendJson(res, 400, { error: "Missing properties" });
        return;
      }

      const stablePatchProps = {};
      for (const [k, v] of entries.sort(([a], [b]) => String(a).localeCompare(String(b)))) {
        stablePatchProps[String(k)] = { type: "rich_text", rich_text: [{ plain_text: String(v ?? "") }] };
      }

      sendJson(res, 200, {
        object: "page",
        id: notionPageId,
        updated: true,
        properties: {
          Name: { type: "title", title: [{ plain_text: "Mock Page" }] },
          ...stablePatchProps,
        },
        last_edited_time: "2024-01-01T00:00:00Z",
      });
      return;
    }

    // Document intake executor endpoint
    if (req.method === "POST" && url.pathname === "/intake/scan") {
      const body = await readJson(req);
      const path = body?.path;
      if (typeof path !== "string" || !path.trim()) {
        sendJson(res, 400, { error: "Missing path" });
        return;
      }
      sendJson(res, 200, {
        files: [
          { name: "a.pdf", type: "pdf" },
          { name: "b.jpg", type: "image" },
        ],
      });
      return;
    }

    // Tax analysis executor endpoint (Tier 5.2 demo)
    if (req.method === "POST" && url.pathname === "/tax/analyze") {
      const body = await readJson(req);
      if (!hasArtifactInputs(body, "intake")) {
        sendJson(res, 400, { error: "Missing artifacts.intake.outputs" });
        return;
      }
      sendJson(res, 200, { ok: true, analysis: "mock-tax-analysis" });
      return;
    }

    // Webhook contract endpoints
    if (req.method !== "POST") {
      notFound(res);
      return;
    }
    if (url.pathname !== "/validation" && url.pathname !== "/planner") {
      notFound(res);
      return;
    }
    if (!requireSecret(req, res)) return;

    const body = await readJson(req);
    const type = body?.type;
    const threadId = body?.threadId;
    const message = body?.message;

    if (type !== "user_message" || typeof threadId !== "string" || typeof message !== "string") {
      sendJson(res, 400, { error: "Invalid payload. Expected {type,user_message,threadId,message}." });
      return;
    }

    const baseUrl = process.env.MOCK_BASE_URL || `http://localhost:${port}`;
    const agentVersions = { validator: "1.2.0", planner: "1.1.3" };

    if (url.pathname === "/validation") {
      // Domain: document intake
      if (message.startsWith("/build document-intake")) {
        const args = parseTrailingJsonObject(message) ?? {};
        const pathArg = args?.path;

        if (typeof pathArg !== "string" || !pathArg.trim()) {
          const need = {
            kind: "NeedInput",
            question: "What path should I scan for documents?",
            missing: ["path"],
            ...(process.env.MOCK_INCLUDE_THREADID === "1" ? { threadId } : {}),
          };
          sendJson(res, 200, wrapAgentResponse(threadId, need));
          return;
        }

        const validated = {
          kind: "ValidatedCommand",
          allowed: true,
          intent: "document-intake",
          command: message,
          args: { path: pathArg },
          ...(process.env.MOCK_INCLUDE_THREADID === "1" ? { threadId } : {}),
        };
        sendJson(res, 200, wrapAgentResponse(threadId, validated));
        return;
      }

      const isUnknown =
        message.includes("does-not-exist") ||
        message.includes("unknown") ||
        message.includes("/build does-not-exist");

      const validated = isUnknown
        ? {
            kind: "ValidatedCommand",
            allowed: false,
            intent: "unknown",
            denial_reason: "Unknown command or target",
            required_inputs: [],
            ...(process.env.MOCK_INCLUDE_THREADID === "1" ? { threadId } : {}),
          }
        : {
            kind: "ValidatedCommand",
            allowed: true,
            intent: "build",
            command: message,
            args: {},
            ...(process.env.MOCK_INCLUDE_THREADID === "1" ? { threadId } : {}),
          };

      sendJson(res, 200, wrapAgentResponse(threadId, validated));
      return;
    }

    // planner

    if (message.startsWith("/build policy-domain-denied")) {
      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_policy_domain_001",
        threadId,
        dry_run: false,
        goal: "Policy test: domain denied",
        required_capabilities: [],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "policy-domain",
            action: "noop",
            adapter: "WebhookAdapter",
            method: "GET",
            url: "https://example.com/",
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200] },
            idempotency_key: null,
          },
        ],
      };
      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const docsCaptureMatch = message.match(/^\/docs\s+capture\s+(\S+)\s*$/i);
    if (docsCaptureMatch) {
      let targetUrl = docsCaptureMatch[1];
      try {
        const u = new URL(targetUrl);
        // Smoke vectors use localhost:8787 as a stable placeholder; rewrite to this server's baseUrl.
        if (u.hostname === "localhost" && u.port === "8787") {
          targetUrl = `${baseUrl}${u.pathname}${u.search}${u.hash}`;
        }
      } catch {
        // Leave as-is; URL validity is validated elsewhere.
      }
      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_docs_capture_001",
        threadId,
        dry_run: false,
        goal: `Capture vendor docs from ${targetUrl}`,
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "docs-capture",
            action: "docs.capture",
            adapter: "WebhookAdapter",
            method: "GET",
            read_only: true,
            url: targetUrl,
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200] },
            idempotency_key: null,
          },
        ],
      };
      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const notionDbMatch = message.match(/^\/notion\s+(?:db|database)\s+(\S+)\s*$/);
    if (notionDbMatch) {
      const dbId = notionDbMatch[1];
      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_notion_db_001",
        threadId,
        dry_run: false,
        goal: `Read Notion database ${dbId}`,
        required_capabilities: ["notion.read.database"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "read-database",
            action: "notion.read.database",
            adapter: "NotionAdapter",
            method: "GET",
            read_only: true,
            url: `${baseUrl}/notion/database/${encodeURIComponent(dbId)}`,
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200], json_paths_present: ["properties", "id"] },
            idempotency_key: null,
          },
        ],
      };
      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const notionLiveDbMatch = message.match(/^\/notion\s+live\s+db\s+(\S+)\s*$/);
    if (notionLiveDbMatch) {
      const dbId = notionLiveDbMatch[1];
      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_notion_live_db_001",
        threadId,
        dry_run: false,
        goal: `Live-read Notion database ${dbId}`,
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [
          {
            name: "NOTION_TOKEN",
            source: "env",
            notes: "Notion API token for live read-only access",
          },
        ],
        steps: [
          {
            step_id: "notion-live-read-db",
            action: "notion.live.read",
              adapter: "WebhookAdapter",
            method: "GET",
            read_only: true,
            notion_path: `/v1/databases/${encodeURIComponent(dbId)}`,
            url: `https://api.notion.com/v1/databases/${encodeURIComponent(dbId)}`,
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200], json_paths_present: ["id", "title"] },
            idempotency_key: null,
          },
        ],
      };
      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const notionLiveWriteMatch = message.match(/^\/notion\s+live\s+write\s+(\S+)\s*$/);
    if (notionLiveWriteMatch) {
      const dbId = notionLiveWriteMatch[1];
      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_notion_live_write_001",
        threadId,
        dry_run: false,
        goal: `Attempt live Notion write ${dbId}`,
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [
          {
            name: "NOTION_TOKEN",
            source: "env",
            notes: "Notion API token (should be blocked by policy for writes)",
          },
        ],
        steps: [
          {
            step_id: "notion-live-write",
            action: "notion.live.write",
              adapter: "WebhookAdapter",
            method: "PATCH",
            read_only: false,
            notion_path: `/v1/databases/${encodeURIComponent(dbId)}`,
            url: `https://api.notion.com/v1/databases/${encodeURIComponent(dbId)}`,
            headers: { "Cache-Control": "no-store" },
            payload: { illegal: true },
            expects: { http_status: [200] },
            idempotency_key: null,
          },
        ],
      };
      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    // Tier-10.6: batch approval mock — two approval-scoped live write steps in one phased plan.
    // Example: /notion live bundle pg_001 Status=Done Priority=High Owner=Isiah
    const notionLiveBundleMatch = message.match(/^\/notion\s+live\s+bundle\s+(\S+)\s+(.+)$/i);
    if (notionLiveBundleMatch) {
      const pageId = notionLiveBundleMatch[1];
      const tail = String(notionLiveBundleMatch[2] || "").trim();

      const pairs = tail.split(/\s+/).filter(Boolean);
      const parsed = {};
      for (const p of pairs) {
        const ix = String(p).indexOf("=");
        if (ix > 0) {
          const k = String(p).slice(0, ix).trim();
          const v = String(p).slice(ix + 1).trim();
          if (k && v) parsed[k] = v;
        }
      }

      const stepAProps = { Status: parsed.Status || "Done" };
      const stepBProps = {
        Priority: parsed.Priority || "High",
        Owner: parsed.Owner || "Isiah",
      };

      const toNotionProps = (obj) => {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          out[k] = { rich_text: [{ text: { content: String(v) } }] };
        }
        return out;
      };

      const plan = {
        kind: "ExecutionPlan",
        execution_id: "tier10_6-batch-pauses-once_001",
        threadId,
        dry_run: false,
        goal: `Tier-10.6 batch bundle live-write ${pageId}`,
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [
          {
            name: "NOTION_TOKEN",
            source: "env",
            notes: "Notion API token for approval-scoped live writes",
          },
        ],
        steps: [
          {
            step_id: "write-1",
            adapter: "WebhookAdapter",
            action: "notion.live.write",
            approval_scoped: true,
            read_only: false,
            method: "PATCH",
            url: `https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`,
            notion_path: `/v1/pages/${encodeURIComponent(pageId)}`,
            notion_path_prestate: `/v1/pages/${encodeURIComponent(pageId)}`,
            properties: toNotionProps(stepAProps),
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200] },
            idempotency_key: null,
          },
          {
            step_id: "write-2",
            adapter: "WebhookAdapter",
            action: "notion.live.write",
            approval_scoped: true,
            read_only: false,
            method: "PATCH",
            url: `https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`,
            notion_path: `/v1/pages/${encodeURIComponent(pageId)}`,
            notion_path_prestate: `/v1/pages/${encodeURIComponent(pageId)}`,
            properties: toNotionProps(stepBProps),
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200] },
            idempotency_key: null,
          },
        ],
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }


    // Tier-10.7: approval templates — named, reusable bundles expanded into the same
    // Tier-10.6-style batch-approvable plan (multiple approval-scoped live-write steps).
    // Example: /approve-template close_case pg_001
    const approveTemplateMatch = message.match(/^\/approve-template\s+(\S+)\s+(\S+)(?:\s+(.+))?$/i);
    if (approveTemplateMatch) {
      const templateName = String(approveTemplateMatch[1] || "").trim();
      const targetId = String(approveTemplateMatch[2] || "").trim();

      const toNotionProps = (obj) => {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          out[k] = { rich_text: [{ text: { content: String(v) } }] };
        }
        return out;
      };

      // Keep deterministic IDs for smoke vectors.
      const executionId = "tier10_7-template-pauses-once_001";

      // Minimal template catalog for deterministic tests.
      const templates = {
        close_case: [
          { step_id: "write-1", props: { Status: "Closed" } },
          { step_id: "write-2", props: { Resolution: "Resolved" } },
        ],
        finalize_tax_return: [
          { step_id: "write-1", props: { Status: "Finalized" } },
          { step_id: "write-2", props: { Filed: "Yes" } },
        ],
      };

      const selected = templates[templateName];
      const stepsForTemplate = Array.isArray(selected) ? selected : templates.close_case;

      const plan = {
        kind: "ExecutionPlan",
        execution_id: executionId,
        threadId,
        dry_run: false,
        goal: `Tier-10.7 approve-template ${templateName} ${targetId}`,
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [
          {
            name: "NOTION_TOKEN",
            source: "env",
            notes: "Notion API token for approval-scoped live writes",
          },
        ],
        steps: stepsForTemplate.map((s) => ({
          step_id: s.step_id,
          adapter: "WebhookAdapter",
          action: "notion.live.write",
          approval_scoped: true,
          read_only: false,
          method: "PATCH",
          url: `https://api.notion.com/v1/pages/${encodeURIComponent(targetId)}`,
          notion_path: `/v1/pages/${encodeURIComponent(targetId)}`,
          notion_path_prestate: `/v1/pages/${encodeURIComponent(targetId)}`,
          properties: toNotionProps(s.props),
          headers: { "Cache-Control": "no-store" },
          expects: { http_status: [200] },
          idempotency_key: null,
        })),
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }    // Tier-10.3: notion live set supports bundled properties via inline JSON
    // Example message: /notion live set pg_001 {"properties":{"Status":"Done","Priority":"High"}}
    const notionLiveSetMatch = message.match(/^\/notion\s+live\s+set\s+(\S+)\s+(.+)$/i);
    if (notionLiveSetMatch) {
      const pageId = notionLiveSetMatch[1];
      const tail = notionLiveSetMatch[2].trim();
      let props = null;
      let rawGuards = null;

      // Parse inline JSON args if present
      try {
        const maybeJson = tail.startsWith("{") ? JSON.parse(tail) : null;
        if (maybeJson?.properties && typeof maybeJson.properties === "object") props = maybeJson.properties;
        if (Array.isArray(maybeJson?.guards)) rawGuards = maybeJson.guards;
      } catch {
        // ignore
      }

      if (!props) {
        // fallback single pair parsing in mock for resiliency
        const pairs = tail.split(/\s+/).filter(Boolean);
        const out = {};
        for (const p of pairs) {
          const ix = String(p).indexOf("=");
          if (ix > 0) {
            const k = String(p).slice(0, ix).trim();
            const v = String(p).slice(ix + 1).trim();
            if (k && v) out[k] = v;
          }
        }
        props = Object.keys(out).length ? out : { Status: "Done" };
      }

      // Convert simple k:v into Notion PATCH properties shape deterministically
      const notionProps = {};
      for (const [k, v] of Object.entries(props)) {
        // Keep the property shapes stable and easy to guard against.
        notionProps[k] = { rich_text: [{ text: { content: String(v) } }] };
      }

      const keys = Object.keys(notionProps);
      const hasGuards = Array.isArray(rawGuards) && rawGuards.length > 0;
      const execution_id = hasGuards
        ? "tier10_4-guard-pauses_001"
        : keys.length > 1
          ? "tier10_3-bundle-pauses_001"
          : "tier10_2-live-write-pauses_001";
      const goal =
        hasGuards
          ? `Live-write Notion page guarded ${pageId} (${keys[0] || "property"})`
          : keys.length > 1
          ? `Live-write Notion page bundle ${pageId} (${keys.join(", ")})`
          : `Live-write Notion page ${pageId} (${keys[0] || "property"})`;

      // Tier-10.4: deterministically set up the guard scenario.
      // The first approval-time prestate read should see Status=Todo; the pre-exec
      // recheck should see Status=Done.
      if (hasGuards && pageId) {
        liveNotionPages.set(pageId, "Todo");
        flipStatusToDoneAfterRead.add(pageId);
      }

      const plan = {
        kind: "ExecutionPlan",
        execution_id,
        threadId,
        dry_run: false,
        goal,
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [
          {
            name: "NOTION_TOKEN",
            source: "env",
            notes: "Notion API token for approval-scoped live writes",
          },
        ],
        steps: [
          {
            step_id: "notion-live-write-bundle",
            adapter: "WebhookAdapter",
            action: "notion.live.write",
            approval_scoped: true,
            read_only: false,
            method: "PATCH",
            url: `https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`,
            notion_path: `/v1/pages/${encodeURIComponent(pageId)}`,
            notion_path_prestate: `/v1/pages/${encodeURIComponent(pageId)}`,
            properties: notionProps,
            ...(hasGuards
              ? {
                  guards: rawGuards.map((g) => ({
                    path:
                      typeof g?.path === "string" && g.path.trim()
                        ? g.path
                        : `properties.${g.field}.rich_text[0].text.content`,
                    op: g.op,
                    value: g.value,
                  })),
                }
              : {}),
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200] },
            idempotency_key: null,
          },
        ],
      };
      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    // Tier-7 orchestration: /orchestrate notion-status <db_id> <page_id>
    if (/^\/orchestrate\s+notion-status\s+\S+\s+\S+$/.test(message)) {
      const [, , dbId, pageId] = message.split(" ");
      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_orchestration_001",
        threadId,
        dry_run: false,
        goal: `Orchestrate Notion status update for ${dbId} → ${pageId}`,
        required_capabilities: ["notion.read.database", "notion.write.page_property"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        phases: [
          {
            phase_id: "read",
            required_capabilities: ["notion.read.database"],
            outputs: ["properties"],
            steps: [
              {
                step_id: "read-db",
                action: "notion.read.database",
                adapter: "NotionAdapter",
                method: "GET",
                url: `${baseUrl}/notion/database/${encodeURIComponent(dbId)}`,
                read_only: true,
                headers: { "Cache-Control": "no-store" },
                expects: { http_status: [200], json_paths_present: ["properties"] },
                idempotency_key: null,
              },
            ],
          },
          {
            phase_id: "analyze",
            required_capabilities: ["notion.read.database"],
            inputs_from: ["read"],
            steps: [
              {
                step_id: "analyze-status",
                action: "analysis.propose_status",
                adapter: "BuildMyAgentAdapter",
                method: "POST",
                url: `${baseUrl}/analysis/propose_status`,
                read_only: true,
                headers: { "Cache-Control": "no-store" },
                expects: { http_status: [200] },
                idempotency_key: null,
              },
            ],
          },
          {
            phase_id: "write",
            required_capabilities: ["notion.write.page_property"],
            inputs_from: ["read", "analyze"],
            steps: [
              {
                step_id: "write-status",
                action: "notion.write.page_property",
                adapter: "NotionAdapter",
                method: "PATCH",
                url: `${baseUrl}/notion/page/${encodeURIComponent(pageId)}`,
                read_only: false,
                headers: { "Cache-Control": "no-store" },
                payload: { properties: { Status: "Done" } },
                expects: { http_status: [200], json_paths_present: ["updated"] },
                idempotency_key: null,
              },
            ],
          },
        ],
        steps: [],
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const notionPageMatch = message.match(/^\/notion\s+page\s+(\S+)\s*$/);
    if (notionPageMatch) {
      const pageId = notionPageMatch[1];
      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_notion_page_001",
        threadId,
        dry_run: false,
        goal: `Read Notion page ${pageId}`,
        required_capabilities: ["notion.read.page"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "read-page",
            action: "notion.read.page",
            adapter: "NotionAdapter",
            method: "GET",
            read_only: true,
            url: `${baseUrl}/notion/page/${encodeURIComponent(pageId)}`,
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200], json_paths_present: ["properties", "id"] },
            idempotency_key: null,
          },
        ],
      };
      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const notionSetMatch = message.match(/^\/notion\s+set\s+(\S+)\s+([^=\s]+)=(.+)$/);
    if (notionSetMatch) {
      const pageId = notionSetMatch[1];
      const property = String(notionSetMatch[2] ?? "").trim();
      const value = String(notionSetMatch[3] ?? "").trim();

      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_notion_write_001",
        threadId,
        dry_run: false,
        goal: `Set Notion page property ${property} on ${pageId}`,
        required_capabilities: ["notion.write.page_property"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "write-page-property",
            action: "notion.write.page_property",
            adapter: "NotionAdapter",
            method: "PATCH",
            read_only: false,
            url: `${baseUrl}/notion/page/${encodeURIComponent(pageId)}`,
            headers: { "Cache-Control": "no-store" },
            payload: { properties: { [property]: value } },
            expects: { http_status: [200], json_paths_present: ["updated"] },
            idempotency_key: null,
          },
        ],
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const notionTitleMatch = message.match(/^\/notion\s+title\s+(\S+)\s+"([^"]+)"\s*$/);
    if (notionTitleMatch) {
      const pageId = notionTitleMatch[1];
      const title = notionTitleMatch[2];

      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_notion_title_001",
        threadId,
        dry_run: false,
        goal: `Set Notion page title on ${pageId}`,
        required_capabilities: ["notion.write.page_title"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "notion-title-write",
            action: "notion.write.page_title",
            adapter: "NotionAdapter",
            method: "PATCH",
            read_only: false,
            url: `${baseUrl}/notion/page/${encodeURIComponent(pageId)}/title`,
            headers: { "Cache-Control": "no-store" },
            payload: { title },
            expects: { http_status: 200, json_paths_present: ["updated", "title"] },
            idempotency_key: null,
          },
        ],
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const intakeDslMatch = message.match(/^\/intake\s+(.+)$/);
    const intakePath = intakeDslMatch?.[1]?.trim();
    const intakeArgs = message.startsWith("/build document-intake") ? parseTrailingJsonObject(message) : null;

    if (intakePath || intakeArgs) {
      const pathArg = intakePath || intakeArgs?.path;
      if (typeof pathArg !== "string" || !pathArg.trim()) {
        const need = {
          kind: "NeedInput",
          question: "What path should I scan for documents?",
          missing: ["path"],
          threadId,
        };
        sendJson(res, 200, wrapAgentResponse(threadId, need));
        return;
      }

      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_intake_001",
        threadId,
        dry_run: false,
        goal: `Scan documents at ${pathArg}`,
        required_capabilities: ["intake.scan"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "scan-path",
            action: "scan_documents",
            adapter: "WebhookAdapter",
            method: "POST",
            url: `${baseUrl}/intake/scan`,
            headers: { "Cache-Control": "no-store" },
            payload: { path: pathArg },
            expects: { http_status: [200], json_paths_present: ["files"] },
            idempotency_key: null,
          },
        ],
      };
      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const plan = {
      kind: "ExecutionPlan",
      execution_id: "exec_mock_empty_001",
      threadId,
      dry_run: false,
      goal: "No-op",
      required_capabilities: [],
      agent_versions: agentVersions,
      assumptions: ["Generated by local mock planner"],
      required_secrets: [],
      steps: [],
    };
    sendJson(res, 200, wrapAgentResponse(threadId, plan));
  } catch (err) {
    sendJson(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-server] listening on http://localhost:${port}`);
});

/*
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    // Local httpbin-ish endpoints for executor testing
    if (req.method === "GET" && url.pathname === "/status/200") {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === "GET" && url.pathname === "/status/500") {
      sendJson(res, 500, { ok: false });
      return;
    }

    // Notion mock read endpoints (Tier 6.0)
    const notionDbId = matchPathParam(url.pathname, "/notion/database/");
    if (req.method === "GET" && notionDbId) {
      sendJson(res, 200, {
        object: "database",
        id: notionDbId,
        properties: {
          Name: { type: "title" },
          Status: { type: "select" },
          Created: { type: "created_time" },
        },
        last_edited_time: "2024-01-01T00:00:00Z",
      });
      return;
    }

    const notionPageId = matchPathParam(url.pathname, "/notion/page/");
    if (req.method === "GET" && notionPageId) {
      sendJson(res, 200, {
        object: "page",
        id: notionPageId,
        properties: {
          Name: { type: "title", title: [{ plain_text: "Mock Page" }] },
          Status: { type: "select", select: { name: "Open" } },
        },
        last_edited_time: "2024-01-01T00:00:00Z",
      });
      return;
    }

    // Tier 6.1: Notion mock write endpoint (approval-scoped)
    if (req.method === "PATCH" && notionPageId) {
      const body = await readJson(req);
      const properties = body?.properties;
      if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
        sendJson(res, 400, { error: "Missing properties" });
        return;
      }
      const entries = Object.entries(properties).filter(([k]) => typeof k === "string" && k.trim());
      if (!entries.length) {
        sendJson(res, 400, { error: "Missing properties" });
        return;
      }

      const stablePatchProps = {};
      for (const [k, v] of entries.sort(([a], [b]) => String(a).localeCompare(String(b)))) {
        stablePatchProps[String(k)] = { type: "rich_text", rich_text: [{ plain_text: String(v ?? "") }] };
      }

      sendJson(res, 200, {
        object: "page",
        id: notionPageId,
        updated: true,
        properties: {
          Name: { type: "title", title: [{ plain_text: "Mock Page" }] },
          ...stablePatchProps,
        },
        last_edited_time: "2024-01-01T00:00:00Z",
      });
      return;
    }

    // Tier 6.2: Notion mock title write endpoint (approval-scoped)
    const titlePathMatch = url.pathname.match(/^\/notion\/page\/([^/]+)\/title$/);
    if (req.method === "PATCH" && titlePathMatch) {
      const body = await readJson(req);
      const title = body?.title;
      if (typeof title !== "string" || !title.length) {
        sendJson(res, 400, { error: "title required" });
        return;
      }
      sendJson(res, 200, {
        object: "page",
        id: titlePathMatch[1],
        updated: true,
        title,
        last_edited_time: "2024-01-01T00:00:00Z",
      });
      return;
    }
    // Document intake executor endpoint
    if (req.method === "POST" && url.pathname === "/intake/scan") {
      const body = await readJson(req);
      const path = body?.path;
      if (typeof path !== "string" || !path.trim()) {
        sendJson(res, 400, { error: "Missing path" });
        return;
      }
      sendJson(res, 200, {
        files: [
          { name: "a.pdf", type: "pdf" },
          { name: "b.jpg", type: "image" },
        ],
      });
      return;
    }

      // Tax analysis executor endpoint (Tier 5.2 demo)
      if (req.method === "POST" && url.pathname === "/tax/analyze") {
        const body = await readJson(req);
        // The orchestration block has been removed as per the requirement.
        : {
            kind: "ValidatedCommand",
            allowed: true,
            intent: "build",
            command: message,
            args: {},
            ...(process.env.MOCK_INCLUDE_THREADID === "1" ? { threadId } : {}),
          };

      sendJson(res, 200, wrapAgentResponse(threadId, validated));
      return;
    }

    // planner
    // Policy test: produce a plan that targets a non-local domain (should be denied by policy).
    if (message.startsWith("/build policy-domain-denied")) {
      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_policy_domain_001",
        threadId,
        dry_run: false,
        goal: "Policy test: domain denied",
        required_capabilities: [],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "policy-domain",
            action: "noop",
            adapter: "WebhookAdapter",
            method: "GET",
            url: "https://example.com/",
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200] },
            idempotency_key: null,
          },
        ],
        required_capabilities: ["notion.read.database"],
    // Tax analysis executor endpoint (Tier 5.2 demo)
    if (req.method === "POST" && url.pathname === "/tax/analyze") {
      const body = await readJson(req);
      if (!hasArtifactInputs(body, "intake")) {
        sendJson(res, 400, { error: "Missing artifacts.intake.outputs" });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        analysis: "mock-tax-analysis",
      });
      return;
    }
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "read-database",
            action: "notion.read.database",
            adapter: "NotionAdapter",
            method: "GET",
            read_only: true,
            url: `${baseUrl}/notion/database/${encodeURIComponent(dbId)}`,
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200], json_paths_present: ["properties"] },
            idempotency_key: null,
          },
        ],
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const notionPageMatch = message.match(/^\/notion\s+page\s+(\S+)\s*$/);
    if (notionPageMatch) {
      const pageId = notionPageMatch[1];
      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_notion_page_001",
        threadId,
        dry_run: false,
        goal: `Read Notion page ${pageId}`,
        required_capabilities: ["notion.read.page"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "read-page",
            action: "notion.read.page",
            adapter: "NotionAdapter",
            method: "GET",
            read_only: true,
            url: `${baseUrl}/notion/page/${encodeURIComponent(pageId)}`,
            headers: { "Cache-Control": "no-store" },
            expects: { http_status: [200], json_paths_present: ["properties"] },
            idempotency_key: null,
          },
        ],
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    // Tier 6.1: Notion approval-scoped write planning
    // Command: /notion set <page_id> <property>=<value>
    const notionSetMatch = message.match(/^\/notion\s+set\s+(\S+)\s+([^=\s]+)=(.+)$/);
    if (notionSetMatch) {
      const pageId = notionSetMatch[1];
      const property = String(notionSetMatch[2] ?? "").trim();
      const value = String(notionSetMatch[3] ?? "").trim();

      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_notion_write_001",
        threadId,
        dry_run: false,
        goal: `Set Notion page property ${property} on ${pageId}`,
        required_capabilities: ["notion.write.page_property"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "write-page-property",
            action: "notion.write.page_property",
            adapter: "NotionAdapter",
            method: "PATCH",
            read_only: false,
            url: `${baseUrl}/notion/page/${encodeURIComponent(pageId)}`,
            headers: { "Cache-Control": "no-store" },
            payload: { properties: { [property]: value } },
            expects: { http_status: [200], json_paths_present: ["updated"] },
            idempotency_key: null,
          },
        ],
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    // Tier 6.2: Notion approval-scoped title write planning
    // Command: /notion title <page_id> "<new title>"
    const notionTitleMatch = message.match(/^\/notion\s+title\s+(\S+)\s+"([^"]+)"\s*$/);
    if (notionTitleMatch) {
      const pageId = notionTitleMatch[1];
      const title = notionTitleMatch[2];

      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_notion_title_001",
        threadId,
        dry_run: false,
        goal: `Set Notion page title on ${pageId}`,
        required_capabilities: ["notion.write.page_title"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "notion-title-write",
            action: "notion.write.page_title",
            adapter: "NotionAdapter",
            method: "PATCH",
            read_only: false,
            url: `${baseUrl}/notion/page/${encodeURIComponent(pageId)}/title`,
            headers: { "Cache-Control": "no-store" },
            payload: { title },
            expects: { http_status: 200, json_paths_present: ["updated", "title"] },
            idempotency_key: null,
          },
        ],
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    // Document intake planning supports both:
    // - /intake ./docs (DSL)
    // - /build document-intake {"path":"./docs"} (canonical)
    const intakeDslMatch = message.match(/^\/intake\s+(.+)$/);
    const intakePath = intakeDslMatch?.[1]?.trim();
    const intakeArgs = message.startsWith("/build document-intake") ? parseTrailingJsonObject(message) : null;

    if (intakePath || intakeArgs) {
      const pathArg = intakePath || intakeArgs?.path;
      if (typeof pathArg !== "string" || !pathArg.trim()) {
        const need = {
          kind: "NeedInput",
          question: "What path should I scan for documents?",
          missing: ["path"],
          threadId,
        };
        sendJson(res, 200, wrapAgentResponse(threadId, need));
        return;
      }

      const plan = {
        kind: "ExecutionPlan",
        execution_id: "exec_mock_intake_001",
        threadId,
        dry_run: false,
        goal: `Scan documents at ${pathArg}`,
        required_capabilities: ["intake.scan"],
        agent_versions: agentVersions,
        assumptions: ["Generated by local mock planner"],
        required_secrets: [],
        steps: [
          {
            step_id: "scan-path",       
            action: "scan_documents",
            adapter: "WebhookAdapter",
            method: "POST",
            url: `${baseUrl}/intake/scan`,
            headers: { "Cache-Control": "no-store" },
            payload: { path: pathArg },
            expects: { http_status: [200], json_paths_present: ["files"] },
            idempotency_key: null,
          },
        ],
      };

      sendJson(res, 200, wrapAgentResponse(threadId, plan));
      return;
    }

    const dryRun = /"dry_run"\s*:\s*true/.test(message) || /dry_run\s*=\s*true/i.test(message);

    const plan = {
      kind: "ExecutionPlan",
      execution_id: "exec_mock_001",
      threadId,
      dry_run: dryRun,
      goal: "Mock plan for testing",
      required_capabilities: [],
      agent_versions: agentVersions,
      assumptions: ["Generated by local mock planner"],
      required_secrets: [],
      steps: [
        {
          step_id: "noop_200",
          action: "noop",
          adapter: "WebhookAdapter",
          method: "GET",
          url: `${baseUrl}/status/200`,
          headers: { "Cache-Control": "no-store" },
          expects: { http_status: [200] },
          idempotency_key: null,
        },
      ],
    };

    sendJson(res, 200, wrapAgentResponse(threadId, plan));
  } catch (e) {
    sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`mock-server listening on http://localhost:${port}`);
  console.log("endpoints:");
  console.log("  POST /validation");
  console.log("  POST /planner");
  console.log("  POST /intake/scan");
  console.log("  POST /tax/analyze");
  console.log("  GET  /notion/database/:id");
  console.log("  GET  /notion/page/:id");
  console.log("  PATCH /notion/page/:id");
  console.log("  PATCH /notion/page/:id/title");
  console.log("  GET  /status/200");
  console.log("  GET  /status/500");
});

*/
