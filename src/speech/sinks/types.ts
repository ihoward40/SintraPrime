export type SpeechPayload = {
  text: string;
  category: string;
  threadId?: string;
  timestamp: string;
  meta?: {
    // Tier-S9
    redaction_hits?: string[];
    confidence?: number;
    severity?: "calm" | "warning" | "urgent";
    cadence?: "slow" | "normal" | "fast";
    // Tier-S12
    redaction_level?: "normal" | "strict" | "paranoid";
    // Tier-S13
    effective_voice_budget?: number;

    // Tier-S?: autoplay request signal (alerts may request; sink decides)
    autoplay_requested?: boolean;

    // Alert policy routing / auditing (do not log content)
    alert_kind?: string;
    alert_priority?: "low" | "med" | "high";

    // Provenance for audit/debugging
    source?: "operator" | "alert";
  };
};

export interface SpeechSink {
  name: string;
  speak(payload: SpeechPayload): Promise<void> | void;
}
