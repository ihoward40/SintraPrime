export function analyticsController() {
  return async (req, res) => {
    // Stub: metrics ingestion is handled by worker/connector in later phases.
    const { content_id, platform } = req.query;

    res.status(200).json({
      items: [
        {
          content_id: content_id || "00000000-0000-0000-0000-000000000000",
          platform: platform || "stub",
          views: 0,
          engagement_rate: 0
        }
      ]
    });
  };
}
