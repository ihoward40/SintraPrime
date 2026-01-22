import type { NotionLive } from "../../notion/live.js";
import type {
  CreateCaseInput,
  DueCaseQuery,
  NotionCaseRecord,
  NotionCaseStore,
  UpdateCaseInput,
} from "./notionCaseStore.js";

function getTitle(p: any, name: string): string {
  return String(p?.[name]?.title?.[0]?.plain_text ?? "");
}

function getRT(p: any, name: string): string {
  return String(p?.[name]?.rich_text?.[0]?.plain_text ?? "");
}

function getSel(p: any, name: string): string {
  return String(p?.[name]?.select?.name ?? "");
}

function getDate(p: any, name: string): string {
  return String(p?.[name]?.date?.start ?? "");
}

function getUrl(p: any, name: string): string {
  return String(p?.[name]?.url ?? "");
}

function getChk(p: any, name: string): boolean {
  return Boolean(p?.[name]?.checkbox ?? false);
}

function getPeopleIds(p: any, name: string): string[] {
  const arr = p?.[name]?.people;
  if (!Array.isArray(arr)) return [];
  return arr.map((x: any) => String(x?.id ?? "")).filter((s: string) => !!s);
}

export class LiveNotionCaseStore implements NotionCaseStore {
  constructor(
    private notion: NotionLive,
    private casesDbId: string
  ) {}

  private toNotionPropsCreate(input: CreateCaseInput) {
    const props: any = {
      "Case ID": { title: [{ text: { content: input.caseId } }] },
      Title: { rich_text: [{ text: { content: input.title } }] },
      "Case Type": { select: { name: input.caseType } },
      Status: { select: { name: input.status } },
      Stage: { select: { name: input.stage } },
      Priority: { select: { name: input.priority } },
      "Next Action": { rich_text: [{ text: { content: input.nextAction } }] },
      "Due Date": { date: { start: input.dueDate } },
      Module: { select: { name: input.module } },
      "Intake Key": { rich_text: [{ text: { content: input.intakeKey } }] },
      "Escalation Lock Until": { date: null },
      "Notion Page ID": { rich_text: [{ text: { content: "" } }] },
    };

    if (input.counterparty) props["Counterparty"] = { rich_text: [{ text: { content: input.counterparty } }] };
    if (input.accountRef) props["Account Ref"] = { rich_text: [{ text: { content: input.accountRef } }] };
    if (input.artifactIndex) props["Artifact Index"] = { url: input.artifactIndex };
    if (typeof input.amountInDispute === "number") props["Amount in Dispute"] = { number: input.amountInDispute };
    if (typeof input.amountUndisputed === "number") props["Amount Undisputed"] = { number: input.amountUndisputed };
    if (input.assignedToPersonIds?.length) {
      props["Assigned To"] = { people: input.assignedToPersonIds.map((id) => ({ id })) };
    }

    return props;
  }

