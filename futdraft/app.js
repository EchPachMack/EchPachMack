// NBA FUT Draft: pick a franchise and a captain, draft 13 players under the salary cap, then play a full NBA season.
const SAVE_KEY = "nba-futdraft-v2";
const DATA_VERSION = 3;
const SLOTS = [
  { key: "PG", label: "PG", accepts: ["PG"], adjacent: ["SG"], starter: true, draft: true },
  { key: "SG", label: "SG", accepts: ["SG"], adjacent: ["PG", "SF"], starter: true, draft: true },
  { key: "SF", label: "SF", accepts: ["SF"], adjacent: ["SG", "PF"], starter: true, draft: true },
  { key: "PF", label: "PF", accepts: ["PF"], adjacent: ["SF", "C"], starter: true, draft: true },
  { key: "C", label: "C", accepts: ["C"], adjacent: ["PF"], starter: true, draft: true },
  { key: "B1", label: "Запас G", accepts: ["PG", "SG"], adjacent: [], draft: true },
  { key: "B2", label: "Запас F", accepts: ["SF", "PF"], adjacent: [], draft: true },
  { key: "B3", label: "Запас BIG", accepts: ["PF", "C"], adjacent: [], draft: true },
  { key: "B4", label: "Запас G", accepts: ["PG", "SG"], adjacent: [], draft: true },
  { key: "B5", label: "Запас F", accepts: ["SF", "PF"], adjacent: [], draft: true },
  { key: "B6", label: "Запас BIG", accepts: ["PF", "C"], adjacent: [], draft: true },
  { key: "B7", label: "Запас", accepts: ["PG", "SG", "SF", "PF", "C"], adjacent: [], draft: true },
  { key: "B8", label: "Запас", accepts: ["PG", "SG", "SF", "PF", "C"], adjacent: [], draft: true },
  { key: "R1", label: "Резерв", accepts: ["PG", "SG", "SF", "PF", "C"], adjacent: [], draft: false },
  { key: "R2", label: "Резерв", accepts: ["PG", "SG", "SF", "PF", "C"], adjacent: [], draft: false },
];
const DRAFT_SLOTS = SLOTS.filter((s) => s.draft);
const CHOICES = 5;
const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

let state = load() || freshState();
let confirmRestart = false;

function freshState() {
  return {
    v: DATA_VERSION, phase: "franchise", franchise: null, lineup: {}, pending: null,
    owners: {}, dead: [], mleUsed: false, injuries: {}, schedule: null, day: 0, lastDay: 0, deadline: 0,
    fin: { gate: 0, playoffGate: 0, salaryPaid: 0 }, po: null, tab: "overview", sel: null,
    trade: { out: null, in: null }, news: [], stats: emptyStats(), info: null, statKind: "reg", teamSort: "net",
  };
}

function emptyStats() {
  return { reg: { players: {}, teams: {} }, po: { players: {}, teams: {} } };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.v === 2) {
      // Version 2 saves have no detailed stats yet: keep the season and start counting from today.
      Object.assign(s, { v: 3, stats: emptyStats(), info: null, statKind: "reg", teamSort: "net" });
    }
    return s && s.v === DATA_VERSION ? s : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the game still works for this visit.
  }
}

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
const P = (id) => NBA_PLAYERS[id];
const sal = (p) => salaryFor(p);
const slotOf = (key) => SLOTS.find((s) => s.key === key);
const rosterIds = () => Object.values(state.lineup);
const healthy = (id) => !(state.injuries[id] > 0);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const teamName = (code) => (code === state.franchise ? `★ ${NBA_TEAMS[code]}` : NBA_TEAMS[code]);
const teamLabel = (code) => NBA_TEAMS[code] || "G League";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function news(text) {
  state.news.unshift(text);
  state.news.length = Math.min(state.news.length, 30);
}

function payroll() {
  return rosterIds().reduce((s, id) => s + sal(P(id)), 0) + state.dead.reduce((s, d) => s + d.sal, 0);
}

// Chemistry per player (0..3): natural position, a teammate from the same NBA club, half the roster from the same conference.
function playerChem(slotKey) {
  const slot = slotOf(slotKey);
  const p = P(state.lineup[slotKey]);
  const others = rosterIds().filter((id) => id !== p.id).map(P);
  let chem = slot.accepts.includes(p.pos) ? 1 : 0;
  if (p.team !== "GL" && others.some((q) => q.team === p.team)) chem++;
  if (others.length >= 4 && others.filter((q) => q.conf === p.conf).length >= Math.floor(others.length / 2)) chem++;
  return chem;
}

function teamChem() {
  const keys = Object.keys(state.lineup);
  return { sum: keys.reduce((s, k) => s + playerChem(k), 0), max: 3 * keys.length || 1 };
}

function userRating(onlyHealthy = false) {
  const ids = rosterIds().filter((id) => !onlyHealthy || healthy(id));
  return ids.length ? rotationRating(ids.map((id) => P(id).ovr)) : 0;
}

const ownerTeam = (id) => (state.owners[id] === "USER" ? state.franchise : state.owners[id]);

// Your rotation: healthy starters in their slots (an injured starter is replaced by the best healthy bench player), then the bench by OVR.
function userRotation() {
  const starters = SLOTS.filter((s) => s.starter).map((s) => state.lineup[s.key]).filter((id) => id != null && healthy(id)).map(P);
  const bench = rosterIds().map(P).filter((p) => healthy(p.id) && !starters.includes(p)).sort((a, b) => b.ovr - a.ovr);
  while (starters.length < 5 && bench.length) starters.push(bench.shift());
  return [...starters, ...bench];
}

function teamRotation(code) {
  if (code === state.franchise) return userRotation();
  return Object.keys(state.owners).filter((id) => state.owners[id] === code && healthy(id)).map(P).sort((a, b) => b.ovr - a.ovr);
}

// Chemistry turns into a small shooting and ball-security bonus (-2.5..+2.5). AI clubs are settled teams: +1.
function simTeam(code) {
  const c = teamChem();
  const chem = code === state.franchise ? (c.sum / c.max) * 5 - 2.5 : 1;
  return makeTeam(code, teamRotation(code), chem);
}

// Team-level ratings: minutes-weighted attributes of the current rotation plus results on the court.
function teamRatings(code) {
  const t = code === state.franchise && !state.schedule ? makeTeam(code, userRotation(), 0) : simTeam(code);
  const r = t.r;
  const top = t.rot.map((p, i) => ({ p, u: t.usage[i] })).sort((x, y) => y.u - x.u).slice(0, 3);
  const ts = state.stats.reg.teams[code];
  return {
    code, ovr: rotationRating(t.rot.map((p) => p.ovr)), atk: offenseScore(r), def: defenseScore(r),
    three: r.three, ins: r.ins, pas: r.pas, perD: r.perD, intD: r.intD, reb: r.reb, ath: r.ath,
    clu: top.reduce((s, x) => s + x.p.a.clu, 0) / top.length,
    ortg: ts && ts.poss ? (100 * ts.pts) / ts.poss : null,
    drtg: ts && ts.poss ? (100 * ts.opp) / ts.poss : null,
    pace: ts && ts.g ? ts.poss / ts.g : null,
    net: ts && ts.poss ? (100 * (ts.pts - ts.opp)) / ts.poss : null,
  };
}

const CARD_ATTRS = ["three", "mid", "ins", "pas", "perD", "intD", "reb", "clu"];
const attrShort = (k) => ATTRS.find((x) => x.key === k).short;
const attrLevel = (v) => (v >= 88 ? "a-elite" : v >= 78 ? "a-good" : v >= 65 ? "a-mid" : "a-low");
// Team averages sit lower than single-player ratings, so they get a shifted scale.
const teamLevel = (v) => attrLevel(v + 9);

