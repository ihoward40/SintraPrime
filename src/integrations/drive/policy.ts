import { z } from "zod";

export function splitAndValidatePath(args: {
  path: string;
  denyPatterns: string[];
  maxDepthPerCall: number;
}): string[] {
  const raw = String(args.path ?? "");

  if (!raw.trim()) throw new Error("DRIVE_FAIL: PATH_EMPTY");
  if (raw.includes("\\")) throw new Error("DRIVE_FAIL: PATH_BACKSLASH_FORBIDDEN");

  for (const pat of args.denyPatterns) {
    if (pat && raw.includes(pat)) throw new Error("DRIVE_FAIL: PATH_DENIED_PATTERN");
  }

  const parts = raw
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (parts.length === 0) throw new Error("DRIVE_FAIL: PATH_EMPTY");
  if (parts.length > args.maxDepthPerCall) throw new Error("DRIVE_FAIL: PATH_TOO_DEEP");

  for (const seg of parts) {
    if (seg === "." || seg === "..") throw new Error("DRIVE_FAIL: PATH_DOT_SEGMENT_FORBIDDEN");
    if (seg.includes("|")) throw new Error("DRIVE_FAIL: PATH_PIPE_FORBIDDEN");
    if (seg.includes("/")) throw new Error("DRIVE_FAIL: PATH_SLASH_IN_SEGMENT");
    if (seg.length > 200) throw new Error("DRIVE_FAIL: PATH_SEGMENT_TOO_LONG");

    // Disallow common slash lookalikes (keep it boring).
    if (/[\u2215\u2044\uFF0F]/.test(seg)) throw new Error("DRIVE_FAIL: PATH_SLASH_LOOKALIKE_FORBIDDEN");
  }

  return parts;
}

export const EnsurePathInputSchema = z.object({
  target: z.string().min(1),
  path: z.string().min(1),
  root: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
});

export type EnsurePathInput = z.infer<typeof EnsurePathInputSchema>;

export const ApplyTemplateInputSchema = z.object({
  target: z.string().min(1),
  template: z.string().min(1),
  root: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
});

export type ApplyTemplateInput = z.infer<typeof ApplyTemplateInputSchema>;