  private toNotionPropsPatch(input: UpdateCaseInput) {
    const props: any = {};
    if (input.status) props["Status"] = { select: { name: input.status } };
    if (input.stage) props["Stage"] = { select: { name: input.stage } };
    if (input.priority) props["Priority"] = { select: { name: input.priority } };
    if (input.nextAction) props["Next Action"] = { rich_text: [{ text: { content: input.nextAction } }] };
    if (input.dueDate) props["Due Date"] = { date: { start: input.dueDate } };
    if (input.assignedToPersonIds) props["Assigned To"] = { people: input.assignedToPersonIds.map((id) => ({ id })) };
    if (input.escalationLockUntil !== undefined) {
      props["Escalation Lock Until"] = input.escalationLockUntil
        ? { date: { start: input.escalationLockUntil } }
        : { date: null };
    }
    if (input.artifactIndex) props["Artifact Index"] = { url: input.artifactIndex };
    if (input.latestRunId) props["Latest Run ID"] = { rich_text: [{ text: { content: input.latestRunId } }] };
    if (typeof input.responseReceived === "boolean") props["Response Received"] = { checkbox: input.responseReceived };
    if (typeof input.packetReady === "boolean") props["Packet Ready"] = { checkbox: input.packetReady };

    if (input.lastIdempotencyKey !== undefined) {
      props["Last Idempotency Key"] = input.lastIdempotencyKey
        ? { rich_text: [{ text: { content: input.lastIdempotencyKey } }] }
        : { rich_text: [] };
    }
    if (typeof input.driftFlag === "boolean") props["Drift Flag"] = { checkbox: input.driftFlag };
    if (input.driftReason !== undefined) {
      props["Drift Reason"] = input.driftReason ? { rich_text: [{ text: { content: input.driftReason } }] } : { rich_text: [] };
    }
    if (input.approvalStatus) props["Approval Status"] = { select: { name: input.approvalStatus } };
    if (input.approvedBundleHash !== undefined) {
      props["Approved Bundle Hash"] = input.approvedBundleHash
        ? { rich_text: [{ text: { content: input.approvedBundleHash } }] }
        : { rich_text: [] };
    }
    if (input.approvedByPersonIds) props["Approved By"] = { people: input.approvedByPersonIds.map((id) => ({ id })) };
    if (input.approvedAt !== undefined) {
      props["Approved At"] = input.approvedAt ? { date: { start: input.approvedAt } } : { date: null };
    }

    if (input.approvalOverrideReason !== undefined) {
      props["Approval Override Reason"] = input.approvalOverrideReason
        ? { rich_text: [{ text: { content: input.approvalOverrideReason } }] }
        : { rich_text: [] };
    }
    if (input.approvalOverrideByPersonIds) {
      props["Approval Override By"] = { people: input.approvalOverrideByPersonIds.map((id) => ({ id })) };
    }

    if (input.approvalOverrideStage) props["Approval Override Stage"] = { select: { name: input.approvalOverrideStage } };
    if (input.approvalOverrideBundleHash !== undefined) {
      props["Approval Override Bundle Hash"] = input.approvalOverrideBundleHash
        ? { rich_text: [{ text: { content: input.approvalOverrideBundleHash } }] }
        : { rich_text: [] };
    }
    if (input.approvalOverrideUntil !== undefined) {
      props["Approval Override Until"] = input.approvalOverrideUntil ? { date: { start: input.approvalOverrideUntil } } : { date: null };
    }
    return props;
  }

  private fromNotionPage(page: any): NotionCaseRecord {
    const p = page?.properties ?? {};

    return {
      notionPageId: String(page?.id ?? ""),
      caseId: getTitle(p, "Case ID"),
      title: getRT(p, "Title") || undefined,
      caseType: getSel(p, "Case Type") || undefined,
      status: getSel(p, "Status") as any,
      stage: getSel(p, "Stage") as any,
      priority: getSel(p, "Priority") as any,
      nextAction: getRT(p, "Next Action"),
      dueDate: getDate(p, "Due Date"),
      intakeKey: getRT(p, "Intake Key"),
      responseReceived: getChk(p, "Response Received"),
      packetReady: getChk(p, "Packet Ready"),
      escalationLockUntil: getDate(p, "Escalation Lock Until") || null,
      module: getSel(p, "Module") || undefined,
      counterparty: getRT(p, "Counterparty") || undefined,
      accountRef: getRT(p, "Account Ref") || undefined,
      artifactIndex: getUrl(p, "Artifact Index") || undefined,
      latestRunId: getRT(p, "Latest Run ID") || undefined,
      lastIdempotencyKey: getRT(p, "Last Idempotency Key") || undefined,
      driftFlag: getChk(p, "Drift Flag"),
      driftReason: getRT(p, "Drift Reason") || undefined,
      approvalStatus: getSel(p, "Approval Status") || undefined,
      approvedBundleHash: getRT(p, "Approved Bundle Hash") || undefined,
      approvedByPersonIds: getPeopleIds(p, "Approved By"),
      approvedAt: getDate(p, "Approved At") || undefined,
      approvalOverrideReason: getRT(p, "Approval Override Reason") || undefined,
      approvalOverrideByPersonIds: getPeopleIds(p, "Approval Override By"),
      approvalOverrideStage: (getSel(p, "Approval Override Stage") as any) || undefined,
      approvalOverrideBundleHash: getRT(p, "Approval Override Bundle Hash") || undefined,
      approvalOverrideUntil: getDate(p, "Approval Override Until") || undefined,
    };
  }

