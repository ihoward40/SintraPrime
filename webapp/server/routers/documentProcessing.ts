import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { extractTextFromPDFUrl, extractTextFromImageUrl, isPDF, isImage, cleanExtractedText } from "../pdfExtractor";
import { storagePut } from "../storage";

/**
 * Document Processing Router
 * 
 * Handles OCR extraction and structured data parsing for tax documents
 * including W-2, 1099 (all variants), Schedule K-1, and trust instruments.
 */

export const documentProcessingRouter = router({
  /**
   * Process uploaded tax document with OCR and LLM extraction
   */
  processDocument: protectedProcedure
    .input(
      z.object({
        taxDocumentId: z.number(),
        documentType: z.string(), // w2, 1099-int, 1099-div, k1, etc.
        ocrText: z.string(), // Raw OCR text from PDF/image
        taxYear: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Update document status to processing
      await db.updateTaxDocument(input.taxDocumentId, {
        status: "processing",
        ocrText: input.ocrText,
      });

      try {
        // Extract structured data based on document type
        const extractedData = await extractTaxDocumentData(
          input.documentType,
          input.ocrText,
          input.taxYear
        );

        // Update tax document with extracted data
        await db.updateTaxDocument(input.taxDocumentId, {
          status: "extracted",
          extractedData,
          processedAt: new Date(),
        });

        // Store type-specific data in dedicated tables
        if (input.documentType === "w2") {
          await db.createW2Data({
            taxDocumentId: input.taxDocumentId,
            userId: ctx.user.id,
            taxYear: input.taxYear || new Date().getFullYear() - 1,
            ...extractedData,
            rawData: extractedData,
          });
        } else if (input.documentType.startsWith("1099")) {
          await db.create1099Data({
            taxDocumentId: input.taxDocumentId,
            userId: ctx.user.id,
            taxYear: input.taxYear || new Date().getFullYear() - 1,
            formType: input.documentType.toUpperCase(),
            ...extractedData,
            rawData: extractedData,
          });
        } else if (input.documentType === "k1" || input.documentType === "k1-1041") {
          await db.createK1Data({
            taxDocumentId: input.taxDocumentId,
            userId: ctx.user.id,
            taxYear: input.taxYear || new Date().getFullYear() - 1,
            formType: input.documentType === "k1-1041" ? "1041" : "1065",
            ...extractedData,
            rawData: extractedData,
          });
        }

        return {
          success: true,
          extractedData,
          message: "Document processed successfully",
        };
      } catch (error) {
        // Update document status to failed
        await db.updateTaxDocument(input.taxDocumentId, {
          status: "failed",
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Document processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get all tax documents for current user
   */
  getUserTaxDocuments: protectedProcedure
    .input(
      z.object({
        taxYear: z.number().optional(),
        documentType: z.string().optional(),
        status: z.enum(["uploaded", "processing", "extracted", "verified", "failed"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await db.getUserTaxDocuments(ctx.user.id, input);
    }),

  /**
   * Get W-2 data for a specific document
   */
  getW2Data: protectedProcedure
    .input(z.object({ taxDocumentId: z.number() }))
    .query(async ({ input }) => {
      return await db.getW2DataByDocumentId(input.taxDocumentId);
    }),

  /**
   * Get 1099 data for a specific document
   */
  get1099Data: protectedProcedure
    .input(z.object({ taxDocumentId: z.number() }))
    .query(async ({ input }) => {
      return await db.get1099DataByDocumentId(input.taxDocumentId);
    }),

  /**
   * Get K-1 data for a specific document
   */
  getK1Data: protectedProcedure
    .input(z.object({ taxDocumentId: z.number() }))
    .query(async ({ input }) => {
      return await db.getK1DataByDocumentId(input.taxDocumentId);
    }),

  /**
   * Verify document data manually
   */
  verifyDocument: protectedProcedure
    .input(
      z.object({
        taxDocumentId: z.number(),
        verificationStatus: z.enum(["verified", "flagged", "rejected"]),
        notes: z.string().optional(),
        changesRequested: z
          .array(
            z.object({
              field: z.string(),
              oldValue: z.string(),
              newValue: z.string(),
              reason: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Update document verification status (only if verified or flagged, not rejected)
      if (input.verificationStatus === "verified" || input.verificationStatus === "flagged") {
        await db.updateTaxDocument(input.taxDocumentId, {
          verificationStatus: input.verificationStatus,
          verificationNotes: input.notes,
        });
      }

      // Create verification audit record
      await db.createDocumentVerification({
        taxDocumentId: input.taxDocumentId,
        verifiedBy: ctx.user.id,
        verificationStatus: input.verificationStatus,
        notes: input.notes,
        changesRequested: input.changesRequested,
      });

      return {
        success: true,
        message: "Document verification recorded",
      };
    }),

  /**
   * Upload and process tax document with automatic OCR extraction
   */
  uploadAndProcessDocument: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
        documentType: z.string(), // w2, 1099-int, etc.
        taxYear: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Decode base64 to buffer
      const buffer = Buffer.from(input.base64Data, "base64");
      const fileSize = buffer.length;

      // Generate unique file key
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `${ctx.user.id}-tax-docs/${Date.now()}-${randomSuffix}-${safeFileName}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // Create tax document record
      const taxYear = input.taxYear || new Date().getFullYear() - 1;
      const taxDoc = await db.createTaxDocument({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileUrl: url,
        fileKey,
        mimeType: input.mimeType,
        documentType: input.documentType,
        taxYear,
        status: "processing",
      });

      if (!taxDoc) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create tax document record",
        });
      }

      // Extract text from PDF or image
      let ocrText = "";
      try {
        if (isPDF(input.mimeType)) {
          ocrText = await extractTextFromPDFUrl(url);
          ocrText = cleanExtractedText(ocrText);
        } else if (isImage(input.mimeType)) {
          ocrText = await extractTextFromImageUrl(url);
          ocrText = cleanExtractedText(ocrText);
        } else {
          throw new Error(`Unsupported file type: ${input.mimeType}`);
        }
      } catch (error) {
        console.error("[OCR] Extraction failed:", error);
        await db.updateTaxDocument(taxDoc.id, {
          status: "failed",
          verificationNotes: `OCR extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract text from document",
        });
      }

      // Update with OCR text
      await db.updateTaxDocument(taxDoc.id, {
        ocrText,
      });

      // Extract structured data using LLM
      try {
        const extractedData = await extractTaxDocumentData(
          input.documentType,
          ocrText,
          taxYear
        );

        // Update tax document with extracted data
        await db.updateTaxDocument(taxDoc.id, {
          status: "extracted",
          extractedData,
          processedAt: new Date(),
        });

        // Store type-specific data in dedicated tables
        if (input.documentType === "w2") {
          await db.createW2Data({
            taxDocumentId: taxDoc.id,
            userId: ctx.user.id,
            taxYear,
            ...extractedData,
            rawData: extractedData,
          });
        } else if (input.documentType.startsWith("1099")) {
          await db.create1099Data({
            taxDocumentId: taxDoc.id,
            userId: ctx.user.id,
            taxYear,
            formType: input.documentType.toUpperCase(),
            ...extractedData,
            rawData: extractedData,
          });
        } else if (input.documentType === "k1" || input.documentType === "k1-1041") {
          await db.createK1Data({
            taxDocumentId: taxDoc.id,
            userId: ctx.user.id,
            taxYear,
            formType: input.documentType === "k1-1041" ? "1041" : "1065",
            ...extractedData,
            rawData: extractedData,
          });
        }

        return {
          success: true,
          taxDocumentId: taxDoc.id,
          extractedData,
          ocrText,
          message: "Document uploaded and processed successfully",
        };
      } catch (error) {
        console.error("[LLM] Extraction failed:", error);
        await db.updateTaxDocument(taxDoc.id, {
          status: "failed",
          verificationNotes: `LLM extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract structured data from document",
        });
      }
    }),

  /**
   * Get missing documents analysis
   */
  getMissingDocuments: protectedProcedure
    .input(
      z.object({
        taxYear: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const documents = await db.getUserTaxDocuments(ctx.user.id, {
        taxYear: input.taxYear,
      });

      // Analyze which common documents are missing
      const documentTypes = documents.map((d) => d.documentType);
      const commonTypes = [
        "w2",
        "1099-int",
        "1099-div",
        "1099-b",
        "1099-r",
        "k1",
        "k1-1041",
        "trust_instrument",
      ];

      const missing = commonTypes.filter((type) => !documentTypes.includes(type));

      return {
        uploaded: documents,
        missing,
        completionRate: ((documents.length / commonTypes.length) * 100).toFixed(1),
      };
    }),
});

/**
 * Extract structured data from OCR text using LLM
 */
async function extractTaxDocumentData(
  documentType: string,
  ocrText: string,
  taxYear?: number
): Promise<Record<string, any>> {
  const prompt = buildExtractionPrompt(documentType, ocrText, taxYear);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a conservative tax document extraction specialist. Extract ONLY the data that is clearly visible in the OCR text. Do not infer or estimate values. If a field is not clearly readable, mark it as null. Return valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tax_document_extraction",
        strict: true,
        schema: getExtractionSchema(documentType),
      },
    },
  });

  const content = response.choices[0].message.content;
  const extractedData = typeof content === "string" ? JSON.parse(content) : content;

  // Convert dollar amounts to cents
  return convertDollarsToCents(extractedData);
}

/**
 * Build extraction prompt based on document type
 */
function buildExtractionPrompt(documentType: string, ocrText: string, taxYear?: number): string {
  const yearContext = taxYear ? `Tax Year: ${taxYear}` : "";

  const prompts: Record<string, string> = {
    w2: `Extract W-2 (Wage and Tax Statement) data from the following OCR text.

${yearContext}

**OCR Text:**
${ocrText}

**Instructions:**
- Extract employer name, EIN, and address
- Extract employee name, SSN, and address
- Extract all box values (1-20)
- Wages (Box 1), Federal tax withheld (Box 2), Social Security wages (Box 3), etc.
- State and local tax information
- Mark any unclear or unreadable fields as null
- Return dollar amounts as numbers (e.g., 50000.00 not "$50,000.00")`,

    "1099-int": `Extract 1099-INT (Interest Income) data from the following OCR text.

${yearContext}

**OCR Text:**
${ocrText}

**Instructions:**
- Extract payer name, EIN, and address
- Extract recipient name, SSN, and address
- Box 1: Interest income
- Box 2: Early withdrawal penalty
- Box 3: Interest on U.S. Savings Bonds
- Box 4: Federal income tax withheld
- Mark any unclear fields as null
- Return dollar amounts as numbers`,

    "1099-div": `Extract 1099-DIV (Dividends and Distributions) data from the following OCR text.

${yearContext}

**OCR Text:**
${ocrText}

**Instructions:**
- Extract payer name, EIN, and address
- Extract recipient name, SSN, and address
- Box 1a: Total ordinary dividends
- Box 1b: Qualified dividends
- Box 2a: Total capital gain distributions
- Box 3: Nondividend distributions
- Box 4: Federal income tax withheld
- Mark any unclear fields as null
- Return dollar amounts as numbers`,

    k1: `Extract Schedule K-1 (Partner's Share of Income) data from the following OCR text.

${yearContext}

**OCR Text:**
${ocrText}

**Instructions:**
- Identify if this is Form 1065 (Partnership) or Form 1041 (Trust/Estate)
- Extract entity name, EIN, and address
- Extract partner/beneficiary name, SSN, and address
- Line 1: Ordinary business income (loss)
- Line 2: Net rental real estate income (loss)
- Line 3: Other net rental income (loss)
- Line 4a: Guaranteed payments
- Line 5: Interest income
- Line 6a: Ordinary dividends
- Line 6b: Qualified dividends
- Line 7: Royalties
- Line 8: Net short-term capital gain (loss)
- Line 9a: Net long-term capital gain (loss)
- Line 10: Net section 1231 gain (loss)
- Extract all other relevant lines
- Mark any unclear fields as null
- Return dollar amounts as numbers`,
  };

  return (
    prompts[documentType] ||
    `Extract all relevant tax information from the following ${documentType} document:\n\n${ocrText}`
  );
}

/**
 * Get JSON schema for extraction based on document type
 */
function getExtractionSchema(documentType: string): any {
  const schemas: Record<string, any> = {
    w2: {
      type: "object",
      properties: {
        employerName: { type: ["string", "null"] },
        employerEIN: { type: ["string", "null"] },
        employeeName: { type: ["string", "null"] },
        employeeSSN: { type: ["string", "null"] },
        wages: { type: ["number", "null"] },
        federalTaxWithheld: { type: ["number", "null"] },
        socialSecurityWages: { type: ["number", "null"] },
        socialSecurityTaxWithheld: { type: ["number", "null"] },
        medicareWages: { type: ["number", "null"] },
        medicareTaxWithheld: { type: ["number", "null"] },
        socialSecurityTips: { type: ["number", "null"] },
        allocatedTips: { type: ["number", "null"] },
        stateWages: { type: ["number", "null"] },
        stateTaxWithheld: { type: ["number", "null"] },
        state: { type: ["string", "null"] },
      },
      required: [],
      additionalProperties: false,
    },
    "1099-int": {
      type: "object",
      properties: {
        payerName: { type: ["string", "null"] },
        payerEIN: { type: ["string", "null"] },
        recipientName: { type: ["string", "null"] },
        recipientSSN: { type: ["string", "null"] },
        interestIncome: { type: ["number", "null"] },
        earlyWithdrawalPenalty: { type: ["number", "null"] },
        interestOnUSSavingsBonds: { type: ["number", "null"] },
        federalTaxWithheld: { type: ["number", "null"] },
      },
      required: [],
      additionalProperties: false,
    },
    "1099-div": {
      type: "object",
      properties: {
        payerName: { type: ["string", "null"] },
        payerEIN: { type: ["string", "null"] },
        recipientName: { type: ["string", "null"] },
        recipientSSN: { type: ["string", "null"] },
        ordinaryDividends: { type: ["number", "null"] },
        qualifiedDividends: { type: ["number", "null"] },
        capitalGainDistributions: { type: ["number", "null"] },
        federalTaxWithheld: { type: ["number", "null"] },
      },
      required: [],
      additionalProperties: false,
    },
    k1: {
      type: "object",
      properties: {
        formType: { type: ["string", "null"] },
        entityName: { type: ["string", "null"] },
        entityEIN: { type: ["string", "null"] },
        partnerName: { type: ["string", "null"] },
        partnerSSN: { type: ["string", "null"] },
        ordinaryBusinessIncome: { type: ["number", "null"] },
        netRentalRealEstateIncome: { type: ["number", "null"] },
        otherNetRentalIncome: { type: ["number", "null"] },
        guaranteedPayments: { type: ["number", "null"] },
        interestIncome: { type: ["number", "null"] },
        ordinaryDividends: { type: ["number", "null"] },
        qualifiedDividends: { type: ["number", "null"] },
        royalties: { type: ["number", "null"] },
        netShortTermCapitalGain: { type: ["number", "null"] },
        netLongTermCapitalGain: { type: ["number", "null"] },
        collectiblesGain: { type: ["number", "null"] },
        section1231Gain: { type: ["number", "null"] },
        otherIncome: { type: ["number", "null"] },
        section179Deduction: { type: ["number", "null"] },
        otherDeductions: { type: ["number", "null"] },
        selfEmploymentEarnings: { type: ["number", "null"] },
      },
      required: [],
      additionalProperties: false,
    },
  };

  return (
    schemas[documentType] || {
      type: "object",
      properties: {},
      additionalProperties: true,
    }
  );
}

/**
 * Convert dollar amounts to cents for database storage
 */
function convertDollarsToCents(data: Record<string, any>): Record<string, any> {
  const converted: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "number" && !key.includes("Year") && !key.includes("SSN") && !key.includes("EIN")) {
      // Convert dollars to cents
      converted[key] = Math.round(value * 100);
    } else {
      converted[key] = value;
    }
  }

  return converted;
}
