# EchPachMack

Composio integration using `@composio/core`.

## Setup

```sh
npm install
cp .env.example .env   # then fill in COMPOSIO_API_KEY
```

## Scripts

- `npm run smoke`: no-auth call (`HACKERNEWS_GET_FRONTPAGE`) that checks your key and network.
- `npm run connect -- [toolkit] [toolSlug]`: connects a toolkit through OAuth, then calls a tool.
  It defaults to `github` and `GITHUB_GET_THE_AUTHENTICATED_USER`. If the user already has an
  active connection, it reuses it.
