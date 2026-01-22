import express from "express";
import { maybeSynthesizeTextToBuffer, synthesizeToFile } from "../services/elevenlabs-speech.js";
import { pickVoiceForText } from "../services/voice-router.js";

const router = express.Router();

function contentTypeFromOutputFormat(outputFormat) {
  const of = String(outputFormat || "").trim().toLowerCase();
  if (of === "wav") return "audio/wav";
  return "audio/mpeg";
}

function asNonEmptyString(value) {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function pickCharacter({ explicitCharacter, text }) {
  const c = asNonEmptyString(explicitCharacter);
  return c ? c.toLowerCase() : pickVoiceForText(text);
}

function normalizeMode(mode) {
  const m = String(mode || "").trim().toLowerCase();
  if (!m) return null;
  if (m === "brick" || m === "brick_city_oracle" || m === "brick-city-oracle") return "oracle";
  if (m === "dragon_due_process" || m === "dragon-due-process" || m === "due_process" || m === "due-process") return "dragon";
  if (m === "judge_invisible" || m === "judge-invisible" || m === "invisible_judge" || m === "invisible-judge") return "judge";
  if (m === "supreme_court_mode" || m === "supreme-court-mode" || m === "supreme court") return "supreme";
  if (m === "shadow_trustee" || m === "shadow-trustee" || m === "shadow trustee") return "shadow";
  return m;
}

/**
 * POST /api/voice/test
 * Body: { text: string, character?: string }
 * Returns: audio/mpeg stream
 */
router.post("/test", async (req, res) => {
  try {
    const text = asNonEmptyString(req.body?.text);
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

    const character = pickCharacter({ explicitCharacter: req.body?.character ?? req.body?.persona ?? req.body?.voice, text });
    const r = await maybeSynthesizeTextToBuffer(text, { character });
    if (r?.skipped) {
      return res.status(200).json({ ok: false, skipped: true, reason: r.reason, character });
    }

    const { audio, bytes, voiceId, modelId } = r;

    res.set("Content-Type", contentTypeFromOutputFormat(r.outputFormat));
    res.set("Content-Length", String(bytes));
    res.set("X-Voice-Character", character);
    res.set("X-Voice-Id", voiceId);
    res.set("X-Model-Id", modelId);
    res.send(audio);
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to generate speech", details: String(err?.message ?? err) });
  }
});

/**
 * GET /api/voice/test/:mode
 * Optional: ?text=...
 * Returns: audio/mpeg stream (or JSON if skipped)
 */
router.get("/test/:mode", async (req, res) => {
  try {
    const mode = normalizeMode(req.params?.mode);
    if (!mode) return res.status(400).json({ ok: false, error: "Missing mode" });

    const text = asNonEmptyString(req.query?.text) || "SintraPrime voice test. All systems nominal.";
    const character = pickCharacter({ explicitCharacter: mode, text });

    const r = await maybeSynthesizeTextToBuffer(text, { character });
    if (r?.skipped) {
      return res.status(200).json({ ok: false, skipped: true, reason: r.reason, character });
    }

    const { audio, bytes, voiceId, modelId } = r;
    res.set("Content-Type", contentTypeFromOutputFormat(r.outputFormat));
    res.set("Content-Length", String(bytes));
    res.set("X-Voice-Character", character);
    res.set("X-Voice-Id", voiceId);
    res.set("X-Model-Id", modelId);
    res.send(audio);
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to generate speech", details: String(err?.message ?? err) });
  }
});

/**
 * POST /api/voice/case-briefing
 * Body: { caseId?: string, text: string, character?: string }
 * Returns: { ok, filePath, voice, bytes }
 */
router.post("/case-briefing", async (req, res) => {
  try {
    const text = asNonEmptyString(req.body?.text);
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

    const caseId = asNonEmptyString(req.body?.caseId) || `ad-hoc-${Date.now()}`;
    const voice = pickCharacter({ explicitCharacter: req.body?.character ?? req.body?.persona ?? req.body?.voice, text });

    const out = await synthesizeToFile(text, {
      character: voice,
      filename: `${caseId}-${voice}.mp3`,
      subdir: "case-briefings",
    });

    if (out?.skipped) {
      return res.json({ ok: false, skipped: true, caseId, voice, reason: out.reason });
    }

    res.json({ ok: true, caseId, voice, filePath: out.relativePath, bytes: out.bytes });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to generate case briefing audio", details: String(err?.message ?? err) });
  }
});

/**
 * POST /api/voice/deadline-alert
 * Body: { message: string, character?: string }
 */
router.post("/deadline-alert", async (req, res) => {
  try {
    const message = asNonEmptyString(req.body?.message) || asNonEmptyString(req.body?.text);
    if (!message) return res.status(400).json({ ok: false, error: "Missing message" });

    const voice = pickCharacter({ explicitCharacter: req.body?.character ?? req.body?.persona ?? req.body?.voice, text: message });

    const out = await synthesizeToFile(message, {
      character: voice,
      filename: `deadline-${Date.now()}-${voice}.mp3`,
      subdir: "deadline-alerts",
    });

    if (out?.skipped) {
      return res.json({ ok: false, skipped: true, voice, reason: out.reason });
    }

    res.json({ ok: true, voice, filePath: out.relativePath, bytes: out.bytes });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to generate deadline alert audio", details: String(err?.message ?? err) });
  }
});

export default router;
