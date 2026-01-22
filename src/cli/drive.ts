import { EnsurePathInputSchema, ApplyTemplateInputSchema } from "../integrations/drive/policy.js";
import { driveEnsurePath } from "../integrations/drive/ensurePath.js";
import { driveApplyTemplate } from "../integrations/drive/applyTemplate.js";
import { driveAuthTest, driveAuthTestMany } from "../integrations/drive/authTest.js";

export async function runDriveEnsurePath(payload: unknown) {
  const p = EnsurePathInputSchema.parse(payload);
  return driveEnsurePath({
    target: p.target,
    path: p.path,
    root: p.root,
    dryRun: p.dryRun,
  });
}

export async function runDriveApplyTemplate(payload: unknown) {
  const p = ApplyTemplateInputSchema.parse(payload);
  return driveApplyTemplate({
    target: p.target,
    template: p.template as any,
    root: p.root,
    dryRun: p.dryRun,
  });
}

export async function runDriveAuthTest(payload: unknown) {
  const p: any = payload ?? {};
  const createTemp = Boolean(p?.createTemp);

  const targets = Array.isArray(p?.targets) ? p.targets.map((x: any) => String(x)).filter((s: string) => s.trim()) : [];
  if (targets.length > 0) {
    return driveAuthTestMany({ targets, createTemp });
  }

  const target = typeof p?.target === "string" ? String(p.target) : "";
  if (!target.trim()) throw new Error("DRIVE_FAIL: TARGET_REQUIRED");
  return driveAuthTest({ target, createTemp });
}
