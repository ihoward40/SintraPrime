import fs from "node:fs";
import path from "node:path";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const MATRIX_PATH = path.join(RUNS_DIR, "capability-matrix.json");

let matrix = {
  version: 1,
  lastUpdatedAt: Date.now(),
  // skills keyed by id
  skills: {},
};

function ensureRunsDir() {
  try {
    if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function loadMatrix() {
  ensureRunsDir();
  if (!fs.existsSync(MATRIX_PATH)) return;

  try {
    const raw = fs.readFileSync(MATRIX_PATH, "utf8");
    const parsed = safeJsonParse(raw);
    if (parsed && typeof parsed === "object") matrix = parsed;
  } catch {
    // ignore
  }
}

function saveMatrix() {
  ensureRunsDir();
  try {
    matrix.lastUpdatedAt = Date.now();
    fs.writeFileSync(MATRIX_PATH, JSON.stringify(matrix, null, 2) + "\n", "utf8");
  } catch {
    // ignore
  }
}

function normalizeId(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_:\-]/g, "");
}

loadMatrix();

export function getCapabilityMatrixMeta() {
  return {
    version: matrix.version,
    lastUpdatedAt: matrix.lastUpdatedAt,
    path: MATRIX_PATH,
    count: Object.keys(matrix.skills || {}).length,
  };
}

export function listSkills(filter = {}) {
  const all = Object.values(matrix.skills || {});
  const category = filter?.category ? String(filter.category) : null;
  const enabled = typeof filter?.enabled === "boolean" ? filter.enabled : null;
  const tag = filter?.tag ? String(filter.tag).toLowerCase() : null;

  return all.filter((s) => {
    if (category && String(s?.category || "") !== category) return false;
    if (enabled != null && Boolean(s?.enabled) !== enabled) return false;
    if (tag) {
      const tags = Array.isArray(s?.tags) ? s.tags.map((t) => String(t).toLowerCase()) : [];
      if (!tags.includes(tag)) return false;
    }
    return true;
  });
}

export function upsertSkill(skill) {
  const category = String(skill?.category || "general").trim() || "general";
  const label = String(skill?.label || "").trim() || "(untitled)";
  const explicitId = skill?.id ? normalizeId(skill.id) : "";
  const id = explicitId || normalizeId(`${category}:${label}`);

  const existing = matrix.skills[id] || {};
  const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
  const nextTags = Array.isArray(skill?.tags) ? skill.tags : [];

  const mergedTags = Array.from(
    new Set([...existingTags, ...nextTags].map((t) => String(t).trim()).filter(Boolean)),
  );

  matrix.skills[id] = {
    id,
    category,
    label,
    description: String(skill?.description || existing.description || ""),
    strength:
      typeof skill?.strength === "number" && Number.isFinite(skill.strength)
        ? Math.max(0, Math.min(1, skill.strength))
        : typeof existing.strength === "number"
          ? existing.strength
          : 0.7,
    source: String(skill?.source || existing.source || "sintra"),
    enabled: typeof skill?.enabled === "boolean" ? skill.enabled : existing.enabled ?? true,
    tags: mergedTags,
    meta: {
      ...(existing.meta || {}),
      ...(skill?.meta || {}),
    },
    updatedAt: Date.now(),
    createdAt: existing.createdAt || Date.now(),
  };

  saveMatrix();
  return matrix.skills[id];
}

export function disableSkill(id) {
  const key = normalizeId(id);
  if (!matrix.skills[key]) return false;
  matrix.skills[key].enabled = false;
  saveMatrix();
  return true;
}

export function getBestSkillsForTask(task = {}) {
  const all = listSkills({ enabled: true });

  const type = String(task?.type || "").trim().toLowerCase();
  const category = task?.category ? String(task.category).trim() : null;
  const tags = Array.isArray(task?.tags) ? task.tags.map((t) => String(t).toLowerCase()) : [];

  const scored = all.map((skill) => {
    let score = typeof skill?.strength === "number" ? skill.strength : 0.5;

    if (category && String(skill?.category || "") === category) score += 0.15;

    const taskTypes = Array.isArray(skill?.meta?.taskTypes)
      ? skill.meta.taskTypes.map((t) => String(t).toLowerCase())
      : [];
    if (type && taskTypes.includes(type)) score += 0.1;

    const skillTags = Array.isArray(skill?.tags) ? skill.tags.map((t) => String(t).toLowerCase()) : [];
    if (tags.length && skillTags.length) {
      const overlap = skillTags.filter((t) => tags.includes(t)).length;
      score += overlap * 0.05;
    }

    return { skill, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const limit = typeof task?.limit === "number" && Number.isFinite(task.limit) ? Math.max(1, Math.min(25, Math.floor(task.limit))) : 5;
  return scored.slice(0, limit).map((s) => s.skill);
}

export function recordToolObservation({ name, category, description, features, tags } = {}) {
  const toolName = String(name || "").trim();
  if (!toolName) return { ok: false, error: "name_required" };

  const baseTag = normalizeId(toolName);
  const baseTags = Array.from(new Set([baseTag, ...(Array.isArray(tags) ? tags : [])].map((t) => String(t).trim()).filter(Boolean)));

  const feats = Array.isArray(features) ? features : [];
  const results = [];

  for (let i = 0; i < feats.length; i++) {
    const feature = feats[i] || {};
    const label = String(feature?.label || `Feature ${i + 1}`).trim();

    results.push(
      upsertSkill({
        category: String(category || "general").trim() || "general",
        label: `${toolName} - ${label}`,
        description: String(feature?.description || ""),
        strength:
          typeof feature?.strength === "number" && Number.isFinite(feature.strength) ? feature.strength : 0.85,
        source: `tool:${baseTag}`,
        tags: Array.from(new Set([...baseTags, ...(Array.isArray(feature?.tags) ? feature.tags : [])])),
        meta: {
          toolName,
          toolDescription: String(description || ""),
          taskTypes: Array.isArray(feature?.taskTypes) ? feature.taskTypes : [],
          samplePipelines: Array.isArray(feature?.samplePipelines) ? feature.samplePipelines : [],
        },
      }),
    );
  }

  return { ok: true, tool: toolName, category: String(category || "general"), ingested: results.length, items: results };
}
