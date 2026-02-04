#!/usr/bin/env node
/**
 * notion:gate:doctor
 * Validates the Notion "Schema Drift Gate" control row/page and its parent database schema.
 *
 * Exit codes:
 * 0 = OK (safe to enable gate flip)
 * 2 = Schema mismatch / missing required fields (fail-closed)
 * 1 = Misconfig / Notion API error
 */

const DEFAULT_NOTION_VERSION = "2022-06-28";

const REQUIRED = [
  {
    name: "Gate Status",
    type: "select",
    checks: [{ kind: "select_option_exists", optionName: "BLOCKED" }],
  },
  { name: "Gate Reason", type: "rich_text" },
  { name: "Gate Timestamp", type: "date" },
  { name: "Gate RunId", type: "rich_text" },
  { name: "Gate Fingerprint", type: "rich_text" },
];

function notionVersion() {
  // Support both naming conventions.
  return String(process.env.NOTION_API_VERSION || process.env.NOTION_VERSION || DEFAULT_NOTION_VERSION).trim();
}

function notionBaseUrl() {
  return String(process.env.NOTION_API_BASE || "https://api.notion.com").trim().replace(/\/$/, "");
}

function usage() {
  return `
Usage:
  node scripts/notion-gate-doctor.mjs

Required env:
  NOTION_TOKEN
  NOTION_SCHEMA_DRIFT_GATE_PAGE_ID

Optional env:
  NOTION_API_BASE (default: ${notionBaseUrl()})
  NOTION_API_VERSION (default: ${notionVersion()})
  NOTION_VERSION (alias of NOTION_API_VERSION)
`.trim();
}

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

async function notionFetch(url, opts = {}) {
  const token = process.env.NOTION_TOKEN;
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": notionVersion(),
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, text, json };
}

function typeMatches(actual, expected) {
  return String(actual) === String(expected);
}

function collectSelectOptions(propDef) {
  const opts = propDef?.select?.options;
  if (!Array.isArray(opts)) return [];
  return opts.map((o) => o?.name).filter(Boolean);
}

function summarizeMismatch(mismatches) {
  const lines = [];
  for (const m of mismatches) {
    if (m.kind === "missing_property") {
      lines.push(`- Missing property: "${m.name}" (expected type: ${m.expectedType})`);
    } else if (m.kind === "wrong_type") {
      lines.push(`- Wrong type for "${m.name}": expected ${m.expectedType}, got ${m.actualType}`);
    } else if (m.kind === "missing_select_option") {
      lines.push(
        `- Missing select option "${m.optionName}" in "${m.name}" (existing: ${
          (m.existingOptions || []).join(", ") || "none"
        })`
      );
    } else if (m.kind === "gate_page_not_in_database") {
      lines.push("- Gate page parent is not a database. Put the gate row inside a database.");
    }
  }
  return lines.join("\n");
}

function pagePropType(p) {
  return p?.type || null;
}

function isPatchableShape(pageProp, expectedType) {
  if (!pageProp) return false;
  const t = pagePropType(pageProp);
  if (t !== expectedType) return false;

  // For our patch usage: ensure the typed field exists.
  if (expectedType === "select") return "select" in pageProp;
  if (expectedType === "rich_text") return "rich_text" in pageProp;
  if (expectedType === "date") return "date" in pageProp;

  return false;
}

function validateGatePagePayload(pageJson) {
  const mismatches = [];
  const props = pageJson?.properties || {};

  for (const req of REQUIRED) {
    const p = props[req.name];
    if (!p) {
      mismatches.push({ kind: "missing_page_property", name: req.name, expectedType: req.type });
      continue;
    }

    const actualType = pagePropType(p);
    if (actualType !== req.type) {
      mismatches.push({
        kind: "wrong_page_type",
        name: req.name,
        expectedType: req.type,
        actualType,
      });
      continue;
    }

    if (!isPatchableShape(p, req.type)) {
      mismatches.push({ kind: "unpatchable_shape", name: req.name, expectedType: req.type });
      continue;
    }

    // Sanity: Notion normally provides a per-property ID in page payload.
    if (!p.id) {
      mismatches.push({ kind: "missing_page_property_id", name: req.name });
    }
  }

  return mismatches;
}

