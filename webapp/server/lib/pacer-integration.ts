/**
 * PACER Integration Service
 * Public Access to Court Electronic Records
 * 
 * This service provides integration with PACER for:
 * - Case search and docket retrieval
 * - Document downloads
 * - Real-time docket monitoring
 * - Multi-jurisdiction support
 */

import axios, { AxiosInstance } from "axios";

export interface PACERCredentials {
  username: string;
  password: string;
  clientCode?: string;
}

export interface CourtCase {
  caseNumber: string;
  courtId: string;
  courtName: string;
  title: string;
  filed: Date;
  status: string;
  nature: string;
  jurisdiction: string;
  judge?: string;
  parties: Party[];
}

export interface Party {
  name: string;
  role: "Plaintiff" | "Defendant" | "Appellant" | "Appellee" | "Other";
  attorneys: Attorney[];
}

export interface Attorney {
  name: string;
  firm?: string;
  phone?: string;
  email?: string;
}

export interface DocketEntry {
  entryNumber: number;
  date: Date;
  description: string;
  documentNumber?: string;
  pages?: number;
  hasDocument: boolean;
  cost?: number;
}

export interface PACERSearchParams {
  caseNumber?: string;
  partyName?: string;
  courtId?: string;
  filedFrom?: Date;
  filedTo?: Date;
  caseType?: string;
}

export class PACERService {
  private client: AxiosInstance;
  private credentials?: PACERCredentials;
  private sessionToken?: string;
  private costTracker: number = 0;

