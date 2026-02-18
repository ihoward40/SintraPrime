import { sendMessage } from '../sendMessage.js';

const webhookUrl = process.env.WEBHOOK_URL;
const webhookSecret = process.env.WEBHOOK_SECRET;

if (!webhookUrl || !webhookSecret) {
  console.log('[skip] test-build.js requires WEBHOOK_URL and WEBHOOK_SECRET');
  process.exit(0);
}

try {
  const url = new URL(webhookUrl);
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!isLocalhost && process.env.ALLOW_NONLOCAL_WEBHOOK_TESTS !== '1') {
    console.log(`[skip] test-build.js WEBHOOK_URL is not localhost: ${webhookUrl}`);
    console.log('[skip] Set ALLOW_NONLOCAL_WEBHOOK_TESTS=1 to override');
    process.exit(0);
  }
} catch {
  console.log(`[skip] test-build.js WEBHOOK_URL is not a valid URL: ${webhookUrl}`);
  process.exit(0);
}

const result = await sendMessage({
  message: '/build validation-agent {"dry_run":false}',
  threadId: 'local_test_001'
});

console.log('HTTP:', result.status);
console.log('Agent response:', result.response);
