import express from "express";
import { json } from "express";

import { requestId } from "./middleware/request_id.mjs";
import { errorHandler } from "./middleware/error_handler.mjs";

import { contentRoutes } from "./routes/content.mjs";
import { scheduleRoutes } from "./routes/schedule.mjs";
import { analyticsRoutes } from "./routes/analytics.mjs";
import { bestTimeRoutes } from "./routes/best_time.mjs";
import { receiptsRoutes } from "./routes/receipts.mjs";
import { healthRoutes } from "./routes/health.mjs";
import { healthRootRoutes } from "./routes/health_root.mjs";
import { getStore } from "./lib/store_factory.mjs";

const app = express();
app.use(json({ limit: "2mb" }));
app.use(requestId());

app.get("/status/200", (_req, res) => res.status(200).send("ok"));

app.use("/content", contentRoutes());
app.use("/", scheduleRoutes());
app.use("/", analyticsRoutes());
app.use("/", bestTimeRoutes());
app.use("/", receiptsRoutes());
app.use("/", healthRoutes());
app.use("/", healthRootRoutes());

app.use(errorHandler());

const port = process.env.PORT ? Number(process.env.PORT) : 8787;
app.listen(port, () => {
  console.log(`SocialOS API listening on http://127.0.0.1:${port}`);

  if (process.env.SOCIALOS_HEALTH_RECEIPTS_STARTUP === "1" && process.env.NODE_ENV !== "production") {
    (async () => {
      try {
        const store = await getStore();
        const items = await store.receipts.list({ content_id: null, platform: null, limit: 5 });
        const first = items.find((r) => r?.result?.kind === "schedule_decision") || items[0];
        if (!first) {
          console.log("[health/receipts] no receipts to check");
          return;
        }

        const { verifyReceiptHash } = await import("./services/receipt_verify.mjs");
        const v = verifyReceiptHash(first);
        console.log(`[health/receipts] ${v.ok ? "OK" : "MISMATCH"} receipt_id=${first.receipt_id}`);

        if (
          !v.ok &&
          process.env.SOCIALOS_HEALTH_RECEIPTS_FAIL_ON_MISMATCH === "1" &&
          process.env.NODE_ENV !== "production"
        ) {
          console.error("[health/receipts] FAIL_ON_MISMATCH=1; exiting (dev)");
          process.exit(1);
        }
      } catch (e) {
        console.error("[health/receipts] error", e);
      }
    })();
  }
});
