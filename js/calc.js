// calc.js: the only place where money is calculated.
// Pure functions: no DOM, no localStorage.

export const WEEKLY_SAVINGS = 10;
export const DEFAULT_GOAL = 700;

const EPS = 0.005; // tolerance for decimal rounding

/** Whether an expense fits the computed week's remaining balance. */
export function canAfford(computedWeek, amount) {
  return Number(amount) <= Number(computedWeek?.remaining ?? 0) + EPS;
}

function getSavedValue(week) {
  const saved = Number(week?.saved ?? WEEKLY_SAVINGS);
  return Number.isFinite(saved) && saved >= 0 ? saved : WEEKLY_SAVINGS;
}

/**
 * Compute every week in chronological order.
 * Each input week: { id, startDate: "YYYY-MM-DD", received, saved?, expenses: [{ amount }] }
 * Adds: number, carry, total, available, spent, remaining
 */
export function computeWeeks(weeks) {
  let carry = 0;
  return [...weeks]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((w, i) => {
      const spent = w.expenses.reduce((s, e) => s + Number(e.amount), 0);
      const saved = getSavedValue(w);
      const total = carry + Number(w.received);        // carry-over + received
      const available = total - saved;                 // after savings
      const remaining = available - spent;             // after expenses
      const result = { ...w, number: i + 1, carry, total, available, spent, remaining, saved };
      carry = remaining;                               // becomes next week's carry-over
      return result;
    });
}

/** True if no week ends below zero. */
export function isValid(computed) {
  return computed.every((w) => w.remaining >= -EPS);
}

/** Savings totals: saved amount, percent of goal, weeks left. */
export function savingsSummary(computed, goal = DEFAULT_GOAL) {
  const saved = computed.reduce((sum, w) => sum + getSavedValue(w), 0);
  const pace = computed.length ? getSavedValue(computed[computed.length - 1]) : WEEKLY_SAVINGS;
  const paceValue = pace > 0 ? pace : WEEKLY_SAVINGS;
  return {
    saved,
    percent: Math.min(100, (saved / goal) * 100),
    weeksLeft: Math.max(0, Math.ceil((goal - saved) / paceValue)),
  };
}

/** Global totals for the quick summary. */
export function totals(computed) {
  return {
    received: computed.reduce((s, w) => s + Number(w.received), 0),
    spent: computed.reduce((s, w) => s + w.spent, 0),
    current: computed.length ? computed[computed.length - 1].remaining : 0,
  };
}

/** Totals for weeks whose startDate is in a given year (defaults to the current year). */
export function yearTotals(computed = [], year = new Date().getFullYear()) {
  const y = Number(year);
  const prefix = `${y}-`;
  const yearWeeks = (computed || []).filter((w) => typeof w?.startDate === "string" && w.startDate.startsWith(prefix));
  const round2 = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;
  return {
    year: y,
    received: round2(yearWeeks.reduce((s, w) => s + Number(w.received || 0), 0)),
    spent: round2(yearWeeks.reduce((s, w) => s + (w.spent !== undefined ? Number(w.spent) : (Array.isArray(w.expenses) ? w.expenses.reduce((sub, e) => sub + Number(e.amount || 0), 0) : 0)), 0)),
    saved: round2(yearWeeks.reduce((s, w) => s + getSavedValue(w), 0)),
    count: yearWeeks.length,
  };
}

/**
 * Remaining money per day for the current week, counting today.
 * daysLeft = (Sunday - today) + 1, minimum 1.
 * If today falls before the week or after the week, use 7 days.
 */
export function dailyAllowance(week, todayIso) {
  if (!week || !week.startDate) return 0;
  const remaining = Math.max(0, Number(week.remaining) || 0);
  if (remaining === 0) return 0;

  const start = new Date(`${week.startDate}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const todayValue = todayIso ? new Date(`${todayIso}T12:00:00`) : new Date();
  const todayStart = new Date(todayValue);
  todayStart.setHours(12, 0, 0, 0);

  const inRange = todayStart >= start && todayStart <= end;
  const daysLeft = inRange
    ? Math.max(1, ((end.getTime() - todayStart.getTime()) / 86400000) + 1)
    : 7;

  return remaining / daysLeft;
}

/**
 * Apply a change to a copy of the data and check the money still works.
 * `mutate(copy)` edits the copy; it may return an error string to refuse the change.
 * Returns { ok: true, data } or { ok: false, error }. The original data is never touched.
 */
export function applyChange(data, mutate) {
  const next = structuredClone(data);
  const problem = mutate(next);
  if (typeof problem === "string") return { ok: false, error: problem };
  if (!isValid(computeWeeks(next.weeks))) {
    return {
      ok: false,
      error: "Not allowed: a week would not have enough money for its savings and expenses.",
    };
  }
  return { ok: true, data: next };
}
