import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { 
  CreateCreditDisputeInput, 
  UpdateCreditDisputeInput, 
  ListCreditDisputesQuery 
} from '../models/creditDispute.schema';
import { AppError } from '../middleware/errorHandler';

import { getDb } from '../db/mysql';
import { ikeCreditDisputes } from '../db/schema';

export class CreditDisputeService {
  async list(query: ListCreditDisputesQuery) {
    const { page, limit, sortBy, sortOrder, status, beneficiary_id } = query;
    const offset = (page - 1) * limit;

    const database = getDb();

    const whereConditions = [];
    if (status) {
      whereConditions.push(eq(ikeCreditDisputes.status, status));
    }
    if (beneficiary_id) {
      whereConditions.push(eq(ikeCreditDisputes.beneficiary_id, beneficiary_id));
    }

    const whereClause = whereConditions.length ? and(...whereConditions) : undefined;

    const orderByColumn = (() => {
      switch (sortBy) {
        case 'status':
          return ikeCreditDisputes.status;
        case 'created_at':
        default:
          return ikeCreditDisputes.created_at;
      }
    })();

    const orderByExpr = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn);

    try {
      const [{ count }] = await database
        .select({ count: sql<number>`count(*)` })
        .from(ikeCreditDisputes)
        .where(whereClause);

      const data = await database
        .select()
        .from(ikeCreditDisputes)
        .where(whereClause)
        .orderBy(orderByExpr)
        .limit(limit)
        .offset(offset);

      const total = Number(count ?? 0);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      throw new AppError(500, `Failed to fetch credit disputes: ${error.message}`);
    }
  }

  async getById(id: string) {
    const database = getDb();

    try {
      const rows = await database.select().from(ikeCreditDisputes).where(eq(ikeCreditDisputes.id, id)).limit(1);
      const data = rows[0];
      if (!data) {
        throw new AppError(404, 'Credit dispute not found');
      }
      return data;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, `Failed to fetch credit dispute: ${error.message}`);
    }
  }

  async create(input: CreateCreditDisputeInput) {
    const database = getDb();
    const id = uuidv4();
    const values = Object.fromEntries(
      Object.entries({ ...input, id }).filter(([, v]) => v !== undefined),
    ) as any;

    try {
      await database.insert(ikeCreditDisputes).values(values);
      const rows = await database.select().from(ikeCreditDisputes).where(eq(ikeCreditDisputes.id, id)).limit(1);
      return rows[0];
    } catch (error: any) {
      throw new AppError(500, `Failed to create credit dispute: ${error.message}`);
    }
  }

  async update(id: string, input: UpdateCreditDisputeInput) {
    const database = getDb();
    const updateValues = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    ) as any;

    try {
      const existing = await database
        .select({ id: ikeCreditDisputes.id })
        .from(ikeCreditDisputes)
        .where(eq(ikeCreditDisputes.id, id))
        .limit(1);

      if (!existing[0]) {
        throw new AppError(404, 'Credit dispute not found');
      }

      if (Object.keys(updateValues).length > 0) {
        await database.update(ikeCreditDisputes).set(updateValues).where(eq(ikeCreditDisputes.id, id));
      }

      const rows = await database.select().from(ikeCreditDisputes).where(eq(ikeCreditDisputes.id, id)).limit(1);
      return rows[0];
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, `Failed to update credit dispute: ${error.message}`);
    }
  }

  async delete(id: string) {
    const database = getDb();

    try {
      await database.delete(ikeCreditDisputes).where(eq(ikeCreditDisputes.id, id));
      return { success: true };
    } catch (error: any) {
      throw new AppError(500, `Failed to delete credit dispute: ${error.message}`);
    }
  }
}
