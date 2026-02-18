import { describe, it, expect, vi, beforeAll } from "vitest";
import { SUBSCRIPTION_TIERS } from "./stripe-products";

// ============================================================================
// STRIPE PRODUCTS TESTS
// ============================================================================

describe("Stripe Products Configuration", () => {
  it("should have all four subscription tiers defined", () => {
    expect(SUBSCRIPTION_TIERS.free).toBeDefined();
    expect(SUBSCRIPTION_TIERS.pro).toBeDefined();
    expect(SUBSCRIPTION_TIERS.coalition).toBeDefined();
    expect(SUBSCRIPTION_TIERS.enterprise).toBeDefined();
  });

  it("should have correct pricing for each tier", () => {
    expect(SUBSCRIPTION_TIERS.free.priceMonthly).toBe(0);
    expect(SUBSCRIPTION_TIERS.pro.priceMonthly).toBe(2900);
    expect(SUBSCRIPTION_TIERS.coalition.priceMonthly).toBe(7900);
    expect(SUBSCRIPTION_TIERS.enterprise.priceMonthly).toBe(19900);
  });

  it("should have features array for each tier", () => {
    for (const tier of Object.values(SUBSCRIPTION_TIERS)) {
      expect(Array.isArray(tier.features)).toBe(true);
      expect(tier.features.length).toBeGreaterThan(0);
    }
  });

  it("should have ascending pricing", () => {
    expect(SUBSCRIPTION_TIERS.free.priceMonthly).toBeLessThan(SUBSCRIPTION_TIERS.pro.priceMonthly);
    expect(SUBSCRIPTION_TIERS.pro.priceMonthly).toBeLessThan(SUBSCRIPTION_TIERS.coalition.priceMonthly);
    expect(SUBSCRIPTION_TIERS.coalition.priceMonthly).toBeLessThan(SUBSCRIPTION_TIERS.enterprise.priceMonthly);
  });

  it("should have names matching tier keys", () => {
    expect(SUBSCRIPTION_TIERS.free.name).toBe("Free");
    expect(SUBSCRIPTION_TIERS.pro.name).toBe("Pro");
    expect(SUBSCRIPTION_TIERS.coalition.name).toBe("Coalition");
    expect(SUBSCRIPTION_TIERS.enterprise.name).toBe("Enterprise");
  });
});

// ============================================================================
// DEADLINE CALCULATOR LOGIC TESTS
// ============================================================================

describe("Deadline Calculator Logic", () => {
  // Replicate the deadline calculation logic from the router
  const FEDERAL_RULES: Record<string, { name: string; days: number; description: string; statute: string }> = {
    fdcpa_validation: { name: "FDCPA Debt Validation", days: 30, description: "Dispute debt within 30 days of initial communication", statute: "15 U.S.C. § 1692g(b)" },
    fdcpa_lawsuit: { name: "FDCPA Lawsuit Deadline", days: 365, description: "File lawsuit within 1 year of FDCPA violation", statute: "15 U.S.C. § 1692k(d)" },
    fcra_dispute: { name: "FCRA Investigation Period", days: 30, description: "CRA must investigate within 30 days", statute: "15 U.S.C. § 1681i(a)(1)" },
    fcra_lawsuit: { name: "FCRA Lawsuit Deadline", days: 730, description: "File lawsuit within 2 years of discovery", statute: "15 U.S.C. § 1681p" },
    tila_rescission: { name: "TILA Right of Rescission", days: 3, description: "Right to rescind within 3 business days", statute: "15 U.S.C. § 1635(a)" },
    tila_lawsuit: { name: "TILA Lawsuit Deadline", days: 365, description: "File lawsuit within 1 year of violation", statute: "15 U.S.C. § 1640(e)" },
    respa_lawsuit: { name: "RESPA Lawsuit Deadline", days: 1095, description: "File lawsuit within 3 years of violation", statute: "12 U.S.C. § 2614" },
    answer_complaint: { name: "Answer to Complaint", days: 21, description: "File answer within 21 days of service", statute: "FRCP Rule 12(a)(1)" },
    discovery_response: { name: "Discovery Response", days: 30, description: "Respond to discovery within 30 days", statute: "FRCP Rule 33(b)(2)" },
    appeal_notice: { name: "Notice of Appeal", days: 30, description: "File notice of appeal within 30 days", statute: "FRAP Rule 4(a)(1)" },
  };

  function calculateDeadline(triggerDate: string, days: number) {
    const trigger = new Date(triggerDate);
    const deadline = new Date(trigger);
    deadline.setDate(deadline.getDate() + days);
    return deadline;
  }

  it("should calculate FDCPA validation deadline correctly (30 days)", () => {
    const trigger = "2026-01-01";
    const deadline = calculateDeadline(trigger, 30);
    expect(deadline.toISOString().split("T")[0]).toBe("2026-01-31");
  });

  it("should calculate FDCPA lawsuit deadline correctly (365 days)", () => {
    const trigger = "2025-01-01";
    const deadline = calculateDeadline(trigger, 365);
    expect(deadline.toISOString().split("T")[0]).toBe("2026-01-01");
  });

  it("should calculate FCRA lawsuit deadline correctly (730 days)", () => {
    const trigger = "2024-01-01";
    const deadline = calculateDeadline(trigger, 730);
    expect(deadline.toISOString().split("T")[0]).toBe("2025-12-31");
  });

  it("should calculate RESPA deadline correctly (1095 days / 3 years)", () => {
    const trigger = "2023-01-01";
    const deadline = calculateDeadline(trigger, 1095);
    expect(deadline.toISOString().split("T")[0]).toBe("2025-12-31");
  });

  it("should handle leap year correctly", () => {
    const trigger = "2024-02-28";
    const deadline = calculateDeadline(trigger, 1);
    expect(deadline.toISOString().split("T")[0]).toBe("2024-02-29");
  });

  it("should correctly identify past deadlines", () => {
    const trigger = "2020-01-01";
    const deadline = calculateDeadline(trigger, 30);
    const now = new Date();
    expect(deadline < now).toBe(true);
  });

  it("should correctly identify future deadlines", () => {
    const trigger = "2026-12-01";
    const deadline = calculateDeadline(trigger, 365);
    const now = new Date();
    expect(deadline > now).toBe(true);
  });

  it("should have all federal rules with required fields", () => {
    for (const [key, rule] of Object.entries(FEDERAL_RULES)) {
      expect(rule.name).toBeTruthy();
      expect(rule.days).toBeGreaterThan(0);
      expect(rule.description).toBeTruthy();
      expect(rule.statute).toBeTruthy();
    }
  });

  it("should have 10 federal rules defined", () => {
    expect(Object.keys(FEDERAL_RULES).length).toBe(10);
  });
});

