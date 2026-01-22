// src/routes/slack.test.routes.js
import express from "express";
import { sharedEventBus as bus } from "../core/eventBus.js";
import { sendSlackMessage } from "../../ui/services/slack.service.js";
import { getSlackHealth } from "../../ui/services/slackHealth.js";
import { getSlackTokenWatchdogStatus } from "../watchers/slackTokenWatchdog.js";

function requireAdmin(req, res) {
  const requireAdmin = String(process.env.SLACK_TEST_REQUIRE_ADMIN || "1").trim() !== "0";
  if (!requireAdmin) return true;

  const expected = String(process.env.CLUSTER_ADMIN_SECRET || "").trim();
  if (!expected) {
    res.status(500).json({ ok: false, error: "Admin secret not configured (CLUSTER_ADMIN_SECRET)" });
    return false;
  }

  const provided = String(req.headers["x-sintra-admin"] || "").trim();
  if (!provided || provided !== expected) {
    res.status(403).json({ ok: false, error: "Forbidden: invalid admin token" });
    return false;
  }

  return true;
}

async function sendTestPing(slackClient, channel) {
  // Prefer a passed-in SlackClient instance if available.
  if (slackClient?.sendMessage) {
    return slackClient.sendMessage({ channel, text: ":satellite: Slack Test Ping from SintraPrime." });
  }

  if (slackClient?.sendText) {
    return slackClient.sendText(channel, ":satellite: Slack Test Ping from SintraPrime.");
  }

  const out = await sendSlackMessage({ channel, text: ":satellite: Slack Test Ping from SintraPrime." });
  if (out?.ok === false) {
    throw new Error(`Slack ping not delivered (${out?.auth_problem ? "auth_problem" : out?.offline ? "offline" : "failed"})`);
  }
  return out;
}

export default function registerSlackTestRoutes(app, options = {}) {
  const getSlackClient =
    typeof options.getSlackClient === "function" ? options.getSlackClient : () => options.slackClient;

  const router = express.Router();

  // Watchtower dashboard JSON (for UI tiles / sanity checks)
  router.get("/watchtower", (req, res) => {
    if (!requireAdmin(req, res)) return;
    return res.json({ ok: true, slack: getSlackHealth(), watchtower: getSlackTokenWatchdogStatus() });
  });

  // Simple ping – sends a test message to your default channel
  router.post("/ping", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const channel = String(process.env.SLACK_DEFAULT_CHANNEL || "").trim();
      if (!channel) {
        return res.status(400).json({ ok: false, error: "SLACK_DEFAULT_CHANNEL missing" });
      }

      await sendTestPing(getSlackClient(), channel);
      return res.json({ ok: true });
    } catch (err) {
      console.log("[SlackTest] /ping error:", err?.message || String(err));
      return res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
  });

  // Simulate token_expired to test the Watchtower refresh logic
  router.post("/simulate-token-expired", (req, res) => {
    if (!requireAdmin(req, res)) return;

    const fakeError = {
      code: "slack_webapi_platform_error",
      data: { ok: false, error: "token_expired", response_metadata: {} },
      message: "Simulated token_expired for testing",
    };

    // Emit through the same channel slack clients use
    bus.emit("slack.error", fakeError);

    return res.json({
      ok: true,
      note: "Emitted slack.error with token_expired. Watch logs for Watchtower refresh.",
    });
  });

  // Emit a fake creditor event to make sure Slack + Enforcement + Paralegal are wired
  router.post("/fake-creditor-event", (req, res) => {
    if (!requireAdmin(req, res)) return;

    const payload = {
      name: "Verizon Wireless (TEST)",
      source: "slack.test",
      context: {
        channel: "test",
        message: "This is a fake Verizon alert for pipeline testing.",
        risk: "high",
      },
      createdAt: new Date().toISOString(),
    };

    bus.emit("creditor.observed", payload);

    return res.json({
      ok: true,
      emitted: "creditor.observed",
      payload,
    });
  });

  app.use("/api/slack/test", router);
}
