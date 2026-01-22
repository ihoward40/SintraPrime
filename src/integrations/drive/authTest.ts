import fs from "node:fs";
import path from "node:path";
import { loadDriveConfig, resolveTarget, requireSecret } from "./config.js";
import { writeDriveReceipt } from "./receipts.js";
import { oauthDriveClient, serviceAccountDriveClient } from "./providers/googleDrive.js";
import type { drive_v3 } from "googleapis";
import { makeProxyEnsurePath } from "../../adapters/driveMakeProxy.js";
import { updateDriveCapabilitiesFile } from "./capabilitiesRegistry.js";

function defaultRunDir(): string {
  return process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";
}

function nowIso(): string {
  return new Date().toISOString();
}

function assertRootApproved(cfg: any, t: any, root: string) {
  if (!cfg?.defaults?.requireRootAllowlist) return;
  if (!Array.isArray(t?.approvedRoots) || !t.approvedRoots.includes(root)) {
    throw new Error("DRIVE_FAIL: ROOT_NOT_APPROVED");
  }
}

function driveCorporaForType(driveType: string) {
  if (driveType === "sharedDrive") return "drive";
  if (driveType === "folder") return "allDrives";
  return "user";
}

async function listChildrenUnderRoot(args: {
  drive: drive_v3.Drive;
  rootFolderId: string;
  driveType: string;
  driveId?: string;
}): Promise<{ childCount: number }> {
  const q = [`'${args.rootFolderId}' in parents`, "trashed = false"].join(" and ");

  const list = await args.drive.files.list({
    q,
    fields: "files(id,name,mimeType)",
    pageSize: 25,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: driveCorporaForType(args.driveType) as any,
    driveId: args.driveType === "sharedDrive" ? args.driveId : undefined,
  });

  const files = Array.isArray(list.data.files) ? list.data.files : [];
  return { childCount: files.length };
}

