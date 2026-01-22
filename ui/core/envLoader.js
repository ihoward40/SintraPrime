import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const rawKey = line.slice(0, eq).trim();
    const k = rawKey.startsWith("export ") ? rawKey.slice("export ".length).trim() : rawKey;
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!k) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Load env vars from control/secrets.env if present.
 *
 * - Does NOT override already-set process.env values.
 * - Designed for local/dev ops so Node can "just work" without a separate dotenv dependency.
 */
export function loadControlSecretsEnv(options = {}) {
  const cwdRoot = process.cwd();
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const moduleRepoRoot = path.resolve(moduleDir, "..", "..", "..");

  const requestedPath = String(options?.path || process.env.SINTRAPRIME_ENV_PATH || "").trim();

  const candidates = [
    ...(requestedPath ? [path.resolve(requestedPath)] : []),
    path.resolve(cwdRoot, "control", "secrets.env"),
    path.resolve(moduleRepoRoot, "control", "secrets.env"),
    // Optional Windows-friendly default for operators who keep a machine-level .env
    "C:\\SintraPrime\\.env",
  ];

  const envPath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
  if (!fs.existsSync(envPath)) return { loaded: false, path: envPath, keys: 0 };

  try {
    const parsed = parseEnvFile(fs.readFileSync(envPath, "utf8"));
    let applied = 0;
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] == null || process.env[k] === "") {
        process.env[k] = String(v);
        applied++;
      }
    }
    return { loaded: true, path: envPath, keys: applied };
  } catch (e) {
    return { loaded: false, path: envPath, keys: 0, error: String(e?.message || e) };
  }
}