function cardHtml(p, extra = "", note = "", cls = "", detail = false) {
  const tier = p.ovr >= 90 ? "elite" : p.ovr >= 85 ? "gold" : p.ovr >= 78 ? "silver" : "bronze";
  const conf = p.conf === "West" ? "Запад" : p.conf === "East" ? "Восток" : "";
  const chips = detail
    ? `<div class="attr-grid">${CARD_ATTRS.map((k) => `<span><i>${attrShort(k)}</i><b class="${attrLevel(p.a[k])}">${p.a[k]}</b></span>`).join("")}</div>`
    : `<div class="chips"><span>3PT <b>${p.a.three}</b></span><span>ЗАЩ <b>${Math.round(defenseScore(p.a))}</b></span><span>КЛЧ <b>${p.a.clu}</b></span></div>`;
  return `<div class="card ${tier} ${cls} ${detail ? "wide" : ""}" ${extra}>
    <div class="ovr">${p.ovr}<span>${p.pos}</span></div>
    <div class="name">${esc(p.name)}</div>
    <div class="team" title="${esc(teamLabel(p.team))}">${p.team === "GL" ? "G League" : `${p.team} · ${conf}`}</div>
    ${chips}
    <div class="salary">${money(sal(p))}</div>${note}
  </div>`;
}

function chemDots(c) {
  return `<span class="dots chem-${c}">${"●".repeat(c)}${"○".repeat(3 - c)}</span>`;
}

function capBar() {
  const pay = payroll();
  const max = 220;
  const pos = (x) => `${(Math.min(x, max) / max) * 100}%`;
  const zone = capZone(pay);
  const marks = [[CAP, "П", "потолок"], [TAX_LINE, "Н", "налог"], [APRON_1, "1А", "1-й апрон"], [APRON_2, "2А", "2-й апрон"]];
  return `<div class="capbar" aria-label="Зарплатная ведомость ${money(pay)}">
    <div class="capfill zone-${zone.key}" style="width:${pos(pay)}"></div>
    ${marks.map(([x, short], i) => `<div class="capmark ${i % 2 ? "low" : ""}" style="left:${pos(x)}"><span>${short}</span></div>`).join("")}
  </div>
  <p class="cap-legend">${marks.map(([x, short, long]) => `<span><b>${short}</b> ${long} ${money(x)}</span>`).join("")}</p>`;
}

// ---------- draft ----------
const draftable = () => NBA_PLAYERS.filter((p) => p.team !== "GL" && !rosterIds().includes(p.id));

function reserveCost(slotsLeft, pool) {
  return pool.map(sal).sort((a, b) => a - b).slice(0, slotsLeft).reduce((s, x) => s + x, 0);
}

function affordable(p) {
  const left = DRAFT_SLOTS.filter((s) => state.lineup[s.key] == null).length - 1;
  const pool = draftable().filter((q) => q.id !== p.id);
  return payroll() + sal(p) + reserveCost(left, pool) <= APRON_2;
}

function slotOptions(slot) {
  const pool = shuffle(draftable());
  const natural = pool.filter((p) => slot.accepts.includes(p.pos));
  const adjacent = pool.filter((p) => slot.adjacent.includes(p.pos));
  const options = adjacent.slice(0, Math.min(2, adjacent.length));
  for (const p of natural) {
    if (options.length >= CHOICES) break;
    options.push(p);
  }
  if (!options.some(affordable)) {
    // Always offer at least one player who fits: same position first, then any position, then a G League prospect.
    const byPrice = (list) => list.filter(affordable).sort((a, b) => sal(a) - sal(b))[0];
    const gLeague = NBA_PLAYERS.filter((p) => p.team === "GL" && !rosterIds().includes(p.id));
    const cheap = byPrice(natural) || byPrice(pool) || byPrice(gLeague);
    if (cheap) options[options.length - 1] = cheap;
    else {
      // Payroll is already over the hard cap (old save): let the cheapest prospect through so the draft can finish.
      const prospect = gLeague.sort((a, b) => sal(a) - sal(b))[0];
      options[options.length - 1] = prospect;
      return { ids: shuffle(options).map((p) => p.id), forced: prospect.id };
    }
  }
  return { ids: shuffle(options).map((p) => p.id) };
}

function openSlot(key) {
  state.pending = { slot: key, ...slotOptions(slotOf(key)) };
}

function openCaptain() {
  const ids = shuffle(NBA_PLAYERS.filter((p) => p.team !== "GL" && p.ovr >= 88)).slice(0, CHOICES).map((p) => p.id);
  state.pending = { slot: "captain", ids };
}

function canPick(id) {
  const pend = state.pending;
  return pend.slot === "captain" || pend.forced === id || affordable(P(id));
}

function pick(id) {
  const p = P(id);
  if (state.pending.slot === "captain") {
    state.lineup[p.pos] = id;
    state.phase = "draft";
  } else {
    if (!canPick(id)) return;
    state.lineup[state.pending.slot] = id;
  }
  state.pending = null;
}

// ---------- season ----------
function startSeason() {
  state.owners = {};
  for (const p of NBA_PLAYERS) {
    state.owners[p.id] = rosterIds().includes(p.id) ? "USER" : p.team === state.franchise || p.team === "GL" ? "FA" : p.team;
  }
  state.schedule = buildSchedule();
  state.lastDay = state.schedule[state.schedule.length - 1].d;
  state.deadline = Math.floor(state.lastDay * 0.6);
  state.day = 0;
  state.stats = emptyStats();
  state.injuries = {};
  state.phase = "season";
  state.tab = "overview";
  news(`Сезон стартовал. Дедлайн обменов — день ${state.deadline + 1}.`);
}

function userRecord() {
  let w = 0;
  let l = 0;
  for (const g of state.schedule || []) {
    if (g.hs == null || (g.h !== state.franchise && g.a !== state.franchise)) continue;
    const homeWon = g.hs > g.as;
    if ((g.h === state.franchise) === homeWon) w++;
    else l++;
  }
  return { w, l };
}

// Plays a game between two clubs, records stats, heals and injures players. kind: "reg" | "po".
function playMatch(home, away, kind, g = null) {
  const H = simTeam(home);
  const A = simTeam(away);
  const r = simGame(H, A);
  const book = state.stats[kind];
  for (const T of [H, A]) {
    T.rot.forEach((p, i) => {
      if (p.id == null) return;
      const line = (book.players[p.id] ||= { g: 0, min: 0, team: T.code });
      line.g++;
      line.min += T.mins[i];
      line.team = T.code;
      const box = r.box.get(p.id);
      if (box) for (const k in box) line[k] = (line[k] || 0) + box[k];
    });
    const mine = T === H ? r.hs : r.as;
    const theirs = T === H ? r.as : r.hs;
    const tl = (book.teams[T.code] ||= { g: 0, pts: 0, opp: 0, poss: 0 });
    tl.g++;
    tl.pts += mine;
    tl.opp += theirs;
    tl.poss += r.poss;
    injuries(T);
  }
  const userGame = home === state.franchise || away === state.franchise;
  if (g && userGame) {
    const mineIds = [...r.box.keys()].filter((id) => ownerTeam(id) === state.franchise);
    const best = mineIds.sort((x, y) => r.box.get(y).pts - r.box.get(x).pts)[0];
    if (best != null) g.top = [best, r.box.get(best).pts];
    g.ot = r.ot;
  }
  if (r.gw != null) {
    if (g) g.gw = r.gw;
    const opp = ownerTeam(r.gw) === home ? away : home;
    if (userGame || P(r.gw).ovr >= 90) news(`Победный бросок: ${P(r.gw).name} (${ownerTeam(r.gw)}) против ${opp}.`);
  }
  return [r.hs, r.as];
}

