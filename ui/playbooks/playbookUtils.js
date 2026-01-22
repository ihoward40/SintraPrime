function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

export function channelFor(key, fallbackChannelName) {
  // Prefer env override (can be channel ID or #name)
  const v = env(`PLAYBOOK_CHANNEL_${key.toUpperCase()}`);
  return v || fallbackChannelName;
}

export function emitPlaybookHeader(eventBus, { channel, title, summary, voiceText, voicePersona }) {
  eventBus.emit("case.update", {
    channel,
    caseId: "PLAYBOOK",
    title,
    summary,
    idempotency_key: `pb:${title}:${channel}`,
  });

  if (voiceText) {
    eventBus.emit("briefing.voice", {
      channel,
      character: voicePersona,
      subdir: "autonomous/playbooks",
      outputDir: "output/audio",
      title,
      initial_comment: `🎤 *Playbook Briefing (${String(voicePersona || "oracle").toUpperCase()})*`,
      text: voiceText,
    });
  }
}

export function safeName(v) {
  return String(v || "").trim();
}
