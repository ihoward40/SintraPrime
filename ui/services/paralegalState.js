let TASKS = [];
let CASES = new Map();

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "paralegal") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function resetParalegalState() {
  TASKS = [];
  CASES = new Map();
}

export function getParalegalState() {
  return {
    tasks: TASKS,
    cases: [...CASES.values()],
  };
}

export function upsertParalegalCase(bus, key, patch = {}) {
  // Back-compat: allow calling without bus
  if (typeof bus === "string" || bus == null || bus?.emit == null) {
    patch = key ?? {};
    key = bus;
    bus = null;
  }

  const k = String(key || "").trim();
  if (!k) return null;

  const existing = CASES.get(k) || {
    id: k,
    createdAt: nowIso(),
    updatedAt: null,
    domain: patch.domain || "general",
    creditor: patch.creditor || null,
    reference: patch.reference || null,
    status: "open",
    events: [],
  };

  const merged = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
  };

  if (patch.event) merged.events = [...(existing.events || []), patch.event];
  CASES.set(k, merged);

  if (bus?.emit) {
    bus.emit("paralegal.case.upsert", {
      ...merged,
      systemId: merged.id,
      caseId: merged.caseId || merged.id,
    });
  }
  return merged;
}

export function createParalegalTask(bus, payload = {}) {
  const task = {
    id: makeId("task"),
    createdAt: nowIso(),
    status: "pending",
    ...payload,
  };

  TASKS.push(task);
  if (bus?.emit) {
    bus.emit("paralegal.task.created", task);
    bus.emit("paralegal.task.upsert", {
      ...task,
      systemId: task.id,
      taskId: task.taskId || task.id,
      updatedAt: task.updatedAt || task.createdAt,
    });
  }
  return task;
}

export function completeParalegalTask(bus, id) {
  const taskId = String(id || "").trim();
  if (!taskId) return null;

  const task = TASKS.find((t) => t?.id === taskId);
  if (!task) return null;

  task.status = "done";
  task.completedAt = nowIso();
  if (bus?.emit) {
    bus.emit("paralegal.task.completed", task);
    bus.emit("paralegal.task.upsert", {
      ...task,
      systemId: task.id,
      taskId: task.taskId || task.id,
      updatedAt: task.completedAt,
    });
  }
  return task;
}

export function linkParalegalCaseNotion(systemId, notionPageId) {
  const id = String(systemId || "").trim();
  const pageId = String(notionPageId || "").trim();
  if (!id || !pageId) return false;
  const existing = CASES.get(id);
  if (!existing) return false;
  existing.notionPageId = pageId;
  existing.updatedAt = nowIso();
  CASES.set(id, existing);
  return true;
}

export function linkParalegalTaskNotion(systemId, notionPageId) {
  const id = String(systemId || "").trim();
  const pageId = String(notionPageId || "").trim();
  if (!id || !pageId) return false;
  const task = TASKS.find((t) => t?.id === id);
  if (!task) return false;
  task.notionPageId = pageId;
  task.updatedAt = nowIso();
  return true;
}
