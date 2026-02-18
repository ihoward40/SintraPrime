import { getDb } from "../db";
import { 
  contracts, 
  contractTemplates, 
  contractClauses,
  contractNegotiations,
  contractObligations
} from "../../drizzle/schema";
import { eq, or, desc } from "drizzle-orm";

// ============================================================================
// CONTRACT TEMPLATES
// ============================================================================

export async function getContractTemplates(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const templates = await db
    .select()
    .from(contractTemplates)
    .where(
      userId 
        ? or(
            eq(contractTemplates.isPublic, true),
            eq(contractTemplates.userId, userId)
          )
        : eq(contractTemplates.isPublic, true)
    )
    .orderBy(desc(contractTemplates.usageCount));
    
  return templates;
}

export async function getContractTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [template] = await db
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.id, id))
    .limit(1);
    
  return template || null;
}

export async function createContractFromTemplate(data: {
  templateId: number;
  userId: number;
  caseId?: number;
  title: string;
  parties: string[];
  placeholderValues: Record<string, string>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const template = await getContractTemplateById(data.templateId);
  if (!template) throw new Error("Template not found");
  
  // Replace placeholders
  let content = template.content;
  for (const [key, value] of Object.entries(data.placeholderValues)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  await db
    .insert(contracts)
    .values({
      userId: data.userId,
      caseId: data.caseId || null,
      title: data.title,
      contractType: template.contractType,
      status: "draft",
      parties: data.parties,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
  // Get the last inserted contract for this user
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.userId, data.userId))
    .orderBy(desc(contracts.id))
    .limit(1);
    
  // Increment template usage count
  await db
    .update(contractTemplates)
    .set({ usageCount: (template.usageCount || 0) + 1 })
    .where(eq(contractTemplates.id, data.templateId));
    
  return contract;
}

// ============================================================================
// CONTRACTS
// ============================================================================

export async function getContractsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const userContracts = await db
    .select()
    .from(contracts)
    .where(eq(contracts.userId, userId))
    .orderBy(desc(contracts.createdAt));
    
  return userContracts;
}

export async function getContractById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
    
  return contract || null;
}

export async function updateContract(id: number, data: Partial<typeof contracts.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(contracts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contracts.id, id));
    
  const updated = await getContractById(id);
    
  return updated;
}

// ============================================================================
// CONTRACT CLAUSES
// ============================================================================

export async function getContractClauses(category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const clauses = await db
    .select()
    .from(contractClauses)
    .where(category ? eq(contractClauses.category, category) : undefined)
    .orderBy(desc(contractClauses.createdAt));
    
  return clauses;
}

export async function getContractClauseById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [clause] = await db
    .select()
    .from(contractClauses)
    .where(eq(contractClauses.id, id))
    .limit(1);
    
  return clause || null;
}

// ============================================================================
// CONTRACT NEGOTIATIONS
// ============================================================================

export async function getContractNegotiations(contractId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const negotiations = await db
    .select()
    .from(contractNegotiations)
    .where(eq(contractNegotiations.contractId, contractId))
    .orderBy(desc(contractNegotiations.createdAt));
    
  return negotiations;
}

export async function createContractNegotiation(data: typeof contractNegotiations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .insert(contractNegotiations)
    .values(data);
    
  // Get the last inserted negotiation for this contract
  const [negotiation] = await db
    .select()
    .from(contractNegotiations)
    .where(eq(contractNegotiations.contractId, data.contractId))
    .orderBy(desc(contractNegotiations.id))
    .limit(1);
    
  return negotiation;
}

// ============================================================================
// CONTRACT OBLIGATIONS
// ============================================================================

export async function getContractObligations(contractId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const obligations = await db
    .select()
    .from(contractObligations)
    .where(eq(contractObligations.contractId, contractId))
    .orderBy(desc(contractObligations.dueDate));
    
  return obligations;
}

export async function createContractObligation(data: typeof contractObligations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .insert(contractObligations)
    .values(data);
    
  // Get the last inserted obligation for this contract
  const [obligation] = await db
    .select()
    .from(contractObligations)
    .where(eq(contractObligations.contractId, data.contractId))
    .orderBy(desc(contractObligations.id))
    .limit(1);
    
  return obligation;
}

export async function updateContractObligation(id: number, data: Partial<typeof contractObligations.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(contractObligations)
    .set(data)
    .where(eq(contractObligations.id, id));
    
  const [updated] = await db
    .select()
    .from(contractObligations)
    .where(eq(contractObligations.id, id))
    .limit(1);
    
  return updated;
}
