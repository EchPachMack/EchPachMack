// NBA player pool for FUT Draft. Ratings are approximate fan estimates, not official data.
// pos: primary position (PG, SG, SF, PF, C). sal: 2025-26 salary in $M where it differs a lot from the
// rating-based estimate (rookie-scale deals); otherwise salary comes from salaryFor() in finance.js.
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

const DIVISIONS = {
  East: [["BOS", "BKN", "NYK", "PHI", "TOR"], ["CHI", "CLE", "DET", "IND", "MIL"], ["ATL", "CHA", "MIA", "ORL", "WAS"]],
  West: [["DEN", "MIN", "OKC", "POR", "UTA"], ["GSW", "LAC", "LAL", "PHX", "SAC"], ["DAL", "HOU", "MEM", "NOP", "SAS"]],
};
const DIVISION_NAMES = ["Атлантический", "Центральный", "Юго-Восточный", "Северо-Западный", "Тихоокеанский", "Юго-Западный"];

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
  ["Jalen Williams", "SG", "OKC", 86, 4.8], ["Tyler Herro", "SG", "MIA", 84],
  ["Desmond Bane", "SG", "ORL", 84], ["Austin Reaves", "SG", "LAL", 84],
  ["Derrick White", "SG", "BOS", 83], ["Zach LaVine", "SG", "SAC", 82],
  ["Jalen Green", "SG", "PHX", 82], ["Dyson Daniels", "SG", "ATL", 82, 6.1],
  ["Norman Powell", "SG", "MIA", 81], ["Klay Thompson", "SG", "DAL", 80],
  ["Cam Thomas", "SG", "BKN", 80], ["Coby White", "SG", "CHI", 80],
  ["CJ McCollum", "SG", "WAS", 80], ["Anfernee Simons", "SG", "BOS", 80],
  // Small forwards
  ["Jayson Tatum", "SF", "BOS", 90], ["LeBron James", "SF", "LAL", 90],
  ["Kevin Durant", "SF", "HOU", 89], ["Kawhi Leonard", "SF", "LAC", 88],
  ["Franz Wagner", "SF", "ORL", 86], ["Jimmy Butler", "SF", "GSW", 85],
  ["Scottie Barnes", "SF", "TOR", 85], ["Mikal Bridges", "SF", "NYK", 84],
  ["Amen Thompson", "SF", "HOU", 84, 9.6], ["Paul George", "SF", "PHI", 83],
  ["Brandon Ingram", "SF", "TOR", 83], ["OG Anunoby", "SF", "NYK", 83],
  ["Deni Avdija", "SF", "POR", 83], ["DeMar DeRozan", "SF", "SAC", 82],
  ["Michael Porter Jr.", "SF", "BKN", 82], ["Trey Murphy III", "SF", "NOP", 82],
  ["Brandon Miller", "SF", "CHA", 81, 11.4], ["Cooper Flagg", "SF", "DAL", 81, 13.8],
  ["Jaden McDaniels", "SF", "MIN", 80],
  // Power forwards
  ["Giannis Antetokounmpo", "PF", "MIL", 95], ["Anthony Davis", "PF", "DAL", 89],
  ["Evan Mobley", "PF", "CLE", 88], ["Paolo Banchero", "PF", "ORL", 87, 15.3],
  ["Jaren Jackson Jr.", "PF", "MEM", 86], ["Pascal Siakam", "PF", "IND", 86],
  ["Chet Holmgren", "PF", "OKC", 86, 13.7], ["Zion Williamson", "PF", "NOP", 85],
  ["Jalen Johnson", "PF", "ATL", 85], ["Lauri Markkanen", "PF", "UTA", 84],
  ["Julius Randle", "PF", "MIN", 83], ["Aaron Gordon", "PF", "DEN", 81],
  ["Jabari Smith Jr.", "PF", "HOU", 80], ["John Collins", "PF", "LAC", 80],
  ["Draymond Green", "PF", "GSW", 79],
  // Centers
  ["Nikola Jokić", "C", "DEN", 98], ["Victor Wembanyama", "C", "SAS", 94, 13.8],
  ["Joel Embiid", "C", "PHI", 88], ["Karl-Anthony Towns", "C", "NYK", 88],
  ["Alperen Şengün", "C", "HOU", 87], ["Domantas Sabonis", "C", "SAC", 86],
  ["Bam Adebayo", "C", "MIA", 85], ["Rudy Gobert", "C", "MIN", 84],
  ["Ivica Zubac", "C", "LAC", 84], ["Jarrett Allen", "C", "CLE", 83],
  ["Myles Turner", "C", "MIL", 82], ["Kristaps Porziņģis", "C", "ATL", 82],
  ["Jalen Duren", "C", "DET", 82, 6.5], ["Deandre Ayton", "C", "LAL", 81],
  ["Nikola Vučević", "C", "CHI", 81], ["Isaiah Hartenstein", "C", "OKC", 81],
  ["Walker Kessler", "C", "UTA", 80, 4.9],

  // Rotation and bench players
  ["Nickeil Alexander-Walker", "SG", "ATL", 78], ["Onyeka Okongwu", "C", "ATL", 79], ["Zaccharie Risacher", "SF", "ATL", 76, 13.6],
  ["Payton Pritchard", "PG", "BOS", 79], ["Sam Hauser", "SF", "BOS", 75], ["Neemias Queta", "C", "BOS", 74],
  ["Nic Claxton", "C", "BKN", 78], ["Noah Clowney", "PF", "BKN", 74, 3.2], ["Egor Dëmin", "PG", "BKN", 73, 5.2],
  ["Miles Bridges", "PF", "CHA", 79], ["Kon Knueppel", "SG", "CHA", 76, 11.6], ["Collin Sexton", "PG", "CHA", 77],
  ["Josh Giddey", "PG", "CHI", 81], ["Matas Buzelis", "PF", "CHI", 76, 4.2], ["Patrick Williams", "PF", "CHI", 73],
  ["De'Andre Hunter", "SF", "CLE", 78], ["Max Strus", "SF", "CLE", 76], ["Sam Merrill", "SG", "CLE", 73],
  ["Jaden Ivey", "SG", "DET", 78, 10.1], ["Ausar Thompson", "SF", "DET", 78, 8.9], ["Tobias Harris", "PF", "DET", 77], ["Duncan Robinson", "SF", "DET", 75],
  ["Andrew Nembhard", "PG", "IND", 78], ["Aaron Nesmith", "SF", "IND", 76], ["Bennedict Mathurin", "SG", "IND", 79, 9.2],
  ["Andrew Wiggins", "SF", "MIA", 78], ["Kel'el Ware", "C", "MIA", 77, 4.4], ["Davion Mitchell", "PG", "MIA", 75],
  ["Kyle Kuzma", "PF", "MIL", 76], ["Bobby Portis", "PF", "MIL", 76], ["Kevin Porter Jr.", "PG", "MIL", 76],
  ["Josh Hart", "SG", "NYK", 79], ["Mitchell Robinson", "C", "NYK", 76], ["Miles McBride", "PG", "NYK", 74],
  ["Jalen Suggs", "PG", "ORL", 79], ["Wendell Carter Jr.", "C", "ORL", 76], ["Anthony Black", "SG", "ORL", 74, 7.6],
  ["Kelly Oubre Jr.", "SF", "PHI", 77], ["VJ Edgecombe", "SG", "PHI", 77, 11.0], ["Quentin Grimes", "SG", "PHI", 77],
  ["RJ Barrett", "SF", "TOR", 79], ["Immanuel Quickley", "PG", "TOR", 79], ["Jakob Pöltl", "C", "TOR", 78],
  ["Alex Sarr", "C", "WAS", 77, 12.5], ["Bilal Coulibaly", "SF", "WAS", 76, 7.2], ["Khris Middleton", "SF", "WAS", 76], ["Bub Carrington", "PG", "WAS", 73, 2.5],
  ["P.J. Washington", "PF", "DAL", 78], ["Dereck Lively II", "C", "DAL", 78, 5.3], ["Daniel Gafford", "C", "DAL", 77],
  ["Christian Braun", "SG", "DEN", 79], ["Cameron Johnson", "SF", "DEN", 79], ["Jonas Valančiūnas", "C", "DEN", 76],
  ["Jonathan Kuminga", "PF", "GSW", 79], ["Brandin Podziemski", "SG", "GSW", 77, 3.7], ["Buddy Hield", "SG", "GSW", 75],
  ["Tari Eason", "PF", "HOU", 78, 5.7], ["Reed Sheppard", "PG", "HOU", 76, 11.2], ["Steven Adams", "C", "HOU", 75], ["Dorian Finney-Smith", "SF", "HOU", 74],
  ["Derrick Jones Jr.", "SF", "LAC", 75], ["Kris Dunn", "PG", "LAC", 74], ["Nicolas Batum", "PF", "LAC", 72],
  ["Rui Hachimura", "PF", "LAL", 78], ["Marcus Smart", "PG", "LAL", 75], ["Jaxson Hayes", "C", "LAL", 73],
  ["Zach Edey", "C", "MEM", 77, 6.4], ["Santi Aldama", "PF", "MEM", 77], ["Ty Jerome", "PG", "MEM", 76], ["Kentavious Caldwell-Pope", "SG", "MEM", 75],
  ["Naz Reid", "C", "MIN", 79], ["Donte DiVincenzo", "SG", "MIN", 77], ["Mike Conley", "PG", "MIN", 73],
  ["Herbert Jones", "SF", "NOP", 77], ["Jordan Poole", "SG", "NOP", 77], ["Yves Missi", "C", "NOP", 74, 3.2], ["Derik Queen", "C", "NOP", 74, 5.0],
  ["Luguentz Dort", "SG", "OKC", 77], ["Alex Caruso", "SG", "OKC", 77], ["Cason Wallace", "SG", "OKC", 77, 5.6], ["Aaron Wiggins", "SF", "OKC", 74],
  ["Dillon Brooks", "SF", "PHX", 77], ["Grayson Allen", "SG", "PHX", 75], ["Mark Williams", "C", "PHX", 77, 6.3],
  ["Shaedon Sharpe", "SG", "POR", 79, 8.4], ["Scoot Henderson", "PG", "POR", 76, 10.3], ["Donovan Clingan", "C", "POR", 77, 7.4], ["Toumani Camara", "SF", "POR", 77],
  ["Keegan Murray", "PF", "SAC", 79, 11.1], ["Malik Monk", "SG", "SAC", 78], ["Dennis Schröder", "PG", "SAC", 76],
  ["Stephon Castle", "PG", "SAS", 79, 9.1], ["Devin Vassell", "SG", "SAS", 78], ["Harrison Barnes", "SF", "SAS", 75], ["Dylan Harper", "PG", "SAS", 77, 11.6],
  ["Keyonte George", "PG", "UTA", 78, 4.1], ["Jusuf Nurkić", "C", "UTA", 74], ["Ace Bailey", "SF", "UTA", 75, 9.0], ["Isaiah Collier", "PG", "UTA", 72, 2.5],
  // G League prospects: always available as free agents on a minimum deal, never in the draft
  ["Проспект G-Лиги (PG)", "PG", "GL", 71, 1.3], ["Проспект G-Лиги (SG)", "SG", "GL", 70, 1.3], ["Проспект G-Лиги (SF)", "SF", "GL", 71, 1.3],
  ["Проспект G-Лиги (PF)", "PF", "GL", 70, 1.3], ["Проспект G-Лиги (C)", "C", "GL", 71, 1.3], ["Ветеран на минималке", "SF", "GL", 72, 2.3],
].map(([name, pos, team, ovr, sal], id) => ({ id, name, pos, team, ovr, sal, conf: team === "GL" ? "—" : WEST.has(team) ? "West" : "East" }));
