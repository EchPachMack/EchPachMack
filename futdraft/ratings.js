// Detailed player attributes (25..99). Built from position + play style around the player's OVR,
// with hand-set values for signature skills. Approximate fan estimates, not official ratings.
const ATTRS = [
  { key: "three", label: "Трёхочковые", short: "3PT", group: "Бросок" },
  { key: "mid", label: "Средний бросок", short: "СРД", group: "Бросок" },
  { key: "ft", label: "Штрафные", short: "ШТР", group: "Бросок" },
  { key: "ins", label: "Проходы и игра у кольца", short: "ПРХ", group: "Атака" },
  { key: "pas", label: "Пас и видение", short: "ПАС", group: "Атака" },
  { key: "bh", label: "Дриблинг", short: "ДРБ", group: "Атака" },
  { key: "perD", label: "Защита на периметре", short: "П-З", group: "Защита" },
  { key: "intD", label: "Защита под кольцом", short: "З-К", group: "Защита" },
  { key: "stl", label: "Перехваты", short: "ПХВ", group: "Защита" },
  { key: "blk", label: "Блок-шоты", short: "БЛК", group: "Защита" },
  { key: "reb", label: "Подбор", short: "ПДБ", group: "Физика" },
  { key: "ath", label: "Атлетизм", short: "АТЛ", group: "Физика" },
  { key: "dur", label: "Здоровье", short: "ЗДР", group: "Физика" },
  { key: "iq", label: "Баскетбольный IQ", short: "IQ", group: "Интеллект" },
  { key: "clu", label: "Клатч", short: "КЛЧ", group: "Интеллект" },
];
const ATTR_KEYS = ATTRS.map((a) => a.key);

// Offsets from OVR by position.
const POS_MOD = {
  PG: { three: 0, mid: 0, ft: 4, ins: -4, pas: 6, bh: 7, perD: -3, intD: -20, stl: 0, blk: -24, reb: -18, ath: 0, dur: 0, iq: 2 },
  SG: { three: 2, mid: 1, ft: 3, ins: -3, pas: -3, bh: 2, perD: -1, intD: -18, stl: -1, blk: -20, reb: -15, ath: 1, dur: 0, iq: 0 },
  SF: { three: -1, mid: -1, ft: -1, ins: 0, pas: -5, bh: -4, perD: 0, intD: -9, stl: -2, blk: -10, reb: -7, ath: 2, dur: 0, iq: 0 },
  PF: { three: -6, mid: -4, ft: -6, ins: 4, pas: -9, bh: -11, perD: -5, intD: 2, stl: -5, blk: 0, reb: 3, ath: 1, dur: 0, iq: 0 },
  C: { three: -22, mid: -12, ft: -12, ins: 7, pas: -11, bh: -20, perD: -12, intD: 8, stl: -7, blk: 7, reb: 9, ath: -2, dur: 0, iq: 0 },
};

// Offsets by play style. A player with two styles gets 65% of each.
const STYLE_MOD = {
  sniper: { three: 11, mid: 4, ft: 7, ins: -6, perD: -4, ath: -3 },
  scorer: { three: 3, mid: 7, ft: 3, ins: 4, bh: 4, perD: -4, pas: -1 },
  slasher: { ins: 9, ath: 7, three: -8, bh: 2, ft: -2 },
  playmaker: { pas: 11, bh: 6, iq: 5, perD: -2 },
  threeD: { three: 6, perD: 9, stl: 5, bh: -6, pas: -5, ins: -3 },
  lockdown: { perD: 13, stl: 7, three: -6, ins: -2, pas: -3, iq: 2 },
  rim: { intD: 11, blk: 13, reb: 7, three: -16, pas: -4, mid: -6 },
  stretch: { three: 14, mid: 5, ft: 6, intD: -2, reb: -2 },
  post: { ins: 9, reb: 6, three: -14, ath: -5, mid: 3, pas: 2 },
  athlete: { ath: 13, ins: 5, reb: 3, iq: -4, three: -5 },
  twoway: { perD: 7, intD: 3, stl: 3, three: 2, iq: 2 },
  glue: { iq: 8, perD: 4, pas: 4, three: 1, ins: -3, bh: -2 },
};

