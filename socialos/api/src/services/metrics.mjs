// Minimal Prometheus-style metrics for SocialOS.
// Process-local by design (good enough for single-instance dev/prod).

const counters = new Map(); // name -> number
const counterLabels = new Map(); // name -> Map(labelKey -> number)
const gauges = new Map(); // name -> () => number

function keyFromLabels(labels) {
  if (!labels) return "";
  const entries = Object.entries(labels)
    .filter(([k, v]) => k && v != null)
    .map(([k, v]) => [String(k), String(v)])
    .sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(",");
}

function renderLabels(labels) {
  if (!labels) return "";
  const entries = Object.entries(labels)
    .filter(([k, v]) => k && v != null)
    .map(([k, v]) => [String(k), String(v)])
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return "";
  const parts = entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  return `{${parts.join(",")}}`;
}

export function incCounter(name, by = 1) {
  const n = Number(by);
  const delta = Number.isFinite(n) ? n : 1;
  counters.set(name, (counters.get(name) || 0) + delta);
}

export function incCounterLabeled(name, labels, by = 1) {
  const labelKey = keyFromLabels(labels);
  if (!counterLabels.has(name)) counterLabels.set(name, new Map());
  const m = counterLabels.get(name);
  const n = Number(by);
  const delta = Number.isFinite(n) ? n : 1;
  m.set(labelKey, (m.get(labelKey) || 0) + delta);
}

export function setGauge(name, fn) {
  if (typeof fn !== "function") return;
  gauges.set(name, fn);
}

export function formatMetrics() {
  const lines = [];

  for (const [name, val] of counters.entries()) {
    lines.push(`${name} ${Number(val || 0)}`);
  }

  for (const [name, m] of counterLabels.entries()) {
    for (const [labelKey, val] of m.entries()) {
      const labels = labelKey
        ? Object.fromEntries(
            labelKey.split(",").map((kv) => {
              const idx = kv.indexOf("=");
              const k = idx >= 0 ? kv.slice(0, idx) : kv;
              const raw = idx >= 0 ? kv.slice(idx + 1) : "\"\"";
              let v = "";
              try {
                v = JSON.parse(raw);
              } catch {
                v = raw;
              }
              return [k, v];
            })
          )
        : null;

      lines.push(`${name}${renderLabels(labels)} ${Number(val || 0)}`);
    }
  }

  for (const [name, fn] of gauges.entries()) {
    try {
      const v = Number(fn());
      lines.push(`${name} ${Number.isFinite(v) ? v : 0}`);
    } catch {
      lines.push(`${name} 0`);
    }
  }

  return lines.join("\n") + "\n";
}
