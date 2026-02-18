/**
 * Beneficiary Operations Module
 * 
 * Provides beneficiary management, distribution tracking, and reporting
 */

import { getDb } from '../db';
import { beneficiaries, distributions, trusts } from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createReceipt } from './receiptLedger';

export interface BeneficiaryData {
  trustId: number;
  name: string;
  relationship: string;
  contactEmail?: string;
  contactPhone?: string;
  taxId?: string;
  distributionPercentage: number;
  isActive: boolean;
}

export interface DistributionData {
  beneficiaryId: number;
  trustId: number;
  amount: number;
  distributionDate: Date;
  distributionType: 'income' | 'principal' | 'required_minimum' | 'discretionary';
  taxYear: number;
  description?: string;
  performedBy: number;
}

/**
 * Create new beneficiary
 * @param {BeneficiaryData} data - Beneficiary data
 * @returns {Promise<number>} Beneficiary ID
 */
export async function createBeneficiary(data: BeneficiaryData): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [result] = await db.insert(beneficiaries).values({
    trustId: data.trustId,
    name: data.name,
    relationship: data.relationship || undefined,
    beneficiaryType: 'primary',
    distributionShare: `${data.distributionPercentage}%`,
    contactInfo: {
      email: data.contactEmail,
      phone: data.contactPhone,
      taxId: data.taxId,
    },
    status: data.isActive ? 'active' : 'removed',
  }).$returningId();
  
  const beneficiaryId = result.id;
  
  // Create audit receipt
  await createReceipt({
    action: 'beneficiary_created',
    actor: 'system',
    details: {
      beneficiary_id: beneficiaryId,
      trust_id: data.trustId,
      name: data.name,
      relationship: data.relationship,
    },
    outcome: 'success',
    severity: 'medium',
  });
  
  return beneficiaryId;
}

/**
 * Update beneficiary information
 * @param {number} beneficiaryId - Beneficiary ID
 * @param {Partial<BeneficiaryData>} updates - Updates to apply
 * @returns {Promise<void>}
 */
export async function updateBeneficiary(
  beneficiaryId: number,
  updates: Partial<BeneficiaryData>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const updateData: any = {};
  
  if (updates.name) updateData.name = updates.name;
  if (updates.relationship) updateData.relationship = updates.relationship;
  if (updates.distributionPercentage !== undefined) {
    updateData.distributionShare = `${updates.distributionPercentage}%`;
  }
  if (updates.isActive !== undefined) {
    updateData.status = updates.isActive ? 'active' : 'removed';
  }
  if (updates.taxId !== undefined) updateData.taxId = updates.taxId;
  
  if (updates.contactEmail || updates.contactPhone) {
    // Fetch current contact info
    const current = await db
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.id, beneficiaryId))
      .limit(1);
    
    const currentContactInfo = (current[0]?.contactInfo as any) || {};
    
    updateData.contactInfo = {
      email: updates.contactEmail || currentContactInfo.email,
      phone: updates.contactPhone || currentContactInfo.phone,
    };
  }
  
  await db
    .update(beneficiaries)
    .set(updateData)
    .where(eq(beneficiaries.id, beneficiaryId));
  
  // Create audit receipt
  await createReceipt({
    action: 'beneficiary_updated',
    actor: 'system',
    details: {
      beneficiary_id: beneficiaryId,
      updates: Object.keys(updates),
    },
    outcome: 'success',
    severity: 'medium',
  });
}

/**
 * Get beneficiaries for a trust
 * @param {number} trustId - Trust ID
 * @returns {Promise<Array>} Beneficiaries
 */
export async function getTrustBeneficiaries(trustId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.trustId, trustId))
    .orderBy(desc(beneficiaries.createdAt));
}

/**
 * Record distribution to beneficiary
 * @param {DistributionData} data - Distribution data
 * @returns {Promise<number>} Distribution ID
 */
export async function recordDistribution(data: DistributionData): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
    const [result] = await db.insert(distributions).values({
    beneficiaryId: data.beneficiaryId,
    trustId: data.trustId,
    amount: data.amount,
    distributionDate: data.distributionDate,
    distributionType: data.distributionType,
    taxYear: data.taxYear,
    description: data.description || undefined,
    performedBy: data.performedBy,
  }).$returningId();  
  const distributionId = result.id;
  
  // Create audit receipt
  await createReceipt({
    action: 'distribution_recorded',
    actor: `user:${data.performedBy}`,
    details: {
      distribution_id: distributionId,
      beneficiary_id: data.beneficiaryId,
      trust_id: data.trustId,
      amount: data.amount,
      distribution_type: data.distributionType,
      tax_year: data.taxYear,
    },
    outcome: 'success',
    severity: 'high',
    requiresReview: data.amount > 10000, // Flag large distributions for review
  });
  
  return distributionId;
}

/**
 * Get distribution history for beneficiary
 * @param {number} beneficiaryId - Beneficiary ID
 * @param {number} taxYear - Tax year (optional)
 * @returns {Promise<Array>} Distributions
 */
