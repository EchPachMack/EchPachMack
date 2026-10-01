// No-auth tool call through a session: proves the API key and network path work before any OAuth.
import { composio, userId } from './client.mjs';

const session = await composio.create(userId, { toolkits: ['hackernews'] });
const result = await session.execute('HACKERNEWS_GET_TOP_STORIES', {});

if (result.error) {
  console.error('Tool call failed:', result.error);
  process.exit(1);
}
console.log(JSON.stringify(result.data, null, 2).slice(0, 2000));
