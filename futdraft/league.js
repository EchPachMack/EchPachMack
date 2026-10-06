// 82-game schedule, game simulation, standings and the play-in/playoff bracket.
const ALL_TEAMS = [...DIVISIONS.East.flat(), ...DIVISIONS.West.flat()];

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

// ---------- possession-by-possession game ----------
// Minutes for a 10-man rotation (starters first). Sum = 240.
const MINUTES = [35, 34, 33, 32, 30, 24, 20, 16, 10, 6];
const STYLE_USAGE = { scorer: 1.3, slasher: 1.1, playmaker: 1.05, sniper: 1.0, post: 1.0, athlete: 0.95, stretch: 0.9, twoway: 0.9, threeD: 0.75, glue: 0.7, lockdown: 0.65, rim: 0.6 };
// Depth player for clubs whose real bench is not in the player pool: a solid end-of-rotation NBA player.
const REPLACEMENT = { id: null, name: "Игрок замены", pos: "SF", ovr: 76, styles: ["glue"],
  a: { three: 66, mid: 62, ft: 72, ins: 64, pas: 60, bh: 60, perD: 64, intD: 60, stl: 60, blk: 55, reb: 60, ath: 66, dur: 80, iq: 66, clu: 50 } };

// Builds what the simulation needs for one team: rotation, minutes-weighted ratings, usage and shot mix.
function makeTeam(code, players, chem) {
  const rot = players.slice(0, 10);
  while (rot.length < 10) rot.push(REPLACEMENT);
  const mins = rot.map((_, i) => MINUTES[i]);
  const avg = (k) => rot.reduce((s, p, i) => s + p.a[k] * mins[i], 0) / 240;
  const usage = rot.map((p, i) => mins[i] * Math.max(0.5, 1 + (p.ovr - 72) * 0.045) * Math.max(...p.styles.map((st) => STYLE_USAGE[st] || 1)));
  const mix = rot.map((p) => {
    const w3 = 2.8 * Math.max(2, p.a.three - 48) ** 1.25;
    const wMid = Math.max(2, p.a.mid - 55) ** 1.25;
    const wIns = Math.max(2, p.a.ins - 45) ** 1.5;
    const t = w3 + wMid + wIns;
    return [w3 / t, wMid / t];
  });
  const r = {};
  for (const k of ATTR_KEYS) r[k] = avg(k);
  return { code, rot, mins, r, usage, mix, chem };
}

