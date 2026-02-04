import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function stableStringify(value) {
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

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const baselineIndex = args.indexOf("--baseline");
  const baselinePath = baselineIndex !== -1 ? args[baselineIndex + 1] : null;

  const currentIndex = args.indexOf("--current");
  const currentPath = currentIndex !== -1 ? args[currentIndex + 1] : null;

  const strict = args.includes("--strict");

  const json = args.includes("--json");

  return { baselinePath, currentPath, strict, json };
}

function indexBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr || []) m.set(keyFn(x), x);
  return m;
}

function addCount(counts, key, n = 1) {
  counts[key] = (counts[key] || 0) + n;
}

function toDbList(snapshot) {
  const dbs = Array.isArray(snapshot?.databases) ? snapshot.databases : [];
  return dbs
    .map((d) => ({
      key: d?.key ?? null,
      databaseId: d?.database_id ?? null,
      fingerprint: d?.fingerprint ?? null,
    }))
    .filter((d) => d.databaseId);
}

function diffDatabasesStructured(baseline, current) {
  const baseMap = indexBy(baseline?.databases || [], (d) => d.key);
  const curMap = indexBy(current?.databases || [], (d) => d.key);

  const counts = {
    databaseAdds: 0,
    databaseRemovals: 0,
    databaseIdChanges: 0,
    fingerprintChanges: 0,
    propertyAdds: 0,
    propertyRemovals: 0,
    propertyIdChanges: 0,
    typeChanges: 0,
    optionAdds: 0,
    optionRemovals: 0,
    optionNameChanges: 0,
    optionIdChanges: 0,
  };

  const dbDiffs = [];
  const allKeys = Array.from(new Set([...baseMap.keys(), ...curMap.keys()])).sort((a, b) => a.localeCompare(b));

  for (const key of allKeys) {
    const b = baseMap.get(key);
    const c = curMap.get(key);
    const changes = [];

    if (!b) {
      changes.push({ kind: "database_added" });
      addCount(counts, "databaseAdds");
      dbDiffs.push({ databaseId: c?.database_id ?? null, key, changes });
      continue;
    }
    if (!c) {
      changes.push({ kind: "database_removed" });
      addCount(counts, "databaseRemovals");
      dbDiffs.push({ databaseId: b?.database_id ?? null, key, changes });
      continue;
    }

    const bId = String(b.database_id);
    const cId = String(c.database_id);
    if (bId !== cId) {
      changes.push({ kind: "database_id_changed", from: bId, to: cId });
      addCount(counts, "databaseIdChanges");
    }

    const bFp = String(b.fingerprint);
    const cFp = String(c.fingerprint);
    if (bFp !== cFp) {
      changes.push({ kind: "database_fingerprint_changed", from: bFp, to: cFp });
      addCount(counts, "fingerprintChanges");

      // Deep-ish diff: properties and select options.
      const bProps = indexBy(b.properties || [], (p) => p.name);
      const cProps = indexBy(c.properties || [], (p) => p.name);
      const propNames = Array.from(new Set([...bProps.keys(), ...cProps.keys()])).sort((a, b) => a.localeCompare(b));

      for (const pname of propNames) {
        const bp = bProps.get(pname);
        const cp = cProps.get(pname);
        if (!bp) {
          changes.push({ kind: "property_added", name: pname });
          addCount(counts, "propertyAdds");
          continue;
        }
        if (!cp) {
          changes.push({ kind: "property_removed", name: pname });
          addCount(counts, "propertyRemovals");
          continue;
        }

        if (String(bp.id) !== String(cp.id)) {
          changes.push({ kind: "property_id_changed", name: pname, from: String(bp.id), to: String(cp.id) });
          addCount(counts, "propertyIdChanges");
        }
        if (String(bp.type) !== String(cp.type)) {
          changes.push({ kind: "property_type_changed", name: pname, from: String(bp.type), to: String(cp.type) });
          addCount(counts, "typeChanges");
        }

        const bpOpts = Array.isArray(bp.options) ? bp.options : [];
        const cpOpts = Array.isArray(cp.options) ? cp.options : [];
        if (bpOpts.length || cpOpts.length) {
          const bById = indexBy(bpOpts, (o) => String(o.id));
          const cById = indexBy(cpOpts, (o) => String(o.id));
          const bByName = indexBy(bpOpts, (o) => String(o.name));
          const cByName = indexBy(cpOpts, (o) => String(o.name));

          // 1) Same-id name change (true rename).
          for (const oid of new Set([...bById.keys(), ...cById.keys()])) {
            const bo = bById.get(oid);
            const co = cById.get(oid);
            if (!bo || !co) continue;
            if (String(bo.name) !== String(co.name)) {
              changes.push({
                kind: "option_name_changed",
                property: pname,
                id: String(oid),
                from: String(bo.name),
                to: String(co.name),
              });
              addCount(counts, "optionNameChanges");
            }
          }

          // 2) Same-name id change (rebuilt select options).
          const pairedBaselineIds = new Set();
          const pairedCurrentIds = new Set();
          for (const name of new Set([...bByName.keys(), ...cByName.keys()])) {
            const bo = bByName.get(name);
            const co = cByName.get(name);
            if (!bo || !co) continue;
            const bOid = String(bo.id);
            const cOid = String(co.id);
            if (bOid !== cOid) {
              changes.push({ kind: "option_id_changed", property: pname, name: String(name), from: bOid, to: cOid });
              addCount(counts, "optionIdChanges");
              pairedBaselineIds.add(bOid);
              pairedCurrentIds.add(cOid);
            }
          }

          // 3) Adds/removals by id, excluding paired ids.
          const allIds = new Set([...bById.keys(), ...cById.keys()]);
          for (const oid of allIds) {
            const bo = bById.get(oid);
            const co = cById.get(oid);

            if (!bo && co) {
              if (pairedCurrentIds.has(String(oid))) continue;
              changes.push({ kind: "option_added", property: pname, id: String(oid), name: String(co?.name || "") });
              addCount(counts, "optionAdds");
              continue;
            }
            if (bo && !co) {
              if (pairedBaselineIds.has(String(oid))) continue;
              changes.push({ kind: "option_removed", property: pname, id: String(oid), name: String(bo?.name || "") });
              addCount(counts, "optionRemovals");
              continue;
            }
          }
        }
      }
    }

    if (changes.length) dbDiffs.push({ databaseId: cId, key, changes });
  }

  return {
    databases: dbDiffs,
    counts,
  };
}

