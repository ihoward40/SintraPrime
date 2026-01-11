import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { PDFDocument } from "pdf-lib";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function requireString(args, key) {
  const value = args[key];
  if (!value || typeof value !== "string") {
    throw new Error(`Missing required --${key}`);
  }
  return value;
}

const args = parseArgs(process.argv);

if (args.help) {
  process.stdout.write(
    [
      "Usage:",
      "  node scripts/pdf/append-pdf.mjs --base <base.pdf> --append <append.pdf> --out <out.pdf>",
      "",
    ].join("\n")
  );
  process.exit(0);
}

const basePath = requireString(args, "base");
const appendPath = requireString(args, "append");
const outPath = requireString(args, "out");

const baseBytes = fs.readFileSync(basePath);
const appendBytes = fs.readFileSync(appendPath);

const baseDoc = await PDFDocument.load(baseBytes);
const appendDoc = await PDFDocument.load(appendBytes);

const copiedPages = await baseDoc.copyPages(appendDoc, appendDoc.getPageIndices());
for (const page of copiedPages) baseDoc.addPage(page);

const outBytes = await baseDoc.save();
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, outBytes);

process.stdout.write(outPath + "\n");
