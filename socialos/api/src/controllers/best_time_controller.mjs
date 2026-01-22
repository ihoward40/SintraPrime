import { getStore } from "../lib/store_factory.mjs";

export async function getBestTime(req, res, next) {
  try {
    const store = await getStore();
    const { platform = null, limit = "50" } = req.query;
    const items = await store.bestTime.list({
      platform,
      limit: Math.min(Number(limit) || 50, 200)
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
}