async function ensureFolderByName(args: {
  drive: drive_v3.Drive;
  parentId: string;
  name: string;
  driveType: string;
  driveId?: string;
}): Promise<{ id: string; created: boolean }> {
  const q = [
    `name = '${args.name.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `'${args.parentId}' in parents`,
  ].join(" and ");

  const list = await args.drive.files.list({
    q,
    fields: "files(id,name)",
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: driveCorporaForType(args.driveType) as any,
    driveId: args.driveType === "sharedDrive" ? args.driveId : undefined,
  });

  const files = Array.isArray(list.data.files) ? list.data.files : [];
  const first = files.find((f) => f && typeof f.id === "string" && f.id.trim());
  if (first?.id) return { id: String(first.id), created: false };

  const created = await args.drive.files.create({
    supportsAllDrives: true,
    fields: "id",
    requestBody: {
      name: args.name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [args.parentId],
    },
  });

  const id = String(created.data.id ?? "").trim();
  if (!id) throw new Error("DRIVE_FAIL: GOOGLE_CREATE_MISSING_ID");
  return { id, created: true };
}

async function deleteOrTrash(args: { drive: drive_v3.Drive; fileId: string }): Promise<{ deleted: boolean; trashed: boolean }> {
  try {
    await args.drive.files.delete({ fileId: args.fileId, supportsAllDrives: true });
    return { deleted: true, trashed: false };
  } catch {
    try {
      await args.drive.files.update({
        fileId: args.fileId,
        supportsAllDrives: true,
        requestBody: { trashed: true },
      });
      return { deleted: false, trashed: true };
    } catch {
      return { deleted: false, trashed: false };
    }
  }
}

export type DriveAuthTestPerTargetResult = {
  target: string;
  rootFolderId: string;
  auth: { ok: boolean; mode: string; error?: string };
  list: { ok: boolean; childCount?: number; error?: string };
  write: { ok: boolean; created?: boolean; deleted?: boolean; trashed?: boolean; error?: string };
  latencyMs: number;
};

export async function driveAuthTest(args: {
  target: string;
  configPath?: string;
  runDir?: string;
  createTemp?: boolean;
}): Promise<{ ok: true; results: DriveAuthTestPerTargetResult[] }> {
  return driveAuthTestMany({
    targets: [args.target],
    configPath: args.configPath,
    runDir: args.runDir,
    createTemp: args.createTemp,
  });
}

export async function driveAuthTestMany(args: {
  targets: string[];
  configPath?: string;
  runDir?: string;
  createTemp?: boolean;
}): Promise<{ ok: true; results: DriveAuthTestPerTargetResult[] }> {
  const cfg = loadDriveConfig(args.configPath);
  const runDir = args.runDir ?? defaultRunDir();
  const createTemp = Boolean(args.createTemp);

  const startedAt = Date.now();
  const results: DriveAuthTestPerTargetResult[] = [];

  for (const alias of args.targets) {
    const t0 = Date.now();
    const t = resolveTarget(cfg, alias);
    const rootFolderId = String(t.defaultRoot ?? "").trim();
    if (!rootFolderId) throw new Error("DRIVE_FAIL: ROOT_EMPTY");
    assertRootApproved(cfg, t, rootFolderId);

    const out: DriveAuthTestPerTargetResult = {
      target: t.alias,
      rootFolderId,
      auth: { ok: false, mode: t.auth.type },
      list: { ok: false },
      write: { ok: false },
      latencyMs: 0,
    };

    try {
      if (t.auth.type === "desktop") {
        const abs = path.isAbsolute(rootFolderId) ? rootFolderId : path.join(process.cwd(), rootFolderId);
        out.auth = { ok: fs.existsSync(abs), mode: "desktop" };
        out.list = { ok: true, childCount: fs.existsSync(abs) ? fs.readdirSync(abs).length : 0 };

        if (!createTemp) {
          out.write = { ok: true, created: false, deleted: false };
        } else {
          if (!fs.existsSync(abs)) throw new Error("DRIVE_FAIL: DESKTOP_ROOT_MISSING");
          const base = path.join(abs, "__sintraprime_auth_test__");
          const tmp = path.join(base, `tmp_${nowIso().replace(/[:.]/g, "-")}`);
          fs.mkdirSync(tmp, { recursive: true });
          fs.rmSync(tmp, { recursive: true, force: true });
          out.write = { ok: true, created: true, deleted: true };
        }
      } else if (t.auth.type === "make") {
        // Validate reachability + schema by calling ensurePath via the adapter.
        const probePath = "__sintraprime_auth_test__";
        const r = await makeProxyEnsurePath({
          webhookUrlSecretRef: t.auth.webhookUrlSecretRef,
          rootFolderId,
          path: probePath,
          dryRun: true,
        });
        out.auth = { ok: true, mode: "make" };
        out.list = { ok: true, childCount: Array.isArray(r.chain) ? r.chain.length : 0 };
        out.write = createTemp
          ? { ok: false, error: "DRIVE_FAIL: MAKE_PROXY_TEMP_NOT_SUPPORTED" }
          : { ok: true, created: false, deleted: false };
      } else {
        const drive =
          t.auth.type === "oauth"
            ? oauthDriveClient({
                clientId: requireSecret(t.auth.clientIdSecretRef),
                clientSecret: requireSecret(t.auth.clientSecretSecretRef),
                refreshToken: requireSecret(t.auth.refreshTokenSecretRef),
              })
            : serviceAccountDriveClient({ serviceAccountJson: requireSecret(t.auth.secretRef) });

        // Auth check
        const me = await drive.about.get({ fields: "user" });
        out.auth = { ok: Boolean(me.data.user), mode: t.auth.type };

        // List children under root
        try {
          const listed = await listChildrenUnderRoot({
            drive,
            rootFolderId,
            driveType: t.driveType,
            driveId: t.driveId,
          });
          out.list = { ok: true, childCount: listed.childCount };
        } catch (e: any) {
          out.list = { ok: false, error: String(e?.message || e) };
        }

        // Optional temp create/delete inside machine-owned folder
        if (!createTemp) {
          out.write = { ok: true, created: false, deleted: false };
        } else {
          const baseName = "__sintraprime_auth_test__";
          const tmpName = `tmp_${nowIso().replace(/[:.]/g, "-")}`;

          const base = await ensureFolderByName({
            drive,
            parentId: rootFolderId,
            name: baseName,
            driveType: t.driveType,
            driveId: t.driveId,
          });

          const tmp = await ensureFolderByName({
            drive,
            parentId: base.id,
            name: tmpName,
            driveType: t.driveType,
            driveId: t.driveId,
          });

          // Strict containment: only delete inside the machine-owned folder.
          const del = await deleteOrTrash({ drive, fileId: tmp.id });

          out.write = {
            ok: true,
            created: tmp.created,
            deleted: del.deleted,
            trashed: del.trashed,
          };
        }
      }
    } catch (e: any) {
      const msg = String(e?.message || e);
      out.auth = { ok: false, mode: t.auth.type, error: msg };
      out.list = out.list.ok ? out.list : { ok: false, error: out.list.error || msg };
      out.write = out.write.ok ? out.write : { ok: false, error: out.write.error || msg };
    } finally {
      out.latencyMs = Date.now() - t0;
    }

    results.push(out);
  }

  writeDriveReceipt({
    runDir,
    receipt: {
      tool: "drive.authTest",
      target: "authTestMany",
      auth_type: "multi",
      drive_type: "multi",
      drive_id: null,
      root: "(multiple)",
      dry_run: !createTemp,
      created: [],
      found: [],
      final_id: "(n/a)",
      provider: "authTest",
      details: {
        createTemp,
        targets: args.targets,
        totalLatencyMs: Date.now() - startedAt,
        results,
      },
    },
  });

  // Per-run capability registry (best-effort), colocated with receipts base.
  try {
    const runDirAbs = path.isAbsolute(runDir) ? runDir : path.join(process.cwd(), runDir);
    const envReceiptsDir = String(process.env.SINTRAPRIME_DRIVE_RECEIPTS_DIR ?? "").trim();
    const receiptsDir = envReceiptsDir
      ? (path.isAbsolute(envReceiptsDir) ? envReceiptsDir : path.join(process.cwd(), envReceiptsDir))
      : path.join(runDirAbs, "drive", "receipts");
    const updates: any = {};
    for (const r of results) {
      updates[r.target] = {
        canListChildren: r.list.ok === true,
        canCreateFolder: r.write.ok === true && Boolean(r.write.created),
        canDeleteFolder: r.write.ok === true && (r.write.deleted === true || r.write.trashed === true),
        lastAuthTestAt: nowIso(),
        lastAuthTestResult: r.auth.ok && r.list.ok && r.write.ok ? "ok" : "fail",
      };
    }
    updateDriveCapabilitiesFile({ receiptsDir, updates });
  } catch {
    // best-effort
  }

  return { ok: true, results };
}
