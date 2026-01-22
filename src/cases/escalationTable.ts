import type { CasePriority, CaseStage } from "./types.js";

export type StageKey = CaseStage;

export const ESCALATION_TABLE: Record<
  StageKey,
  {
    nextStage: StageKey;
    defaultDaysByPriority: Record<CasePriority, number | null>;
    packetRunType: "packet_notice" | "packet_cure" | "packet_default" | null;
    nextActionTemplate: string;
  }
> = {
  Notice: {
    nextStage: "Cure",
    defaultDaysByPriority: { Low: 10, Medium: 7, High: 5, Critical: 3 },
    packetRunType: "packet_notice",
    nextActionTemplate: "Send NOTICE packet via selected channel; log proof of delivery.",
  },
  Cure: {
    nextStage: "Default",
    defaultDaysByPriority: { Low: 14, Medium: 10, High: 7, Critical: 5 },
    packetRunType: "packet_cure",
    nextActionTemplate: "Send CURE / follow-up packet; request response by due date; log non-response if none.",
  },
  Default: {
    nextStage: "Regulator Ready",
    defaultDaysByPriority: { Low: 14, Medium: 10, High: 7, Critical: 5 },
    packetRunType: "packet_default",
    nextActionTemplate: "Send DEFAULT / final notice; prepare regulator packet if still no response.",
  },
  "Regulator Ready": {
    nextStage: "Regulator Ready",
    defaultDaysByPriority: { Low: null, Medium: null, High: null, Critical: null },
    packetRunType: null,
    nextActionTemplate: "Generate regulator-ready packet and choose submission channel (CFPB/OCC/AG/etc.).",
  },
};
