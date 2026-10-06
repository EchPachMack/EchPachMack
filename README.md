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

`futdraft/` is a FUT Draft–style browser game that uses only NBA players, followed by a full NBA season.
Open `futdraft/index.html` in a browser. It has no build step and no dependencies. Progress is saved in `localStorage`.

1. Choose the franchise your draft team replaces. That club's undrafted players become free agents.
2. Pick a captain from 5 players rated 88+. Then fill 13 slots (5 starters and 8 bench) by picking 1 of 5 cards for each.
   The second apron works as a hard cap during the draft. Cards that would break it are locked.
3. Play an 82-game season on the NBA format: 4 games against each division rival, 3 or 4 against the rest of the
   conference, and 2 against the other conference. The play-in follows (7–10 seeds), then four best-of-7 rounds.
4. During the season you can make 1-for-1 trades until the deadline, using 2023 CBA salary matching. You can sign
   free agents with cap room, the MLE or a minimum deal, release players (their salary stays as dead money), and
   reorder the roster. Players on your team can get injured.
5. Finances use 2025-26 cap figures: cap, tax line, both aprons and the salary floor. The luxury tax is incremental.
   Revenue comes from media, tickets (these grow with win %) and playoff home games. The season ends with a
   profit-and-loss summary and the owner's verdict.

Files: `players.js` (player pool), `finance.js` (cap rules and economics), `league.js` (schedule, simulation,
playoffs) and `app.js` (UI). Ratings and salaries are approximate fan estimates.
