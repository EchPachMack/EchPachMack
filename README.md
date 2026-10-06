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

## NBA FUT Draft

`futdraft/` is a FUT Draft–style browser game that uses only NBA players. Open
`futdraft/index.html` in a browser. It has no build step and no dependencies.

1. Pick a captain from 5 players rated 88+.
2. Click each empty slot (PG, SG, SF, PF, C and 3 bench spots), then pick 1 of 5 cards.
   Starter slots can offer players from adjacent positions, but those players lose the position chemistry point.
3. Play a 4-round tournament. Your win chance depends on team rating and chemistry.

Player chemistry runs from 0 to 3: +1 for the player's natural position, +1 for a teammate from the same NBA team,
and +1 when 4 or more other players come from the same conference. Rosters and ratings are approximate fan
estimates. Edit them in `futdraft/players.js`.
