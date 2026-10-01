// Connect a toolkit (OAuth via Composio's managed auth) and make a first authenticated call.
// Usage: npm run connect -- [toolkit] [toolSlug]
import { Composio } from '@composio/core';

const [toolkit = 'github', toolSlug = 'GITHUB_GET_THE_AUTHENTICATED_USER'] = process.argv.slice(2);
const userId = process.env.COMPOSIO_USER_ID ?? 'default';
const composio = new Composio();

const existing = await composio.connectedAccounts.list({
  userIds: [userId],
  toolkitSlugs: [toolkit],
  statuses: ['ACTIVE'],
});

if (existing.items.length === 0) {
  const request = await composio.toolkits.authorize(userId, toolkit);
  console.log(`Open this URL to connect ${toolkit}:\n\n  ${request.redirectUrl}\n`);
  console.log('Waiting for you to finish (up to 5 minutes)...');
  await request.waitForConnection(300_000);
  console.log(`Connected ${toolkit} for user "${userId}".`);
} else {
  console.log(`Reusing active ${toolkit} connection ${existing.items[0].id}.`);
}

const result = await composio.tools.execute(toolSlug, {
  userId,
  arguments: {},
  dangerouslySkipVersionCheck: true,
});

if (!result.successful) {
  console.error(`${toolSlug} failed:`, result.error);
  process.exit(1);
}
console.log(JSON.stringify(result.data, null, 2).slice(0, 2000));