  // PACER court codes
  private readonly COURT_CODES = {
    // Federal District Courts
    "cacd": "Central District of California",
    "cand": "Northern District of California",
    "casd": "Southern District of California",
    "nysd": "Southern District of New York",
    "nyed": "Eastern District of New York",
    "txnd": "Northern District of Texas",
    "txsd": "Southern District of Texas",
    "flsd": "Southern District of Florida",
    "flmd": "Middle District of Florida",
    "ilnd": "Northern District of Illinois",
    
    // Circuit Courts
    "ca1": "First Circuit",
    "ca2": "Second Circuit",
    "ca3": "Third Circuit",
    "ca4": "Fourth Circuit",
    "ca5": "Fifth Circuit",
    "ca6": "Sixth Circuit",
    "ca7": "Seventh Circuit",
    "ca8": "Eighth Circuit",
    "ca9": "Ninth Circuit",
    "ca10": "Tenth Circuit",
    "ca11": "Eleventh Circuit",
    "cadc": "DC Circuit",
    "cafc": "Federal Circuit",
    
    // Supreme Court
    "scotus": "Supreme Court of the United States",
  };

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        "User-Agent": "SintraPrime/1.0",
      },
    });
  }

  /**
   * Set PACER credentials
   */
  setCredentials(credentials: PACERCredentials): void {
    this.credentials = credentials;
  }

  /**
   * Login to PACER
   */
  async login(): Promise<boolean> {
    if (!this.credentials) {
      throw new Error("PACER credentials not set");
    }

    try {
      // PACER login endpoint (actual implementation would use real PACER API)
      const response = await this.client.post("https://pacer.login.uscourts.gov/csologin/login.jsf", {
        loginName: this.credentials.username,
        password: this.credentials.password,
      });

      this.sessionToken = response.data.token;
      return true;
    } catch (error) {
      console.error("PACER login failed:", error);
      return false;
    }
  }

  /**
   * Search for cases
   */
  async searchCases(params: PACERSearchParams): Promise<CourtCase[]> {
    if (!this.sessionToken) {
      await this.login();
    }

    try {
      // Mock implementation - real version would call PACER Case Locator API
      const mockCases: CourtCase[] = [
        {
          caseNumber: "2:23-cv-12345",
          courtId: "cacd",
          courtName: this.COURT_CODES["cacd"],
          title: "Smith v. Corporation Inc.",
          filed: new Date("2023-06-15"),
          status: "Active",
          nature: "Contract Dispute",
          jurisdiction: "Federal",
          judge: "Hon. Jane Doe",
          parties: [
            {
              name: "John Smith",
              role: "Plaintiff",
              attorneys: [
                {
                  name: "Alice Johnson",
                  firm: "Johnson & Associates",
                  email: "alice@johnson-law.com",
                },
              ],
            },
            {
              name: "Corporation Inc.",
              role: "Defendant",
              attorneys: [
                {
                  name: "Bob Williams",
                  firm: "Williams Law Group",
                  email: "bob@williamslaw.com",
                },
              ],
            },
          ],
        },
      ];

      return mockCases;
    } catch (error) {
      console.error("PACER search failed:", error);
      return [];
    }
  }

  /**
   * Get docket for a case
   */
  async getDocket(caseNumber: string, courtId: string): Promise<DocketEntry[]> {
    if (!this.sessionToken) {
      await this.login();
    }

    try {
      // Mock implementation - real version would call PACER Docket Report API
      const mockDocket: DocketEntry[] = [
        {
          entryNumber: 1,
          date: new Date("2023-06-15"),
          description: "COMPLAINT filed by John Smith",
          documentNumber: "1",
          pages: 25,
          hasDocument: true,
          cost: 2.50,
        },
        {
          entryNumber: 2,
          date: new Date("2023-06-20"),
          description: "SUMMONS issued",
          hasDocument: false,
        },
        {
          entryNumber: 3,
          date: new Date("2023-07-15"),
          description: "ANSWER to Complaint by Corporation Inc.",
          documentNumber: "3",
          pages: 15,
          hasDocument: true,
          cost: 1.50,
        },
        {
          entryNumber: 4,
          date: new Date("2023-08-01"),
          description: "MOTION for Summary Judgment filed by Corporation Inc.",
          documentNumber: "4",
          pages: 30,
          hasDocument: true,
          cost: 3.00,
        },
        {
          entryNumber: 5,
          date: new Date("2023-08-15"),
          description: "OPPOSITION to Motion for Summary Judgment filed by John Smith",
          documentNumber: "5",
          pages: 28,
          hasDocument: true,
          cost: 2.80,
        },
      ];

      // Track costs
      mockDocket.forEach((entry) => {
        if (entry.cost) {
          this.costTracker += entry.cost;
        }
      });

      return mockDocket;
    } catch (error) {
      console.error("PACER docket retrieval failed:", error);
      return [];
    }
  }

  /**
   * Download document
   */
  async downloadDocument(
    caseNumber: string,
    courtId: string,
    documentNumber: string
  ): Promise<Buffer | null> {
    if (!this.sessionToken) {
      await this.login();
    }

    try {
      // Mock implementation - real version would download PDF from PACER
      console.log(`Downloading document ${documentNumber} from case ${caseNumber}`);
      
      // Track cost (PACER charges per page, max $3.00 per document)
      this.costTracker += 3.00;
      
      return null; // Would return PDF buffer
    } catch (error) {
      console.error("PACER document download failed:", error);
      return null;
    }
  }

  /**
   * Monitor docket for changes
   */
  async monitorDocket(
    caseNumber: string,
    courtId: string,
    lastEntryNumber: number
  ): Promise<DocketEntry[]> {
    const allEntries = await this.getDocket(caseNumber, courtId);
    return allEntries.filter((entry) => entry.entryNumber > lastEntryNumber);
  }

  /**
   * Get cost tracker
   */
  getCostTracker(): number {
    return this.costTracker;
  }

  /**
   * Reset cost tracker
   */
  resetCostTracker(): void {
    this.costTracker = 0;
  }

  /**
   * Get court name from code
   */
  getCourtName(courtId: string): string {
    return this.COURT_CODES[courtId as keyof typeof this.COURT_CODES] || courtId;
  }

  /**
   * Get all supported courts
   */
  getSupportedCourts(): Record<string, string> {
    return this.COURT_CODES;
  }

  /**
   * Logout from PACER
   */
  async logout(): Promise<void> {
    this.sessionToken = undefined;
  }
}

// Singleton instance
export const pacerService = new PACERService();
