import verizonPlaybook from "./verizonPlaybook.js";
import lvnvPlaybook from "./lvnvPlaybook.js";
import chasePlaybook from "./chasePlaybook.js";
import dakotaPlaybook from "./dakotaPlaybook.js";

const playbooks = [verizonPlaybook, lvnvPlaybook, chasePlaybook, dakotaPlaybook];

export function listPlaybooks() {
  return playbooks.map((p) => ({ name: p.name }));
}

/**
 * Registers playbooks onto an EventEmitter-compatible event bus.
 * Playbooks should NOT call Slack directly; they should emit events.
 */
export function registerPlaybooks(eventBus) {
  for (const pb of playbooks) {
    if (pb && typeof pb.activate === "function") {
      pb.activate(eventBus);
    }
  }
}
