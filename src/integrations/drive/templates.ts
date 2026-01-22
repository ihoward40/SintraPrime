export type DriveTemplateId = "TikTokEvidence_v1";

export function templatePaths(id: DriveTemplateId): string[] {
  if (id === "TikTokEvidence_v1") {
    return [
      "TikTok/Exports/Raw",
      "TikTok/Exports/Processed",
      "TikTok/Incoming/Raw",
      "TikTok/Incoming/Normalized",
      "TikTok/Exhibits",
      "TikTok/Receipts",
    ];
  }
  return [];
}