function summarizePageMismatch(mismatches) {
  const lines = [];
  for (const m of mismatches) {
    if (m.kind === "missing_page_property") {
      lines.push(`- Missing property on PAGE: "${m.name}" (expected type: ${m.expectedType})`);
    } else if (m.kind === "wrong_page_type") {
      lines.push(`- Wrong type on PAGE for "${m.name}": expected ${m.expectedType}, got ${m.actualType}`);
    } else if (m.kind === "unpatchable_shape") {
      lines.push(`- Property on PAGE not patchable as ${m.expectedType}: "${m.name}"`);
    } else if (m.kind === "missing_page_property_id") {
      lines.push(`- Missing property id on PAGE payload for "${m.name}" (unexpected)`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const token = process.env.NOTION_TOKEN;
  const gatePageId = process.env.NOTION_SCHEMA_DRIFT_GATE_PAGE_ID;

  if (!token || !gatePageId) {
    console.error(usage());
    fail("ERROR: Missing NOTION_TOKEN or NOTION_SCHEMA_DRIFT_GATE_PAGE_ID", 1);
  }

  // 1) Fetch the gate page to find its parent database (required for schema validation)
  const pageResp = await notionFetch(`${notionBaseUrl()}/v1/pages/${encodeURIComponent(gatePageId)}`, {
    method: "GET",
  });

  if (!pageResp.ok) {
    fail(`ERROR: Failed to fetch gate page. HTTP ${pageResp.status}\n${pageResp.text}`, 1);
  }

  const parent = pageResp.json?.parent;
  const parentType = parent?.type;

  if (parentType !== "database_id") {
    const mismatches = [{ kind: "gate_page_not_in_database" }];
    console.error("Schema Drift Gate Doctor: FAIL (gate page not in a database)\n");
    console.error(summarizeMismatch(mismatches));
    process.exit(2);
  }

  const databaseId = parent.database_id;

  // 2) Fetch the parent database schema
  const dbResp = await notionFetch(`${notionBaseUrl()}/v1/databases/${encodeURIComponent(databaseId)}`, {
    method: "GET",
  });

  if (!dbResp.ok) {
    fail(`ERROR: Failed to fetch parent database schema. HTTP ${dbResp.status}\n${dbResp.text}`, 1);
  }

  const dbTitle =
    (dbResp.json?.title || [])
      .map((t) => t?.plain_text)
      .filter(Boolean)
      .join("") || "(untitled)";
  const properties = dbResp.json?.properties || {};

  // 3) Validate required properties by exact name and type
  const mismatches = [];

  for (const req of REQUIRED) {
    const def = properties[req.name];
    if (!def) {
      mismatches.push({ kind: "missing_property", name: req.name, expectedType: req.type });
      continue;
    }

    const actualType = def.type;
    if (!typeMatches(actualType, req.type)) {
      mismatches.push({ kind: "wrong_type", name: req.name, expectedType: req.type, actualType });
      continue;
    }

    for (const check of req.checks || []) {
      if (check.kind === "select_option_exists") {
        const options = collectSelectOptions(def);
        if (!options.includes(check.optionName)) {
          mismatches.push({
            kind: "missing_select_option",
            name: req.name,
            optionName: check.optionName,
            existingOptions: options,
          });
        }
      }
    }
  }

  if (mismatches.length > 0) {
    console.error("Schema Drift Gate Doctor: FAIL (schema mismatch)\n");
    console.error(`Gate Page ID: ${gatePageId}`);
    console.error(`Parent DB: ${databaseId} (${dbTitle})\n`);
    console.error(summarizeMismatch(mismatches));
    console.error("\nFix: Update the Notion control database schema to match the required properties.");
    process.exit(2);
  }

  // 4) Page-level payload validation (ensures the gate row itself is patchable)
  const pageMismatches = validateGatePagePayload(pageResp.json);
  if (pageMismatches.length > 0) {
    console.error("Schema Drift Gate Doctor: FAIL (page payload mismatch)\n");
    console.error(`Gate Page ID: ${gatePageId}`);
    console.error(`Parent DB: ${databaseId} (${dbTitle})\n`);
    console.error(summarizePageMismatch(pageMismatches));
    console.error(
      "\nFix: Open the gate row page and ensure those properties exist on the page and match the required types."
    );
    process.exit(2);
  }

  console.log("Schema Drift Gate Doctor: OK ✅");
  console.log(`Gate Page ID: ${gatePageId}`);
  console.log(`Parent DB: ${databaseId} (${dbTitle})`);
  console.log("Safe to enable NOTION_SCHEMA_DRIFT_GATE_FLIP=1 (if desired). ");
  process.exit(0);
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
