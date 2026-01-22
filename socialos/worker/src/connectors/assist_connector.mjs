import { assertConnectorResult } from "./connector_interface.mjs";

export async function publishWithAssist({ content, schedule }) {
  const result = {
    status: "assist_required",
    result: {
      assist_kit: {
        platform: schedule.platform,
        content_id: content.content_id,
        instructions: "Manually publish this content, then attach proof (URL/screenshot) and rerun.",
        text: content.canonical_assets.text.original,
        media: content.canonical_assets.media
      }
    }
  };

  return assertConnectorResult(result);
}
