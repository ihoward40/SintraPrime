import { and, asc, desc, or, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { 
  CreateBeneficiaryInput, 
  UpdateBeneficiaryInput, 
  ListBeneficiariesQuery 
} from '../models/beneficiary.schema';
import { AppError } from '../middleware/errorHandler';

import { getDb } from '../db/mysql';
import { ikeBeneficiaries } from '../db/schema';

export class BeneficiaryService {
  async list(query: ListBeneficiariesQuery) {
    const { page, limit, sortBy, sortOrder, search } = query;
    const offset = (page - 1) * limit;

    const database = getDb();

    const whereConditions = [];
    if (search) {
      const term = `%${search}%`;
      whereConditions.push(
        or(
          sql`LOWER(${ikeBeneficiaries.first_name}) LIKE LOWER(${term})`,
          sql`LOWER(${ikeBeneficiaries.last_name}) LIKE LOWER(${term})`,
          sql`LOWER(${ikeBeneficiaries.email}) LIKE LOWER(${term})`,
        ),
      );
    }

    const whereClause = whereConditions.length ? and(...whereConditions) : undefined;

    const orderByColumn = (() => {
      switch (sortBy) {
        case 'first_name':
          return ikeBeneficiaries.first_name;
        case 'last_name':
          return ikeBeneficiaries.last_name;
        case 'email':
          return ikeBeneficiaries.email;
        case 'created_at':
        default:
          return ikeBeneficiaries.created_at;
      }
    })();

    const orderByExpr = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn);

    try {
      const [{ count }] = await database
        .select({ count: sql<number>`count(*)` })
        .from(ikeBeneficiaries)
        .where(whereClause);

      const data = await database
        .select()
        .from(ikeBeneficiaries)
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
      throw new AppError(500, `Failed to fetch beneficiaries: ${error.message}`);
    }
  }

  async getById(id: string) {
    const database = getDb();

    try {
      const rows = await database.select().from(ikeBeneficiaries).where(sql`${ikeBeneficiaries.id} = ${id}`).limit(1);
      const data = rows[0];
      if (!data) {
        throw new AppError(404, 'Beneficiary not found');
      }
      return data;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, `Failed to fetch beneficiary: ${error.message}`);
    }
  }

  async create(input: CreateBeneficiaryInput) {
    const database = getDb();

    const id = uuidv4();
    const values = Object.fromEntries(
      Object.entries({ ...input, id }).filter(([, v]) => v !== undefined),
    ) as any;

    try {
      await database.insert(ikeBeneficiaries).values(values);

      const rows = await database.select().from(ikeBeneficiaries).where(sql`${ikeBeneficiaries.id} = ${id}`).limit(1);
      return rows[0];
    } catch (error: any) {
      throw new AppError(500, `Failed to create beneficiary: ${error.message}`);
    }
  }

  async update(id: string, input: UpdateBeneficiaryInput) {
    const database = getDb();
    const updateValues = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    ) as any;

    try {
      const existing = await database
        .select({ id: ikeBeneficiaries.id })
        .from(ikeBeneficiaries)
        .where(sql`${ikeBeneficiaries.id} = ${id}`)
        .limit(1);

      if (!existing[0]) {
        throw new AppError(404, 'Beneficiary not found');
      }

      if (Object.keys(updateValues).length > 0) {
        await database.update(ikeBeneficiaries).set(updateValues).where(sql`${ikeBeneficiaries.id} = ${id}`);
      }

      const rows = await database.select().from(ikeBeneficiaries).where(sql`${ikeBeneficiaries.id} = ${id}`).limit(1);
      return rows[0];
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, `Failed to update beneficiary: ${error.message}`);
    }
  }

  async delete(id: string) {
    const database = getDb();

    try {
      await database.delete(ikeBeneficiaries).where(sql`${ikeBeneficiaries.id} = ${id}`);
      return { success: true };
    } catch (error: any) {
      throw new AppError(500, `Failed to delete beneficiary: ${error.message}`);
    }
  }
}
