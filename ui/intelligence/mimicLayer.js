import { recordToolObservation } from "./capabilityMatrix.js";

function inferCategoryFromText(text = "") {
  const t = String(text || "").toLowerCase();
  if (t.includes("video") || t.includes("cinematic") || t.includes("lip") || t.includes("scene")) return "video";
  if (t.includes("image") || t.includes("art") || t.includes("illustration") || t.includes("brand")) return "image";
  if (t.includes("voice") || t.includes("audio") || t.includes("speech") || t.includes("music")) return "voice";
  if (t.includes("copy") || t.includes("writing") || t.includes("text") || t.includes("legal")) return "writing";
  if (t.includes("automation") || t.includes("workflow") || t.includes("trigger")) return "automation";
  if (t.includes("dashboard") || t.includes("analytics") || t.includes("bi")) return "analytics";
  if (t.includes("chatbot") || t.includes("support") || t.includes("customer")) return "chatbots";
  if (t.includes("coding") || t.includes("dev") || t.includes("agent")) return "coding";
  return "general";
}

function inferTagsFromLine(line = "") {
  const lower = String(line || "").toLowerCase();
  const tags = [];

  if (lower.includes("temporal") || lower.includes("coherence")) tags.push("temporal_coherence");
  if (lower.includes("cinematic")) tags.push("cinematic");
  if (lower.includes("lip")) tags.push("lip_sync");
  if (lower.includes("brand") || lower.includes("style")) tags.push("branding");
  if (lower.includes("legal") || lower.includes("statute") || lower.includes("case law")) tags.push("legal_reasoning");
  if (lower.includes("workflow") || lower.includes("trigger")) tags.push("workflow_router");

  return tags;
}

function inferTaskTypesFromLine(line = "") {
  const lower = String(line || "").toLowerCase();
  const out = [];

  if (lower.includes("video") || lower.includes("scene")) out.push("video_generation");
  if (lower.includes("image") || lower.includes("art")) out.push("image_generation");
  if (lower.includes("voice") || lower.includes("audio")) out.push("voice_generation");
  if (lower.includes("legal") || lower.includes("draft")) out.push("legal_drafting");
  if (lower.includes("binder") || lower.includes("pdf")) out.push("document_layout");
  if (lower.includes("automation") || lower.includes("trigger")) out.push("workflow_automation");

  return out;
}

export function ingestToolDescription({ name, description, rawFeaturesText } = {}) {
  const toolName = String(name || "").trim();
  if (!toolName) return { ok: false, error: "name_required" };

  const desc = String(description || "");
  const features = Array.isArray(rawFeaturesText) ? rawFeaturesText : [];

  const normalizedFeatures = features
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((line) => ({
      label: line.slice(0, 80),
      description: line,
      strength: 0.85,
      tags: inferTagsFromLine(line),
      taskTypes: inferTaskTypesFromLine(line),
    }));

  const category = inferCategoryFromText(`${toolName} ${desc} ${normalizedFeatures.map((f) => f.description).join(" ")}`);

  return recordToolObservation({
    name: toolName,
    category,
    description: desc,
    features: normalizedFeatures,
    tags: ["external_tool", "mimicked"],
  });
}
