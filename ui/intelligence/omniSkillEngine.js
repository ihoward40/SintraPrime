import { eventBus } from "../core/eventBus.js";
import { getBestSkillsForTask } from "./capabilityMatrix.js";

function baseBrandProfile() {
  return {
    palette: "black-gold",
    typography: "mythic-formal",
    tone: "brick-city-mythic",
    motifs: ["scales", "laurels", "sigils"],
    layout: "evidence-binder",
  };
}

function normalizeTags(input) {
  const tags = Array.isArray(input) ? input : [];
  return tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
}

export function buildOmniPlan({ intent, context = {} } = {}) {
  const intentStr = String(intent || "").trim();
  if (!intentStr) throw new Error("intent_required");

  const task = {
    type: String(context?.type || "legal_automation").toLowerCase(),
    category: String(context?.category || "enforcement").toLowerCase(),
    tags: normalizeTags(context?.tags || [intentStr]),
    limit: typeof context?.limit === "number" ? context.limit : 8,
  };

  const skills = getBestSkillsForTask(task);

  const pipeline = [];

  pipeline.push({
    step: "draft_core_text",
    kind: "llm",
    uses: skills.filter((s) => {
      const cat = String(s?.category || "").toLowerCase();
      return cat === "writing" || cat === "research";
    }),
    output: "primary_text",
  });

  pipeline.push({
    step: "layout_evidence_binder",
    kind: "document",
    uses: skills.filter((s) => {
      const tags = Array.isArray(s?.tags) ? s.tags.map((t) => String(t).toLowerCase()) : [];
      return tags.includes("binder") || tags.includes("document_layout") || String(s?.category || "").toLowerCase() === "document";
    }),
    brandProfile: baseBrandProfile(),
    output: "binder_pdf",
  });

  pipeline.push({
    step: "generate_voice_briefing",
    kind: "voice",
    uses: skills.filter((s) => String(s?.category || "").toLowerCase() === "voice"),
    output: "mp3_briefing",
  });

  pipeline.push({
    step: "generate_social_snippet",
    kind: "video",
    uses: skills.filter((s) => {
      const cat = String(s?.category || "").toLowerCase();
      return cat === "video" || cat === "image";
    }),
    output: "social_clip",
  });

  return {
    intent: intentStr,
    context,
    skillsUsed: skills.map((s) => s.id),
    pipeline,
    createdAt: new Date().toISOString(),
  };
}

export function startOmniSkillEngine() {
  // Build a plan on-demand.
  eventBus.on("omni.request-plan", (payload) => {
    try {
      const plan = buildOmniPlan(payload);
      eventBus.emit("omni.plan.created", plan);
    } catch (err) {
      eventBus.emit("system.error", {
        source: "OmniSkillEngine",
        error: String(err?.message || err),
        context: payload || null,
      });
      eventBus.emit("omni.plan.error", {
        error: String(err?.message || err),
        payload: payload || null,
      });
    }
  });

  // Automatically generate a plan when a case starts.
  eventBus.on("enforcement.chain.start", ({ creditor, caseId } = {}) => {
    const c = String(creditor || "").trim();
    if (!c) return;

    const intent = `${c.toLowerCase().replace(/\s+/g, "_")}_enforcement`;

    const plan = buildOmniPlan({
      intent,
      context: {
        type: "legal_automation",
        category: "enforcement",
        tags: [c.toLowerCase(), "enforcement", "binder", "voice"],
        caseId: caseId || null,
        creditor: c,
      },
    });

    eventBus.emit("omni.plan.for-case", {
      creditor: c,
      caseId: caseId || null,
      plan,
    });

    eventBus.emit("case.update", {
      caseId: caseId || "(case)",
      title: "OmniSkill Plan Created",
      summary: `Intent: ${intent}. Steps: ${plan.pipeline.map((p) => p.step).join("  ")}`,
    });
  });

  eventBus.emit("case.update", {
    caseId: "OMNI",
    title: "OmniSkill Engine Enabled",
    summary: "Capability matrix + plan router active.",
  });
}
