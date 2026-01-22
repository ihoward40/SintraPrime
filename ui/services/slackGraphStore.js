import fs from "node:fs";
import path from "node:path";

let current = {
  loaded: false,
  loadedAt: null,
  sourcePath: null,
  graph: null,
  error: null,
};

function defaultGraphPath() {
  return path.resolve(process.cwd(), "runs", "slack_graph", "latest", "graph.json");
}

export function loadSlackGraphFromDisk({ absPath = null } = {}) {
  const p = absPath ? String(absPath) : String(process.env.SLACK_GRAPH_PATH || "");
  const resolved = p.trim() ? (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)) : defaultGraphPath();

  try {
    if (!fs.existsSync(resolved)) {
      current = {
        loaded: false,
        loadedAt: new Date().toISOString(),
        sourcePath: resolved,
        graph: null,
        error: "missing_graph_file",
      };
      return current;
    }

    const raw = fs.readFileSync(resolved, "utf8");
    const graph = JSON.parse(raw);
    current = {
      loaded: true,
      loadedAt: new Date().toISOString(),
      sourcePath: resolved,
      graph,
      error: null,
    };
    return current;
  } catch (e) {
    current = {
      loaded: false,
      loadedAt: new Date().toISOString(),
      sourcePath: resolved,
      graph: null,
      error: String(e?.message || e),
    };
    return current;
  }
}

export function getSlackGraphState() {
  return current;
}

export function getSlackGraph({ compact = false } = {}) {
  if (!current.loaded || !current.graph) return null;
  if (!compact) return current.graph;

  const g = current.graph;
  return {
    ok: Boolean(g.ok),
    generatedAt: g.generatedAt || null,
    input: g.input || null,
    metrics: g.metrics || null,
  };
}
