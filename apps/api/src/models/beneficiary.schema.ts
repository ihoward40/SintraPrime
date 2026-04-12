import { z } from 'zod';

const normalizeQueryValue = (value: unknown) => {
  const normalized = Array.isArray(value) ? value[0] : value;
  return typeof normalized === 'string' ? normalized.trim() : normalized;
};

const positiveIntQueryParam = (fieldName: string, defaultValue: number, max?: number) => {
  const baseSchema = z.number().int(`${fieldName} must be an integer`).min(1, `${fieldName} must be at least 1`);
  const boundedSchema = typeof max === 'number'
    ? baseSchema.max(max, `${fieldName} must be at most ${max}`)
    : baseSchema;

  return z.preprocess((value) => {
    const normalized = normalizeQueryValue(value);

    if (normalized === undefined || normalized === null || normalized === '') {
      return defaultValue;
    }

    if (typeof normalized === 'number' && Number.isInteger(normalized)) {
      return normalized;
    }

    if (typeof normalized === 'string' && /^\d+$/.test(normalized)) {
      return Number.parseInt(normalized, 10);
    }

    return Number.NaN;
  }, boundedSchema);
};

const sortOrderQueryParam = z.preprocess((value) => {
  const normalized = normalizeQueryValue(value);
  return typeof normalized === 'string' ? normalized.toLowerCase() : normalized;
}, z.enum(['asc', 'desc']).optional());

const beneficiarySortByQueryParam = z.preprocess(normalizeQueryValue, z.enum([
  'first_name',
  'firstName',
  'last_name',
  'lastName',
  'email',
  'created_at',
  'createdAt',
]).optional());

const searchQueryParam = z.preprocess((value) => {
  const normalized = normalizeQueryValue(value);
  return normalized === '' ? undefined : normalized;
}, z.string().optional());

const normalizeBeneficiarySortBy = (value: unknown) => {
  switch (value) {
    case 'firstName':
      return 'first_name';
    case 'lastName':
      return 'last_name';
    case 'createdAt':
      return 'created_at';
    case 'first_name':
    case 'last_name':
    case 'email':
    case 'created_at':
      return value;
    default:
      return 'created_at';
  }
};

export const beneficiarySchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  ssn_last_four: z.string().length(4, 'SSN must be last 4 digits').optional(),
  date_of_birth: z.string().optional(),
  relationship: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const createBeneficiarySchema = beneficiarySchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

export const updateBeneficiarySchema = createBeneficiarySchema.partial();

export const listBeneficiariesQuerySchema = z.object({
  page: positiveIntQueryParam('page', 1),
  limit: positiveIntQueryParam('limit', 10, 100),
  sortBy: beneficiarySortByQueryParam,
  sort_by: beneficiarySortByQueryParam,
  sortOrder: sortOrderQueryParam,
  sort_order: sortOrderQueryParam,
  search: searchQueryParam,
}).transform((query) => ({
  page: query.page,
  limit: query.limit,
  sortBy: normalizeBeneficiarySortBy(query.sortBy ?? query.sort_by ?? 'created_at'),
  sortOrder: query.sortOrder ?? query.sort_order ?? 'desc',
  search: query.search,
}));

export type Beneficiary = z.infer<typeof beneficiarySchema>;
export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;
export type UpdateBeneficiaryInput = z.infer<typeof updateBeneficiarySchema>;
export type ListBeneficiariesQuery = z.infer<typeof listBeneficiariesQuerySchema>;
