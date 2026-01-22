export type TurboSparseReceipt = {
  turbosparse: {
    enabled: boolean;
    experts: string[];
    reason: string[];
    trims?: Array<{ kind: string; detail: string }>;
    cache?: {
      enabled?: boolean;
      hit?: boolean;
      keyPrefix?: string;
    };
  };
};

export function withTurboSparse(receipt: any, meta: TurboSparseReceipt): any {
  return {
    ...receipt,
    ...meta,
  };
}
