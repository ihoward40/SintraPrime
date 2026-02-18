import { getDb } from "../db";
import { trusts, trustees, beneficiaries, trustAssets, trustDistributions, fiduciaryDuties } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InsertTrust, InsertTrustee, InsertBeneficiary, InsertTrustAsset } from "../../drizzle/schema";

// ============================================================================
// TRUST CRUD OPERATIONS
// ============================================================================

export async function createTrust(data: InsertTrust) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trusts).values(data);
  return result;
}

export async function getTrustById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [trust] = await db.select().from(trusts).where(eq(trusts.id, id));
  return trust;
}

export async function getTrustsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trusts).where(eq(trusts.userId, userId)).orderBy(desc(trusts.createdAt));
}

export async function getTrustsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trusts).where(eq(trusts.caseId, caseId)).orderBy(desc(trusts.createdAt));
}

export async function updateTrust(id: number, data: Partial<InsertTrust>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trusts).set(data).where(eq(trusts.id, id));
  return getTrustById(id);
}

export async function deleteTrust(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(trusts).where(eq(trusts.id, id));
}

// ============================================================================
// TRUSTEE OPERATIONS
// ============================================================================

export async function addTrustee(data: InsertTrustee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trustees).values(data);
  return result;
}

export async function getTrusteesByTrustId(trustId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trustees).where(eq(trustees.trustId, trustId));
}

export async function updateTrustee(id: number, data: Partial<InsertTrustee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trustees).set(data).where(eq(trustees.id, id));
}

export async function removeTrustee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trustees).set({ status: "removed", removedDate: new Date() }).where(eq(trustees.id, id));
}

// ============================================================================
// BENEFICIARY OPERATIONS
// ============================================================================

export async function addBeneficiary(data: InsertBeneficiary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(beneficiaries).values(data);
  return result;
}

export async function getBeneficiariesByTrustId(trustId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(beneficiaries).where(eq(beneficiaries.trustId, trustId));
}

export async function updateBeneficiary(id: number, data: Partial<InsertBeneficiary>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(beneficiaries).set(data).where(eq(beneficiaries.id, id));
}

export async function removeBeneficiary(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(beneficiaries).set({ status: "removed" }).where(eq(beneficiaries.id, id));
}

// ============================================================================
// TRUST ASSET OPERATIONS
// ============================================================================

export async function addTrustAsset(data: InsertTrustAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trustAssets).values(data);
  return result;
}

export async function getTrustAssetsByTrustId(trustId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trustAssets).where(eq(trustAssets.trustId, trustId)).orderBy(desc(trustAssets.createdAt));
}

export async function updateTrustAsset(id: number, data: Partial<InsertTrustAsset>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trustAssets).set(data).where(eq(trustAssets.id, id));
}

export async function deleteTrustAsset(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(trustAssets).where(eq(trustAssets.id, id));
}

// ============================================================================
// TRUST DISTRIBUTION OPERATIONS
// ============================================================================

export async function createDistribution(data: {
  trustId: number;
  beneficiaryId: number;
  amount: number;
  distributionType: "income" | "principal" | "discretionary";
  purpose?: string;
  distributionDate: Date;
  method?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trustDistributions).values(data);
  return result;
}

export async function getDistributionsByTrustId(trustId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trustDistributions).where(eq(trustDistributions.trustId, trustId)).orderBy(desc(trustDistributions.distributionDate));
}

export async function getDistributionsByBeneficiaryId(beneficiaryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trustDistributions).where(eq(trustDistributions.beneficiaryId, beneficiaryId)).orderBy(desc(trustDistributions.distributionDate));
}

// ============================================================================
// FIDUCIARY DUTY OPERATIONS
// ============================================================================

export async function createFiduciaryDuty(data: {
  trustId: number;
  dutyType: string;
  description: string;
  dueDate?: Date;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(fiduciaryDuties).values(data);
  return result;
}

export async function getFiduciaryDutiesByTrustId(trustId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fiduciaryDuties).where(eq(fiduciaryDuties.trustId, trustId)).orderBy(desc(fiduciaryDuties.dueDate));
}

export async function completeFiduciaryDuty(id: number, evidence?: Array<{ title: string; fileUrl: string; uploadedAt: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fiduciaryDuties).set({
    status: "completed",
    completedDate: new Date(),
    evidence
  }).where(eq(fiduciaryDuties.id, id));
}

// ============================================================================
// COMPREHENSIVE TRUST DATA
// ============================================================================

export async function getTrustWithDetails(trustId: number) {
  const trust = await getTrustById(trustId);
  if (!trust) return null;

  const [trusteesList, beneficiariesList, assetsList, distributionsList, dutiesList] = await Promise.all([
    getTrusteesByTrustId(trustId),
    getBeneficiariesByTrustId(trustId),
    getTrustAssetsByTrustId(trustId),
    getDistributionsByTrustId(trustId),
    getFiduciaryDutiesByTrustId(trustId)
  ]);

  return {
    ...trust,
    trustees: trusteesList,
    beneficiaries: beneficiariesList,
    assets: assetsList,
    distributions: distributionsList,
    fiduciaryDuties: dutiesList
  };
}
