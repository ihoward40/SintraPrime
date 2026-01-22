import path from "node:path";
import { loadDriveConfig, resolveTarget, requireSecret } from "./config.js";
import { splitAndValidatePath } from "./policy.js";
import { writeDriveReceipt } from "./receipts.js";
import { DesktopEnsurePathProvider } from "./providers/desktop.js";
import { MakeProxyEnsurePathProvider } from "./providers/makeProxy.js";
import { GoogleDriveEnsurePathProvider, oauthDriveClient, serviceAccountDriveClient } from "./providers/googleDrive.js";
import type { EnsurePathProvider } from "./providers/types.js";

export type DriveEnsurePathOutput = {
  ok: true;
  target: string;
  root: string;
  path: string;
  dryRun: boolean;
  finalId: string;
  created: Array<{ name: string; id: string }>;
  found: Array<{ name: string; id: string }>;
  chain: Array<{ name: string; id: string; created: boolean }>;
  receipt?: { path: string; sha256: string };
};

function defaultRunDir(): string {
  return process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";
}

function providerForTarget(t: any): { provider: EnsurePathProvider; authType: string } {
  if (t.auth.type === "make") {
    return {
      provider: new MakeProxyEnsurePathProvider(t.auth.webhookUrlSecretRef),
      authType: "make",
    };
  }

  if (t.auth.type === "desktop") {
    return { provider: new DesktopEnsurePathProvider(), authType: "desktop" };
  }

  if (t.auth.type === "oauth") {
    const drive = oauthDriveClient({
      clientId: requireSecret(t.auth.clientIdSecretRef),
      clientSecret: requireSecret(t.auth.clientSecretSecretRef),
      refreshToken: requireSecret(t.auth.refreshTokenSecretRef),
    });
    return {
      provider: new GoogleDriveEnsurePathProvider({ drive, driveType: t.driveType, driveId: t.driveId }),
      authType: "oauth",
    };
  }

  if (t.auth.type === "serviceAccount") {
    const drive = serviceAccountDriveClient({ serviceAccountJson: requireSecret(t.auth.secretRef) });
    return {
      provider: new GoogleDriveEnsurePathProvider({ drive, driveType: t.driveType, driveId: t.driveId }),
      authType: "serviceAccount",
    };
  }

  throw new Error("DRIVE_FAIL: AUTH_TYPE_UNSUPPORTED");
}

export async function driveEnsurePath(args: {
  target: string;
  path: string;
  root?: string;
  dryRun?: boolean;
  configPath?: string;
  runDir?: string;
}): Promise<DriveEnsurePathOutput> {
  const cfg = loadDriveConfig(args.configPath);
  const t = resolveTarget(cfg, args.target);

  const denyPatterns = cfg.defaults.denyPatterns;
  const maxDepthPerCall = cfg.defaults.maxDepthPerCall;

  const segments = splitAndValidatePath({ path: args.path, denyPatterns, maxDepthPerCall });

  const root = String(args.root ?? t.defaultRoot).trim();
  if (!root) throw new Error("DRIVE_FAIL: ROOT_EMPTY");

  if (cfg.defaults.requireRootAllowlist) {
    if (!t.approvedRoots.includes(root)) {
      throw new Error("DRIVE_FAIL: ROOT_NOT_APPROVED");
    }
  }

  const dryRun = Boolean(args.dryRun);

  // Desktop targets treat roots as absolute local directories.
  const providerRoot =
    t.auth.type === "desktop"
      ? path.isAbsolute(root)
        ? root
        : path.join(process.cwd(), root)
      : root;

  const { provider, authType } = providerForTarget(t);
  const out = await provider.ensurePath({ root: providerRoot, segments, dryRun });

  const runDir = args.runDir ?? defaultRunDir();
  const receipt = writeDriveReceipt({
    runDir,
    receipt: {
      tool: "drive.ensurePath",
      target: t.alias,
      auth_type: authType,
      drive_type: t.driveType,
      drive_id: t.driveId ?? null,
      root: providerRoot,
      path: segments.join("/"),
      dry_run: dryRun,
      created: out.created,
      found: out.found,
      chain: out.chain,
      final_id: out.finalId,
      provider: out.provider,
    },
  });

  return {
    ok: true,
    target: t.alias,
    root,
    path: segments.join("/"),
    dryRun,
    finalId: out.finalId,
    created: out.created,
    found: out.found,
    chain: out.chain,
    receipt: {
      path: receipt.receiptPath,
      sha256: receipt.receiptHash,
    },
  };
}
