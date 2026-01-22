import fs from "node:fs";
import path from "node:path";
import type { EnsurePathProvider, EnsurePathProviderArgs, EnsurePathResult } from "./types.js";

export class DesktopEnsurePathProvider implements EnsurePathProvider {
  public readonly providerId = "desktop";

  async ensurePath(args: EnsurePathProviderArgs): Promise<EnsurePathResult> {
    const created: Array<{ name: string; id: string }> = [];
    const found: Array<{ name: string; id: string }> = [];
    const chain: Array<{ name: string; id: string; created: boolean }> = [];

    let cur = args.root;

    for (const seg of args.segments) {
      const next = path.join(cur, seg);
      if (fs.existsSync(next)) {
        found.push({ name: seg, id: next });
        chain.push({ name: seg, id: next, created: false });
      } else {
        if (!args.dryRun) fs.mkdirSync(next, { recursive: true });
        created.push({ name: seg, id: next });
        chain.push({ name: seg, id: next, created: true });
      }
      cur = next;
    }

    return { finalId: cur, created, found, chain, provider: this.providerId };
  }
}
