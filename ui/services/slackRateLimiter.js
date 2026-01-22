function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envInt(name, fallback) {
  const raw = String(process.env[name] || "").trim();
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// Global queue: ensures we never blast Slack concurrently from multiple subsystems.
let chain = Promise.resolve();
let lastAtMs = 0;

/**
 * Gate Slack message sends to avoid rate-limit storms.
 *
 * Defaults to 1500ms between posts, configurable via SLACK_MIN_POST_INTERVAL_MS.
 */
export function withSlackPostRateLimit(fn) {
  const minIntervalMs = envInt("SLACK_MIN_POST_INTERVAL_MS", 1500);
  const jitterMs = envInt("SLACK_POST_JITTER_MS", 50);

  const run = async () => {
    const now = Date.now();
    const elapsed = now - lastAtMs;

    if (elapsed < minIntervalMs) {
      const extra = jitterMs ? Math.floor(Math.random() * jitterMs) : 0;
      await sleep(minIntervalMs - elapsed + extra);
    }

    lastAtMs = Date.now();
    return fn();
  };

  // Serialize all callers.
  chain = chain.then(run, run);
  return chain;
}
