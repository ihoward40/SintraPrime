import { getDb } from "../db";
import { autonomousTasks } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import type { InsertAutonomousTask } from "../../drizzle/schema";

// ============================================================================
// AUTONOMOUS TASK CRUD OPERATIONS
// ============================================================================

/**
 * Create a new autonomous task
 */
export async function createAutonomousTask(data: {
  userId: string;
  title: string;
  description?: string;
  objective?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "running" | "completed" | "failed";
  tags?: string[];
  createdAt: Date;
}): Promise<{ id: number } & typeof data> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Prepare tags as JSON if provided
  const tagsJson = data.tags ? JSON.stringify(data.tags) : null;

  const result = await db.insert(autonomousTasks).values({
    ...data,
    tags: tagsJson,
  } as any);

  // Get the created task by ID
  const insertedId = (result as any)[0];
  if (!insertedId) throw new Error("Failed to create autonomous task");

  const [createdTask] = await db
    .select()
    .from(autonomousTasks)
    .where(eq(autonomousTasks.id, insertedId));

  return createdTask as any;
}

/**
 * Get all autonomous tasks for a user
 */
export async function getAutonomousTasksByUserId(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const tasks = await db
    .select()
    .from(autonomousTasks)
    .where(eq(autonomousTasks.userId, userId))
    .orderBy(desc(autonomousTasks.createdAt));

  return tasks.map((task) => ({
    ...task,
    tags: task.tags ? JSON.parse(task.tags as any) : [],
  }));
}

/**
 * Get a specific autonomous task by ID
 */
export async function getAutonomousTaskById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [task] = await db
    .select()
    .from(autonomousTasks)
    .where(eq(autonomousTasks.id, id));

  if (!task) return null;

  return {
    ...task,
    tags: task.tags ? JSON.parse(task.tags as any) : [],
  };
}

/**
 * Update an autonomous task
 */
export async function updateAutonomousTask(
  id: number,
  updates: Partial<{
    title: string;
    description: string;
    objective: string;
    priority: "low" | "medium" | "high" | "critical";
    status: "pending" | "running" | "completed" | "failed";
    tags: string[];
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Prepare tags as JSON if provided
  const updateData: any = { ...updates };
  if (updates.tags) {
    updateData.tags = JSON.stringify(updates.tags);
  }

  await db
    .update(autonomousTasks)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(autonomousTasks.id, id));

  return getAutonomousTaskById(id);
}

/**
 * Delete an autonomous task
 */
export async function deleteAutonomousTask(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(autonomousTasks)
    .where(eq(autonomousTasks.id, id));

  return true;
}
