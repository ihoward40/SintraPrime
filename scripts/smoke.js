import { sendMessage } from "../sendMessage.js";

const message = process.argv.slice(2).join(" ").trim() || "/build validation-agent {\"dry_run\":false}";
const threadId = process.env.THREAD_ID || "local_test_001";

const result = await sendMessage({ message, threadId });

// Emit JSON only so callers can pipe/parse deterministically.
process.stdout.write(
  JSON.stringify(
    {
      status: result.status,
      ok: result.ok,
      threadId: result.response?.threadId,
      response: result.response,
    },
    null,
    2
  )
);