  async createCase(input: CreateCaseInput): Promise<NotionCaseRecord> {
    const page = await this.notion.createPage({
      parent: { database_id: this.casesDbId },
      properties: this.toNotionPropsCreate(input),
    });

    const pageId = String((page as any)?.id ?? "");
    if (pageId) {
      await this.notion.updatePage(pageId, {
        properties: { "Notion Page ID": { rich_text: [{ text: { content: pageId } }] } },
      });

      const readback = await this.notion.get<any>(`/v1/pages/${pageId}`);
      return this.fromNotionPage(readback ?? page);
    }

    return this.fromNotionPage(page);
  }

  async updateCase(input: UpdateCaseInput): Promise<void> {
    await this.notion.updatePage(input.notionPageId, { properties: this.toNotionPropsPatch(input) });
  }

  async queryDueCases(q: DueCaseQuery): Promise<NotionCaseRecord[]> {
    const beforeIso = q.beforeIso;
    const res = await this.notion.queryDatabase(this.casesDbId, {
      page_size: 100,
      filter: {
        and: [
          { property: "Due Date", date: { on_or_before: beforeIso } },
          { property: "Status", select: { does_not_equal: "Resolved" } },
          { property: "Status", select: { does_not_equal: "Closed" } },
        ],
      },
      sorts: [{ property: "Due Date", direction: "ascending" }],
    });

    return (res?.results ?? []).map((r: any) => this.fromNotionPage(r));
  }

  async queryResponseReceivedCases(opts?: { limit?: number }): Promise<NotionCaseRecord[]> {
    const res = await this.notion.queryDatabase(this.casesDbId, {
      page_size: Math.max(1, Math.min(100, Number(opts?.limit ?? 25))),
      filter: {
        and: [
          { property: "Response Received", checkbox: { equals: true } },
          { property: "Packet Ready", checkbox: { equals: false } },
          { property: "Status", select: { does_not_equal: "Resolved" } },
          { property: "Status", select: { does_not_equal: "Closed" } },
        ],
      },
      sorts: [{ property: "Due Date", direction: "ascending" }],
    });

    return (res?.results ?? []).map((r: any) => this.fromNotionPage(r));
  }

  async queryReceivedCases(opts?: { limit?: number }): Promise<NotionCaseRecord[]> {
    const res = await this.notion.queryDatabase(this.casesDbId, {
      page_size: Math.max(1, Math.min(100, Number(opts?.limit ?? 25))),
      filter: {
        and: [
          { property: "Packet Ready", checkbox: { equals: false } },
          {
            or: [
              { property: "Status", select: { equals: "Received" } },
              { property: "Response Received", checkbox: { equals: true } },
            ],
          },
          { property: "Status", select: { does_not_equal: "Resolved" } },
          { property: "Status", select: { does_not_equal: "Closed" } },
        ],
      },
      sorts: [{ property: "Due Date", direction: "ascending" }],
    });

    return (res?.results ?? []).map((r: any) => this.fromNotionPage(r));
  }

  async claimEscalationLock(notionPageId: string, lockUntilIso: string): Promise<boolean> {
    const page = await this.notion.get<any>(`/v1/pages/${notionPageId}`);
    const p = page?.properties ?? {};
    const current = getDate(p, "Escalation Lock Until") || null;
    if (current && new Date(current).getTime() > Date.now()) return false;

    await this.updateCase({ notionPageId, escalationLockUntil: lockUntilIso });
    return true;
  }

  async releaseEscalationLock(notionPageId: string): Promise<void> {
    await this.updateCase({ notionPageId, escalationLockUntil: null });
  }
}