export async function getBeneficiaryDistributions(
  beneficiaryId: number,
  taxYear?: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = taxYear
    ? and(
        eq(distributions.beneficiaryId, beneficiaryId),
        eq(distributions.taxYear, taxYear)
      )
    : eq(distributions.beneficiaryId, beneficiaryId);
  
  const query = db
    .select()
    .from(distributions)
    .where(conditions);
  
  return await query.orderBy(desc(distributions.distributionDate));
}

/**
 * Get distribution summary for tax year
 * @param {number} beneficiaryId - Beneficiary ID
 * @param {number} taxYear - Tax year
 * @returns {Promise<Object>} Distribution summary
 */
export async function getDistributionSummary(
  beneficiaryId: number,
  taxYear: number
): Promise<{
  totalDistributions: number;
  byType: Record<string, number>;
  count: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalDistributions: 0,
      byType: {},
      count: 0,
    };
  }
  
  const distributions = await getBeneficiaryDistributions(beneficiaryId, taxYear);
  
  const summary = {
    totalDistributions: 0,
    byType: {} as Record<string, number>,
    count: distributions.length,
  };
  
  distributions.forEach(dist => {
    summary.totalDistributions += dist.amount;
    summary.byType[dist.distributionType] = (summary.byType[dist.distributionType] || 0) + dist.amount;
  });
  
  return summary;
}

/**
 * Calculate distribution allocation
 * @param {number} trustId - Trust ID
 * @param {number} totalAmount - Total amount to distribute
 * @returns {Promise<Array>} Distribution allocations
 */
export async function calculateDistributionAllocation(
  trustId: number,
  totalAmount: number
): Promise<Array<{
  beneficiaryId: number;
  beneficiaryName: string;
  percentage: number;
  amount: number;
}>> {
  const beneficiariesList = await getTrustBeneficiaries(trustId);
  const activeBeneficiaries = beneficiariesList.filter(b => b.isActive);
  
  // Calculate total percentage
  const totalPercentage = activeBeneficiaries.reduce(
    (sum, b) => sum + b.distributionPercentage,
    0
  );
  
  // Allocate amounts
  return activeBeneficiaries.map(b => ({
    beneficiaryId: b.id,
    beneficiaryName: b.name,
    percentage: b.distributionPercentage,
    amount: Math.round((b.distributionPercentage / totalPercentage) * totalAmount),
  }));
}

/**
 * Generate K-1 data preparation
 * @param {number} beneficiaryId - Beneficiary ID
 * @param {number} taxYear - Tax year
 * @returns {Promise<Object>} K-1 preparation data
 */
export async function prepareK1Data(
  beneficiaryId: number,
  taxYear: number
): Promise<{
  beneficiary: any;
  trust: any;
  distributions: any[];
  summary: any;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get beneficiary
  const beneficiaryData = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.id, beneficiaryId))
    .limit(1);
  
  if (beneficiaryData.length === 0) {
    throw new Error('Beneficiary not found');
  }
  
  const beneficiary = beneficiaryData[0];
  
  // Get trust
  const trustData = await db
    .select()
    .from(trusts)
    .where(eq(trusts.id, beneficiary.trustId))
    .limit(1);
  
  const trust = trustData[0] || null;
  
  // Get distributions
  const distributionsList = await getBeneficiaryDistributions(beneficiaryId, taxYear);
  
  // Get summary
  const summary = await getDistributionSummary(beneficiaryId, taxYear);
  
  // Create audit receipt
  await createReceipt({
    action: 'k1_data_prepared',
    actor: 'system',
    details: {
      beneficiary_id: beneficiaryId,
      tax_year: taxYear,
      total_distributions: summary.totalDistributions,
      distribution_count: summary.count,
    },
    outcome: 'success',
    severity: 'medium',
  });
  
  return {
    beneficiary,
    trust,
    distributions: distributionsList,
    summary,
  };
}

/**
 * Get beneficiary report
 * @param {number} beneficiaryId - Beneficiary ID
 * @param {number} startYear - Start tax year
 * @param {number} endYear - End tax year
 * @returns {Promise<Object>} Beneficiary report
 */
export async function getBeneficiaryReport(
  beneficiaryId: number,
  startYear: number,
  endYear: number
): Promise<{
  beneficiary: any;
  yearlyDistributions: Array<{
    year: number;
    total: number;
    count: number;
    byType: Record<string, number>;
  }>;
  totalAllYears: number;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get beneficiary
  const beneficiaryData = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.id, beneficiaryId))
    .limit(1);
  
  if (beneficiaryData.length === 0) {
    throw new Error('Beneficiary not found');
  }
  
  const beneficiary = beneficiaryData[0];
  
  // Get yearly summaries
  const yearlyDistributions = [];
  let totalAllYears = 0;
  
  for (let year = startYear; year <= endYear; year++) {
    const summary = await getDistributionSummary(beneficiaryId, year);
    yearlyDistributions.push({
      year,
      total: summary.totalDistributions,
      count: summary.count,
      byType: summary.byType,
    });
    totalAllYears += summary.totalDistributions;
  }
  
  return {
    beneficiary,
    yearlyDistributions,
    totalAllYears,
  };
}
