export function normalizeVenue(input: unknown): string;
export function normalizeCourtDivision(input: unknown): string;

export function selectTemplateCandidates(input: {
  venue?: unknown;
  courtDivision?: unknown;
  docType?: unknown;
  variant?: unknown;
}): string[];

export function getLitigationTemplatePlan(casePayload: any): {
  jurisdictionKey: string;
  venueKey: string;
  selection?: {
    matter_type: string;
    venue: string;
  };
  documents: Array<{
    kind: string;
    docType: string;
    slug: string;
    title?: string;
    exhibit_code?: string | null;
    templateFile?: string | null;
    templatePath: string | null;
    candidates: string[];
  }>;
};

export function buildBinderCoverAndIndex(casePayload: any, outDir: string): Promise<any>;

export function buildMissingTemplateStub(input: {
  caseId: string;
  docType: string;
  variant?: string | null;
  candidates: string[];
  venue?: unknown;
  courtDivision?: unknown;
}): string;

export function renderLitigationDocument(input: {
  casePayload: any;
  docType: string;
  variant?: string | null;
  outFileBase?: string;
  outDir: string;
  templateFile?: string | null;
  candidates?: string[];
}): Promise<{
  ok: boolean;
  caseId: string;
  docType: string;
  variant: string | null;
  templatePath: string | null;
  outPath: string;
  usedStub: boolean;
  candidates: string[];
}>;

export function buildLitigationPackage(casePayload: any, outDir: string): Promise<any>;
