import type { CasePriority, CaseStage, CaseStatus } from "../types.js";

export type NotionCaseRecord = {
  notionPageId: string;
  caseId: string;
  status: CaseStatus;
  stage: CaseStage;
  priority: CasePriority;
  dueDate: string;
  nextAction: string;
  intakeKey: string;
  responseReceived?: boolean;
  packetReady?: boolean;
  escalationLockUntil?: string | null;
  title?: string;
  caseType?: string;
  module?: string;
  counterparty?: string;
  accountRef?: string;
  artifactIndex?: string;
  latestRunId?: string;
  lastIdempotencyKey?: string;
  driftFlag?: boolean;
  driftReason?: string;
  approvalStatus?: string;
  approvedBundleHash?: string;
  approvedByPersonIds?: string[];
  approvedAt?: string;
  approvalOverrideReason?: string;
  approvalOverrideByPersonIds?: string[];
  approvalOverrideStage?: CaseStage;
  approvalOverrideBundleHash?: string;
  approvalOverrideUntil?: string;
};

export type CreateCaseInput = {
  caseId: string;
  title: string;
  caseType: string;
  status: CaseStatus;
  stage: CaseStage;
  priority: CasePriority;
  nextAction: string;
  dueDate: string;
  assignedToPersonIds?: string[];
  module: string;
  counterparty?: string;
  accountRef?: string;
  intakeKey: string;
  artifactIndex?: string;
  amountInDispute?: number;
  amountUndisputed?: number;
};

export type UpdateCaseInput = {
  notionPageId: string;
  status?: CaseStatus;
  stage?: CaseStage;
  priority?: CasePriority;
  nextAction?: string;
  dueDate?: string;
  assignedToPersonIds?: string[];
  escalationLockUntil?: string | null;
  artifactIndex?: string;
  latestRunId?: string;
  responseReceived?: boolean;
  packetReady?: boolean;
  lastIdempotencyKey?: string;
  driftFlag?: boolean;
  driftReason?: string;
  approvalStatus?: string;
  approvedBundleHash?: string;
  approvedByPersonIds?: string[];
  approvedAt?: string | null;
  approvalOverrideReason?: string;
  approvalOverrideByPersonIds?: string[];
  approvalOverrideStage?: CaseStage;
  approvalOverrideBundleHash?: string;
  approvalOverrideUntil?: string | null;
};

export type DueCaseQuery = {
  beforeIso: string;
};

export interface NotionCaseStore {
  createCase(input: CreateCaseInput): Promise<NotionCaseRecord>;
  updateCase(input: UpdateCaseInput): Promise<void>;
  queryDueCases(q: DueCaseQuery): Promise<NotionCaseRecord[]>;
  claimEscalationLock(notionPageId: string, lockUntilIso: string): Promise<boolean>;
  releaseEscalationLock(notionPageId: string): Promise<void>;
}
