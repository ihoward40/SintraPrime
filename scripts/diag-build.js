import { sendMessage } from '../sendMessage.js';

const result = await sendMessage({
  message: '/build validation-agent {"dry_run":false}',
  threadId: 'local_test_001'
});

console.log('HTTP:', result.status);
console.log('Agent response:', result.response);
