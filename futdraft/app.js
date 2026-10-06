// NBA FUT Draft: pick a captain, fill 5 starters + 3 bench from 5-card choices, then play 4 rounds.
const SLOTS = [
  { key: "PG", label: "PG", accepts: ["PG"], adjacent: ["SG"], starter: true },
  { key: "SG", label: "SG", accepts: ["SG"], adjacent: ["PG", "SF"], starter: true },
  { key: "SF", label: "SF", accepts: ["SF"], adjacent: ["SG", "PF"], starter: true },
  { key: "PF", label: "PF", accepts: ["PF"], adjacent: ["SF", "C"], starter: true },
  { key: "C", label: "C", accepts: ["C"], adjacent: ["PF"], starter: true },
  { key: "B1", label: "Запас G", accepts: ["PG", "SG"], adjacent: [], starter: false },
  { key: "B2", label: "Запас F", accepts: ["SF", "PF"], adjacent: [], starter: false },
  { key: "B3", label: "Запас BIG", accepts: ["PF", "C"], adjacent: [], starter: false },
];
const CHOICES = 5;
const MAX_CHEM = 3 * SLOTS.length;
const ROUNDS = ["1/4 финала", "1/2 финала", "Финал конференции", "Финал НБА"];

const state = { lineup: {}, phase: "captain" };

const $ = (sel) => document.querySelector(sel);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const picked = () => Object.values(state.lineup);
const isPicked = (p) => picked().some((q) => q.id === p.id);

function captainOptions() {
  return shuffle(NBA_PLAYERS.filter((p) => p.ovr >= 88)).slice(0, CHOICES);
}

function slotOptions(slot) {
  const pool = shuffle(NBA_PLAYERS.filter((p) => !isPicked(p)));
  const natural = pool.filter((p) => slot.accepts.includes(p.pos));
  const adjacent = pool.filter((p) => slot.adjacent.includes(p.pos));
  const options = adjacent.slice(0, Math.min(2, CHOICES - 3));
  for (const p of natural) {
    if (options.length >= CHOICES) break;
    options.push(p);
  }
  return shuffle(options);
}

// Chemistry per player (0..3): position fit, a teammate from the same NBA team, 4+ others from the same conference.
function playerChem(slotKey) {
  const slot = SLOTS.find((s) => s.key === slotKey);
  const p = state.lineup[slotKey];
  const others = picked().filter((q) => q.id !== p.id);
  let chem = slot.accepts.includes(p.pos) ? 1 : 0;
  if (others.some((q) => q.team === p.team)) chem++;
  if (others.filter((q) => q.conf === p.conf).length >= 4) chem++;
  return chem;
}

function teamChem() {
  return Object.keys(state.lineup).reduce((sum, k) => sum + playerChem(k), 0);
}

function teamRating() {
  const avg = (list) => (list.length ? list.reduce((s, p) => s + p.ovr, 0) / list.length : 0);
  const starters = SLOTS.filter((s) => s.starter && state.lineup[s.key]).map((s) => state.lineup[s.key]);
  const bench = SLOTS.filter((s) => !s.starter && state.lineup[s.key]).map((s) => state.lineup[s.key]);
  if (!starters.length && !bench.length) return 0;
  if (!bench.length) return Math.round(avg(starters));
  if (!starters.length) return Math.round(avg(bench));
  return Math.round(avg(starters) * 0.8 + avg(bench) * 0.2);
}

function cardHtml(p, extra = "") {
  const tier = p.ovr >= 90 ? "elite" : p.ovr >= 85 ? "gold" : "silver";
  return `<div class="card ${tier}" ${extra}>
    <div class="ovr">${p.ovr}<span>${p.pos}</span></div>
    <div class="name">${p.name}</div>
    <div class="team" title="${NBA_TEAMS[p.team]}">${p.team} · ${p.conf === "West" ? "Запад" : "Восток"}</div>
  </div>`;
}

function render() {
  const chem = teamChem();
  $("#rating").textContent = teamRating();
  $("#chem").textContent = `${chem}/${MAX_CHEM}`;
  const filled = picked().length;
  $("#hint").textContent =
    state.phase === "captain" ? "Выберите капитана" :
    filled < SLOTS.length ? `Нажмите на пустую позицию (${filled}/${SLOTS.length})` : "Состав готов!";
  $("#play").hidden = !(state.phase === "draft" && filled === SLOTS.length);

  for (const row of ["starters", "bench"]) {
    $(`#${row}`).innerHTML = SLOTS.filter((s) => s.starter === (row === "starters")).map((s) => {
      const p = state.lineup[s.key];
      if (!p) {
        const clickable = state.phase === "draft" ? `data-slot="${s.key}"` : "";
        return `<div class="slot"><div class="card empty" ${clickable}>+<small>${s.label}</small></div></div>`;
      }
      const c = playerChem(s.key);
      const dots = "●".repeat(c) + "○".repeat(3 - c);
      return `<div class="slot"><div class="slot-label">${s.label}</div>${cardHtml(p)}<div class="dots chem-${c}">${dots}</div></div>`;
    }).join("");
  }
  document.querySelectorAll("[data-slot]").forEach((el) =>
    el.addEventListener("click", () => openPicker(SLOTS.find((s) => s.key === el.dataset.slot))));
}

function showPicker(title, options, onPick) {
  $("#picker-title").textContent = title;
  $("#picker-cards").innerHTML = options.map((p, i) => cardHtml(p, `data-i="${i}"`)).join("");
  $("#picker-cards").querySelectorAll("[data-i]").forEach((el) =>
    el.addEventListener("click", () => {
      $("#picker").hidden = true;
      onPick(options[Number(el.dataset.i)]);
      render();
    }));
  $("#picker").hidden = false;
}

function openPicker(slot) {
  showPicker(`Позиция: ${slot.label}`, slotOptions(slot), (p) => { state.lineup[slot.key] = p; });
}

function pickCaptain() {
  showPicker("Выберите капитана", captainOptions(), (p) => {
    state.lineup[p.pos] = p;
    state.phase = "draft";
  });
}

function playTournament() {
  state.phase = "done";
  const strength = teamRating() + (teamChem() / MAX_CHEM) * 5 - 2.5;
  const teams = shuffle(Object.keys(NBA_TEAMS));
  const results = [];
  for (let i = 0; i < ROUNDS.length; i++) {
    const opp = 83 + i * 2 + Math.floor(Math.random() * 3) - 1;
    const pWin = 1 / (1 + Math.exp(-(strength - opp) / 2.5));
    const win = Math.random() < pWin;
    const high = 95 + Math.floor(Math.random() * 30);
    const low = high - 1 - Math.floor(Math.random() * 20);
    results.push({ round: ROUNDS[i], opp: `Драфт ${teams[i]} (${opp})`, win, score: win ? `${high}:${low}` : `${low}:${high}` });
    if (!win) break;
  }
  const wins = results.filter((r) => r.win).length;
  $("#results").innerHTML = `<h2>${wins === ROUNDS.length ? "🏆 Чемпионы!" : `Побед: ${wins}/${ROUNDS.length}`}</h2>` +
    results.map((r) => `<div class="result ${r.win ? "win" : "loss"}"><span>${r.round}</span><span>vs ${r.opp}</span><b>${r.score}</b></div>`).join("");
  $("#results").hidden = false;
  render();
}

function restart() {
  state.lineup = {};
  state.phase = "captain";
  $("#results").hidden = true;
  render();
  pickCaptain();
}

$("#play").addEventListener("click", playTournament);
$("#restart").addEventListener("click", restart);
restart();
