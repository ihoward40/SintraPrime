import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import type { EnsurePathProvider, EnsurePathProviderArgs, EnsurePathResult } from "./types.js";

export type GoogleDriveContext = {
  drive: drive_v3.Drive;
  driveType: "myDrive" | "sharedDrive" | "folder";
  driveId?: string;
};

async function findFolder(args: {
  drive: drive_v3.Drive;
  parentId: string;
  name: string;
  driveType: GoogleDriveContext["driveType"];
  driveId?: string;
}): Promise<string | null> {
  const q = [
    `name = '${args.name.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
    `'${args.parentId}' in parents`,
  ].join(" and ");

  const list = await args.drive.files.list({
    q,
    fields: "files(id,name)",
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: args.driveType === "sharedDrive" ? "drive" : "user",
    driveId: args.driveType === "sharedDrive" ? args.driveId : undefined,
  });

  const files = Array.isArray(list.data.files) ? list.data.files : [];
  const first = files.find((f) => f && typeof f.id === "string" && f.id.trim());
  return first?.id ? String(first.id) : null;
}

async function createFolder(args: {
  drive: drive_v3.Drive;
  parentId: string;
  name: string;
}): Promise<string> {
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
  return id;
}

export class GoogleDriveEnsurePathProvider implements EnsurePathProvider {
  public readonly providerId: string;

  constructor(private readonly ctx: GoogleDriveContext) {
    this.providerId = "googleDrive";
  }

  async ensurePath(args: EnsurePathProviderArgs): Promise<EnsurePathResult> {
    const created: Array<{ name: string; id: string }> = [];
    const found: Array<{ name: string; id: string }> = [];
    const chain: Array<{ name: string; id: string; created: boolean }> = [];

    let parentId = args.root;

    for (const seg of args.segments) {
      const existing = await findFolder({
        drive: this.ctx.drive,
        parentId,
        name: seg,
        driveType: this.ctx.driveType,
        driveId: this.ctx.driveId,
      });

      if (existing) {
        found.push({ name: seg, id: existing });
        chain.push({ name: seg, id: existing, created: false });
        parentId = existing;
        continue;
      }

      if (args.dryRun) {
        const fake = `DRYRUN:${parentId}/${seg}`;
        created.push({ name: seg, id: fake });
        chain.push({ name: seg, id: fake, created: true });
        parentId = fake;
        continue;
      }

      const id = await createFolder({ drive: this.ctx.drive, parentId, name: seg });
      created.push({ name: seg, id });
      chain.push({ name: seg, id, created: true });
      parentId = id;
    }

    return { finalId: parentId, created, found, chain, provider: this.providerId };
  }
}

export function oauthDriveClient(args: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): drive_v3.Drive {
  const oauth2 = new google.auth.OAuth2(args.clientId, args.clientSecret);
  oauth2.setCredentials({ refresh_token: args.refreshToken });
  return google.drive({ version: "v3", auth: oauth2 });
}

export function serviceAccountDriveClient(args: { serviceAccountJson: string }): drive_v3.Drive {
  const key = JSON.parse(args.serviceAccountJson);
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}
