
import { loadRequalificationState, writeRequalificationState } from "../requalification/state.js";
import { writeRequalificationActivationArtifact } from "../artifacts/writeRequalificationActivationArtifact.js";
import { getEffectiveConfidence } from "../confidence/confidenceStore.js";
import { touchConfidence } from "../confidence/updateConfidence.js";

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const subcmd = argv[1];
  const fingerprint = argv[2];

  // /autonomy requalify activate <fingerprint>
  if (cmd === "requalify" && subcmd === "activate") {
    if (!fingerprint) {
      console.log(JSON.stringify({ kind: "PolicyDenied", code: "MISSING_FINGERPRINT", reason: "Missing fingerprint" }));
      process.exit(3);
    }
    const runsDir = process.env.RUNS_DIR || "runs";
    const st = loadRequalificationState(runsDir, fingerprint);
    if (!st) {
      console.log(JSON.stringify({ kind: "PolicyDenied", code: "REQUAL_STATE_MISSING", reason: `No requalification state for ${fingerprint}` }));
      process.exit(3);
    }
    if (st.state !== "ELIGIBLE") {
      console.log(JSON.stringify({
        kind: "PolicyDenied",
        code: "REQUAL_NOT_ELIGIBLE",
        reason: `Cannot activate unless ELIGIBLE (current: ${st.state})`,
        fingerprint
      }));
      process.exit(3);
    }

    {
      const eff = getEffectiveConfidence(runsDir, fingerprint);
      const min = Number(process.env.AUTONOMY_ACTIVATE_MIN_CONFIDENCE || "0.80");
      if (Number.isFinite(min) && eff.decayed_confidence < min) {
        console.log(JSON.stringify({
          kind: "PolicyDenied",
          code: "ACTIVATION_CONFIDENCE_TOO_LOW",
          reason: "Activation requires sufficient confidence",
          fingerprint,
          required_min_confidence: min,
          decayed_confidence: eff.decayed_confidence,
          raw_confidence: eff.raw_confidence,
          updated_at: eff.updated_at,
        }));
        process.exit(3);
      }
    }

    const activatedAt = new Date().toISOString();
    writeRequalificationState(runsDir, {
      ...st,
      state: "ACTIVE",
      cause: "OPERATOR_ACTIVATED",
      since: activatedAt
    });

    try {
      touchConfidence({ fingerprint });
    } catch {
      // ignore
    }
    const artifact = writeRequalificationActivationArtifact(runsDir, fingerprint, {
      previous_state: "ELIGIBLE",
      new_state: "ACTIVE",
      activated_at: activatedAt
    });
    console.log(JSON.stringify({
      kind: "RequalificationActivated",
      fingerprint,
      state: "ACTIVE",
      activated_at: activatedAt,
      artifact
    }));
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("[AUTONOMY] fatal", e);
  process.exit(1);
});
