export type CaseStatus = "Intake" | "Active" | "Pending Response" | "Received" | "Resolved" | "Closed";
export type CaseStage = "Notice" | "Cure" | "Default" | "Regulator Ready";
export type CasePriority = "Low" | "Medium" | "High" | "Critical";

export type RunType =
  | "intake"
  | "binder"
  | "packet_notice"
  | "packet_cure"
  | "packet_default"
  | "deadline_scan"
  | "export"
  | "mirror";

export type RunResult = "success" | "error" | "skipped";

export type CaseArtifactRef = {
  artifact_id?: string;
  path: string;
  sha256: string;
  [k: string]: unknown;
};

export type CaseEventType =
  | "CASE_CREATED"
  | "CASE_UPDATED"
  | "LOCK_CLAIMED"
  | "LOCK_RELEASED"
  | "DEADLINE_SCAN"
  | "ESCALATED"
  | "ARTIFACT_GENERATED"
  | "EGRESS_REFUSED"
  | "NOTICE_SENT"
  | "RESPONSE_RECEIVED"
  | "RESOLVED"
  | "CLOSED"
  | "ERROR";

export type CaseEvent = {
  event_id: string;
  timestamp: string;
  event_type: CaseEventType;
  actor: string;
  details: Record<string, unknown>;
  related_artifacts: CaseArtifactRef[];
  prev_hash?: string | null;
  hash?: string | null;
};

export type RunReceipt = {
  run_id: string;
  case_id: string;
  timestamp_start: string;
  timestamp_end?: string | null;
  run_type: RunType;
  result: RunResult;
  idempotency_key?: string | null;
  inputs: Record<string, unknown>;
  outputs: {
    artifacts: Array<{ path: string; sha256: string; [k: string]: unknown }>;
    [k: string]: unknown;
  };
  decision?: Record<string, unknown>;
  errors: Array<Record<string, unknown>>;
  retries: number;
};
