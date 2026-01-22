import fs from "node:fs";
import path from "node:path";
import { loadControlSecretsEnv } from "../ui/core/envLoader.js";

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1);
    out[k] = v;
  }
  return out;
}

function mask(value) {
  const v = String(value || "").trim();
  if (!v) return "(unset)";
  const tail = v.length >= 4 ? v.slice(-4) : v;
  const head = v.includes("-") ? v.split("-")[0] : v.slice(0, 4);
  return `${head}-***-${tail} (len=${v.length})`;
}

const repoRoot = process.cwd();
const envPath = path.resolve(repoRoot, "control", "secrets.env");

// Load local secrets into process.env (no override) so validation works with
// either injected env vars or control/secrets.env.
loadControlSecretsEnv();

let env = {};
if (fs.existsSync(envPath)) {
  env = parseEnvFile(fs.readFileSync(envPath, "utf8"));
}

const get = (key) => {
  const fromProc = String(process.env?.[key] || "").trim();
  if (fromProc) return fromProc;
  return String(env?.[key] || "").trim();
};

const bot = get("SLACK_BOT_TOKEN") || get("SLACK_TOKEN");
const signing = get("SLACK_SIGNING_SECRET");
const app = get("SLACK_APP_TOKEN");
const alert = get("SLACK_ALERT_WEBHOOK");
const channel = get("SLACK_DEFAULT_CHANNEL") || get("SLACK_PARALEGAL_CHANNEL");

const looksLikeWebhook = bot.includes("hooks.slack.com/services/");
const looksLikeBot = /^xoxb-/.test(bot);
const looksLikeApp = !app ? false : /^xapp-/.test(app);

console.log("Slack env validation (masked):");
console.log("- SLACK_BOT_TOKEN:", mask(bot));
console.log("- SLACK_APP_TOKEN:", mask(app));
console.log("- SLACK_SIGNING_SECRET:", signing ? `*** (len=${signing.length})` : "(unset)");
console.log("- SLACK_ALERT_WEBHOOK:", alert ? "(set)" : "(unset)");
console.log("- SLACK_DEFAULT_CHANNEL:", channel || "(unset)");

const looksLikeChannelId = (s) => /^[CGD][A-Z0-9]{6,}$/i.test(String(s || "").trim());

if (channel && channel.startsWith("#")) {
  console.log("  ⚠️  Channel starts with '#'. Prefer a channel ID (C...) or remove the leading '#'.");
}

if (channel && !channel.startsWith("#") && !looksLikeChannelId(channel)) {
  console.log(
    "  ⚠️  Channel looks like a name, not an ID. Prefer a channel ID (C...). You can resolve locally via: node scripts/resolve-slack-channel-id.mjs #all-ikesolutions",
  );
}

if (channel && /^SLACK_[A-Z0-9_]+$/.test(channel)) {
  console.log("  ⚠️  Channel looks like a placeholder/variable. Use a real Slack channel ID (C...).");
}

const problems = [];
if (!bot) problems.push("Missing SLACK_BOT_TOKEN (xoxb-...)");
if (looksLikeWebhook) problems.push("SLACK_BOT_TOKEN is an Incoming Webhook URL (wrong field)");
if (bot && !looksLikeBot && !looksLikeWebhook) problems.push("SLACK_BOT_TOKEN does not look like xoxb-...");
if (!signing) problems.push("Missing SLACK_SIGNING_SECRET (required for Slack HTTP verification)");
if (app && !looksLikeApp) problems.push("SLACK_APP_TOKEN does not look like xapp-... (optional unless Socket Mode is enabled)");
if (!channel) problems.push("Missing SLACK_DEFAULT_CHANNEL (recommended)");

if (problems.length) {
  if (!fs.existsSync(envPath)) {
    console.log(`\nNote: ${envPath} not found (this is OK if you inject env vars another way).`);
  }
  console.log("\nProblems:");
  for (const p of problems) console.log("-", p);
  process.exit(1);
}

console.log("\nOK: Slack config looks sane.");