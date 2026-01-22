import fs from "node:fs";
import path from "node:path";
import { WebClient } from "@slack/web-api";

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

function normalizeChannelName(input) {
  const s = String(input || "").trim();
  if (!s) return null;
  return s.startsWith("#") ? s.slice(1) : s;
}

function looksLikeChannelId(input) {
  const s = String(input || "").trim();
  return /^[CGD][A-Z0-9]{6,}$/i.test(s);
}

const repoRoot = process.cwd();
const envPath = path.resolve(repoRoot, "control", "secrets.env");
if (!fs.existsSync(envPath)) {
  console.error(`Missing ${envPath}`);
  process.exit(2);
}

const env = parseEnvFile(fs.readFileSync(envPath, "utf8"));
const token = String(env.SLACK_BOT_TOKEN || env.SLACK_TOKEN || "").trim();
if (!token) {
  console.error("Missing SLACK_BOT_TOKEN in control/secrets.env");
  process.exit(2);
}

const rawInput = process.argv.slice(2).join(" ").trim() || String(env.SLACK_DEFAULT_CHANNEL || "").trim();
if (!rawInput) {
  console.error("Usage: node scripts/resolve-slack-channel-id.mjs #channel-name");
  console.error("(or set SLACK_DEFAULT_CHANNEL in control/secrets.env)");
  process.exit(2);
}

if (looksLikeChannelId(rawInput)) {
  console.log(rawInput);
  process.exit(0);
}

const name = normalizeChannelName(rawInput);
if (!name) {
  console.error("Invalid channel name");
  process.exit(2);
}

const client = new WebClient(token);

let cursor = undefined;
for (let i = 0; i < 20; i++) {
  const res = await client.conversations.list({
    cursor,
    limit: 1000,
    exclude_archived: true,
    types: "public_channel,private_channel",
  });

  const chans = Array.isArray(res?.channels) ? res.channels : [];
  const hit = chans.find((c) => String(c?.name || "").toLowerCase() === name.toLowerCase());
  if (hit?.id) {
    console.log(hit.id);
    process.exit(0);
  }

  cursor = res?.response_metadata?.next_cursor || undefined;
  if (!cursor) break;
}

console.error(`Unable to resolve channel ID for '${rawInput}'. Ensure the bot is in the channel and has channels:read.`);
process.exit(1);
