import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env var: ${name}`);
  return String(v).trim();
}

function readJsonFile(absPath) {
  const bytes = fs.readFileSync(absPath);
  return JSON.parse(String(bytes));
}

function stableStringify(value) {
  // Canonical-ish JSON: recursively sort object keys.
  const seen = new WeakSet();
  const normalize = (v) => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "object") return v;
    if (seen.has(v)) throw new Error("stableStringify: circular structure");
    seen.add(v);
    if (Array.isArray(v)) return v.map(normalize);
    const out = {};
    for (const k of Object.keys(v).sort((a, b) => a.localeCompare(b))) {
      out[k] = normalize(v[k]);
    }
    return out;
  };
  return JSON.stringify(normalize(value));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outPath = outIndex !== -1 ? args[outIndex + 1] : null;

  const configIndex = args.indexOf("--config");
  const configPath = configIndex !== -1 ? args[configIndex + 1] : null;

  const pretty = args.includes("--pretty");

  return { outPath, configPath, pretty };
}

function normalizeProperty(prop) {
  const type = String(prop?.type || "");
  const base = {
    id: String(prop?.id || ""),
    type,
  };

  if (type === "select" || type === "multi_select" || type === "status") {
    const key = type;
    const options = Array.isArray(prop?.[key]?.options) ? prop[key].options : [];
    const normalizedOptions = options
      .map((o) => ({
        id: String(o?.id || ""),
        name: String(o?.name || ""),
        color: String(o?.color || ""),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return { ...base, options: normalizedOptions };
  }

  if (type === "relation") {
    const rel = prop?.relation || {};
    return {
      ...base,
      relation: {
        database_id: typeof rel?.database_id === "string" ? rel.database_id : null,
        synced_property_id: typeof rel?.synced_property_id === "string" ? rel.synced_property_id : null,
        synced_property_name: typeof rel?.synced_property_name === "string" ? rel.synced_property_name : null,
      },
    };
  }

  // For formulas, rollups, etc: include minimal structural hints.
  if (type === "formula") {
    const f = prop?.formula || {};
    return {
      ...base,
      formula: {
        // Notion does not reliably return the full expression; type is still useful.
        result_type: typeof f?.type === "string" ? f.type : null,
      },
    };
  }

  if (type === "rollup") {
    const r = prop?.rollup || {};
    return {
      ...base,
      rollup: {
        function: typeof r?.function === "string" ? r.function : null,
        relation_property_id: typeof r?.relation_property_id === "string" ? r.relation_property_id : null,
        relation_property_name: typeof r?.relation_property_name === "string" ? r.relation_property_name : null,
        rollup_property_id: typeof r?.rollup_property_id === "string" ? r.rollup_property_id : null,
        rollup_property_name: typeof r?.rollup_property_name === "string" ? r.rollup_property_name : null,
      },
    };
  }

  return base;
}

async function fetchNotionDatabaseSchema({ baseUrl, version, token, databaseId }) {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/databases/${encodeURIComponent(databaseId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": version,
      Accept: "application/json",
    },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = typeof json === "object" && json ? stableStringify(json) : String(json);
    throw new Error(`Notion GET database failed (${res.status}) for ${databaseId}: ${detail}`);
  }

  return json;
}

function normalizeDatabaseSchema(db) {
  const props = db?.properties && typeof db.properties === "object" ? db.properties : {};
  const normalizedProperties = Object.entries(props)
    .map(([name, prop]) => ({
      name,
      ...normalizeProperty(prop),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const schema = {
    database_id: String(db?.id || ""),
    // Notion title is an array of rich text objects; store plain text for human readability.
    title: Array.isArray(db?.title) ? db.title.map((t) => String(t?.plain_text || "")).join("") : "",
    properties: normalizedProperties,
  };

  const fingerprint = sha256Hex(Buffer.from(stableStringify(schema), "utf8"));
  return { ...schema, fingerprint };
}

async function main() {
  const repoRoot = path.resolve(process.cwd());
  const { outPath, configPath, pretty } = parseArgs(process.argv);

  const configAbs = configPath
    ? path.resolve(repoRoot, configPath)
    : path.resolve(repoRoot, "control", "notion-automation-config.json");

  if (!fs.existsSync(configAbs)) {
    const example = path.resolve(repoRoot, "control", "notion-automation-config.example.json");
    throw new Error(
      `Config not found: ${path.relative(repoRoot, configAbs)}\n` +
        `Create it from: ${path.relative(repoRoot, example)}\n` +
        `Or pass --config <path>`
    );
  }

  const cfg = readJsonFile(configAbs);

  const token = mustEnv("NOTION_TOKEN");
  const baseUrl = String(process.env.NOTION_API_BASE || cfg?.notion?.api_base || "https://api.notion.com").trim();
  const version = String(process.env.NOTION_API_VERSION || cfg?.notion?.api_version || "2022-06-28").trim();

  const dbs = cfg?.databases && typeof cfg.databases === "object" ? cfg.databases : {};
  const entries = Object.entries(dbs)
    .map(([key, v]) => ({ key, v }))
    .filter(({ v }) => v && typeof v === "object" && typeof v.database_id === "string" && v.database_id.trim());

  if (entries.length === 0) {
    throw new Error("No databases.*.database_id entries found in config");
  }

  const normalized = [];
  for (const { key, v } of entries) {
    const databaseId = String(v.database_id).trim();
    const raw = await fetchNotionDatabaseSchema({ baseUrl, version, token, databaseId });
    const n = normalizeDatabaseSchema(raw);
    normalized.push({ key, name: String(v?.name || key), ...n });
  }

  // Overall snapshot fingerprint is derived from per-db normalized schemas.
  const snapshotCore = {
    kind: "notion.schema_snapshot.v1",
    created_at: new Date().toISOString(),
    base_url: baseUrl,
    notion_version: version,
    config_path: path.relative(repoRoot, configAbs).replace(/\\/g, "/"),
    databases: normalized.sort((a, b) => a.key.localeCompare(b.key)),
  };

  const snapshotFingerprint = sha256Hex(Buffer.from(stableStringify(snapshotCore), "utf8"));
  const snapshot = { ...snapshotCore, fingerprint: snapshotFingerprint };

  const out = outPath
    ? path.resolve(repoRoot, outPath)
    : path.join(repoRoot, "scripts", "schema-snapshots", "notion.schema-snapshot.json");

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(snapshot, null, pretty ? 2 : 0) + "\n", "utf8");

  console.log(`Wrote Notion schema snapshot: ${path.relative(repoRoot, out).replace(/\\/g, "/")}`);
  console.log(`Databases: ${snapshot.databases.length}`);
  console.log(`Fingerprint: ${snapshot.fingerprint}`);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