// name: "style" | "style+style" | [styles, overrides]
const PROFILES = {
  "Shai Gilgeous-Alexander": ["scorer", { mid: 97, ins: 93, ft: 92, clu: 96, perD: 84, stl: 86, three: 84, bh: 95, dur: 88, iq: 94 }],
  "Luka Dončić": ["scorer+playmaker", { three: 86, pas: 96, bh: 95, clu: 95, ath: 60, perD: 58, reb: 84, dur: 66, iq: 97 }],
  "Stephen Curry": ["sniper", { three: 99, ft: 97, mid: 92, clu: 96, bh: 94, pas: 84, perD: 62, ath: 70, dur: 70, iq: 95 }],
  "Jalen Brunson": ["scorer", { mid: 94, clu: 97, bh: 93, three: 85, perD: 58, ath: 62, iq: 93 }],
  "Cade Cunningham": ["scorer+playmaker", { clu: 85, pas: 91, reb: 72 }],
  "Tyrese Haliburton": ["playmaker", { pas: 97, three: 88, clu: 94, perD: 66, dur: 52, ath: 70, iq: 93 }],
  "Tyrese Maxey": ["scorer", { ath: 93, three: 87, clu: 80, ins: 88 }],
  "Jamal Murray": ["scorer", { clu: 94, mid: 90, three: 87 }],
  "Ja Morant": ["slasher", { ath: 98, ins: 93, three: 68, clu: 84, dur: 50, pas: 86 }],
  "Trae Young": ["playmaker", { pas: 96, three: 85, perD: 40, clu: 88, ft: 90, ath: 68 }],
  "De'Aaron Fox": ["slasher", { clu: 93, ath: 94, three: 75, stl: 84 }],
  "Kyrie Irving": ["scorer", { bh: 99, ins: 93, mid: 93, clu: 94, three: 88, dur: 62, ft: 91 }],
  "LaMelo Ball": ["playmaker", { three: 83, dur: 50, clu: 72, reb: 70 }],
  "Darius Garland": ["playmaker", { three: 86, perD: 55 }],
  "James Harden": ["playmaker", { pas: 95, three: 84, ft: 88, clu: 78, ath: 58, iq: 94 }],
  "Damian Lillard": ["sniper", { three: 92, clu: 97, ft: 93, perD: 50, dur: 52, bh: 91 }],
  "Jrue Holiday": ["twoway", { perD: 90, clu: 82, iq: 92, stl: 84 }],
  "Fred VanVleet": ["playmaker+threeD", { iq: 92, clu: 76 }],
  "Dejounte Murray": ["twoway", { stl: 90 }],
  "Anthony Edwards": ["scorer+athlete", { ath: 97, clu: 88, three: 86, perD: 82 }],
  "Donovan Mitchell": ["scorer", { clu: 91, ath: 90, three: 86 }],
  "Devin Booker": ["scorer", { mid: 96, clu: 90, three: 85, pas: 84, ft: 90 }],
  "Jaylen Brown": ["slasher+twoway", { clu: 84 }],
  "Jalen Williams": ["twoway", { clu: 84, mid: 86 }],
  "Tyler Herro": ["scorer", { three: 88, perD: 52, clu: 84 }],
  "Desmond Bane": "sniper",
  "Austin Reaves": ["scorer", { clu: 86, ft: 92 }],
  "Derrick White": ["threeD+glue", { blk: 68, clu: 85 }],
  "Zach LaVine": ["scorer+athlete", { three: 85 }],
  "Jalen Green": ["athlete+scorer", { clu: 62 }],
  "Dyson Daniels": ["lockdown", { stl: 97, three: 62 }],
  "Norman Powell": "scorer",
  "Klay Thompson": ["sniper", { clu: 84, ath: 58, perD: 70, dur: 62 }],
  "Cam Thomas": ["scorer", { perD: 45, pas: 60 }],
  "Coby White": "scorer",
  "CJ McCollum": ["scorer", { mid: 92, clu: 82 }],
  "Anfernee Simons": ["sniper", { perD: 48 }],
  "Jayson Tatum": ["scorer+twoway", { clu: 86, reb: 80, dur: 58 }],
  "LeBron James": ["playmaker+athlete", { iq: 99, pas: 95, clu: 93, ins: 95, perD: 70, dur: 70, ath: 84 }],
  "Kevin Durant": ["scorer", { mid: 99, three: 89, ft: 91, clu: 93, blk: 70, dur: 66 }],
  "Kawhi Leonard": ["twoway+scorer", { mid: 95, clu: 95, perD: 90, stl: 88, dur: 38 }],
  "Franz Wagner": "slasher",
  "Jimmy Butler": ["twoway", { clu: 92, ft: 88, three: 62, iq: 93, dur: 60 }],
  "Scottie Barnes": ["twoway+playmaker", { three: 66 }],
  "Mikal Bridges": ["threeD", { dur: 99, clu: 80 }],
  "Amen Thompson": ["athlete+lockdown", { three: 52, ath: 99 }],
  "Paul George": ["threeD", { dur: 50, clu: 68 }],
  "Brandon Ingram": ["scorer", { mid: 91 }],
  "OG Anunoby": ["lockdown", { three: 79 }],
  "Deni Avdija": "twoway",
  "DeMar DeRozan": ["scorer", { mid: 97, three: 58, clu: 95, ft: 88 }],
  "Michael Porter Jr.": ["sniper", { dur: 56 }],
  "Trey Murphy III": "threeD",
  "Brandon Miller": "sniper",
  "Cooper Flagg": ["twoway+athlete", { clu: 72 }],
  "Jaden McDaniels": "lockdown",
  "Giannis Antetokounmpo": ["athlete+slasher", { three: 55, ft: 62, ins: 99, ath: 99, reb: 94, clu: 80, intD: 90, mid: 70 }],
  "Anthony Davis": ["rim", { ins: 92, three: 64, clu: 72, dur: 48, mid: 80 }],
  "Evan Mobley": "rim+twoway",
  "Paolo Banchero": ["scorer", { clu: 84, ins: 89 }],
  "Jaren Jackson Jr.": ["rim+stretch", { blk: 96 }],
  "Pascal Siakam": ["slasher", { clu: 85, mid: 86 }],
  "Chet Holmgren": ["rim+stretch", { dur: 62 }],
  "Zion Williamson": ["post+athlete", { ins: 97, three: 40, dur: 34, clu: 70 }],
  "Jalen Johnson": "athlete+playmaker",
  "Lauri Markkanen": "stretch",
  "Julius Randle": "post+scorer",
  "Aaron Gordon": ["athlete+twoway", { clu: 85 }],
  "Jabari Smith Jr.": "stretch",
  "John Collins": "athlete",
  "Draymond Green": ["glue", { iq: 98, intD: 90, perD: 85, three: 58, pas: 88, clu: 76 }],
  "Nikola Jokić": ["playmaker+post", { pas: 99, iq: 99, ins: 96, mid: 93, three: 82, ft: 84, reb: 97, ath: 55, perD: 62, intD: 74, blk: 66, stl: 78, clu: 94, dur: 92 }],
  "Victor Wembanyama": ["rim+stretch", { blk: 99, intD: 97, three: 80, ath: 92, clu: 80, bh: 78, dur: 66 }],
  "Joel Embiid": ["post+scorer", { mid: 92, ft: 88, ins: 96, dur: 32, clu: 84 }],
  "Karl-Anthony Towns": ["stretch", { three: 89, clu: 72 }],
  "Alperen Şengün": ["post+playmaker", { pas: 90, three: 58 }],
  "Domantas Sabonis": ["post+playmaker", { reb: 98, three: 66 }],
  "Bam Adebayo": ["rim", { perD: 85, pas: 80, three: 60, clu: 68 }],
  "Rudy Gobert": ["rim", { three: 20, ft: 62, blk: 93, intD: 98, reb: 95, ins: 84, clu: 40 }],
  "Ivica Zubac": ["post+rim", { three: 20 }],
  "Jarrett Allen": ["rim", { three: 22 }],
  "Myles Turner": "stretch+rim",
  "Kristaps Porziņģis": ["stretch+rim", { dur: 46 }],
  "Jalen Duren": ["rim+athlete", { three: 20 }],
  "Deandre Ayton": "post",
  "Nikola Vučević": "stretch+post",
  "Isaiah Hartenstein": ["rim+playmaker", { three: 25 }],
  "Walker Kessler": ["rim", { three: 25, blk: 92 }],
  "Nickeil Alexander-Walker": "threeD", "Onyeka Okongwu": "rim", "Zaccharie Risacher": "threeD",
  "Payton Pritchard": ["sniper", { clu: 82 }], "Sam Hauser": "sniper", "Neemias Queta": "rim",
  "Nic Claxton": "rim", "Noah Clowney": "stretch", "Egor Dëmin": "playmaker",
  "Miles Bridges": "athlete", "Kon Knueppel": "sniper", "Collin Sexton": "scorer",
  "Josh Giddey": ["playmaker", { reb: 78 }], "Matas Buzelis": "athlete", "Patrick Williams": "threeD",
  "De'Andre Hunter": "threeD", "Max Strus": "sniper", "Sam Merrill": "sniper",
  "Jaden Ivey": "slasher", "Ausar Thompson": ["lockdown+athlete", { three: 55 }], "Tobias Harris": "glue", "Duncan Robinson": "sniper",
  "Andrew Nembhard": ["twoway", { clu: 85 }], "Aaron Nesmith": "threeD", "Bennedict Mathurin": "slasher",
  "Andrew Wiggins": "twoway", "Kel'el Ware": "rim", "Davion Mitchell": "lockdown",
  "Kyle Kuzma": "scorer", "Bobby Portis": "stretch", "Kevin Porter Jr.": "scorer",
  "Josh Hart": ["glue", { reb: 86 }], "Mitchell Robinson": "rim", "Miles McBride": "threeD",
  "Jalen Suggs": "lockdown", "Wendell Carter Jr.": "rim", "Anthony Black": "lockdown",
  "Kelly Oubre Jr.": "athlete", "VJ Edgecombe": "athlete", "Quentin Grimes": "threeD",
  "RJ Barrett": "slasher", "Immanuel Quickley": "playmaker", "Jakob Pöltl": "rim",
  "Alex Sarr": "rim", "Bilal Coulibaly": "lockdown", "Khris Middleton": ["scorer", { dur: 48, clu: 84 }], "Bub Carrington": "playmaker",
  "P.J. Washington": "twoway", "Dereck Lively II": "rim", "Daniel Gafford": "rim",
  "Christian Braun": "twoway", "Cameron Johnson": "sniper", "Jonas Valančiūnas": "post",
  "Jonathan Kuminga": "athlete", "Brandin Podziemski": "glue", "Buddy Hield": "sniper",
  "Tari Eason": "athlete+lockdown", "Reed Sheppard": "sniper", "Steven Adams": ["post", { reb: 90 }], "Dorian Finney-Smith": "threeD",
  "Derrick Jones Jr.": "lockdown", "Kris Dunn": "lockdown", "Nicolas Batum": "glue",
  "Rui Hachimura": "threeD", "Marcus Smart": ["lockdown", { clu: 78 }], "Jaxson Hayes": "rim",
  "Zach Edey": "post", "Santi Aldama": "stretch", "Ty Jerome": "scorer", "Kentavious Caldwell-Pope": "threeD",
  "Naz Reid": "stretch", "Donte DiVincenzo": "sniper", "Mike Conley": ["playmaker", { iq: 92, clu: 80 }],
  "Herbert Jones": "lockdown", "Jordan Poole": "scorer", "Yves Missi": "rim", "Derik Queen": "post",
  "Luguentz Dort": "lockdown", "Alex Caruso": ["lockdown", { iq: 90 }], "Cason Wallace": "threeD", "Aaron Wiggins": "athlete",
  "Dillon Brooks": "lockdown", "Grayson Allen": "sniper", "Mark Williams": "rim",
  "Shaedon Sharpe": "athlete", "Scoot Henderson": "playmaker", "Donovan Clingan": "rim", "Toumani Camara": "lockdown",
  "Keegan Murray": "threeD", "Malik Monk": ["scorer", { clu: 82 }], "Dennis Schröder": "playmaker",
  "Stephon Castle": "twoway", "Devin Vassell": "threeD", "Harrison Barnes": "glue", "Dylan Harper": "slasher",
  "Keyonte George": "scorer", "Jusuf Nurkić": "post", "Ace Bailey": "scorer", "Isaiah Collier": "playmaker",
};

