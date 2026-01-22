import fs from "node:fs";
import path from "node:path";
import { withFileLockSync } from "../../utils/fsLock.js";

export type DriveCapabilityRow = {
  canListChildren: boolean;
  canCreateFolder: boolean;
  canDeleteFolder: boolean;
  lastAuthTestAt: string;
  lastAuthTestResult: "ok" | "fail";
};

type DriveCapabilitiesFileV1 = {
  schemaVersion: 1;
  updatedAtUtc: string;
  targets: Record<string, DriveCapabilityRow>;
};

export function updateDriveCapabilitiesFile(args: {
  receiptsDir: string;
  updates: Record<string, DriveCapabilityRow>;
}) {
  const absReceiptsDir = path.isAbsolute(args.receiptsDir) ? args.receiptsDir : path.join(process.cwd(), args.receiptsDir);
  fs.mkdirSync(absReceiptsDir, { recursive: true });

  const capPath = path.join(absReceiptsDir, "drive_capabilities.json");
  const lockPath = `${capPath}.lock`;

  withFileLockSync({
    lockPath,
    fn: () => {
      const raw = fs.existsSync(capPath) ? JSON.parse(fs.readFileSync(capPath, "utf8")) : {};

      const prevTargets: Record<string, DriveCapabilityRow> =
        raw && typeof raw === "object" && !Array.isArray(raw) && raw.schemaVersion === 1 && raw.targets && typeof raw.targets === "object"
          ? (raw.targets as any)
          : (raw as any);

      const nextFile: DriveCapabilitiesFileV1 = {
        schemaVersion: 1,
        updatedAtUtc: new Date().toISOString(),
        targets: { ...(prevTargets ?? {}), ...(args.updates ?? {}) },
      };

      const tmp = `${capPath}.tmp_${process.pid}_${Date.now()}`;
      fs.writeFileSync(tmp, JSON.stringify(nextFile, null, 2) + "\n", "utf8");
      fs.renameSync(tmp, capPath);
    },
  });
}
