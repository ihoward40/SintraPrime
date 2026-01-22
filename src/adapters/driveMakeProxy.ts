import { requireSecret } from "../integrations/drive/config.js";

export async function makeProxyEnsurePath(args: {
  webhookUrlSecretRef: string;
  rootFolderId: string;
  path: string;
  dryRun: boolean;
}): Promise<{ finalFolderId: string; chain: Array<{ name: string; id: string; created?: boolean }> }> {
  const url = requireSecret(args.webhookUrlSecretRef);

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      rootFolderId: args.rootFolderId,
      path: args.path,
      mode: "ensure",
      receipt: true,
      dryRun: args.dryRun,
    }),
  });

  if (!res.ok) {
    throw new Error(`DRIVE_FAIL: MAKE_PROXY_HTTP_${res.status}`);
  }

  const json: any = await res.json();
  const finalFolderId = String(json?.finalFolderId ?? "").trim();
  if (!finalFolderId) throw new Error("DRIVE_FAIL: MAKE_PROXY_BAD_RESPONSE");

  const chain = Array.isArray(json?.chain) ? json.chain : [];
  return { finalFolderId, chain };
}
