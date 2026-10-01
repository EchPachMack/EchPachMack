// Connect a toolkit (OAuth via Composio's managed auth) and make a first authenticated call,
// all through a session.
// Usage: npm run connect -- [toolkit] [toolSlug]
import { composio, userId } from './client.mjs';

const [toolkit = 'github', toolSlug = 'GITHUB_GET_THE_AUTHENTICATED_USER'] = process.argv.slice(2);

const session = await composio.create(userId, { toolkits: [toolkit] });

const { items } = await session.toolkits({ toolkits: [toolkit] });
const connection = items.find((item) => item.slug === toolkit)?.connection;

if (connection?.isActive) {
  console.log(`Reusing active ${toolkit} connection ${connection.connectedAccount?.id}.`);
} else {
  const request = await session.authorize(toolkit);
  console.log(`Open this URL to connect ${toolkit}:\n\n  ${request.redirectUrl}\n`);
  console.log('Waiting for you to finish (up to 5 minutes)...');
  await request.waitForConnection(300_000);
  console.log(`Connected ${toolkit} for user "${userId}".`);
}

const result = await session.execute(toolSlug, {});

if (result.error) {
  console.error(`${toolSlug} failed:`, result.error);
  process.exit(1);
}
console.log(JSON.stringify(result.data, null, 2).slice(0, 2000));
