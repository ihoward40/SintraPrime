import { z } from "zod";

export const DriveEnsurePathOutputSchema = z.object({
  ok: z.literal(true),
  target: z.string(),
  root: z.string(),
  path: z.string(),
  dryRun: z.boolean(),
  finalId: z.string(),
  created: z.array(z.object({ name: z.string(), id: z.string() })),
  found: z.array(z.object({ name: z.string(), id: z.string() })),
  receipt: z
    .object({
      path: z.string(),
      sha256: z.string(),
    })
    .optional(),
});

export type DriveEnsurePathOutput = z.infer<typeof DriveEnsurePathOutputSchema>;
