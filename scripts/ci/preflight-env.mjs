const isCI = process.env.CI === "1";

if (!isCI) {
  // eslint-disable-next-line no-console
  console.log("preflight-env: skipped (not CI)");
  process.exit(0);
}

// Add only what CI truly needs.
// Keep this list short and real.
const required = [
  // Example: "SOME_REQUIRED_TOKEN",
];

const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");

if (missing.length) {
  // eslint-disable-next-line no-console
  console.error(`preflight-env: missing required env: ${missing.join(", ")}`);
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("preflight-env: ok");
