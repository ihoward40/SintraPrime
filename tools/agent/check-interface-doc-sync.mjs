#!/usr/bin/env node

import { readAgentInterfaceVersions } from "./interface-doc-sync.mjs";

const r = readAgentInterfaceVersions(process.cwd());

if (!r.ok) {
  console.error(`interface doc mismatch: code=${r.codeVersion || "?"} docs=${r.docsVersion || "?"}`);
  process.exit(1);
}

console.log(`interface doc sync ok: ${r.codeVersion}`);
