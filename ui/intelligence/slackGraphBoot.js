import { eventBus } from "../core/eventBus.js";
import { getSlackGraphState, loadSlackGraphFromDisk } from "../services/slackGraphStore.js";

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[SlackGraph] ${msg}`);
}

try {
  const state = loadSlackGraphFromDisk();
  if (state.loaded) {
    log(`Loaded (${state.sourcePath})`);
    eventBus.emit("slack.graph.loaded", { sourcePath: state.sourcePath, loadedAt: state.loadedAt, metrics: state.graph?.metrics || null });
  } else {
    log(`Not loaded (${state.sourcePath}) reason=${state.error}`);
    eventBus.emit("slack.graph.missing", { sourcePath: state.sourcePath, loadedAt: state.loadedAt, reason: state.error });
  }
} catch (e) {
  const err = String(e?.message || e);
  const state = getSlackGraphState();
  log(`Error (${state?.sourcePath || "(unknown)"}) ${err}`);
  eventBus.emit("slack.graph.error", { sourcePath: state?.sourcePath || null, error: err });
}