// Players heal one game at a time; anyone who played can get hurt, the fragile more often.
function injuries(T) {
  for (const id of Object.keys(state.injuries)) {
    if (ownerTeam(id) !== T.code) continue;
    if (--state.injuries[id] <= 0) {
      delete state.injuries[id];
      if (T.code === state.franchise) news(`${P(id).name} вернулся после травмы.`);
    }
  }
  T.rot.forEach((p, i) => {
    if (p.id == null || !T.mins[i]) return;
    if (Math.random() < 0.0045 * (1.7 - p.a.dur / 100) * (T.mins[i] / 30)) {
      const games = 1 + Math.floor(Math.random() ** 2.2 * 25);
      state.injuries[p.id] = games;
      if (T.code === state.franchise || p.ovr >= 88) news(`Травма: ${p.name} (${T.code}) пропустит ${games} ${plural(games, "игру", "игры", "игр")}.`);
    }
  });
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function simDay() {
  if (state.phase !== "season") return;
  for (const g of state.schedule) {
    if (g.d !== state.day) continue;
    [g.hs, g.as] = playMatch(g.h, g.a, "reg", g);
    if (g.h === state.franchise) {
      const r = userRecord();
      const pct = (r.w + 5) / (r.w + r.l + 10);
      state.fin.gate += ECON.gateBase + ECON.gateWin * pct;
    }
  }
  state.fin.salaryPaid += payroll() / (state.lastDay + 1);
  state.day++;
  if (state.day === state.deadline + 1) news("Дедлайн обменов прошёл.");
  if (state.day > state.lastDay) startPlayoffs();
}

function simDays(n) {
  for (let i = 0; i < n && state.phase === "season"; i++) simDay();
}

// ---------- playoffs ----------
function startPlayoffs() {
  const st = standings(state.schedule);
  const seeds = {};
  const pct = {};
  for (const conf of ["East", "West"]) {
    seeds[conf] = st[conf].map((r) => r.team);
    st[conf].forEach((r) => (pct[r.team] = r.pct));
  }
  const playin = {};
  for (const conf of ["East", "West"]) {
    const s = seeds[conf];
    playin[conf] = [{ h: s[6], a: s[7], hs: null, as: null }, { h: s[8], a: s[9], hs: null, as: null }];
  }
  state.po = { stage: "playin", seeds, pct, playin, rounds: [], round: -1, champion: null };
  state.phase = "playoffs";
  const r = userRecord();
  news(`Регулярный сезон завершён: ${r.w}–${r.l}.`);
}

function playPlayoffGame(home, away, gate) {
  const [hs, as] = playMatch(home, away, "po");
  if (home === state.franchise) state.fin.playoffGate += gate;
  return [hs, as];
}

const winnerOf = (g) => (g.hs > g.as ? g.h : g.a);
const loserOf = (g) => (g.hs > g.as ? g.a : g.h);

function playoffDay() {
  const po = state.po;
  if (state.phase !== "playoffs") return;
  if (po.stage === "playin") {
    const pending = ["East", "West"].flatMap((c) => po.playin[c].filter((g) => g.hs == null));
    for (const g of pending) [g.hs, g.as] = playPlayoffGame(g.h, g.a, ECON.playInGate);
    for (const conf of ["East", "West"]) {
      const games = po.playin[conf];
      if (games.length === 2) games.push({ h: loserOf(games[0]), a: winnerOf(games[1]), hs: null, as: null, final: true });
    }
    if (pending.some((g) => g.final)) finishPlayin();
    return;
  }
  const round = po.rounds[po.round];
  for (const s of round) {
    if (s.winner) continue;
    const home = seriesHome(s);
    const away = home === s.hi ? s.lo : s.hi;
    const [hs, as] = playPlayoffGame(home, away, po.round === 3 ? ECON.finalsGate : ECON.playoffGate);
    const winner = hs > as ? home : away;
    s.games.push({ h: home, hs, as });
    s.wins[winner]++;
    if (s.wins[winner] === 4) s.winner = winner;
  }
  if (round.every((s) => s.winner)) nextRound();
}

function finishPlayin() {
  const po = state.po;
  for (const conf of ["East", "West"]) {
    const [g1, , g3] = po.playin[conf];
    const s = po.seeds[conf];
    po.seeds[conf] = [...s.slice(0, 6), winnerOf(g1), winnerOf(g3), ...s.slice(6).filter((t) => t !== winnerOf(g1) && t !== winnerOf(g3))];
  }
  po.stage = "series";
  po.round = 0;
  po.rounds.push(["East", "West"].flatMap((conf) => {
    const s = po.seeds[conf];
    return [[0, 7], [3, 4], [2, 5], [1, 6]].map(([a, b]) => newSeries(s[a], s[b], conf));
  }));
}

function nextRound() {
  const po = state.po;
  const prev = po.rounds[po.round];
  if (po.round === 3) {
    po.champion = prev[0].winner;
    po.stage = "done";
    state.phase = "done";
    news(`Чемпион НБА — ${NBA_TEAMS[po.champion]}!`);
    return;
  }
  const next = [];
  for (let i = 0; i < prev.length; i += 2) {
    const a = prev[i].winner;
    const b = prev[i + 1].winner;
    let aFirst;
    if (prev[i].conf === prev[i + 1].conf) {
      const seeds = po.seeds[prev[i].conf];
      aFirst = seeds.indexOf(a) < seeds.indexOf(b);
    } else {
      aFirst = po.pct[a] >= po.pct[b];
    }
    const conf = prev[i].conf === prev[i + 1].conf ? prev[i].conf : "Finals";
    next.push(aFirst ? newSeries(a, b, conf) : newSeries(b, a, conf));
  }
  po.rounds.push(next);
  po.round++;
}

// tier: 0 missed playoffs, 1 out in play-in, 2..5 out in a playoff round (round + 2), 6 champion, -1 still playing.
function userResult() {
  const po = state.po;
  const me = state.franchise;
  if (!po) return null;
  const idx = po.seeds[teamInfo(me).conf].indexOf(me);
  if (po.stage === "playin") {
    if (idx >= 10) return { tier: 0, text: "Не попали в плей-офф" };
    return { tier: -1, text: idx >= 6 ? "Плей-ин" : "Ждём соперника по 1-му раунду" };
  }
  if (idx >= 10) return { tier: 0, text: "Не попали в плей-офф" };
  if (idx >= 8) return { tier: 1, text: "Вылет в плей-ин" };
  if (po.champion === me) return { tier: 6, text: "Чемпионы НБА!" };
  for (let r = 0; r < po.rounds.length; r++) {
    const s = po.rounds[r].find((x) => x.hi === me || x.lo === me);
    if (s && s.winner && s.winner !== me) return { tier: r + 2, text: `Вылет: ${ROUND_NAMES[r]}` };
    if (s && !s.winner) return { tier: -1, text: ROUND_NAMES[r] };
  }
  return { tier: -1, text: "Плей-офф" };
}

// ---------- roster moves ----------
function swapSlots(a, b) {
  const ia = state.lineup[a];
  const ib = state.lineup[b];
  delete state.lineup[a];
  delete state.lineup[b];
  if (ib != null) state.lineup[a] = ib;
  if (ia != null) state.lineup[b] = ia;
}

function waive(key) {
  if (rosterIds().length <= ROSTER_MIN) return;
  const id = state.lineup[key];
  delete state.lineup[key];
  state.dead.push({ id, sal: sal(P(id)) });
  state.owners[id] = "WAIVED";
  delete state.injuries[id];
  news(`${P(id).name} отчислен. ${money(sal(P(id)))} остаются в ведомости.`);
}

function sign(id) {
  const p = P(id);
  const check = signingCheck(payroll(), sal(p), state.mleUsed);
  const slot = SLOTS.find((s) => state.lineup[s.key] == null);
  if (!check.ok || !slot || state.owners[id] !== "FA") return;
  state.lineup[slot.key] = id;
  state.owners[id] = "USER";
  if (check.via === "mle") state.mleUsed = true;
  news(`Подписан ${p.name}: ${money(sal(p))} (${check.reason}).`);
}

function tradeVerdict(outId, inId) {
  const out = P(outId);
  const inn = P(inId);
  const money_ = tradeCheck(payroll(), sal(out), sal(inn));
  let ai;
  if (!healthy(outId)) ai = { ok: false, reason: "Клуб не берёт травмированных игроков" };
  else if (inn.ovr >= 90 && out.ovr < inn.ovr) ai = { ok: false, reason: "Звезду отдают только за равного игрока" };
  else {
    const value = out.ovr + (sal(inn) - sal(out)) / 5;
    ai = value >= inn.ovr
      ? { ok: true, reason: sal(inn) > sal(out) ? "Клуб согласен: экономит на зарплате" : "Клуб согласен на обмен" }
      : { ok: false, reason: "Клуб считает предложение слабым" };
  }
  return { money: money_, ai, ok: money_.ok && ai.ok };
}

function doTrade() {
  const { out, in: inn } = state.trade;
  if (out == null || inn == null || state.day > state.deadline) return;
  if (!tradeVerdict(out, inn).ok) return;
  const key = Object.keys(state.lineup).find((k) => state.lineup[k] === out);
  const club = state.owners[inn];
  state.lineup[key] = inn;
  state.owners[inn] = "USER";
  state.owners[out] = club;
  delete state.injuries[out];
  news(`Обмен: ${P(out).name} → ${NBA_TEAMS[club]}, ${P(inn).name} в команде.`);
  state.trade = { out: null, in: null };
}

// ---------- finances ----------
function seasonFinance() {
  const pay = payroll();
  const final = state.phase === "done";
  const daysLeft = state.phase === "season" ? state.lastDay + 1 - state.day : 0;
  const salaries = state.fin.salaryPaid + (pay * daysLeft) / (state.lastDay + 1 || 1);
  const tax = luxuryTax(pay);
  const floorPenalty = Math.max(0, SALARY_FLOOR - pay);
  const income = [
    ["Национальное ТВ и доходы лиги", ECON.nationalMedia],
    ["Местное ТВ, спонсоры, арена", ECON.localMedia],
    ["Билеты, регулярный сезон", state.fin.gate],
    ["Билеты, плей-ин и плей-офф", state.fin.playoffGate],
  ];
  if (tax === 0) income.push(["Доля налога от плательщиков", ECON.taxShare]);
  const costs = [["Зарплаты игроков", salaries], ["Операционные расходы", ECON.operations]];
  if (tax > 0) costs.push(["Налог на роскошь", tax]);
  if (floorPenalty > 0) costs.push(["Доплата до минимума зарплат", floorPenalty]);
  const total = (rows) => rows.reduce((s, [, x]) => s + x, 0);
  return { income, costs, profit: total(income) - total(costs), final };
}

function ownerVerdict(tier, profit) {
  const sport = ["провал", "разочарование", "приемлемо", "хороший сезон", "отличный сезон", "почти идеально", "триумф"][tier];
  const fin = profit >= 20 ? "клуб хорошо заработал" : profit >= 0 ? "клуб в плюсе" : profit > -40 ? "клуб ушёл в минус" : "огромные убытки";
  const happy = tier * 10 + Math.max(-30, Math.min(20, profit / 2));
  const mood = happy >= 45 ? "Владелец в восторге" : happy >= 25 ? "Владелец доволен" : happy >= 10 ? "Владелец сдержан" : "Владелец недоволен";
  return `${mood}: спортивно — ${sport}, финансово — ${fin}.`;
}

// ---------- rendering ----------
function render() {
  const c = teamChem();
  const pay = payroll();
  const zone = capZone(pay);
  const record = state.schedule ? userRecord() : null;
  $("#stats").innerHTML = state.phase === "franchise" ? "" : `
    <div>Рейтинг <b>${Math.round(userRating())}</b></div>
    <div>Химия <b>${c.sum}/${c.max}</b></div>
    <div>Зарплаты <b class="zone-text-${zone.key}">${money(pay)}</b></div>
    ${record ? `<div>Баланс <b>${record.w}–${record.l}</b></div>` : ""}`;
  $("#restart").textContent = confirmRestart ? "Точно начать заново?" : "Новый драфт";
  $("#restart").classList.toggle("danger", confirmRestart);

  const views = { franchise: renderFranchise, captain: renderDraft, draft: renderDraft };
  $("#app").innerHTML = (views[state.phase] || renderSeason)();
  renderPicker();
  renderInfo();
  save();
}

function renderFranchise() {
  return `<h2>Выберите франшизу</h2>
    <p class="muted">Ваша драфт-команда заменит этот клуб в лиге. Его игроки, которых вы не возьмёте, станут свободными агентами.</p>
    ${["East", "West"].map((conf) => `<h3>${conf === "East" ? "Восточная конференция" : "Западная конференция"}</h3>
      <div class="teams">${DIVISIONS[conf].flat().map((t) => `<button class="team-btn" data-act="franchise" data-v="${t}"><b>${t}</b><span>${NBA_TEAMS[t]}</span></button>`).join("")}</div>`).join("")}`;
}

function slotCard(s) {
  const id = state.lineup[s.key];
  if (id == null) {
    const act = state.phase === "draft" ? `data-act="slot" data-v="${s.key}" tabindex="0" role="button"` : "";
    return `<div class="slot"><div class="slot-label">${s.label}</div><div class="card empty" ${act}>+</div></div>`;
  }
  return `<div class="slot"><div class="slot-label">${s.label}</div>${cardHtml(P(id), `data-act="player" data-v="${id}" tabindex="0" role="button"`)}${chemDots(playerChem(s.key))}</div>`;
}

function renderDraft() {
  const filled = DRAFT_SLOTS.filter((s) => state.lineup[s.key] != null).length;
  const done = filled === DRAFT_SLOTS.length;
  return `<p class="muted center">${state.phase === "captain" ? "Выберите капитана" : done ? "Состав готов!" : `Нажмите на пустую позицию (${filled}/${DRAFT_SLOTS.length}). Франшиза: ${NBA_TEAMS[state.franchise]}`}</p>
    <section class="panel">
      <div class="cap-head"><b>Зарплатная ведомость: ${money(payroll())}</b><span class="muted">2-й апрон (${money(APRON_2)}) — жёсткий потолок драфта</span></div>
      ${capBar()}
    </section>
    <section class="court">
      <h3>Старт</h3><div class="row">${SLOTS.filter((s) => s.starter).map(slotCard).join("")}</div>
      <h3>Скамейка</h3><div class="row">${SLOTS.filter((s) => s.draft && !s.starter).map(slotCard).join("")}</div>
    </section>
    ${rosterIds().length ? teamProfileHtml(teamRatings(state.franchise), "Профиль вашей команды") : ""}
    ${done ? `<div class="center"><button class="primary" data-act="start">Начать сезон НБА</button></div>` : ""}
    <p class="rules">Химия игрока (0–3): +1 за родную позицию, +1 если в составе есть одноклубник, +1 если хотя бы половина партнёров из той же конференции.
      Рейтинги и зарплаты приблизительные.</p>`;
}

function renderPicker() {
  const pend = state.pending;
  $("#picker").hidden = !pend;
  if (!pend) return;
  $("#picker-title").textContent = pend.slot === "captain" ? "Выберите капитана" : `Позиция: ${slotOf(pend.slot).label}`;
  $("#picker-sub").innerHTML = `Ведомость: ${money(payroll())} · до 2-го апрона ${money(APRON_2 - payroll())}`;
  $("#picker-cards").innerHTML = pend.ids.map((id) => {
    const ok = canPick(id);
    return ok
      ? cardHtml(P(id), `data-act="pick" data-v="${id}" tabindex="0" role="button"`, "", "", true)
      : cardHtml(P(id), "", `<div class="nofit">Не влезает под потолок</div>`, "disabled", true);
  }).join("");
}

const TABS = [
  ["overview", "Обзор"], ["standings", "Таблица"], ["roster", "Состав"], ["stats", "Статистика"], ["teams", "Команды"],
  ["trades", "Обмены"], ["fa", "Свободные агенты"], ["finance", "Финансы"], ["playoffs", "Плей-офф"],
];

function renderSeason() {
  const tabs = TABS.filter(([k]) => k !== "playoffs" || state.po);
  const body = { overview: viewOverview, standings: viewStandings, roster: viewRoster, stats: viewStats, teams: viewTeams, trades: viewTrades, fa: viewFA, finance: viewFinance, playoffs: viewPlayoffs }[state.tab]();
  return `<nav class="tabs">${tabs.map(([k, l]) => `<button class="${state.tab === k ? "on" : ""}" data-act="tab" data-v="${k}">${l}</button>`).join("")}</nav>${body}`;
}

function controls() {
  if (state.phase === "season") {
    return `<div class="controls">
      <button class="primary" data-act="sim" data-v="1">Следующий день</button>
      <button data-act="sim" data-v="7">Неделя</button>
      ${state.day <= state.deadline ? `<button data-act="sim" data-v="deadline">До дедлайна</button>` : ""}
      <button data-act="sim" data-v="end">До конца сезона</button></div>`;
  }
  if (state.phase === "playoffs") {
    return `<div class="controls">
      <button class="primary" data-act="po" data-v="1">Следующий день</button>
      <button data-act="po" data-v="round">До конца раунда</button>
      <button data-act="po" data-v="end">До чемпиона</button></div>`;
  }
  return "";
}

function userGames() {
  return state.schedule.filter((g) => g.h === state.franchise || g.a === state.franchise);
}

function gameLine(g) {
  const home = g.h === state.franchise;
  const opp = home ? g.a : g.h;
  if (g.hs == null) return `<li><span class="muted">День ${g.d + 1}</span> ${home ? "vs" : "@"} ${NBA_TEAMS[opp]}</li>`;
  const my = home ? g.hs : g.as;
  const their = home ? g.as : g.hs;
  const extra = [
    g.top ? `${esc(P(g.top[0]).name.split(" ").pop())} ${g.top[1]}` : "",
    g.ot ? (g.ot > 1 ? `${g.ot}OT` : "OT") : "",
    g.gw != null && ownerTeam(g.gw) === state.franchise ? `победный: ${esc(P(g.gw).name.split(" ").pop())}` : "",
  ].filter(Boolean).join(" · ");
  return `<li class="${my > their ? "win" : "loss"}"><b>${my > their ? "W" : "L"}</b> <span class="gl-main">${home ? "vs" : "@"} ${NBA_TEAMS[opp]}${extra ? `<small>${extra}</small>` : ""}</span> <span class="score">${my}:${their}</span></li>`;
}

function viewOverview() {
  const r = userRecord();
  const st = standings(state.schedule);
  const conf = teamInfo(state.franchise).conf;
  const seed = st[conf].findIndex((x) => x.team === state.franchise) + 1;
  const games = userGames();
  const played = games.filter((g) => g.hs != null);
  const upcoming = games.filter((g) => g.hs == null).slice(0, 3);
  const res = userResult();
  let status;
  if (state.phase === "season") status = `День ${state.day + 1} из ${state.lastDay + 1}${state.day <= state.deadline ? ` · дедлайн обменов: день ${state.deadline + 1}` : " · дедлайн прошёл"}`;
  else if (state.phase === "playoffs") status = `Плей-офф · ${res.text}`;
  else status = `Сезон окончен · чемпион: ${NBA_TEAMS[state.po.champion]}`;
  const fin = seasonFinance();
  const summary = state.phase === "done" ? `<section class="panel summary">
      <h2>${res.text}</h2>
      <p>Регулярный сезон: ${r.w}–${r.l}, ${seed}-е место на ${conf === "East" ? "Востоке" : "Западе"}. Прибыль клуба: <b class="${fin.profit >= 0 ? "pos" : "neg"}">${money(fin.profit)}</b>.</p>
      <p>${ownerVerdict(res.tier, fin.profit)}</p>
      <button class="primary" data-act="restart">Новый драфт</button></section>` : "";
  const injured = rosterIds().filter((id) => !healthy(id));
  return `${summary}<section class="panel">
      <div class="big">${teamName(state.franchise)}</div>
      <div class="record">${r.w}–${r.l} <span class="muted">· ${seed}-е место на ${conf === "East" ? "Востоке" : "Западе"}</span></div>
      <p class="muted">${status}</p>
      ${controls()}
    </section>
    <div class="grid2">
      <section class="panel"><h3>Последние игры</h3><ul class="games">${played.slice(-8).reverse().map(gameLine).join("") || "<li class='muted'>Сезон ещё не начался</li>"}</ul>
        ${upcoming.length ? `<h3>Ближайшие</h3><ul class="games">${upcoming.map(gameLine).join("")}</ul>` : ""}</section>
      <section class="panel"><h3>Новости</h3>
        ${injured.length ? `<p class="warn">Травмированы: ${injured.map((id) => `${esc(P(id).name)} (${state.injuries[id]})`).join(", ")}</p>` : ""}
        <ul class="news">${state.news.slice(0, 10).map((n) => `<li>${esc(n)}</li>`).join("")}</ul></section>
    </div>`;
}

function viewStandings() {
  const st = standings(state.schedule);
  return `<div class="grid2">${["East", "West"].map((conf) => `<section class="panel table-wrap">
    <h3>${conf === "East" ? "Восток" : "Запад"}</h3>
    <table><thead><tr><th>#</th><th>Команда</th><th>В</th><th>П</th><th>%</th><th>ОТ</th><th>10</th></tr></thead><tbody>
    ${st[conf].map((row, i) => `<tr class="${row.team === state.franchise ? "me" : ""} ${i < 6 ? "po" : i < 10 ? "pi" : ""}">
      <td>${i + 1}</td><td>${row.team === state.franchise ? "★ " : ""}${row.team}</td><td>${row.w}</td><td>${row.l}</td>
      <td>${row.pct.toFixed(3).replace(/^0/, "")}</td><td>${row.gb ? row.gb.toFixed(1) : "—"}</td>
      <td>${row.last.slice(-10).filter((x) => x === "W").length}-${row.last.slice(-10).filter((x) => x === "L").length}</td></tr>`).join("")}
    </tbody></table></section>`).join("")}</div>
    <p class="rules">1–6 — прямо в плей-офф, 7–10 — плей-ин. ОТ — отставание от лидера.</p>`;
}

function viewRoster() {
  const canMove = state.phase === "season";
  const rows = SLOTS.map((s) => {
    const id = state.lineup[s.key];
    const sel = state.sel === s.key ? "selected" : "";
    if (id == null) {
      return `<tr class="${sel}"><td>${s.label}</td><td colspan="8" class="muted">Свободно</td>
        <td><button data-act="select" data-v="${s.key}" ${state.sel ? "" : "disabled"}>Сюда</button></td><td></td></tr>`;
    }
    const p = P(id);
    const inj = state.injuries[id] ? `<span class="warn"> травма (${state.injuries[id]})</span>` : "";
    const st = state.stats.reg.players[id];
    return `<tr class="${sel}"><td>${s.label}</td><td>${playerLink(p)}${inj}</td><td>${p.pos}</td><td>${p.ovr}</td>
      <td class="${attrLevel(p.a.three)}">${p.a.three}</td><td class="${attrLevel(defenseScore(p.a))}">${Math.round(defenseScore(p.a))}</td><td class="${attrLevel(p.a.clu)}">${p.a.clu}</td>
      <td>${st ? (st.pts / st.g).toFixed(1) : "—"}</td><td>${money(sal(p))}</td>
      <td><button data-act="select" data-v="${s.key}">${state.sel === s.key ? "Отмена" : state.sel ? "Сюда" : "Переставить"}</button></td>
      <td>${chemDots(playerChem(s.key))} ${canMove && rosterIds().length > ROSTER_MIN ? `<button class="ghost" data-act="waive" data-v="${s.key}">Отчислить</button>` : ""}</td></tr>`;
  });
  const dead = state.dead.length ? `<p class="muted">Мёртвые деньги: ${state.dead.map((d) => `${esc(P(d.id).name)} ${money(d.sal)}`).join(", ")}</p>` : "";
  return `<section class="panel table-wrap"><h3>Состав (${rosterIds().length}/${ROSTER_MAX})</h3>
    <table class="roster"><thead><tr><th>Слот</th><th>Игрок</th><th>Поз</th><th>OVR</th><th>3PT</th><th>ЗАЩ</th><th>КЛЧ</th><th>ОЧК</th><th>Зарплата</th><th></th><th>Химия</th></tr></thead><tbody>${rows.join("")}</tbody></table>
    ${dead}
    <p class="rules">Стартовая пятёрка — игроки в слотах PG–C, они играют 30–35 минут. Со скамейки выходят пятеро лучших по OVR (24, 20, 16, 10 и 6 минут), остальные не играют.
    Травмированного стартера заменяет лучший здоровый запасной. Нажмите «Переставить», затем «Сюда» у другого слота, чтобы поменять игроков местами.
    В составе должно быть от ${ROSTER_MIN} до ${ROSTER_MAX} игроков. Зарплата отчисленного игрока остаётся в ведомости до конца сезона.</p></section>`;
}

function viewTrades() {
  if (state.phase !== "season" || state.day > state.deadline) {
    return `<section class="panel"><h3>Обмены</h3><p class="muted">Дедлайн обменов прошёл (день ${state.deadline + 1}). Можно подписывать свободных агентов.</p></section>`;
  }
  const { out, in: inn } = state.trade;
  const mine = rosterIds().map(P).sort((a, b) => b.ovr - a.ovr);
  const theirs = {};
  for (const [id, owner] of Object.entries(state.owners)) if (NBA_TEAMS[owner] && owner !== state.franchise) (theirs[owner] ||= []).push(P(id));
  const optsMine = mine.map((p) => `<option value="${p.id}" ${p.id === out ? "selected" : ""}>${esc(p.name)} · ${p.ovr} · ${money(sal(p))}</option>`).join("");
  const optsTheirs = Object.keys(theirs).sort().map((t) => `<optgroup label="${NBA_TEAMS[t]}">${theirs[t].sort((a, b) => b.ovr - a.ovr)
    .map((p) => `<option value="${p.id}" ${p.id === inn ? "selected" : ""}>${esc(p.name)} · ${p.pos} · ${p.ovr} · ${money(sal(p))}</option>`).join("")}</optgroup>`).join("");
  let verdict = "";
  if (out != null && inn != null) {
    const v = tradeVerdict(out, inn);
    verdict = `<div class="trade-cards">${cardHtml(P(out), "", "", "", true)}<div class="arrow">⇄</div>${cardHtml(P(inn), "", "", "", true)}</div>
      <ul class="checks"><li class="${v.money.ok ? "pos" : "neg"}">Зарплаты: ${v.money.reason}</li><li class="${v.ai.ok ? "pos" : "neg"}">${v.ai.reason}</li></ul>
      <button class="primary" data-act="trade" ${v.ok ? "" : "disabled"}>Предложить обмен</button>`;
  }
  return `<section class="panel"><h3>Обмен 1 на 1</h3>
    <p class="muted">До дедлайна: ${state.deadline + 1 - state.day} ${plural(state.deadline + 1 - state.day, "день", "дня", "дней")}. Ведомость: ${money(payroll())} (${capZone(payroll()).label}).</p>
    <div class="trade-form">
      <label for="trade-out">Отдаёте<select id="trade-out" data-act="trade-out"><option value="">—</option>${optsMine}</select></label>
      <label for="trade-in">Получаете<select id="trade-in" data-act="trade-in"><option value="">—</option>${optsTheirs}</select></label>
    </div>${verdict}
    <p class="rules">Правила CBA: под потолком после обмена — без ограничений. Ниже 1-го апрона: до 200% + $0.25M при зарплате до $7.5M, +$7.5M при зарплате до $29M, 125% + $0.25M выше.
    Выше 1-го апрона — не больше 100% отдаваемой зарплаты. Превышать 2-й апрон нельзя.</p></section>`;
}

function viewFA() {
  const fas = Object.entries(state.owners).filter(([, o]) => o === "FA").map(([id]) => P(id)).sort((a, b) => b.ovr - a.ovr);
  const full = rosterIds().length >= ROSTER_MAX;
  const open = state.phase === "season";
  const rows = fas.map((p) => {
    const c = signingCheck(payroll(), sal(p), state.mleUsed);
    const can = open && c.ok && !full;
    return `<tr><td>${playerLink(p)}</td><td>${p.pos}</td><td>${p.ovr}</td><td>${money(sal(p))}</td>
      <td class="${c.ok ? "pos" : "neg"}">${c.reason}</td><td><button data-act="sign" data-v="${p.id}" ${can ? "" : "disabled"}>Подписать</button></td></tr>`;
  }).join("");
  return `<section class="panel table-wrap"><h3>Свободные агенты</h3>
    <p class="muted">${!open ? "Подписания закрыты после регулярного сезона." : full ? "В составе уже 15 игроков — сначала отчислите кого-нибудь." : `Свободных мест: ${ROSTER_MAX - rosterIds().length}.`}
      MLE: ${state.mleUsed ? "использована" : "доступна"}.</p>
    <table><thead><tr><th>Игрок</th><th>Поз</th><th>OVR</th><th>Зарплата</th><th>Механизм</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <p class="rules">Подписать можно: на свободное место под потолком, по MLE (${money(NT_MLE)} ниже 1-го апрона, ${money(TP_MLE)} выше; одна за сезон) или на минимальный контракт (до ${money(VET_MIN)}).</p></section>`;
}

function viewFinance() {
  const pay = payroll();
  const f = seasonFinance();
  const line = ([l, x]) => `<tr><td>${l}</td><td class="num">${money(x)}</td></tr>`;
  const sum = (rows) => rows.reduce((s, [, x]) => s + x, 0);
  return `<section class="panel"><div class="cap-head"><b>Ведомость: ${money(pay)}</b><span class="zone-text-${capZone(pay).key}">${capZone(pay).label}</span></div>${capBar()}
    <table class="kv"><tbody>
      <tr><td>Потолок зарплат</td><td class="num">${money(CAP)}</td></tr>
      <tr><td>Порог налога на роскошь</td><td class="num">${money(TAX_LINE)}</td></tr>
      <tr><td>1-й / 2-й апрон</td><td class="num">${money(APRON_1)} / ${money(APRON_2)}</td></tr>
      <tr><td>Минимум зарплат</td><td class="num">${money(SALARY_FLOOR)}</td></tr>
      <tr><td>Налог при текущей ведомости</td><td class="num">${money(luxuryTax(pay))}</td></tr>
      <tr><td>Mid-level exception</td><td class="num">${state.mleUsed ? "использована" : "доступна"}</td></tr>
    </tbody></table></section>
    <div class="grid2">
      <section class="panel"><h3>Доходы ${f.final ? "" : "(прогноз)"}</h3><table class="kv"><tbody>${f.income.map(line).join("")}
        <tr class="total"><td>Итого</td><td class="num">${money(sum(f.income))}</td></tr></tbody></table></section>
      <section class="panel"><h3>Расходы ${f.final ? "" : "(прогноз)"}</h3><table class="kv"><tbody>${f.costs.map(line).join("")}
        <tr class="total"><td>Итого</td><td class="num">${money(sum(f.costs))}</td></tr></tbody></table></section>
    </div>
    <section class="panel"><div class="big ${f.profit >= 0 ? "pos" : "neg"}">Прибыль: ${money(f.profit)}</div>
      <p class="rules">Налог считается по ведомости на конец регулярного сезона: $1.50 за каждый доллар сверх порога в первых $5M, затем $1.75, $2.50, $3.25 и +$0.50 за каждые следующие $5M.
      Команды, не платящие налог, получают долю налоговых денег. Выручка от билетов растёт вместе с процентом побед, домашние игры плей-офф приносят больше.</p></section>`;
}

function seriesHtml(s) {
  const me = (t) => (t === state.franchise ? "me" : "");
  const cls = (t) => `${me(t)} ${s.winner === t ? "won" : s.winner ? "lost" : ""}`;
  return `<div class="series"><div class="${cls(s.hi)}">${s.hi} <b>${s.wins[s.hi]}</b></div><div class="${cls(s.lo)}">${s.lo} <b>${s.wins[s.lo]}</b></div></div>`;
}

function viewPlayoffs() {
  const po = state.po;
  const playin = ["East", "West"].map((conf) => `<div><h4>${conf === "East" ? "Восток" : "Запад"}</h4>${po.playin[conf].map((g, i) =>
    `<div class="pi-game ${g.h === state.franchise || g.a === state.franchise ? "me" : ""}">${["7 vs 8", "9 vs 10", "За 8-е место"][i]}: ${g.h} ${g.hs ?? "–"} : ${g.as ?? "–"} ${g.a}</div>`).join("")}</div>`).join("");
  const rounds = po.rounds.map((round, r) => `<div class="round"><h4>${ROUND_NAMES[r]}</h4>${round.map(seriesHtml).join("")}</div>`).join("");
  return `<section class="panel">${controls()}${po.champion ? `<div class="big">🏆 ${NBA_TEAMS[po.champion]}</div>` : ""}</section>
    <section class="panel"><h3>Плей-ин</h3><div class="grid2">${playin}</div></section>
    ${rounds ? `<section class="panel table-wrap"><h3>Сетка</h3><div class="bracket">${rounds}</div></section>` : ""}`;
}


// ---------- players, teams and stats ----------
const playerLink = (p) => `<button class="link" data-act="player" data-v="${p.id}">${esc(p.name)}</button>`;
const pct = (m, a) => (a ? `${((100 * m) / a).toFixed(1)}%` : "—");
const per = (x, g) => (g ? (x / g).toFixed(1) : "—");

function teamProfileHtml(t, title) {
  const rows = [
    ["Атака", t.atk], ["Защита", t.def], ["Трёхочковые", t.three], ["Игра у кольца", t.ins], ["Пас", t.pas],
    ["Защита периметра", t.perD], ["Защита кольца", t.intD], ["Подбор", t.reb], ["Атлетизм", t.ath], ["Клатч лидеров", t.clu],
  ];
  return `<section class="panel"><h3>${title}</h3><div class="bars">${rows.map(([l, v]) => attrBar(l, v, teamLevel)).join("")}</div>
    ${t.ortg != null ? `<p class="muted">Рейтинг атаки ${t.ortg.toFixed(1)} · рейтинг защиты ${t.drtg.toFixed(1)} · разница ${t.net >= 0 ? "+" : ""}${t.net.toFixed(1)} · темп ${t.pace.toFixed(1)}</p>` : ""}</section>`;
}

function attrBar(label, v, level = attrLevel) {
  const n = Math.round(v);
  return `<div class="bar-row"><span>${label}</span><div class="bar"><div class="${level(n)}" style="width:${n}%"></div></div><b class="${level(n)}">${n}</b></div>`;
}

function statLine(st) {
  if (!st || !st.g) return `<p class="muted">Ещё не играл.</p>`;
  const cells = [
    ["И", st.g], ["МИН", per(st.min, st.g)], ["ОЧК", per(st.pts, st.g)], ["ПДБ", per(st.reb, st.g)], ["ПАС", per(st.ast, st.g)],
    ["ПХВ", per(st.stl, st.g)], ["БЛК", per(st.blk, st.g)], ["ПОТ", per(st.tov, st.g)],
    ["С ИГРЫ", pct(st.fgm, st.fga)], ["3-ОЧК", `${pct(st.tpm, st.tpa)} (${st.tpm || 0}/${st.tpa || 0})`], ["ШТР", pct(st.ftm, st.fta)],
  ];
  return `<div class="statline">${cells.map(([l, v]) => `<span><i>${l}</i><b>${v}</b></span>`).join("")}</div>
    <div class="statline clutch"><span><i>Клатч очки</i><b>${st.cpts || 0}</b></span><span><i>Клатч бросок</i><b>${st.cfgm || 0}/${st.cfga || 0} (${pct(st.cfgm, st.cfga)})</b></span><span><i>Победные броски</i><b>${st.gw || 0}</b></span></div>`;
}

function clutchText(v) {
  if (v >= 92) return "Убийца в концовках: берёт последний бросок и чаще всего забивает.";
  if (v >= 82) return "Надёжен в клатче: в концовках играет лучше обычного.";
  if (v >= 65) return "В концовках играет примерно как обычно.";
  if (v >= 50) return "В концовках немного теряется, но может и зарезать.";
  return "Давление концовок мешает: процент заметно падает, хотя шанс есть всегда.";
}

function playerInfo(id) {
  const p = P(id);
  const groups = [...new Set(ATTRS.map((a) => a.group))];
  const owner = state.schedule ? ownerTeam(id) : null;
  const where = owner === state.franchise ? "Ваша команда" : owner === "FA" ? "Свободный агент" : owner === "WAIVED" ? "Отчислен" : owner ? NBA_TEAMS[owner] : teamLabel(p.team);
  return `<div class="info-head">${cardHtml(p)}<div>
      <h2>${esc(p.name)}</h2>
      <p class="muted">${p.pos} · ${where} · ${money(sal(p))} · стиль: ${p.styles.map((st) => STYLE_NAMES[st]).join(" + ")}</p>
      ${state.injuries[id] ? `<p class="warn">Травма: ещё ${state.injuries[id]} ${plural(state.injuries[id], "игра", "игры", "игр")}</p>` : ""}
      <p><b>Клатч ${p.a.clu}.</b> ${clutchText(p.a.clu)}</p></div></div>
    <div class="attr-groups">${groups.map((gname) => `<div><h4>${gname}</h4><div class="bars">${ATTRS.filter((a) => a.group === gname).map((a) => attrBar(a.label, p.a[a.key])).join("")}</div></div>`).join("")}</div>
    <h4>Регулярный сезон</h4>${statLine(state.stats.reg.players[id])}
    ${state.stats.po.players[id] ? `<h4>Плей-офф</h4>${statLine(state.stats.po.players[id])}` : ""}`;
}

function teamInfoHtml(code) {
  const ids = code === state.franchise ? rosterIds() : Object.keys(state.owners).filter((id) => state.owners[id] === code).map(Number);
  const players = ids.map(P).sort((a, b) => b.ovr - a.ovr);
  const rows = players.map((p) => {
    const st = state.stats.reg.players[p.id];
    return `<tr><td>${playerLink(p)}${state.injuries[p.id] ? ' <span class="warn">травма</span>' : ""}</td><td>${p.pos}</td><td>${p.ovr}</td>
      ${["three", "ins", "pas", "perD", "intD", "reb", "clu"].map((k) => `<td class="${attrLevel(p.a[k])}">${p.a[k]}</td>`).join("")}
      <td>${st ? per(st.pts, st.g) : "—"}</td></tr>`;
  }).join("");
  return `<h2>${teamName(code)}</h2>${teamProfileHtml(teamRatings(code), "Рейтинги команды")}
    <div class="table-wrap"><table><thead><tr><th>Игрок</th><th>Поз</th><th>OVR</th><th>3PT</th><th>ПРХ</th><th>ПАС</th><th>П-З</th><th>З-К</th><th>ПДБ</th><th>КЛЧ</th><th>ОЧК</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="11" class="muted">Нет игроков из базы — клуб играет заменами.</td></tr>`}</tbody></table></div>`;
}

const STYLE_NAMES = { sniper: "снайпер", scorer: "бомбардир", slasher: "проходы", playmaker: "плеймейкер", threeD: "3&D", lockdown: "защитник-стоппер",
  rim: "защитник кольца", stretch: "стретч", post: "игра в посте", athlete: "атлет", twoway: "универсал", glue: "командный игрок" };

function renderInfo() {
  const info = state.info;
  $("#info").hidden = !info;
  if (!info) return;
  $("#info-body").innerHTML = info.type === "player" ? playerInfo(info.id) : teamInfoHtml(info.id);
}

function viewStats() {
  const kind = state.po && state.statKind === "po" ? "po" : "reg";
  const book = state.stats[kind].players;
  const entries = Object.entries(book).map(([id, st]) => ({ p: P(id), st }));
  const maxG = Math.max(1, ...Object.values(state.stats[kind].teams).map((t) => t.g));
  const qualified = entries.filter((e) => e.st.g >= Math.max(1, maxG * 0.4));
  const board = (title, val, fmt, list = qualified) => {
    const top = list.map((e) => ({ ...e, v: val(e.st) })).filter((e) => Number.isFinite(e.v)).sort((a, b) => b.v - a.v).slice(0, 5);
    return `<div class="leader"><h4>${title}</h4><ol>${top.map((e) => `<li class="${ownerTeam(e.p.id) === state.franchise ? "mine" : ""}">${playerLink(e.p)} <span>${fmt(e.v)}</span></li>`).join("")}</ol></div>`;
  };
  const f1 = (v) => v.toFixed(1);
  const f0 = (v) => String(Math.round(v));
  const fp = (v) => `${(100 * v).toFixed(1)}%`;
  const shooters = qualified.filter((e) => (e.st.tpa || 0) >= maxG * 2);
  const clutchers = entries.filter((e) => (e.st.cfga || 0) >= Math.max(3, maxG * 0.15));
  const mine = rosterIds().map((id) => ({ p: P(id), st: book[id] })).filter((e) => e.st).sort((a, b) => b.st.pts / b.st.g - a.st.pts / a.st.g);
  const toggle = state.po ? `<div class="controls"><button class="${kind === "reg" ? "on" : ""}" data-act="stat-kind" data-v="reg">Регулярный сезон</button><button class="${kind === "po" ? "on" : ""}" data-act="stat-kind" data-v="po">Плей-офф</button></div>` : "";
  if (!entries.length) return `<section class="panel">${toggle}<p class="muted">Статистика появится после первых игр.</p></section>`;
  return `<section class="panel">${toggle}<h3>Лидеры лиги</h3><div class="leaders">
      ${board("Очки за игру", (s) => s.pts / s.g, f1)}${board("Подборы", (s) => (s.reb || 0) / s.g, f1)}${board("Передачи", (s) => (s.ast || 0) / s.g, f1)}
      ${board("Перехваты", (s) => (s.stl || 0) / s.g, f1)}${board("Блок-шоты", (s) => (s.blk || 0) / s.g, f1)}${board("Трёхочковые (всего)", (s) => s.tpm || 0, f0, entries)}
      ${board("Процент трёх", (s) => s.tpm / s.tpa, fp, shooters)}${board("Клатч-очки", (s) => s.cpts || 0, f0, entries)}
      ${board("Клатч-процент", (s) => s.cfgm / s.cfga, fp, clutchers)}${board("Победные броски", (s) => s.gw || 0, f0, entries.filter((e) => e.st.gw))}
    </div></section>
    <section class="panel table-wrap"><h3>Ваша команда</h3><table><thead><tr><th>Игрок</th><th>И</th><th>МИН</th><th>ОЧК</th><th>ПДБ</th><th>ПАС</th><th>ПХВ</th><th>БЛК</th><th>ПОТ</th><th>С ИГРЫ</th><th>3-ОЧК</th><th>ШТР</th><th>КЛЧ О</th><th>КЛЧ %</th><th>ПБ</th></tr></thead><tbody>
    ${mine.map(({ p, st }) => `<tr><td>${playerLink(p)}</td><td>${st.g}</td><td>${per(st.min, st.g)}</td><td>${per(st.pts, st.g)}</td><td>${per(st.reb || 0, st.g)}</td><td>${per(st.ast || 0, st.g)}</td>
      <td>${per(st.stl || 0, st.g)}</td><td>${per(st.blk || 0, st.g)}</td><td>${per(st.tov || 0, st.g)}</td><td>${pct(st.fgm, st.fga)}</td><td>${pct(st.tpm, st.tpa)}</td><td>${pct(st.ftm, st.fta)}</td>
      <td>${st.cpts || 0}</td><td>${pct(st.cfgm, st.cfga)}</td><td>${st.gw || 0}</td></tr>`).join("")}</tbody></table>
    <p class="rules">Клатч — последние 5 минут и овертаймы при разнице не больше 5 очков. ПБ — победные броски.</p></section>`;
}

const TEAM_COLS = [
  ["ovr", "OVR"], ["atk", "АТК"], ["def", "ЗАЩ"], ["three", "3PT"], ["ins", "ПРХ"], ["pas", "ПАС"], ["perD", "П-З"], ["intD", "З-К"],
  ["reb", "ПДБ"], ["clu", "КЛЧ"], ["ortg", "ORtg"], ["drtg", "DRtg"], ["net", "NET"], ["pace", "Темп"],
];

function viewTeams() {
  const rows = ALL_TEAMS.map(teamRatings);
  const key = state.teamSort;
  const asc = key === "drtg";
  rows.sort((a, b) => ((asc ? a[key] - b[key] : b[key] - a[key]) || b.ovr - a.ovr));
  const fmt = (k, v) => (v == null ? "—" : k === "net" ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}` : ["ortg", "drtg", "pace"].includes(k) ? v.toFixed(1) : Math.round(v));
  return `<section class="panel table-wrap"><h3>Рейтинги команд</h3>
    <table class="teams-table"><thead><tr><th>Команда</th>${TEAM_COLS.map(([k, l]) => `<th><button class="link ${key === k ? "on" : ""}" data-act="sort" data-v="${k}">${l}</button></th>`).join("")}</tr></thead><tbody>
    ${rows.map((t) => `<tr class="${t.code === state.franchise ? "me" : ""}"><td><button class="link" data-act="team" data-v="${t.code}">${t.code === state.franchise ? "★ " : ""}${t.code}</button></td>
      ${TEAM_COLS.map(([k]) => `<td class="${["ortg", "drtg", "pace", "net"].includes(k) || t[k] == null ? "" : teamLevel(t[k])}">${fmt(k, t[k])}</td>`).join("")}</tr>`).join("")}
    </tbody></table>
    <p class="rules">Рейтинги считаются по текущей ротации с учётом минут и травм. ORtg и DRtg — очки за 100 владений в атаке и в защите (меньше DRtg — лучше), NET — разница.
    Нажмите на заголовок, чтобы отсортировать, или на команду, чтобы открыть её состав.</p></section>`;
}

