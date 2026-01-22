import { RUNBOOKS } from "../../socialos/ui/src/lib/runbooks.js";
import { EMITTED_STATUS_CODES } from "../../socialos/api/src/tests/status_code_contract.mjs";

function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

const rbVersion = RUNBOOKS?._meta?.version || "unknown";

const missing = [];
for (const code of EMITTED_STATUS_CODES) {
  if (!code) continue;
  if (!RUNBOOKS[code]) missing.push(code);
}

if (missing.length) {
  fail(
    [
      `RUNBOOKS map is missing ${missing.length} emitted status_code(s) (map v${rbVersion}):`,
      ...missing.map((c) => `- ${c}`),
      "\nFix: add entries to socialos/ui/src/lib/runbooks.js"
    ].join("\n")
  );
}

// eslint-disable-next-line no-console
console.log(`RUNBOOKS check ok (v${rbVersion}) — ${EMITTED_STATUS_CODES.length} status_code(s) covered`);
