export type StitchRefusalCode =
  | "STITCH_EXPORT_MISSING"
  | "STITCH_UNSUPPORTED_EXPORT"
  | "STITCH_AUTOMATION_BLOCKED"
  | "STITCH_UNKNOWN_BACKEND"
  | "STITCH_RENDER_FAILED";

export type StitchRefusal = {
  type: "REFUSE";
  code: StitchRefusalCode;
  message: string;
  details?: Record<string, unknown>;
};

export function stitchRefusal(
  code: StitchRefusalCode,
  message: string,
  details?: Record<string, unknown>
): StitchRefusal {
  return { type: "REFUSE", code, message, details };
}

export class StitchStrictError extends Error {
  refusal: StitchRefusal;

  constructor(refusal: StitchRefusal) {
    super(refusal.message);
    this.name = "StitchStrictError";
    this.refusal = refusal;
  }
}
