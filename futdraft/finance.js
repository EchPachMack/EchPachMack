// NBA salary-cap rules (2025-26 figures, $M) and team economics.
const CAP = 154.647;
const TAX_LINE = 187.895;
const APRON_1 = 195.945;
const APRON_2 = 207.824; // Works as a hard cap in this game.
const SALARY_FLOOR = 139.182;
const NT_MLE = 14.104; // Non-taxpayer mid-level exception.
const TP_MLE = 5.685; // Taxpayer mid-level exception.
const VET_MIN = 2.3;
const ROSTER_MIN = 13;
const ROSTER_MAX = 15;

// Rating -> typical veteran salary; rookie-scale players override it with p.sal.
const SALARY_CURVE = [[70, 1.3], [72, 2.3], [75, 4], [78, 10], [80, 16], [83, 26], [86, 36], [89, 46], [92, 52], [95, 55]];

function nameHash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function salaryFor(p) {
  if (p.sal != null) return p.sal;
  const c = SALARY_CURVE;
  let base = c[c.length - 1][1];
  if (p.ovr <= c[0][0]) base = c[0][1];
  for (let i = 1; i < c.length; i++) {
    if (p.ovr <= c[i][0]) {
      const [x0, y0] = c[i - 1];
      const [x1, y1] = c[i];
      base = y0 + ((p.ovr - x0) / (x1 - x0)) * (y1 - y0);
      break;
    }
  }
  const jitter = 0.9 + (nameHash(p.name) % 21) / 100; // 0.90..1.10, stable per player
  return Math.round(Math.min(base * jitter, 0.35 * CAP) * 10) / 10;
}

// Incremental tax: $1.50 per $1 over the line for the first $5M, then 1.75, 2.50, 3.25, +0.50 per further $5M.
function luxuryTax(payroll) {
  let over = payroll - TAX_LINE;
  let tax = 0;
  let rate = 1.5;
  const steps = [1.5, 1.75, 2.5, 3.25];
  for (let i = 0; over > 0; i++) {
    rate = i < steps.length ? steps[i] : rate + 0.5;
    tax += Math.min(over, 5) * rate;
    over -= 5;
  }
  return tax;
}

function capZone(payroll) {
  if (payroll > APRON_2) return { key: "hard", label: "Выше 2-го апрона" };
  if (payroll > APRON_1) return { key: "apron2", label: "Между апронами" };
  if (payroll > TAX_LINE) return { key: "apron1", label: "Платит налог" };
  if (payroll > CAP) return { key: "tax", label: "Выше потолка" };
  return { key: "cap", label: "Под потолком" };
}

// Salary matching for a trade under the 2023 CBA. Amounts in $M.
function tradeCheck(payroll, outSal, inSal) {
  const after = payroll - outSal + inSal;
  if (after > APRON_2) return { ok: false, reason: `Зарплата превысит 2-й апрон (${money(APRON_2)})` };
  if (after <= CAP) return { ok: true, reason: "После обмена команда под потолком — сверять зарплаты не нужно" };
  if (after > APRON_1) {
    return inSal <= outSal
      ? { ok: true, reason: "Выше 1-го апрона: входящая зарплата не больше исходящей" }
      : { ok: false, reason: "Выше 1-го апрона можно брать не больше 100% отдаваемой зарплаты" };
  }
  const limit = outSal <= 7.5 ? 2 * outSal + 0.25 : outSal <= 29 ? outSal + 7.5 : 1.25 * outSal + 0.25;
  return inSal <= limit
    ? { ok: true, reason: `Входящая зарплата в пределах лимита ${money(limit)}` }
    : { ok: false, reason: `Можно принять максимум ${money(limit)} за ${money(outSal)}` };
}

// Which mechanism lets the team sign a free agent, if any.
function signingCheck(payroll, sal, mleUsed) {
  const after = payroll + sal;
  if (after > APRON_2) return { ok: false, reason: "Превысит 2-й апрон" };
  if (after <= CAP) return { ok: true, via: "cap", reason: "Есть место под потолком" };
  if (sal <= VET_MIN) return { ok: true, via: "min", reason: "Минимальный контракт" };
  if (!mleUsed && sal <= NT_MLE && after <= APRON_1) return { ok: true, via: "mle", reason: `MLE для неплательщиков (до ${money(NT_MLE)})` };
  if (!mleUsed && sal <= TP_MLE) return { ok: true, via: "mle", reason: `MLE для плательщиков налога (до ${money(TP_MLE)})` };
  return { ok: false, reason: mleUsed ? "MLE уже использована, места под потолком нет" : "Зарплата больше доступного исключения" };
}

// Season economics, $M.
const ECON = {
  nationalMedia: 135, // League TV deals and shared revenue
  localMedia: 45, // Local TV, sponsors, arena
  operations: 55, // Staff, travel, arena operations
  taxShare: 10, // Share of tax payments distributed to non-taxpayers
  gateBase: 1.2, // Per regular-season home game, plus gateWin * win%
  gateWin: 2.4,
  playInGate: 2,
  playoffGate: 3.5,
  finalsGate: 6,
};

function money(x) {
  const sign = x < 0 ? "−" : "";
  return `${sign}$${Math.abs(x).toFixed(1)}M`;
}
