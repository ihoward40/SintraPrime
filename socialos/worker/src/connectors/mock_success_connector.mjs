import { assertConnectorResult } from "./connector_interface.mjs";

export async function publishMockSuccess({ content, schedule }) {
  const result = {
    status: "success",
    result: {
      platform: schedule.platform,
      published_url: `https://example.invalid/${schedule.platform}/${content.content_id}`
    }
  };

  return assertConnectorResult(result);
}
