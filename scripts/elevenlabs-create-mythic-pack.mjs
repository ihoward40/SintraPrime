import { loadControlSecretsEnv } from "../ui/core/envLoader.js";

loadControlSecretsEnv();

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function usage(exitCode = 1) {
  console.log("Usage:");
  console.log("  node scripts/elevenlabs-create-mythic-pack.mjs --sample <path_to_audio>");
  console.log("  node scripts/elevenlabs-create-mythic-pack.mjs --samples <a.mp3,b.mp3,...>");
  console.log("  node scripts/elevenlabs-create-mythic-pack.mjs --sample a.mp3 --sample b.mp3  (repeatable)");
  console.log("Optional:");
  console.log("  --prefix <name_prefix>   (default: SINTRAPRIME)");
  process.exit(exitCode);
}

const sample = getArg("--sample");
const samplesCsv = getArg("--samples");
const prefix = (getArg("--prefix") || "SINTRAPRIME").trim();

function collectSamples() {
  const samples = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "--sample") {
      const v = process.argv[i + 1];
      if (v) samples.push(v);
    }
  }
  if (samplesCsv) {
    for (const f of String(samplesCsv)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      samples.push(f);
    }
  }
  if (!samples.length && sample) samples.push(sample);
  const seen = new Set();
  return samples.filter((s) => {
    const k = String(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const samples = collectSamples();
if (!samples.length) usage(1);

const apiKey = String(process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || process.env.XI_API_KEY || "").trim();
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY (or ELEVEN_API_KEY/XI_API_KEY). Set it in control/secrets.env or your environment.");
  process.exit(2);
}

const voices = [
  { key: "SHADOW", name: "SHADOW_TRUSTEE_HYBRID_ELITE", env: ["ELEVEN_SHADOW_TRUSTEE_HYBRID_ELITE", "ELEVEN_VOICE_SHADOW", "ELEVEN_VOICE_ID_FOR_SHADOW_TRUSTEE"] },
  { key: "ORACLE", name: "BRICK_CITY_ORACLE_V2", env: ["ELEVEN_BRICK_CITY_ORACLE_V2", "ELEVEN_VOICE_ORACLE", "ELEVEN_VOICE_ID_FOR_BRICK_CITY_ORACLE"] },
  { key: "DRAGON", name: "DRAGON_DUE_PROCESS_V2", env: ["ELEVEN_DRAGON_DUE_PROCESS_V2", "ELEVEN_VOICE_DRAGON", "ELEVEN_VOICE_ID_FOR_DRAGON_DUE_PROCESS"] },
  { key: "JUDGE", name: "JUDGE_INVISIBLE_V2", env: ["ELEVEN_JUDGE_INVISIBLE_V2", "ELEVEN_VOICE_JUDGE", "ELEVEN_VOICE_ID_FOR_JUDGE_INVISIBLE"] },
  { key: "SUPREME", name: "SUPREME_COURT_MODE_V2", env: ["ELEVEN_SUPREME_COURT_MODE_V2", "ELEVEN_VOICE_SUPREME", "ELEVEN_VOICE_ID_FOR_SUPREME_COURT_MODE"] },
];

async function createOne(fullName) {
  const args = [
    "scripts/elevenlabs-create-voice.mjs",
    "--name",
    fullName,
    ...(samples.length === 1 ? ["--file", samples[0]] : ["--files", samples.join(",")]),
    "--labels",
    JSON.stringify({ pack: "mythic", system: "sintraprime" }),
  ];

  const { spawn } = await import("node:child_process");
  return await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString("utf8")));
    p.stderr.on("data", (d) => (err += d.toString("utf8")));
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(err.trim() || out.trim() || `create failed (${code})`));
      try {
        const json = JSON.parse(out);
        return resolve(json?.voice_id);
      } catch {
        return reject(new Error(`Unexpected output: ${out.slice(0, 1000)}`));
      }
    });
  });
}

async function main() {
  const created = [];
  for (const v of voices) {
    const fullName = `${prefix}_${v.name}`;
    process.stdout.write(`Creating ${fullName}... `);
    const id = await createOne(fullName);
    console.log("OK");
    created.push({ ...v, fullName, id });
  }

  console.log("\n# Mythic Voice Pack env patch (choose ONE style per persona)");
  for (const v of created) {
    console.log(`# ${v.name}`);
    for (const k of v.env) {
      console.log(`${k}=${v.id}`);
      break;
    }
    console.log("");
  }

  console.log("# Alternative aliases (all supported by SintraPrime)");
  for (const v of created) {
    console.log(`# ${v.name}`);
    for (const k of v.env) console.log(`${k}=${v.id}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
