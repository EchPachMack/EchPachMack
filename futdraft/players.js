// NBA player pool for FUT Draft. Ratings are approximate fan estimates, not official data.
// pos: primary position (PG, SG, SF, PF, C). Edit freely to update rosters.
const NBA_TEAMS = {
  ATL: "Atlanta Hawks", BOS: "Boston Celtics", BKN: "Brooklyn Nets", CHA: "Charlotte Hornets",
  CHI: "Chicago Bulls", CLE: "Cleveland Cavaliers", DET: "Detroit Pistons", IND: "Indiana Pacers",
  MIA: "Miami Heat", MIL: "Milwaukee Bucks", NYK: "New York Knicks", ORL: "Orlando Magic",
  PHI: "Philadelphia 76ers", TOR: "Toronto Raptors", WAS: "Washington Wizards",
  DAL: "Dallas Mavericks", DEN: "Denver Nuggets", GSW: "Golden State Warriors", HOU: "Houston Rockets",
  LAC: "LA Clippers", LAL: "Los Angeles Lakers", MEM: "Memphis Grizzlies", MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans", OKC: "Oklahoma City Thunder", PHX: "Phoenix Suns",
  POR: "Portland Trail Blazers", SAC: "Sacramento Kings", SAS: "San Antonio Spurs", UTA: "Utah Jazz",
};

const WEST = new Set(["DAL", "DEN", "GSW", "HOU", "LAC", "LAL", "MEM", "MIN", "NOP", "OKC", "PHX", "POR", "SAC", "SAS", "UTA"]);

const NBA_PLAYERS = [
  // Point guards
  ["Shai Gilgeous-Alexander", "PG", "OKC", 97], ["Luka Dončić", "PG", "LAL", 96],
  ["Stephen Curry", "PG", "GSW", 91], ["Jalen Brunson", "PG", "NYK", 90],
  ["Cade Cunningham", "PG", "DET", 89], ["Tyrese Haliburton", "PG", "IND", 87],
  ["Tyrese Maxey", "PG", "PHI", 87], ["Jamal Murray", "PG", "DEN", 87],
  ["Ja Morant", "PG", "MEM", 86], ["Trae Young", "PG", "ATL", 86],
  ["De'Aaron Fox", "PG", "SAS", 86], ["Kyrie Irving", "PG", "DAL", 86],
  ["LaMelo Ball", "PG", "CHA", 85], ["Darius Garland", "PG", "CLE", 85],
  ["James Harden", "PG", "LAC", 85], ["Damian Lillard", "PG", "POR", 84],
  ["Jrue Holiday", "PG", "POR", 82], ["Fred VanVleet", "PG", "HOU", 81],
  ["Dejounte Murray", "PG", "NOP", 81],
  // Shooting guards
  ["Anthony Edwards", "SG", "MIN", 92], ["Donovan Mitchell", "SG", "CLE", 90],
  ["Devin Booker", "SG", "PHX", 88], ["Jaylen Brown", "SG", "BOS", 88],
  ["Jalen Williams", "SG", "OKC", 86], ["Tyler Herro", "SG", "MIA", 84],
  ["Desmond Bane", "SG", "ORL", 84], ["Austin Reaves", "SG", "LAL", 84],
  ["Derrick White", "SG", "BOS", 83], ["Zach LaVine", "SG", "SAC", 82],
  ["Jalen Green", "SG", "PHX", 82], ["Dyson Daniels", "SG", "ATL", 82],
  ["Norman Powell", "SG", "MIA", 81], ["Klay Thompson", "SG", "DAL", 80],
  ["Cam Thomas", "SG", "BKN", 80], ["Coby White", "SG", "CHI", 80],
  ["CJ McCollum", "SG", "WAS", 80], ["Anfernee Simons", "SG", "BOS", 80],
  // Small forwards
  ["Jayson Tatum", "SF", "BOS", 90], ["LeBron James", "SF", "LAL", 90],
  ["Kevin Durant", "SF", "HOU", 89], ["Kawhi Leonard", "SF", "LAC", 88],
  ["Franz Wagner", "SF", "ORL", 86], ["Jimmy Butler", "SF", "GSW", 85],
  ["Scottie Barnes", "SF", "TOR", 85], ["Mikal Bridges", "SF", "NYK", 84],
  ["Amen Thompson", "SF", "HOU", 84], ["Paul George", "SF", "PHI", 83],
  ["Brandon Ingram", "SF", "TOR", 83], ["OG Anunoby", "SF", "NYK", 83],
  ["Deni Avdija", "SF", "POR", 83], ["DeMar DeRozan", "SF", "SAC", 82],
  ["Michael Porter Jr.", "SF", "BKN", 82], ["Trey Murphy III", "SF", "NOP", 82],
  ["Brandon Miller", "SF", "CHA", 81], ["Cooper Flagg", "SF", "DAL", 81],
  ["Jaden McDaniels", "SF", "MIN", 80],
  // Power forwards
  ["Giannis Antetokounmpo", "PF", "MIL", 95], ["Anthony Davis", "PF", "DAL", 89],
  ["Evan Mobley", "PF", "CLE", 88], ["Paolo Banchero", "PF", "ORL", 87],
  ["Jaren Jackson Jr.", "PF", "MEM", 86], ["Pascal Siakam", "PF", "IND", 86],
  ["Chet Holmgren", "PF", "OKC", 86], ["Zion Williamson", "PF", "NOP", 85],
  ["Jalen Johnson", "PF", "ATL", 85], ["Lauri Markkanen", "PF", "UTA", 84],
  ["Julius Randle", "PF", "MIN", 83], ["Aaron Gordon", "PF", "DEN", 81],
  ["Jabari Smith Jr.", "PF", "HOU", 80], ["John Collins", "PF", "LAC", 80],
  ["Draymond Green", "PF", "GSW", 79],
  // Centers
  ["Nikola Jokić", "C", "DEN", 98], ["Victor Wembanyama", "C", "SAS", 94],
  ["Joel Embiid", "C", "PHI", 88], ["Karl-Anthony Towns", "C", "NYK", 88],
  ["Alperen Şengün", "C", "HOU", 87], ["Domantas Sabonis", "C", "SAC", 86],
  ["Bam Adebayo", "C", "MIA", 85], ["Rudy Gobert", "C", "MIN", 84],
  ["Ivica Zubac", "C", "LAC", 84], ["Jarrett Allen", "C", "CLE", 83],
  ["Myles Turner", "C", "MIL", 82], ["Kristaps Porziņģis", "C", "ATL", 82],
  ["Jalen Duren", "C", "DET", 82], ["Deandre Ayton", "C", "LAL", 81],
  ["Nikola Vučević", "C", "CHI", 81], ["Isaiah Hartenstein", "C", "OKC", 81],
  ["Walker Kessler", "C", "UTA", 80],
].map(([name, pos, team, ovr], id) => ({ id, name, pos, team, ovr, conf: WEST.has(team) ? "West" : "East" }));