function pickIndex(weights, rand) {
  let t = 0;
  for (const w of weights) t += w;
  let x = rand() * t;
  for (let i = 0; i < weights.length; i++) if ((x -= weights[i]) < 0) return i;
  return weights.length - 1;
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Plays one game. Returns score, per-player box lines, possessions, overtimes and the game-winning shooter.
function simGame(home, away, rand = Math.random) {
  const box = new Map();
  const line = (p) => {
    if (p.id == null) return null;
    if (!box.has(p.id)) box.set(p.id, { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, cpts: 0, cfgm: 0, cfga: 0, gw: 0 });
    return box.get(p.id);
  };
  const add = (p, k, v = 1) => {
    const l = line(p);
    if (l) l[k] += v;
  };
  const score = { [home.code]: 0, [away.code]: 0 };
  // Shooting nights vary: every team gets a hot or cold factor for the game.
  home.hot = (rand() + rand() + rand() - 1.5) * 0.04;
  away.hot = (rand() + rand() + rand() - 1.5) * 0.04;
  const pace = 98.5 + ((home.r.ath + away.r.ath) / 2 - 68) * 0.25 + (rand() * 6 - 3);
  const regPoss = Math.round(pace);
  let goAhead = null;

  function possession(off, def, clutch, homeTeam, left, extra = 0) {
    const o = off.r;
    const d = def.r;
    const boost = (homeTeam ? 0.012 : 0) + off.chem * 0.004 + (off.edge || 0);
    const tov = 0.135 + (68 - (o.bh + o.pas) / 2) * 0.0016 + (d.stl - 66) * 0.0018 - off.chem * 0.002 - (off.edge || 0) * 0.5;
    if (extra === 0 && rand() < tov) {
      add(off.rot[pickIndex(off.usage, rand)], "tov");
      if (rand() < 0.6) add(def.rot[pickIndex(def.rot.map((p, i) => p.a.stl * def.mins[i]), rand)], "stl");
      return;
    }
    // In the clutch the ball goes to stars, weighted by their clutch rating.
    const weights = clutch ? off.usage.map((u, i) => u ** 1.4 * (0.4 + off.rot[i].a.clu / 100)) : off.usage;
    const si = pickIndex(weights, rand);
    const sh = off.rot[si];
    const a = sh.a;
    const before = score[off.code] - score[def.code];
    const clutchMod = clutch ? (a.clu - 70) * 0.0028 : 0;
    const scored = (pts) => {
      score[off.code] += pts;
      add(sh, "pts", pts);
      if (clutch) add(sh, "cpts", pts);
      const after = score[off.code] - score[def.code];
      if (before <= 0 && after > 0 && left <= 2) goAhead = { team: off.code, p: sh };
    };
    if (rand() < 0.12 + (a.ins - 70) * 0.001 + (a.ath - 70) * 0.0008) {
      // Shooting foul: two free throws.
      const ftPct = clamp(0.28 + a.ft * 0.0068 + (clutch ? (a.clu - 70) * 0.0015 : 0), 0.4, 0.95);
      let made = 0;
      for (let i = 0; i < 2; i++) {
        add(sh, "fta");
        if (rand() < ftPct) { made++; add(sh, "ftm"); }
      }
      if (made) scored(made);
      return;
    }
    const [p3, pMid] = off.mix[si];
    const x = rand();
    let type = x < p3 ? 3 : x < p3 + pMid ? 1 : 2; // 1 = mid-range two
    if (left === 1 && before === -3) type = 3; // down three at the end: must shoot a three
    if (left === 1 && (before === -2 || before === -1) && type === 3 && rand() < 0.6) type = 2;
    let pct;
    if (type === 3) pct = 0.35 + (a.three - 75) * 0.0033 - (d.perD - 65) * 0.0016;
    else if (type === 1) pct = 0.41 + (a.mid - 72) * 0.003 - (d.perD - 65) * 0.0014;
    else pct = 0.615 + (a.ins - 72) * 0.003 + (a.ath - 70) * 0.001 - (d.intD - 60) * 0.0024;
    pct = clamp(pct + boost + clutchMod + off.hot, 0.12, 0.8); // nobody is automatic, nobody hopeless
    add(sh, "fga");
    if (clutch) add(sh, "cfga");
    if (type === 3) add(sh, "tpa");
    const blocked = type === 2 && rand() < clamp(0.1 + (d.blk - 58) * 0.003, 0.03, 0.2);
    if (blocked) add(def.rot[pickIndex(def.rot.map((p, i) => p.a.blk ** 3 * def.mins[i]), rand)], "blk");
    if (!blocked && rand() < pct) {
      add(sh, "fgm");
      if (clutch) add(sh, "cfgm");
      if (type === 3) add(sh, "tpm");
      scored(type === 3 ? 3 : 2);
      if (rand() < (type === 2 ? 0.58 : 0.8)) {
        const passers = off.usage.map((_, i) => (i === si ? 0 : off.rot[i].a.pas ** 2 * off.mins[i]));
        add(off.rot[pickIndex(passers, rand)], "ast");
      }
      return;
    }
    const oreb = clamp(0.27 + (o.reb - d.reb) * 0.005, 0.14, 0.4);
    if (rand() < oreb) {
      add(off.rot[pickIndex(off.rot.map((p, i) => p.a.reb ** 2 * off.mins[i]), rand)], "reb");
      if (extra < 3) possession(off, def, clutch, homeTeam, left, extra + 1);
    } else {
      add(def.rot[pickIndex(def.rot.map((p, i) => p.a.reb ** 2 * def.mins[i]), rand)], "reb");
    }
  }

  function period(n, alwaysClutchWindow) {
    for (let i = 0; i < n; i++) {
      const left = n - i;
      const margin = Math.abs(score[home.code] - score[away.code]);
      const clutch = margin <= 5 && (alwaysClutchWindow || left <= 10);
      possession(home, away, clutch, true, left);
      const margin2 = Math.abs(score[home.code] - score[away.code]);
      possession(away, home, margin2 <= 5 && (alwaysClutchWindow || left <= 10), false, left);
    }
  }

  period(regPoss, false);
  let ot = 0;
  while (score[home.code] === score[away.code]) {
    ot++;
    period(11, true);
  }
  const winner = score[home.code] > score[away.code] ? home.code : away.code;
  let gw = null;
  if (goAhead && goAhead.team === winner && goAhead.p.id != null) {
    gw = goAhead.p.id;
    add(goAhead.p, "gw");
  }
  return { hs: score[home.code], as: score[away.code], box, poss: regPoss + ot * 11, ot, gw };
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
