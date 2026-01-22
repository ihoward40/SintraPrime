import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const DriveAuthOAuthSchema = z.object({
  type: z.literal("oauth"),
  account: z.string().min(1),
  clientIdSecretRef: z.string().min(1),
  clientSecretSecretRef: z.string().min(1),
  refreshTokenSecretRef: z.string().min(1),
});

const DriveAuthServiceAccountSchema = z.object({
  type: z.literal("serviceAccount"),
  secretRef: z.string().min(1),
});

const DriveAuthMakeSchema = z.object({
  type: z.literal("make"),
  webhookUrlSecretRef: z.string().min(1),
});

const DriveAuthDesktopSchema = z.object({
  type: z.literal("desktop"),
  localRootPath: z.string().min(1),
});

export const DriveAuthSchema = z.discriminatedUnion("type", [
  DriveAuthOAuthSchema,
  DriveAuthServiceAccountSchema,
  DriveAuthMakeSchema,
  DriveAuthDesktopSchema,
]);

export type DriveAuth = z.infer<typeof DriveAuthSchema>;

export const DriveTargetSchema = z.object({
  alias: z.string().min(1),
  auth: DriveAuthSchema,
  driveType: z.enum(["myDrive", "sharedDrive", "folder", "desktop"]),
  driveId: z.string().min(1).optional(),
  approvedRoots: z.array(z.string().min(1)).min(1),
  defaultRoot: z.string().min(1),
});

export type DriveTarget = z.infer<typeof DriveTargetSchema>;

export const DriveConfigSchema = z.object({
  defaults: z
    .object({
      maxDepthPerCall: z.number().int().min(1).max(64).default(12),
      maxCreatesPerCall: z.number().int().min(0).max(200).default(20),
      denyPatterns: z.array(z.string()).default(["..", "//"]),
      requireRootAllowlist: z.boolean().default(true),
    })
    .default({
      maxDepthPerCall: 12,
      maxCreatesPerCall: 20,
      denyPatterns: ["..", "//"],
      requireRootAllowlist: true,
    }),
  targets: z.array(DriveTargetSchema).min(1),
});

export type DriveConfig = z.infer<typeof DriveConfigSchema>;

export function resolveConfigPath(p?: string): string {
  const rel = p ?? "config/drives.json";
  return path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
}

export function loadDriveConfig(configPath?: string): DriveConfig {
  const abs = resolveConfigPath(configPath);
  const raw = fs.readFileSync(abs, "utf8");
  const parsed = JSON.parse(raw);
  return DriveConfigSchema.parse(parsed);
}

export function resolveTarget(cfg: DriveConfig, alias: string): DriveTarget {
  const a = String(alias ?? "").trim();
  const t = cfg.targets.find((x) => x.alias === a);
  if (!t) throw new Error(`DRIVE_FAIL: TARGET_NOT_FOUND (${a})`);
  return t;
}

export function requireSecret(ref: string): string {
  const key = String(ref ?? "").trim();
  if (!key) throw new Error("DRIVE_FAIL: SECRET_REF_EMPTY");
  const v = process.env[key];
  if (!v || !String(v).trim()) throw new Error(`DRIVE_FAIL: SECRET_MISSING (${key})`);
  return String(v);
}
