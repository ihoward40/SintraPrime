import { getDb } from "../db";
import { nanobotRepairs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Update repair metadata
 */
export async function updateRepairMetadata(repairId: number, metadata: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  
  return await db
    .update(nanobotRepairs)
    .set({ metadata })
    .where(eq(nanobotRepairs.id, repairId));
}

/**
 * Update repair status
 */
export async function updateRepairStatus(repairId: number, status: string) {
  const db = await getDb();
  if (!db) return;
  
  return await db
    .update(nanobotRepairs)
    .set({ 
      success: status === "success",
      resultMessage: status 
    })
    .where(eq(nanobotRepairs.id, repairId));
}
