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

const creditDisputeSortByQueryParam = z.preprocess(normalizeQueryValue, z.enum([
  'status',
  'created_at',
  'createdAt',
]).optional());

const disputeStatusQueryParam = z.preprocess((value) => {
  const normalized = normalizeQueryValue(value);
  return typeof normalized === 'string' ? normalized.toLowerCase() : normalized;
}, z.enum(['pending', 'submitted', 'investigating', 'resolved', 'rejected']).optional());

const beneficiaryIdQueryParam = z.preprocess((value) => {
  const normalized = normalizeQueryValue(value);
  return normalized === '' ? undefined : normalized;
}, z.string().uuid().optional());

const normalizeCreditDisputeSortBy = (value: unknown) => {
  switch (value) {
    case 'status':
      return 'status';
    case 'createdAt':
    case 'created_at':
    default:
      return 'created_at';
  }
};

export const creditDisputeSchema = z.object({
  id: z.string().uuid().optional(),
  beneficiary_id: z.string().uuid('Invalid beneficiary ID'),
  creditor_name: z.string().min(1, 'Creditor name is required').max(200),
  account_number: z.string().optional(),
  dispute_reason: z.string().min(1, 'Dispute reason is required'),
  dispute_type: z.enum(['identity_theft', 'not_mine', 'inaccurate', 'duplicate', 'paid', 'other']),
  status: z.enum(['pending', 'submitted', 'investigating', 'resolved', 'rejected']).default('pending'),
  amount_disputed: z.number().optional(),
  date_submitted: z.string().optional(),
  date_resolved: z.string().optional(),
  resolution_notes: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const createCreditDisputeSchema = creditDisputeSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

export const updateCreditDisputeSchema = createCreditDisputeSchema.partial().omit({ beneficiary_id: true });

export const listCreditDisputesQuerySchema = z.object({
  page: positiveIntQueryParam('page', 1),
  limit: positiveIntQueryParam('limit', 10, 100),
  sortBy: creditDisputeSortByQueryParam,
  sort_by: creditDisputeSortByQueryParam,
  sortOrder: sortOrderQueryParam,
  sort_order: sortOrderQueryParam,
  status: disputeStatusQueryParam,
  beneficiary_id: beneficiaryIdQueryParam,
  beneficiaryId: beneficiaryIdQueryParam,
}).transform((query) => ({
  page: query.page,
  limit: query.limit,
  sortBy: normalizeCreditDisputeSortBy(query.sortBy ?? query.sort_by ?? 'created_at'),
  sortOrder: query.sortOrder ?? query.sort_order ?? 'desc',
  status: query.status,
  beneficiary_id: query.beneficiary_id ?? query.beneficiaryId,
}));

export type CreditDispute = z.infer<typeof creditDisputeSchema>;
export type CreateCreditDisputeInput = z.infer<typeof createCreditDisputeSchema>;
export type UpdateCreditDisputeInput = z.infer<typeof updateCreditDisputeSchema>;
export type ListCreditDisputesQuery = z.infer<typeof listCreditDisputesQuerySchema>;
