import { GammaStrictError } from "./refusals.js";

export type GammaBackend = "gamma_api" | "gamma_free_pack";

export function assertGammaApiAllowed(opts: {
  strictAny?: boolean;
  requestedBackend?: GammaBackend;
  hasApiKey: boolean;
}) {
  if (!opts.strictAny) return;

  if (opts.requestedBackend === "gamma_api" && !opts.hasApiKey) {
    throw new GammaStrictError({
      type: "REFUSE",
      code: "GAMMA_API_KEY_MISSING",
      message: "Strict-any enabled: gamma_api requested but GAMMA_API_KEY is missing.",
      details: { requestedBackend: opts.requestedBackend, env_var: "GAMMA_API_KEY" },
    });
  }
}
