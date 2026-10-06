// 82-game schedule, game simulation, standings and the play-in/playoff bracket.
const ALL_TEAMS = [...DIVISIONS.East.flat(), ...DIVISIONS.West.flat()];
const HOME_EDGE = 1.5;
const SPREAD = 3.5;

function teamInfo(code) {
  for (const conf of ["East", "West"]) {
    const d = DIVISIONS[conf].findIndex((div) => div.includes(code));
    if (d >= 0) return { conf, div: d, idx: DIVISIONS[conf][d].indexOf(code) };
  }
  throw new Error(`Unknown team ${code}`);
}

// NBA format: 4 games vs division rivals, 4 vs six conference teams, 3 vs four, 2 vs the other conference.
// Returns [games, gamesHostedByA].
function matchup(a, b) {
  const A = teamInfo(a);
  const B = teamInfo(b);
  if (A.conf !== B.conf) return [2, 1];
  if (A.div === B.div) return [4, 2];
  if (B.div === (A.div + 1) % 3 && (B.idx === A.idx || B.idx === (A.idx + 1) % 5)) return [3, 2];
  if (B.div === (A.div + 2) % 3 && (B.idx === A.idx || B.idx === (A.idx + 4) % 5)) return [3, 1];
  return [4, 2];
}

function buildSchedule(rand = Math.random) {
  const games = [];
  for (let i = 0; i < ALL_TEAMS.length; i++) {
    for (let j = i + 1; j < ALL_TEAMS.length; j++) {
      const a = ALL_TEAMS[i];
      const b = ALL_TEAMS[j];
      const [n, aHome] = matchup(a, b);
      for (let k = 0; k < n; k++) games.push(k < aHome ? { h: a, a: b } : { h: b, a: a });
    }
  }
  for (let i = games.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [games[i], games[j]] = [games[j], games[i]];
  }
  // Greedy: each game goes on the first day both teams are free and neither played the day before too often.
  const busy = {};
  for (const g of games) {
    let d = 0;
    while (busy[`${g.h}:${d}`] || busy[`${g.a}:${d}`] || (busy[`${g.h}:${d - 1}`] && busy[`${g.h}:${d - 2}`]) || (busy[`${g.a}:${d - 1}`] && busy[`${g.a}:${d - 2}`])) d++;
    busy[`${g.h}:${d}`] = busy[`${g.a}:${d}`] = true;
    g.d = d;
    g.hs = null;
    g.as = null;
  }
  games.sort((x, y) => x.d - y.d);
  return games;
}

// Team strength from a list of player ratings (any order). Weights: starters, top 3 bench, deep bench.
function rotationRating(ovrs, filler = 74) {
  const list = ovrs.slice().sort((a, b) => b - a);
  while (list.length < 13) list.push(filler);
  const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  return 0.7 * avg(list.slice(0, 5)) + 0.22 * avg(list.slice(5, 8)) + 0.08 * avg(list.slice(8, 13));
}

function winProb(homeRating, awayRating, neutral = false) {
  return 1 / (1 + Math.exp(-(homeRating + (neutral ? 0 : HOME_EDGE) - awayRating) / SPREAD));
}

function playGame(homeRating, awayRating, rand = Math.random) {
  const homeWins = rand() < winProb(homeRating, awayRating);
  const loser = 98 + Math.floor(rand() * 22);
  const margin = 1 + Math.floor(Math.abs(rand() + rand() + rand() - 1.5) * 18);
  return homeWins ? [loser + margin, loser] : [loser, loser + margin];
}

function standings(schedule) {
  const rec = {};
  for (const t of ALL_TEAMS) rec[t] = { team: t, w: 0, l: 0, last: [] };
  for (const g of schedule) {
    if (g.hs == null) continue;
    const homeWon = g.hs > g.as;
    rec[g.h][homeWon ? "w" : "l"]++;
    rec[g.a][homeWon ? "l" : "w"]++;
    rec[g.h].last.push(homeWon ? "W" : "L");
    rec[g.a].last.push(homeWon ? "L" : "W");
  }
  const table = {};
  for (const conf of ["East", "West"]) {
    const rows = DIVISIONS[conf].flat().map((t) => rec[t]);
    rows.forEach((r) => (r.pct = r.w + r.l ? r.w / (r.w + r.l) : 0));
    // Tiebreak by total wins, then a stable per-team order.
    rows.sort((a, b) => b.pct - a.pct || b.w - a.w || nameHash(a.team) - nameHash(b.team));
    const lead = rows[0];
    rows.forEach((r) => (r.gb = (lead.w - r.w + r.l - lead.l) / 2));
    table[conf] = rows;
  }
  return table;
}

function newSeries(hi, lo, conf) {
  return { hi, lo, conf, wins: { [hi]: 0, [lo]: 0 }, games: [], winner: null };
}

// Home court in games 1, 2, 5, 7 for the higher seed (2-2-1-1-1).
function seriesHome(s) {
  const n = s.games.length;
  return [0, 1, 4, 6].includes(n) ? s.hi : s.lo;
}

const ROUND_NAMES = ["1-й раунд", "Полуфинал конференции", "Финал конференции", "Финал НБА"];
