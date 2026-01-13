// templates/tauri-teaching-cockpit/src/state/operatorLog.ts
//
// Paste-ready operator ledger helper (Tauri).
// Requires Rust commands: append_operator_log / read_operator_log_tail.
//
// Note: Depending on Tauri version, the import path for `invoke` may differ.
// - Tauri v1: import { invoke } from "@tauri-apps/api/tauri";
// - Tauri v2: import { invoke } from "@tauri-apps/api/core";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function invoke<T>(cmd: string, args?: Record<string, any>): Promise<T>;

export type OperatorActionV1 =
  | "preview_requested"
  | "build_confirmed"
  | "build_completed"
  | "build_failed"
  | "transcript_generated"
  | "usb_packaged"
  | "artifact_opened"
  | "teaching_mode_viewed";

export async function logOperatorAction(action: OperatorActionV1, caseId: string | null, details?: Record<string, string>) {
  // `binary_sha256` must be supplied from your build attestation in your app.
  // This template leaves it as an empty string by default.
  const binary_sha256 = "";

  const entry = {
    schema: "OPERATOR_LOG_v1",
    utc: new Date().toISOString(),
    operator_action: action,
    case_id: caseId ?? "",
    binary_sha256,
    details: details ?? {},
  };

  await invoke<void>("append_operator_log", {
    entryJson: JSON.stringify(entry),
  });
}
