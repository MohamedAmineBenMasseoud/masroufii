// weeks.js: add / edit / delete a week.
// Logic only: every function takes the data and returns { ok, data } or { ok: false, error }.
// The screens decide what to do with the result.
import { WEEKLY_SAVINGS, applyChange } from "./calc.js";
import { addDays, isMonday, mondayOf, newId } from "./utils.js";
import { t } from "./i18n.js";

/** Default Monday for the "Add Week" form: the week after the latest one, or this week's Monday. */
export function suggestedStart(data) {
  if (!data.weeks.length) return mondayOf();
  const last = data.weeks.map((w) => w.startDate).sort().pop();
  return addDays(last, 7);
}

/** Suggested saving amount for a new week: the previous week's amount, or the default. */
export function suggestSaved(data, ignoreId = null) {
  const previous = [...data.weeks]
    .filter((w) => w.id !== ignoreId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .at(-1);
  const value = previous ? Number(previous.saved ?? WEEKLY_SAVINGS) : WEEKLY_SAVINGS;
  return Number.isFinite(value) && value >= 0 ? value : WEEKLY_SAVINGS;
}

/** Return an error message if the form values are not acceptable, otherwise null. */
function checkInput(data, { startDate, received, saved }, ignoreId = null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || "")) return "Please choose a date.";
  if (!isMonday(startDate)) return "Please choose a Monday.";
  const amount = Number(received);
  if (!Number.isFinite(amount) || amount < 0) return "Money received must be 0 or more.";
  const savings = Number(saved ?? suggestSaved(data, ignoreId));
  if (!Number.isFinite(savings) || savings < 0) return "Savings amount must be 0 or more.";
  if (data.weeks.some((w) => w.id !== ignoreId && w.startDate === startDate)) {
    return "A week with this Monday already exists.";
  }
  return null;
}

/** Create a week. Carry-over is automatic; the chosen savings amount is stored with the week. */
export function addWeek(data, input) {
  return applyChange(data, (d) => {
    const problem = checkInput(d, input);
    if (problem) return problem;
    d.weeks.push({
      id: newId(),
      startDate: input.startDate,
      received: Number(input.received),
      saved: Number(input.saved ?? suggestSaved(d)),
      expenses: [],
    });
  });
}

/** Change a week's Monday, received amount, and saved amount. Expenses are kept. */
export function editWeek(data, id, input) {
  return applyChange(data, (d) => {
    const week = d.weeks.find((w) => w.id === id);
    if (!week) return "Week not found.";
    const problem = checkInput(d, input, id);
    if (problem) return problem;
    week.startDate = input.startDate;
    week.received = Number(input.received);
    week.saved = Number(input.saved ?? suggestSaved(d, id));
    const month = (d.months || []).find((item) => item.weekIds.includes(id));
    if (month) {
      const planned = d.weeks.filter((item) => month.weekIds.includes(item.id)).reduce((sum, item) => sum + Number(item.received), 0);
      if (planned > month.income + 0.005) {
        return t("month.errOver", { x: (planned - month.income).toFixed(2) });
      }
    }
  });
}

/** Delete a week with its expenses. Later weeks are recalculated; refused if that breaks them. */
export function deleteWeek(data, id) {
  return applyChange(data, (d) => {
    if (!d.weeks.some((w) => w.id === id)) return "Week not found.";
    d.weeks = d.weeks.filter((w) => w.id !== id);
    d.months = (d.months || [])
      .map((month) => ({ ...month, weekIds: month.weekIds.filter((weekId) => weekId !== id) }))
      .filter((month) => month.weekIds.length > 0);
  });
}
