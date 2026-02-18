import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

export const taxAnalysisRouter = router({
  /**
   * Analyze DNI calculation and provide IRC §643(a) interpretation
   */
  analyzeDNI: protectedProcedure
    .input(
      z.object({
        trustAccountingIncome: z.number(),
        capitalGains: z.number(),
        includeCapitalGains: z.boolean(),
        taxExemptIncome: z.number(),
        deductibleExpenses: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const prompt = `You are a conservative tax advisor analyzing a trust's Distributable Net Income (DNI) calculation under IRC §643(a).

**Trust Information:**
- Trust Accounting Income: $${input.trustAccountingIncome.toLocaleString()}
- Capital Gains: $${input.capitalGains.toLocaleString()}
- Include Capital Gains in DNI: ${input.includeCapitalGains ? "Yes" : "No"}
- Tax-Exempt Income: $${input.taxExemptIncome.toLocaleString()}
- Deductible Expenses: $${input.deductibleExpenses.toLocaleString()}

**Calculated DNI:**
${
  input.trustAccountingIncome +
  (input.includeCapitalGains ? input.capitalGains : 0) +
  input.taxExemptIncome -
  input.deductibleExpenses
}

**Your Task:**
1. Verify the DNI calculation is correct under IRC §643(a)
2. Explain the treatment of capital gains (why included or excluded)
3. Cite relevant IRS publications (Pub 559, IRC §643)
4. Identify any audit risks or aggressive positions
5. Provide conservative interpretation warnings
6. Suggest alternative treatments if applicable

**Response Format:**
- Calculation Verification: [Correct/Needs Adjustment]
- Capital Gains Treatment: [Explanation with IRC citation]
- Audit Risk Score: [Low/Medium/High]
- Conservative Warnings: [List any concerns]
- IRS Publications: [Cite Pub 559, IRC §643(a), etc.]
- Recommendations: [Any suggested changes]

Be conservative. Flag any aggressive positions. Cite IRS publications.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a conservative tax advisor specializing in trust & estate taxation. Always cite IRS publications and flag audit risks.",
          },
          { role: "user", content: prompt },
        ],
      });

      const analysis = response.choices[0].message.content;

      return {
        analysis,
        timestamp: new Date().toISOString(),
        inputHash: JSON.stringify(input),
      };
    }),

  /**
   * Analyze beneficiary allocation and provide recommendations
   */
  analyzeBeneficiaryAllocation: protectedProcedure
    .input(
      z.object({
        totalDNI: z.number(),
        beneficiaries: z.array(
          z.object({
            name: z.string(),
            percentage: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const allocations = input.beneficiaries.map((b) => ({
        name: b.name,
        percentage: b.percentage,
        amount: (input.totalDNI * b.percentage) / 100,
      }));

      const prompt = `You are a conservative tax advisor analyzing beneficiary allocations for a trust.

**Trust DNI:** $${input.totalDNI.toLocaleString()}

**Proposed Allocations:**
${allocations.map((a) => `- ${a.name}: ${a.percentage}% ($${a.amount.toLocaleString()})`).join("\n")}

**Your Task:**
1. Verify allocations comply with IRC §661 and §662
2. Check if allocations match trust instrument provisions
3. Identify any tax optimization opportunities
4. Flag potential audit risks
5. Provide conservative recommendations
6. Cite relevant IRS publications

**Response Format:**
- Compliance Status: [Compliant/Needs Review]
- Trust Instrument Alignment: [Verified/Requires Verification]
- Tax Optimization: [Opportunities if any]
- Audit Risk Score: [Low/Medium/High]
- IRS Publications: [Cite Pub 559, IRC §661, §662]
- Recommendations: [Any suggested changes]

Be conservative. Ensure allocations comply with trust terms and tax law.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a conservative tax advisor specializing in trust & estate taxation. Always cite IRS publications and flag audit risks.",
          },
          { role: "user", content: prompt },
        ],
      });

      const analysis = response.choices[0].message.content;

      return {
        analysis,
        allocations,
        timestamp: new Date().toISOString(),
        inputHash: JSON.stringify(input),
      };
    }),

  /**
   * Analyze trust tax position and provide audit risk assessment
   */
  analyzeTrustPosition: protectedProcedure
    .input(
      z.object({
        trustType: z.enum(["simple", "complex", "grantor"]),
        totalIncome: z.number(),
        distributions: z.number(),
        capitalGainsTreatment: z.string(),
        stateResidency: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const prompt = `You are a conservative tax advisor conducting a comprehensive trust tax position analysis.

**Trust Details:**
- Type: ${input.trustType.charAt(0).toUpperCase() + input.trustType.slice(1)} Trust
- Total Income: $${input.totalIncome.toLocaleString()}
- Distributions: $${input.distributions.toLocaleString()}
- Capital Gains Treatment: ${input.capitalGainsTreatment}
- State Residency: ${input.stateResidency}

**Your Task:**
1. Assess overall tax position and compliance
2. Identify audit risk factors
3. Flag aggressive positions
4. Provide conservative interpretation warnings
5. Cite relevant IRC sections and IRS publications
6. Recommend risk mitigation strategies

**Response Format:**
- Overall Compliance: [Compliant/Needs Review/High Risk]
- Audit Risk Score: [Low/Medium/High] with explanation
- Aggressive Positions: [List any concerns]
- IRC Citations: [Relevant sections]
- IRS Publications: [Pub 559, 590-A, etc.]
- Risk Mitigation: [Recommended actions]
- State Tax Considerations: [${input.stateResidency} specific issues]

Be conservative. Prioritize audit defense over tax savings.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a conservative tax advisor specializing in trust & estate taxation. Always prioritize audit defense over aggressive tax savings.",
          },
          { role: "user", content: prompt },
        ],
      });

      const analysis = response.choices[0].message.content;

      return {
        analysis,
        timestamp: new Date().toISOString(),
        inputHash: JSON.stringify(input),
      };
    }),
});