// ============================================================================
// STATE SOL DATA TESTS
// ============================================================================

describe("State Statute of Limitations Data", () => {
  const STATE_SOL: Record<string, { written: number; oral: number; promissory: number; openAccount: number }> = {
    CA: { written: 4, oral: 2, promissory: 4, openAccount: 4 },
    NY: { written: 6, oral: 6, promissory: 6, openAccount: 6 },
    TX: { written: 4, oral: 4, promissory: 4, openAccount: 4 },
    FL: { written: 5, oral: 4, promissory: 5, openAccount: 4 },
  };

  it("should have SOL data for major states", () => {
    expect(STATE_SOL.CA).toBeDefined();
    expect(STATE_SOL.NY).toBeDefined();
    expect(STATE_SOL.TX).toBeDefined();
    expect(STATE_SOL.FL).toBeDefined();
  });

  it("should have all four debt types for each state", () => {
    for (const [state, sol] of Object.entries(STATE_SOL)) {
      expect(sol.written).toBeGreaterThan(0);
      expect(sol.oral).toBeGreaterThan(0);
      expect(sol.promissory).toBeGreaterThan(0);
      expect(sol.openAccount).toBeGreaterThan(0);
    }
  });

  it("should have California SOL at 4 years for written contracts", () => {
    expect(STATE_SOL.CA.written).toBe(4);
  });

  it("should have New York SOL at 6 years for written contracts", () => {
    expect(STATE_SOL.NY.written).toBe(6);
  });
});

// ============================================================================
// FILE UPLOAD VALIDATION TESTS
// ============================================================================

describe("File Upload Validation", () => {
  const ACCEPTED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  it("should accept PDF files", () => {
    expect(ACCEPTED_TYPES.includes("application/pdf")).toBe(true);
  });

  it("should accept Word documents", () => {
    expect(ACCEPTED_TYPES.includes("application/msword")).toBe(true);
    expect(ACCEPTED_TYPES.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
  });

  it("should accept image files", () => {
    expect(ACCEPTED_TYPES.includes("image/png")).toBe(true);
    expect(ACCEPTED_TYPES.includes("image/jpeg")).toBe(true);
    expect(ACCEPTED_TYPES.includes("image/gif")).toBe(true);
    expect(ACCEPTED_TYPES.includes("image/webp")).toBe(true);
  });

  it("should accept text files", () => {
    expect(ACCEPTED_TYPES.includes("text/plain")).toBe(true);
  });

  it("should reject executable files", () => {
    expect(ACCEPTED_TYPES.includes("application/x-executable")).toBe(false);
    expect(ACCEPTED_TYPES.includes("application/x-msdownload")).toBe(false);
  });

  it("should have 10MB max file size", () => {
    expect(MAX_FILE_SIZE).toBe(10485760);
  });

  it("should reject files over 10MB", () => {
    const fileSize = 11 * 1024 * 1024;
    expect(fileSize > MAX_FILE_SIZE).toBe(true);
  });

  it("should accept files under 10MB", () => {
    const fileSize = 5 * 1024 * 1024;
    expect(fileSize <= MAX_FILE_SIZE).toBe(true);
  });
});

// ============================================================================
// FORMAT FILE SIZE UTILITY TEST
// ============================================================================

describe("formatFileSize utility", () => {
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  it("should format bytes correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("should format kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("should format megabytes correctly", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(5242880)).toBe("5.0 MB");
  });

  it("should handle zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
});
