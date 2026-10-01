// No-auth tool call: proves the API key and network path work before any OAuth.
import { composio, userId } from './client.mjs';

const result = await composio.tools.execute('HACKERNEWS_GET_FRONTPAGE', {
  userId,
  arguments: {},
  // Resolving 'latest' returns 404 for this toolkit, so pin an explicit version.
  version: '20260312_00',
});

if (!result.successful) {
  console.error('Tool call failed:', result.error);
  process.exit(1);
}
console.log(JSON.stringify(result.data, null, 2).slice(0, 2000));
