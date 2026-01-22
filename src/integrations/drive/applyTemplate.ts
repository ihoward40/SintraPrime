import { loadDriveConfig, resolveTarget } from "./config.js";
import { templatePaths, type DriveTemplateId } from "./templates.js";
import { driveEnsurePath, type DriveEnsurePathOutput } from "./ensurePath.js";
import { writeDriveReceipt } from "./receipts.js";

function defaultRunDir(): string {
  return process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";
}

export async function driveApplyTemplate(args: {
  target: string;
  template: DriveTemplateId;
  root?: string;
  dryRun?: boolean;
  configPath?: string;
  runDir?: string;
}): Promise<{ ok: true; template: string; results: DriveEnsurePathOutput[] }> {
  const cfg = loadDriveConfig(args.configPath);
  const t = resolveTarget(cfg, args.target);

  const roots = args.root ? [args.root] : [t.defaultRoot];
  const root = String(roots[0] ?? "").trim();

  const paths = templatePaths(args.template);
  if (paths.length === 0) throw new Error("DRIVE_FAIL: TEMPLATE_NOT_FOUND");

  const dryRun = Boolean(args.dryRun);

  const results: DriveEnsurePathOutput[] = [];
  for (const p of paths) {
    results.push(
      await driveEnsurePath({
        target: t.alias,
        path: p,
        root,
        dryRun,
        configPath: args.configPath,
        runDir: args.runDir,
      })
    );
  }

  const runDir = args.runDir ?? defaultRunDir();
  writeDriveReceipt({
    runDir,
    receipt: {
      tool: "drive.applyTemplate",
      target: t.alias,
      auth_type: t.auth.type,
      drive_type: t.driveType,
      drive_id: t.driveId ?? null,
      root,
      dry_run: dryRun,
      created: [],
      found: [],
      final_id: root,
      provider: "template",
    },
  });

  return { ok: true, template: args.template, results };
}
