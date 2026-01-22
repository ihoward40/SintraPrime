export type GammaRefusalCode =
  | "GAMMA_API_KEY_MISSING"
  | "GAMMA_API_FORBIDDEN"
  | "GAMMA_API_UNAUTHORIZED"
  | "GAMMA_GENERATION_FAILED";

export type GammaRefusal = {
  type: "REFUSE";
  code: GammaRefusalCode;
  message: string;
  details?: Record<string, unknown>;
};

export class GammaStrictError extends Error {
  refusal: GammaRefusal;
  constructor(refusal: GammaRefusal) {
    super(refusal.message);
    this.name = "GammaStrictError";
    this.refusal = refusal;
  }
}
