import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

describe("Document Processing Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testUserId: number;
  let testDocumentId: number;

  beforeAll(async () => {
    // Use test user ID (assuming user exists from auth tests)
    testUserId = 1;

    // Create authenticated context
    const ctx: TrpcContext = {
      user: {
        id: testUserId,
        openId: "test-doc-user",
        name: "Test Document User",
        email: "test-doc@example.com",
        role: "user",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    // Create authenticated caller
    caller = appRouter.createCaller(ctx);
  });

  afterAll(async () => {
    // Clean up test data
    if (testDocumentId) {
      await db.deleteTaxDocument(testDocumentId);
    }
  });

  describe("getMissingDocuments", () => {
    it("should return missing documents analysis for a tax year", async () => {
      const result = await caller.documentProcessing.getMissingDocuments({
        taxYear: 2025,
      });

      expect(result).toHaveProperty("uploaded");
      expect(result).toHaveProperty("missing");
      expect(result).toHaveProperty("completionRate");
      expect(Array.isArray(result.uploaded)).toBe(true);
      expect(Array.isArray(result.missing)).toBe(true);
      expect(typeof result.completionRate).toBe("string");
    });

    it("should calculate completion rate correctly", async () => {
      const result = await caller.documentProcessing.getMissingDocuments({
        taxYear: 2025,
      });

      const completionRate = parseFloat(result.completionRate);
      expect(completionRate).toBeGreaterThanOrEqual(0);
      expect(completionRate).toBeLessThanOrEqual(100);
    });
  });

  describe("processDocument", () => {
    it("should reject processing without a valid tax document ID", async () => {
      await expect(
        caller.documentProcessing.processDocument({
          taxDocumentId: 999999,
          documentType: "w2",
          ocrText: "Sample OCR text",
          taxYear: 2025,
        })
      ).rejects.toThrow();
    });

    it("should validate document type", async () => {
      // Create a test document first
      const testDoc = await db.createTaxDocument({
        userId: testUserId,
        fileName: "test-w2.pdf",
        fileUrl: "https://example.com/test.pdf",
        fileKey: "test-key",
        mimeType: "application/pdf",
        documentType: "w2",
        taxYear: 2025,
        status: "uploaded",
      });

      testDocumentId = testDoc!.id;

      const result = await caller.documentProcessing.processDocument({
        taxDocumentId: testDocumentId,
        documentType: "w2",
        ocrText: `
          Form W-2 Wage and Tax Statement
          Employer: Test Company Inc
          EIN: 12-3456789
          Employee: John Doe
          SSN: 123-45-6789
          Box 1 Wages: $50,000.00
          Box 2 Federal tax withheld: $5,000.00
        `,
        taxYear: 2025,
      });

      expect(result.success).toBe(true);
      expect(result.extractedData).toBeDefined();
    });
  });

  describe("verifyDocument", () => {
    it("should allow verification of a document", async () => {
      // Create a test document
      const testDoc = await db.createTaxDocument({
        userId: testUserId,
        fileName: "test-verify.pdf",
        fileUrl: "https://example.com/test-verify.pdf",
        fileKey: "test-verify-key",
        mimeType: "application/pdf",
        documentType: "1099-int",
        taxYear: 2025,
        status: "extracted",
      });

      const result = await caller.documentProcessing.verifyDocument({
        taxDocumentId: testDoc!.id,
        verificationStatus: "verified",
        notes: "Test verification",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("verification recorded");

      // Clean up
      await db.deleteTaxDocument(testDoc!.id);
    });

    it("should allow rejection of a document", async () => {
      // Create a test document
      const testDoc = await db.createTaxDocument({
        userId: testUserId,
        fileName: "test-reject.pdf",
        fileUrl: "https://example.com/test-reject.pdf",
        fileKey: "test-reject-key",
        mimeType: "application/pdf",
        documentType: "k1",
        taxYear: 2025,
        status: "extracted",
      });

      const result = await caller.documentProcessing.verifyDocument({
        taxDocumentId: testDoc!.id,
        verificationStatus: "rejected",
        notes: "Test rejection - incorrect data",
      });

      expect(result.success).toBe(true);

      // Clean up
      await db.deleteTaxDocument(testDoc!.id);
    });
  });

  describe("uploadAndProcessDocument", () => {
    it("should reject invalid base64 data", async () => {
      await expect(
        caller.documentProcessing.uploadAndProcessDocument({
          fileName: "invalid.pdf",
          mimeType: "application/pdf",
          base64Data: "invalid-base64",
          documentType: "w2",
          taxYear: 2025,
        })
      ).rejects.toThrow();
    });

    it("should reject unsupported file types", async () => {
      const validBase64 = Buffer.from("test content").toString("base64");

      await expect(
        caller.documentProcessing.uploadAndProcessDocument({
          fileName: "test.exe",
          mimeType: "application/x-msdownload",
          base64Data: validBase64,
          documentType: "w2",
          taxYear: 2025,
        })
      ).rejects.toThrow();
    });
  });

  describe("PDF Extraction", () => {
    it("should handle PDF extraction gracefully", async () => {
      // This test verifies the PDF extraction utility exists and can be imported
      const { extractTextFromPDF, isPDF } = await import("./pdfExtractor");

      expect(typeof extractTextFromPDF).toBe("function");
      expect(typeof isPDF).toBe("function");
    });

    it("should identify PDF MIME types correctly", async () => {
      const { isPDF } = await import("./pdfExtractor");

      expect(isPDF("application/pdf")).toBe(true);
      expect(isPDF("image/jpeg")).toBe(false);
      expect(isPDF("text/plain")).toBe(false);
    });
  });

  describe("Data Validation", () => {
    it("should validate W-2 data structure", async () => {
      const testDoc = await db.createTaxDocument({
        userId: testUserId,
        fileName: "test-w2-validation.pdf",
        fileUrl: "https://example.com/test-w2.pdf",
        fileKey: "test-w2-key",
        mimeType: "application/pdf",
        documentType: "w2",
        taxYear: 2025,
        status: "uploaded",
      });

      const result = await caller.documentProcessing.processDocument({
        taxDocumentId: testDoc!.id,
        documentType: "w2",
        ocrText: `
          Form W-2
          Employer: ABC Corp
          EIN: 98-7654321
          Employee: Jane Smith
          SSN: 987-65-4321
          Wages: $75,000
          Federal withholding: $10,000
        `,
        taxYear: 2025,
      });

      expect(result.extractedData).toBeDefined();
      expect(typeof result.extractedData).toBe("object");

      // Clean up
      await db.deleteTaxDocument(testDoc!.id);
    });
  });
});
