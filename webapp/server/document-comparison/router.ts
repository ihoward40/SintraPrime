import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

export const documentComparisonRouter = router({
  // Compare multiple documents
  compareDocuments: protectedProcedure
    .input(
      z.object({
        documents: z.array(
          z.object({
            fileName: z.string(),
            fileType: z.string(),
            extractedText: z.string(),
          })
        ),
        comparisonType: z.enum(["contracts", "evidence", "general"]),
        focusAreas: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (input.documents.length < 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "At least 2 documents are required for comparison",
          });
        }

        // Build comparison prompt based on type
        let systemPrompt = `You are a legal document comparison expert. Analyze the following documents and provide a detailed comparison.`;

        if (input.comparisonType === "contracts") {
          systemPrompt += `\n\nFocus on:
- Key terms and conditions
- Payment and pricing differences
- Termination clauses
- Liability and indemnification
- Intellectual property rights
- Non-compete and confidentiality provisions
- Material differences that could impact legal rights`;
        } else if (input.comparisonType === "evidence") {
          systemPrompt += `\n\nFocus on:
- Factual consistencies and inconsistencies
- Timeline discrepancies
- Contradictory statements
- Corroborating evidence
- Credibility indicators
- Potential admissibility issues`;
        }

        if (input.focusAreas && input.focusAreas.length > 0) {
          systemPrompt += `\n\nAdditionally, pay special attention to: ${input.focusAreas.join(", ")}`;
        }

        // Build document content
        let documentContent = "\n\n";
        input.documents.forEach((doc, index) => {
          documentContent += `\n\n=== DOCUMENT ${index + 1}: ${doc.fileName} ===\n${doc.extractedText}\n`;
        });

        systemPrompt += documentContent;

        systemPrompt += `\n\nProvide your analysis in the following format:

## Summary
Brief overview of the documents being compared

## Key Similarities
List major points where documents align

## Key Differences
List significant differences with specific references

## Detailed Analysis
Section-by-section comparison with quotes and page references

## Risk Assessment
Identify potential legal risks or concerns

## Recommendations
Actionable recommendations based on the comparison`;

        // Call LLM
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Please compare these ${input.documents.length} documents and provide a comprehensive analysis.` },
          ],
        });

        const analysisContent = response.choices[0]?.message?.content;
        const analysis = typeof analysisContent === "string" 
          ? analysisContent 
          : "Sorry, I couldn't generate a comparison analysis.";

        return {
          success: true,
          analysis,
          documentCount: input.documents.length,
        };
      } catch (error) {
        console.error("Document comparison error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to compare documents: ${error}`,
        });
      }
    }),

  // Extract differences between two specific documents
  extractDifferences: protectedProcedure
    .input(
      z.object({
        document1: z.object({
          fileName: z.string(),
          extractedText: z.string(),
        }),
        document2: z.object({
          fileName: z.string(),
          extractedText: z.string(),
        }),
        granularity: z.enum(["high-level", "detailed", "clause-by-clause"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const systemPrompt = `You are a legal document comparison specialist. Compare these two documents and extract differences at a ${input.granularity} level.

Document 1: ${input.document1.fileName}
${input.document1.extractedText}

Document 2: ${input.document2.fileName}
${input.document2.extractedText}

Provide a structured comparison showing:
1. Added content (in Document 2 but not in Document 1)
2. Removed content (in Document 1 but not in Document 2)
3. Modified content (changed between documents)
4. Unchanged content (same in both documents)

Format each difference with:
- Location/section reference
- Original text (if applicable)
- New text (if applicable)
- Significance level (critical/moderate/minor)`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Please extract and categorize all differences." },
          ],
        });

        const differencesContent = response.choices[0]?.message?.content;
        const differences = typeof differencesContent === "string" 
          ? differencesContent 
          : "Sorry, I couldn't extract differences.";

        return {
          success: true,
          differences,
        };
      } catch (error) {
        console.error("Difference extraction error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to extract differences: ${error}`,
        });
      }
    }),
});
