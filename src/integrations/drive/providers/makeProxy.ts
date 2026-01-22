import { makeProxyEnsurePath } from "../../../adapters/driveMakeProxy.js";
import type { EnsurePathProvider, EnsurePathProviderArgs, EnsurePathResult } from "./types.js";

export class MakeProxyEnsurePathProvider implements EnsurePathProvider {
  public readonly providerId = "makeProxy";

  constructor(private readonly webhookUrlSecretRef: string) {}

  async ensurePath(args: EnsurePathProviderArgs): Promise<EnsurePathResult> {
    const { finalFolderId, chain } = await makeProxyEnsurePath({
      webhookUrlSecretRef: this.webhookUrlSecretRef,
      rootFolderId: args.root,
      path: args.segments.join("/"),
      dryRun: args.dryRun,
    });

    const normalizedChain = chain.map((x: any) => ({
      name: String(x?.name ?? ""),
      id: String(x?.id ?? ""),
      created: x?.created === true,
    }));

    const created = normalizedChain.filter((x) => x.created).map((x) => ({ name: x.name, id: x.id }));
    const found = normalizedChain.filter((x) => !x.created).map((x) => ({ name: x.name, id: x.id }));

    return { finalId: finalFolderId, created, found, chain: normalizedChain, provider: this.providerId };
  }
}
