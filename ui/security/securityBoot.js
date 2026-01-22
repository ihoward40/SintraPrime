import { startSystemVision } from "./systemVision.js";
import { startNetworkVisionAnomalyDetector } from "./networkVision.js";
import { startThreatEngine } from "./threatEngine.js";
import { startSecurityProfileBridge } from "./securityProfile.js";
import { startSecurityIncidentLogger } from "./securityIncidentLogger.js";
import { startConfigIntegrityGuard } from "./configIntegrityGuard.js";
import { startBlueTeamEngine } from "./blueTeamEngine.js";

let started = false;

export function startSecuritySubsystem() {
  if (started) return;
  started = true;

  startSystemVision();
  startNetworkVisionAnomalyDetector();
  startThreatEngine();
  startSecurityProfileBridge();
  startSecurityIncidentLogger();
  startConfigIntegrityGuard();
  startBlueTeamEngine();

  // eslint-disable-next-line no-console
  console.log("[UI] Security + Vision online");
}

startSecuritySubsystem();

