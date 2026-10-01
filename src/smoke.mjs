// No-auth tool call: proves the API key and network path work before any OAuth.
import { Composio } from '@composio/core';

const composio = new Composio();

const result = await composio.tools.execute('HACKERNEWS_GET_FRONTPAGE', {
  userId: process.env.COMPOSIO_USER_ID ?? 'default',
  arguments: {},
  dangerouslySkipVersionCheck: true,
});

if (!result.successful) {
  console.error('Tool call failed:', result.error);
  process.exit(1);
}
console.log(JSON.stringify(result.data, null, 2).slice(0, 2000));
