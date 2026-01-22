export const channelMap = {
  default: "#all-ikesolutions",
  enforcement: "#enforcement-alerts",
  tiktok: "#tiktok-leads",

  // creditor-specific (optional)
  verizon: "#verizon-watch",
};

export function pickChannelForEvent(kind, payload) {
  const creditor = String(payload?.creditor ?? "").trim().toLowerCase();
  if (creditor && channelMap[creditor]) return channelMap[creditor];

  if (kind === "enforcement.event") return channelMap.enforcement || channelMap.default;
  if (kind === "tiktok.lead") return channelMap.tiktok || channelMap.default;

  return channelMap.default;
}
