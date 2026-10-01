# EchPachMack

Composio integration using `@composio/core`.

## Setup

```sh
npm install
cp .env.example .env   # then fill in COMPOSIO_API_KEY
```

The key is sent in the `x-api-key` header. If your environment injects that header through a
proxy (API credentials), leave `COMPOSIO_API_KEY` unset; the scripts pass a placeholder and run
Node with `NODE_USE_ENV_PROXY=1` so built-in `fetch` goes through `HTTPS_PROXY`.

The key needs `tool_execution` write access for both scripts, and `auth_configs` write access
for `connect` the first time it sets up a toolkit.

## Scripts

- `npm run smoke`: no-auth call (`HACKERNEWS_GET_FRONTPAGE`) that checks your key and network.
- `npm run connect -- [toolkit] [toolSlug]`: connects a toolkit through OAuth, then calls a tool.
  It defaults to `github` and `GITHUB_GET_THE_AUTHENTICATED_USER`. If the user already has an
  active connection, it reuses it.
