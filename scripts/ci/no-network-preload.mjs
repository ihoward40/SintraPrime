// CI tripwire: prevent accidental real network calls.
//
// This runs as a Node `--import` preload. Keep it tiny and dependency-free.
// Override points:
// - globalThis.fetch (Node uses undici under the hood)
// - node:http + node:https request/get
//
// Escape hatch:
// - set CI_ALLOW_NETWORK=1 to disable this guard

import http from "node:http";
import https from "node:https";

function shouldAllowNetwork() {
  return String(process.env.CI_ALLOW_NETWORK ?? "") === "1";
}

function fail(msg) {
  const hint =
    "Network calls are forbidden in CI. Use the executor egress path or set CI_ALLOW_NETWORK=1 for a deliberate exception.";
  throw new Error(`CI_NO_NETWORK: ${msg}\n${hint}`);
}

function describeUrl(input) {
  try {
    if (typeof input === "string") return input;
    if (input && typeof input === "object" && "href" in input && typeof input.href === "string") return input.href;
    return String(input);
  } catch {
    return "(unprintable)";
  }
}

// Patch fetch
if (!shouldAllowNetwork()) {
  const originalFetch = globalThis.fetch;
  if (typeof originalFetch === "function") {
    globalThis.fetch = async function patchedFetch(input, init) {
      fail(`fetch(${describeUrl(input)})`);
    };
  }

  // Patch http/https request + get
  const origHttpRequest = http.request.bind(http);
  const origHttpGet = http.get.bind(http);
  const origHttpsRequest = https.request.bind(https);
  const origHttpsGet = https.get.bind(https);

  http.request = function patchedHttpRequest(...args) {
    fail(`http.request(${describeUrl(args[0])})`);
  };
  http.get = function patchedHttpGet(...args) {
    fail(`http.get(${describeUrl(args[0])})`);
  };
  https.request = function patchedHttpsRequest(...args) {
    fail(`https.request(${describeUrl(args[0])})`);
  };
  https.get = function patchedHttpsGet(...args) {
    fail(`https.get(${describeUrl(args[0])})`);
  };

  // Keep references in case someone inspects.
  globalThis.__CI_NO_NETWORK__ = {
    patched: true,
    originalFetch,
    origHttpRequest,
    origHttpGet,
    origHttpsRequest,
    origHttpsGet,
  };
}