function emitJson(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
}

async function main() {
  const repoRoot = path.resolve(process.cwd());
  const { baselinePath, currentPath, strict, json } = parseArgs(process.argv);

  const baselineAbs = baselinePath
    ? path.resolve(repoRoot, baselinePath)
    : path.resolve(repoRoot, "scripts", "schema-snapshots", "notion.schema-baseline.json");

  const currentAbs = currentPath
    ? path.resolve(repoRoot, currentPath)
    : path.resolve(repoRoot, "scripts", "schema-snapshots", "notion.schema-snapshot.json");

  if (!fs.existsSync(currentAbs)) {
    const msg =
      `Current snapshot not found: ${path.relative(repoRoot, currentAbs)}\n` +
      `Generate it with: node scripts/notion-schema-snapshot.mjs --pretty`;
    if (json) {
      emitJson({ ok: false, error: { message: msg }, baseline: null, current: null, diff: null });
      process.exit(1);
    }
    throw new Error(msg);
  }

  if (!fs.existsSync(baselineAbs)) {
    const msg =
      `Baseline not found: ${path.relative(repoRoot, baselineAbs)}\n` +
      `Create it by copying a known-good snapshot to this path.\n` +
      `Example: copy ${path.relative(repoRoot, currentAbs)} -> ${path.relative(repoRoot, baselineAbs)}`;

    if (strict) {
      if (json) {
        emitJson({ ok: false, error: { message: msg }, baseline: null, current: null, diff: null });
        process.exit(1);
      }
      throw new Error(msg);
    }

    if (json) {
      emitJson({ ok: true, skipped: true, reason: "baseline_missing", baseline: null, current: null, diff: null });
    } else {
      console.warn(msg);
      console.warn("Continuing (non-strict): no drift check performed.");
    }
    process.exit(0);
  }

  const baseline = readJson(baselineAbs);
  const current = readJson(currentAbs);

  const baselineFp = String(baseline?.fingerprint || sha256Hex(Buffer.from(stableStringify(baseline))));
  const currentFp = String(current?.fingerprint || sha256Hex(Buffer.from(stableStringify(current))));

  const jsonBaseline = {
    globalFingerprint: baselineFp,
    databases: toDbList(baseline),
  };
  const jsonCurrent = {
    globalFingerprint: currentFp,
    databases: toDbList(current),
  };

  if (baselineFp === currentFp) {
    if (json) {
      emitJson({ ok: true, baseline: jsonBaseline, current: jsonCurrent, diff: { databases: [], counts: {} } });
    } else {
      console.log("Notion schema lint: OK (fingerprints match)");
      console.log(`Fingerprint: ${currentFp}`);
    }
    process.exit(0);
  }

  const diff = diffDatabasesStructured(baseline, current);

  if (json) {
    emitJson({ ok: false, baseline: jsonBaseline, current: jsonCurrent, diff });
  }

  if (!json) {
    console.error("Notion schema lint: DRIFT DETECTED");
    console.error(`Baseline fingerprint: ${baselineFp}`);
    console.error(`Current  fingerprint: ${currentFp}`);

    const lines = [];
    for (const db of diff.databases) {
      const prefix = db.key ? `[${db.key}]` : "[db]";
      for (const c of db.changes || []) {
        if (c.kind === "database_added") lines.push(`- ${prefix} Database added (missing from baseline)`);
        else if (c.kind === "database_removed") lines.push(`- ${prefix} Database missing (present in baseline)`);
        else if (c.kind === "database_id_changed") lines.push(`- ${prefix} Database ID changed: ${c.from} -> ${c.to}`);
        else if (c.kind === "database_fingerprint_changed")
          lines.push(`- ${prefix} Fingerprint mismatch: ${c.from} != ${c.to}`);
        else if (c.kind === "property_added") lines.push(`- ${prefix} Property added: ${c.name}`);
        else if (c.kind === "property_removed") lines.push(`- ${prefix} Property missing: ${c.name}`);
        else if (c.kind === "property_id_changed")
          lines.push(`- ${prefix} Property id changed for ${c.name}: ${c.from} -> ${c.to}`);
        else if (c.kind === "property_type_changed")
          lines.push(`- ${prefix} Property type changed for ${c.name}: ${c.from} -> ${c.to}`);
        else if (c.kind === "option_added")
          lines.push(`- ${prefix} Option added on ${c.property}: ${c.id} (${c.name || ""})`);
        else if (c.kind === "option_removed")
          lines.push(`- ${prefix} Option missing on ${c.property}: ${c.id} (${c.name || ""})`);
        else if (c.kind === "option_name_changed")
          lines.push(`- ${prefix} Option name changed on ${c.property} (${c.id}): ${c.from} -> ${c.to}`);
        else if (c.kind === "option_id_changed")
          lines.push(`- ${prefix} Option id changed on ${c.property} (${c.name}): ${c.from} -> ${c.to}`);
      }
    }

    for (const line of lines.slice(0, 200)) console.error(line);
    if (lines.length > 200) console.error(`... (${lines.length - 200} more)`);
  }

  process.exit(2);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
