import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { getSlackHealth } from "../services/slackHealth.js";
import { getBotUserId } from "../services/slack.service.js";
import { getSlackTokenWatchdogStatus } from "../../src/watchers/slackTokenWatchdog.js";

const router = express.Router();
router.use(adminAuth);

router.get("/slack/status", (_req, res) => {
  const hasToken = Boolean(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN);
  const hasSigningSecret = Boolean(String(process.env.SLACK_SIGNING_SECRET || "").trim());
  const hasAppToken = Boolean(String(process.env.SLACK_APP_TOKEN || "").trim());
  const hasAlertWebhook = Boolean(String(process.env.SLACK_ALERT_WEBHOOK || "").trim());
  const oauthRefreshEnabled = String(process.env.SLACK_ENABLE_OAUTH_REFRESH || "").trim() === "1";
  const hasRefreshConfig = Boolean(
    String(process.env.SLACK_CLIENT_ID || "").trim() &&
      String(process.env.SLACK_CLIENT_SECRET || "").trim() &&
      String(process.env.SLACK_REFRESH_TOKEN || "").trim(),
  );

  function mask(value) {
    const v = String(value || "").trim();
    if (!v) return null;
    const tail = v.length >= 4 ? v.slice(-4) : v;
    const head = v.includes("-") ? v.split("-")[0] : v.slice(0, 4);
    return { head, tail, len: v.length };
  }

  const botToken = process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN || "";
  const appToken = process.env.SLACK_APP_TOKEN || "";
  const looksLikeWebhook = String(botToken).includes("hooks.slack.com/services/");
  const looksLikeBot = /^xoxb-/.test(String(botToken).trim());
  const looksLikeApp = /^xapp-/.test(String(appToken).trim());

  res.json({
    ok: true,
    slack: getSlackHealth(),
    watchtower: getSlackTokenWatchdogStatus(),
    env: {
      hasToken,
      hasSigningSecret,
      hasAppToken,
      hasAlertWebhook,
      oauthRefreshEnabled,
      hasRefreshConfig,
      tokenHints: {
        bot: { present: Boolean(String(botToken).trim()), looksLikeBot, looksLikeWebhook, masked: mask(botToken) },
        app: { present: Boolean(String(appToken).trim()), looksLikeApp, masked: mask(appToken) },
        signingSecret: { present: hasSigningSecret, len: String(process.env.SLACK_SIGNING_SECRET || "").trim().length || 0 },
      },
    },
    hint:
      "If slack.token_expired is true, reinstall the Slack app to get a new xoxb token and update SLACK_BOT_TOKEN.",
  });
});

router.post("/slack/recheck", async (_req, res) => {
  try {
    const id = await getBotUserId();
    res.json({ ok: true, bot_user_id: id });
  } catch (err) {
    // Keep admin route usable even if Slack is unhealthy.
    res.json({ ok: false, bot_user_id: null, error: String(err?.message || err) });
  }
});

export default router;
