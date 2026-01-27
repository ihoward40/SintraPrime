#!/usr/bin/env node
/**
 * Test script for sending PDFs through Airlock
 * 
 * Usage:
 *   AIRLOCK_URL=https://... MANUS_SHARED_SECRET=... node send_to_airlock.mjs [folder]
 * 
 * Example:
 *   AIRLOCK_URL=https://sintraprime-airlock.onrender.com \
 *   MANUS_SHARED_SECRET=my-secret \
 *   node scripts/send_to_airlock.mjs ./test-pdfs
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const AIRLOCK = process.env.AIRLOCK_URL; // e.g. https://sintraprime-airlock.onrender.com
const MANUS_SHARED_SECRET = process.env.MANUS_SHARED_SECRET;

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function hmacHex(secret, msg) {
  return crypto.createHmac("sha256", secret).update(msg).digest("hex");
}

async function main() {
  if (!AIRLOCK || !MANUS_SHARED_SECRET) {
    console.error("ERROR: AIRLOCK_URL and MANUS_SHARED_SECRET env vars required");
    console.error("Usage: AIRLOCK_URL=https://... MANUS_SHARED_SECRET=... node send_to_airlock.mjs [folder]");
    process.exit(1);
  }

  const folder = process.argv[2] || ".";
  
  if (!fs.existsSync(folder)) {
    console.error(`ERROR: Folder not found: ${folder}`);
    process.exit(1);
  }

  const filesOnDisk = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith(".pdf"));
  
  if (filesOnDisk.length === 0) {
    console.error(`ERROR: No PDF files found in ${folder}`);
    process.exit(1);
  }

  console.log(`Found ${filesOnDisk.length} PDF file(s) in ${folder}`);
  
  const files = filesOnDisk.map(name => {
    const full = path.join(folder, name);
    const buf = fs.readFileSync(full);
    console.log(`  - ${name} (${buf.length} bytes)`);
    return {
      name,
      mime: "application/pdf",
      bytes: buf.length,
      sha256: sha256Hex(buf),
      data_b64: buf.toString("base64")
    };
  });
  
  const payload = {
    task_id: `LOCAL-${Date.now()}`,
    task_title: "Airlock Handshake Test",
    portal: "test",
    source_system: "send_to_airlock.mjs",
    no_submit_pay: true,
    files,
    human_summary: `Local handshake test: sending ${files.length} PDF(s) through Airlock into Make → Drive/Notion/Slack.`,
  };
  
  const raw = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = hmacHex(MANUS_SHARED_SECRET, `${ts}.${raw}`);
  
  console.log(`\nSending to: ${AIRLOCK}/manus/webhook`);
  console.log(`Task ID: ${payload.task_id}`);
  
  const res = await fetch(`${AIRLOCK}/manus/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-manus-timestamp": ts,
      "x-manus-signature": sig
    },
    body: raw
  });
  
  const text = await res.text();
  console.log("\n=== RESPONSE ===");
  console.log("STATUS:", res.status);
  console.log(text);
  
  if (res.status === 200) {
    console.log("\n✅ SUCCESS: Airlock accepted the payload");
  } else {
    console.log("\n❌ FAILURE: Check the response above");
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