// ---------- events ----------
function act(name, v) {
  confirmRestart = name === "restart" && !confirmRestart;
  switch (name) {
    case "franchise": state.franchise = v; state.phase = "captain"; openCaptain(); break;
    case "slot": if (!state.pending) openSlot(v); break;
    case "pick": pick(Number(v)); break;
    case "start": startSeason(); break;
    case "tab": state.tab = v; state.sel = null; break;
    case "sim": simDays(v === "end" ? Infinity : v === "deadline" ? state.deadline + 1 - state.day : Number(v)); break;
    case "po": {
      const round = state.po?.round;
      const stage = state.po?.stage;
      let guard = 200;
      do playoffDay(); while (guard-- && state.phase === "playoffs" && (v === "end" || (v === "round" && state.po.round === round && state.po.stage === stage)));
      break;
    }
    case "select":
      if (state.sel == null) state.sel = v;
      else { if (state.sel !== v) swapSlots(state.sel, v); state.sel = null; }
      break;
    case "player": state.info = { type: "player", id: Number(v) }; break;
    case "team": state.info = { type: "team", id: v }; break;
    case "close-info": state.info = null; break;
    case "stat-kind": state.statKind = v; break;
    case "sort": state.teamSort = v; break;
    case "waive": waive(v); state.trade = { out: null, in: null }; break;
    case "sign": sign(Number(v)); break;
    case "trade": doTrade(); break;
    case "restart":
      if (!confirmRestart) { state = freshState(); }
      break;
  }
  render();
}

document.addEventListener("click", (e) => {
  if (e.target.id === "info") return act("close-info");
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "SELECT" || el.disabled) return;
  act(el.dataset.act, el.dataset.v);
});
document.addEventListener("keydown", (e) => {
  const el = e.target.closest?.("[data-act][role=button]");
  if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); act(el.dataset.act, el.dataset.v); }
  if (e.key === "Escape" && state.info) act("close-info");
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.act === "trade-out" || el.dataset.act === "trade-in") {
    const v = el.value === "" ? null : Number(el.value);
    if (el.dataset.act === "trade-out") state.trade.out = v;
    else state.trade.in = v;
    render();
  }
});
$("#restart").addEventListener("click", (e) => { e.stopPropagation(); act("restart"); });

// Saves from older versions could get stuck on a pick where no card fits under the cap: deal new cards.
if (state.pending && state.pending.slot !== "captain" && !state.pending.ids.some(canPick)) openSlot(state.pending.slot);
render();
