/**
 * SintraPrime Multi-Jurisdiction Legal Database Router
 * Comprehensive database of US federal, state, and international jurisdictions
 * with filing deadlines, local rules, court systems, and legal resources.
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";

// Comprehensive jurisdiction data
const JURISDICTIONS = [
  // Federal
  {
    code: "USDC", name: "U.S. District Courts (Federal)", country: "US", type: "federal" as const,
    courtSystem: "94 federal judicial districts organized into 12 regional circuits. Cases involving federal law, constitutional issues, or diversity jurisdiction.",
    filingDeadlines: { answerDeadline: "21 days after service", appealDeadline: "30 days from judgment", discoveryDefault: "Varies by local rules" },
    localRules: { electronicFiling: "Required via CM/ECF", pageLimit: "25 pages for motions", fontRequirement: "12-point Times New Roman or 14-point proportional" },
    resources: [
      { label: "PACER", url: "https://pacer.uscourts.gov" },
      { label: "CM/ECF", url: "https://ecf.uscourts.gov" },
      { label: "Federal Rules of Civil Procedure", url: "https://www.law.cornell.edu/rules/frcp" },
    ],
  },
  {
    code: "9CIR", name: "9th Circuit Court of Appeals", country: "US", type: "federal" as const,
    courtSystem: "Largest federal circuit covering AK, AZ, CA, HI, ID, MT, NV, OR, WA, Guam, N. Mariana Islands.",
    filingDeadlines: { openingBrief: "40 days after docketing", answeringBrief: "30 days after opening brief", replyBrief: "21 days after answering brief" },
    localRules: { wordLimit: "14,000 words for opening brief", format: "Double-spaced, 14-point font", electronicFiling: "Required" },
    resources: [{ label: "9th Circuit", url: "https://www.ca9.uscourts.gov" }],
  },
  // States
  {
    code: "CA", name: "California", country: "US", type: "state" as const,
    courtSystem: "Superior Courts (trial), Courts of Appeal (6 districts), California Supreme Court. Largest state court system in the US.",
    filingDeadlines: { answerDeadline: "30 days after service", appealDeadline: "60 days from judgment", smallClaimsLimit: "$12,500" },
    localRules: { electronicFiling: "Mandatory in most counties", pageLimit: "15 pages for motions (most counties)", format: "28-line pleading paper" },
    resources: [
      { label: "California Courts", url: "https://www.courts.ca.gov" },
      { label: "California Code", url: "https://leginfo.legislature.ca.gov" },
    ],
  },
  {
    code: "NY", name: "New York", country: "US", type: "state" as const,
    courtSystem: "Supreme Court (trial), Appellate Division (4 departments), Court of Appeals (highest). Complex multi-tier system.",
    filingDeadlines: { answerDeadline: "20 days after service (personal), 30 days (other)", appealDeadline: "30 days from judgment", noticePleading: "Required" },
    localRules: { electronicFiling: "NYSCEF required in most counties", format: "Double-spaced, 12-point font", pageLimit: "Varies by court" },
    resources: [
      { label: "NY Courts", url: "https://www.nycourts.gov" },
      { label: "NYSCEF", url: "https://iapps.courts.state.ny.us/nyscef" },
    ],
  },
  {
    code: "TX", name: "Texas", country: "US", type: "state" as const,
    courtSystem: "District Courts (trial), Courts of Appeals (14 courts), Texas Supreme Court (civil), Court of Criminal Appeals (criminal).",
    filingDeadlines: { answerDeadline: "Monday following 20 days after service", appealDeadline: "30 days from judgment", discoveryDefault: "Level 2 discovery plan" },
    localRules: { electronicFiling: "eFileTexas required", format: "Pleading paper not required", pageLimit: "50 pages for briefs" },
    resources: [{ label: "Texas Courts", url: "https://www.txcourts.gov" }],
  },
  {
    code: "FL", name: "Florida", country: "US", type: "state" as const,
    courtSystem: "Circuit Courts (trial), District Courts of Appeal (6 districts), Florida Supreme Court.",
    filingDeadlines: { answerDeadline: "20 days after service", appealDeadline: "30 days from judgment", summaryJudgment: "40 days before hearing" },
    localRules: { electronicFiling: "Florida Courts E-Filing Portal required", format: "Double-spaced, 12-point font" },
    resources: [{ label: "Florida Courts", url: "https://www.flcourts.gov" }],
  },
  {
    code: "IL", name: "Illinois", country: "US", type: "state" as const,
    courtSystem: "Circuit Courts (trial), Appellate Court (5 districts), Illinois Supreme Court.",
    filingDeadlines: { answerDeadline: "30 days after service", appealDeadline: "30 days from judgment" },
    localRules: { electronicFiling: "Odyssey eFile Illinois", format: "12-point font, double-spaced" },
    resources: [{ label: "Illinois Courts", url: "https://www.illinoiscourts.gov" }],
  },
  {
    code: "PA", name: "Pennsylvania", country: "US", type: "state" as const,
    courtSystem: "Courts of Common Pleas (trial), Superior Court, Commonwealth Court, Pennsylvania Supreme Court.",
    filingDeadlines: { answerDeadline: "20 days after service", appealDeadline: "30 days from judgment" },
    localRules: { electronicFiling: "PACFile system", format: "Varies by county" },
    resources: [{ label: "Pennsylvania Courts", url: "https://www.pacourts.us" }],
  },
  {
    code: "OH", name: "Ohio", country: "US", type: "state" as const,
    courtSystem: "Courts of Common Pleas (trial), Courts of Appeals (12 districts), Ohio Supreme Court.",
    filingDeadlines: { answerDeadline: "28 days after service", appealDeadline: "30 days from judgment" },
    localRules: { electronicFiling: "Varies by county" },
    resources: [{ label: "Ohio Courts", url: "https://www.supremecourt.ohio.gov" }],
  },
  {
    code: "GA", name: "Georgia", country: "US", type: "state" as const,
    courtSystem: "Superior Courts, Court of Appeals (3 divisions), Georgia Supreme Court.",
    filingDeadlines: { answerDeadline: "30 days after service", appealDeadline: "30 days from judgment" },
    localRules: { electronicFiling: "eFileGA" },
    resources: [{ label: "Georgia Courts", url: "https://georgiacourts.gov" }],
  },
  // Regulatory
  {
    code: "CFPB", name: "Consumer Financial Protection Bureau", country: "US", type: "regulatory" as const,
    courtSystem: "Federal regulatory agency. Enforces FDCPA, FCRA, TILA, RESPA, and other consumer protection laws.",
    filingDeadlines: { complaintDeadline: "Varies by statute (FDCPA: 1 year)", responseDeadline: "60 days for company response" },
    localRules: { complaintPortal: "consumerfinance.gov/complaint", formalComplaint: "Submit via CFPB portal" },
    resources: [
      { label: "CFPB Complaint Portal", url: "https://www.consumerfinance.gov/complaint" },
      { label: "FDCPA Text", url: "https://www.law.cornell.edu/uscode/text/15/1692" },
    ],
  },
  {
    code: "FTC", name: "Federal Trade Commission", country: "US", type: "regulatory" as const,
    courtSystem: "Federal regulatory agency. Enforces FCRA, FTC Act, and consumer protection regulations.",
    filingDeadlines: { reportDeadline: "No statutory deadline for consumer reports" },
    localRules: { complaintPortal: "reportfraud.ftc.gov" },
    resources: [
      { label: "FTC Complaint Portal", url: "https://reportfraud.ftc.gov" },
      { label: "FCRA Text", url: "https://www.law.cornell.edu/uscode/text/15/1681" },
    ],
  },
  {
    code: "SEC", name: "Securities and Exchange Commission", country: "US", type: "regulatory" as const,
    courtSystem: "Federal regulatory agency. Enforces securities laws, oversees EDGAR filings.",
    filingDeadlines: { "10k": "60-90 days after fiscal year end", "10q": "40-45 days after quarter end" },
    localRules: { electronicFiling: "EDGAR system required" },
    resources: [
      { label: "SEC EDGAR", url: "https://www.sec.gov/edgar" },
      { label: "SEC Complaint", url: "https://www.sec.gov/tcr" },
    ],
  },
  // International
  {
    code: "UK-EW", name: "England & Wales", country: "UK", type: "international" as const,
    courtSystem: "Magistrates Courts, County Courts, High Court, Court of Appeal, Supreme Court of the United Kingdom.",
    filingDeadlines: { acknowledgmentOfService: "14 days", defenceDeadline: "28 days after acknowledgment", appealDeadline: "21 days" },
    localRules: { electronicFiling: "CE-File for High Court", format: "A4 paper, 12-point font" },
    resources: [{ label: "UK Courts", url: "https://www.judiciary.gov.uk" }],
  },
  {
    code: "EU-ECJ", name: "European Court of Justice", country: "EU", type: "international" as const,
    courtSystem: "Highest court of the European Union. Interprets EU law and ensures its uniform application.",
    filingDeadlines: { referenceDeadline: "No fixed deadline (referred by national courts)", directActionDeadline: "2 months" },
    localRules: { languages: "24 official EU languages", format: "Specific ECJ procedural rules" },
    resources: [{ label: "ECJ", url: "https://curia.europa.eu" }],
  },
];

export const jurisdictionRouter = router({
  /** List all jurisdictions with optional filter */
  list: publicProcedure
    .input(z.object({
      type: z.enum(["federal", "state", "county", "international", "regulatory"]).optional(),
      country: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      let filtered = JURISDICTIONS;
      if (input.type) filtered = filtered.filter(j => j.type === input.type);
      if (input.country) filtered = filtered.filter(j => j.country === input.country);
      if (input.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter(j =>
          j.name.toLowerCase().includes(q) ||
          j.code.toLowerCase().includes(q) ||
          j.courtSystem.toLowerCase().includes(q)
        );
      }
      return filtered;
    }),

  /** Get a specific jurisdiction by code */
  get: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const jurisdiction = JURISDICTIONS.find(j => j.code === input.code);
      if (!jurisdiction) return null;
      return jurisdiction;
    }),

  /** Get filing deadline for a specific jurisdiction and deadline type */
  getDeadline: protectedProcedure
    .input(z.object({
      jurisdictionCode: z.string(),
      deadlineType: z.string(),
      filingDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const jurisdiction = JURISDICTIONS.find(j => j.code === input.jurisdictionCode);
      if (!jurisdiction) return null;

      const deadlineInfo = (jurisdiction.filingDeadlines as Record<string, string>)[input.deadlineType];
      return {
        jurisdiction: jurisdiction.name,
        deadlineType: input.deadlineType,
        rule: deadlineInfo ?? "See local rules",
        resources: jurisdiction.resources,
      };
    }),

  /** Get stats about the jurisdiction database */
  getStats: publicProcedure.query(async () => {
    return {
      total: JURISDICTIONS.length,
      federal: JURISDICTIONS.filter(j => j.type === "federal").length,
      state: JURISDICTIONS.filter(j => j.type === "state").length,
      international: JURISDICTIONS.filter(j => j.type === "international").length,
      regulatory: JURISDICTIONS.filter(j => j.type === "regulatory").length,
      countries: [...new Set(JURISDICTIONS.map(j => j.country))].length,
    };
  }),
});
