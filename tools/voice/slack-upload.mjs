#!/usr/bin/env node
/**
 * slack-upload.mjs
 * Upload an audio file to Slack.
 * Output contract: one-line JSON (help/version are human-readable).
 */

import fs from "node:fs";
import path from "node:path";

const TOOL = "slack-upload";
const VERSION = "0.1.0";

function usage() {
  return [
    `${TOOL} ${VERSION}`,
    "",
    "Usage:",
    "  node tools/voice/slack-upload.mjs --file artifacts/voice/out.mp3 --channel C0123456789 [--title \"...\"]",
    "",
    "Flags:",
    "  --file <path>       File to upload (required)",
    "  --channel <id>      Slack channel ID (required)",
    "  --title <string>    Title (optional)",
    "  --initial-comment   Initial comment (optional)",
    "  --help, -h          Show help and exit 0",
    "  --version           Show version and exit 0",
    "",
    "Environment:",
    "  SLACK_BOT_TOKEN     Required",
  ].join("\n");
}

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function fail(msg, extra = {}, code = 1) {
  emit({ ok: false, tool: TOOL, error: String(msg), ...extra });
  process.exit(code);
}

function parseArgs(argv) {
  const out = {
    file: null,
    channel: null,
    title: null,
    initialComment: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help" || a === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }

    if (a === "--version") {
      process.stdout.write(`${TOOL} ${VERSION}\n`);
      process.exit(0);
    }

    if (a === "--file" && argv[i + 1]) {
      out.file = path.resolve(String(argv[++i]));
      continue;
    }

    if (a === "--channel" && argv[i + 1]) {
      out.channel = String(argv[++i]).trim();
      continue;
    }

    if (a === "--title" && argv[i + 1]) {
      out.title = String(argv[++i]);
      continue;
    }

    if (a === "--initial-comment" && argv[i + 1]) {
      out.initialComment = String(argv[++i]);
      continue;
    }

    fail("Unknown argument", { arg: a });
  }

  if (!out.file) fail("Missing --file");
  if (!out.channel) fail("Missing --channel");
  if (!fs.existsSync(out.file)) fail("File not found", { file: out.file });

  return out;
}

async function slackUploadFileV2({ token, filePath, channelId, title, initialComment }) {
  // Step 1: request an upload URL
  const fileSize = fs.statSync(filePath).size;
  const filename = path.basename(filePath);

  const res1 = await fetch("https://slack.com/api/files.getUploadURLExternal", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ filename, length: fileSize }),
  });
  const j1 = await res1.json();
  if (!j1.ok) throw new Error(`Slack getUploadURLExternal failed: ${JSON.stringify(j1)}`);

  // Step 2: PUT the file bytes to the returned URL
  const uploadUrl = j1.upload_url;
  const fileId = j1.file_id;
  const buf = fs.readFileSync(filePath);

  const res2 = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: buf,
  });
  if (!res2.ok) throw new Error(`Slack upload PUT failed: HTTP ${res2.status}`);

  // Step 3: complete the upload
  const res3 = await fetch("https://slack.com/api/files.completeUploadExternal", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      files: [{ id: fileId, title: title || filename }],
      channel_id: channelId,
      initial_comment: initialComment || undefined,
    }),
  });
  const j3 = await res3.json();
  if (!j3.ok) throw new Error(`Slack completeUploadExternal failed: ${JSON.stringify(j3)}`);

  return { file_id: fileId, slack: j3 };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) fail("Missing SLACK_BOT_TOKEN");

  const { file_id } = await slackUploadFileV2({
    token,
    filePath: args.file,
    channelId: args.channel,
    title: args.title,
    initialComment: args.initialComment,
  });

  emit({
    ok: true,
    tool: TOOL,
    file: path.relative(process.cwd(), args.file).split(path.sep).join("/"),
    channel: args.channel,
    file_id,
  });
}

main().catch((e) => fail("Unhandled error", { message: String(e?.message ?? e) }));
