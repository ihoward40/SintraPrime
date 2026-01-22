export type GammaBackend = "gamma_api" | "gamma_free_pack";

export function pickGammaBackend(): GammaBackend {
  return process.env.GAMMA_API_KEY ? "gamma_api" : "gamma_free_pack";
}

export function gammaOutDir(runDir: string): string {
  return `${runDir}/gamma`;
}