const DEFAULT_STYLE = { PG: "playmaker", SG: "scorer", SF: "twoway", PF: "athlete", C: "rim" };

function attrJitter(name, key) {
  return (nameHash(`${name}:${key}`) % 7) - 3; // -3..3, stable
}

// Signature skills of a style never drop below this level (shifted by OVR), so a role-player sniper still shoots well.
const STYLE_FLOOR = {
  sniper: { three: 86, ft: 84 }, stretch: { three: 79 }, scorer: { mid: 80, ins: 78 }, slasher: { ins: 84, ath: 82 },
  playmaker: { pas: 85, bh: 82 }, threeD: { three: 78, perD: 80 }, lockdown: { perD: 86, stl: 80 },
  rim: { intD: 85, blk: 83, reb: 80 }, post: { ins: 83, reb: 80 }, athlete: { ath: 87 }, twoway: { perD: 79, intD: 70 }, glue: { iq: 84 },
};

function buildAttributes(p) {
  const prof = PROFILES[p.name];
  const [styleStr, overrides] = Array.isArray(prof) ? prof : [prof || DEFAULT_STYLE[p.pos], {}];
  const styles = styleStr.split("+");
  const weight = styles.length > 1 ? 0.65 : 1;
  const base = 58 + (p.ovr - 72); // 72 -> 58, 85 -> 71, 98 -> 84
  const a = {};
  for (const key of ATTR_KEYS) {
    if (key === "clu") continue;
    let v = base + (POS_MOD[p.pos][key] || 0) + attrJitter(p.name, key);
    for (const s of styles) {
      v += (STYLE_MOD[s][key] || 0) * weight;
      const floor = STYLE_FLOOR[s][key];
      if (floor) v = Math.max(v, floor + (p.ovr - 78) * 0.6 - (styles.length > 1 ? 3 : 0) + attrJitter(p.name, `f${key}`));
    }
    if (key === "dur") v = 78 + attrJitter(p.name, "dur") * 3; // health is not tied to skill
    a[key] = v;
  }
  // Clutch grows with star level, but varies a lot from player to player.
  a.clu = 45 + (p.ovr - 72) * 1.5 + attrJitter(p.name, "clu") * 2.5;
  Object.assign(a, overrides);
  for (const key of ATTR_KEYS) a[key] = Math.max(25, Math.min(99, Math.round(a[key])));
  p.a = a;
  p.styles = styles;
  return a;
}

for (const p of NBA_PLAYERS) buildAttributes(p);

// Composite numbers used on cards and team pages.
const offenseScore = (a) => 0.25 * a.three + 0.1 * a.mid + 0.25 * a.ins + 0.15 * a.pas + 0.1 * a.bh + 0.05 * a.ft + 0.1 * a.iq;
const defenseScore = (a) => 0.35 * a.perD + 0.35 * a.intD + 0.1 * a.stl + 0.1 * a.blk + 0.1 * a.iq;
