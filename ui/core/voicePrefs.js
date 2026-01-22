const userPrefs = new Map();
const channelPrefs = new Map();

function normalizeMode(mode) {
  const m = String(mode || "").trim().toLowerCase();
  if (!m) return null;

  // on/off are modes; anything else is treated as a persona name
  if (m === "on" || m === "off") return m;
  if (m === "status") return "status";

  return m;
}

function looksLikeSlackId(s) {
  return /^[A-Z][A-Z0-9]{6,}$/.test(String(s || "").trim());
}

export function setVoicePrefForUser(user_id, mode) {
  const uid = String(user_id || "").trim();
  if (!uid || !looksLikeSlackId(uid)) throw new Error("Missing/invalid user_id");
  const m = normalizeMode(mode);
  if (!m || m === "status") throw new Error("Missing mode");
  if (m === "off") {
    userPrefs.set(uid, { enabled: false, persona: null });
    return { scope: "user", user_id: uid, enabled: false, persona: null };
  }
  if (m === "on") {
    userPrefs.set(uid, { enabled: true, persona: null });
    return { scope: "user", user_id: uid, enabled: true, persona: null };
  }
  userPrefs.set(uid, { enabled: true, persona: m });
  return { scope: "user", user_id: uid, enabled: true, persona: m };
}

export function setVoicePrefForChannel(channel_id, mode) {
  const cid = String(channel_id || "").trim();
  if (!cid || !looksLikeSlackId(cid)) throw new Error("Missing/invalid channel_id");
  const m = normalizeMode(mode);
  if (!m || m === "status") throw new Error("Missing mode");
  if (m === "off") {
    channelPrefs.set(cid, { enabled: false, persona: null });
    return { scope: "channel", channel_id: cid, enabled: false, persona: null };
  }
  if (m === "on") {
    channelPrefs.set(cid, { enabled: true, persona: null });
    return { scope: "channel", channel_id: cid, enabled: true, persona: null };
  }
  channelPrefs.set(cid, { enabled: true, persona: m });
  return { scope: "channel", channel_id: cid, enabled: true, persona: m };
}

export function getVoicePref({ user_id, channel_id } = {}) {
  const uid = String(user_id || "").trim();
  const cid = String(channel_id || "").trim();

  // user overrides channel
  if (uid && userPrefs.has(uid)) return { scope: "user", ...userPrefs.get(uid) };
  if (cid && channelPrefs.has(cid)) return { scope: "channel", ...channelPrefs.get(cid) };

  return { scope: "default", enabled: true, persona: null };
}

export function shouldSendVoice({ user_id, channel_id } = {}) {
  const pref = getVoicePref({ user_id, channel_id });
  return { ok: Boolean(pref.enabled), persona: pref.persona || null, scope: pref.scope };
}

export function parseVoiceModeArgs(args = []) {
  const cleaned = Array.isArray(args) ? args.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean) : [];

  // Supported:
  // - /sintra voice-mode on|off|oracle|...
  // - /sintra voice-mode channel on|off|oracle|...
  // - /sintra voice-mode here on|off|oracle|...
  // - /sintra voice-mode status
  // - /sintra voice-mode channel status

  const first = cleaned[0] || null;
  const second = cleaned[1] || null;

  const scopeToken = first === "channel" || first === "here" ? "channel" : "user";
  const modeToken = scopeToken === "channel" ? second : first;

  const mode = normalizeMode(modeToken);

  return { scope: scopeToken, mode };
}
