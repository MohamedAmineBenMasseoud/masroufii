// Monthly income plans are links over the single source of truth: weeks.
import { applyChange } from "./calc.js";
import { t } from "./i18n.js";
import { addDays, newId } from "./utils.js";

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const validMonth = (month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ""));

export function mondaysOfMonth(month) {
  if (!validMonth(month)) return [];
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mondays = [];
  for (let day = 1; day <= days; day += 1) {
    if (new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay() === 1) {
      mondays.push(`${month}-${String(day).padStart(2, "0")}`);
    }
  }
  return mondays;
}

export function splitMonth({ month, income, saveTotal, mondays }) {
  const dates = Array.isArray(mondays) ? mondays : mondaysOfMonth(month);
  const n = dates.length;
  if (!n) return { weeks: 0, spend: [], save: [] };

  const cleanIncome = round2(Number(income) || 0);
  const cleanSave = round2(Number(saveTotal) || 0);
  const baseSave = round2(cleanSave / n);
  const baseSpend = round2((cleanIncome - cleanSave) / n);

  const save = Array(n).fill(baseSave);
  const spend = Array(n).fill(baseSpend);

  save[n - 1] = round2(cleanSave - baseSave * (n - 1));
  spend[n - 1] = round2((cleanIncome - cleanSave) - baseSpend * (n - 1));

  return { weeks: n, spend, save };
}

export function planMonth({ month, income, savePerWeek }) {
  const mondays = mondaysOfMonth(month);
  const saveTotal = round2(Number(savePerWeek) * mondays.length);
  const split = splitMonth({ month, income, saveTotal });
  return { weeks: split.weeks, spendPerWeek: split.spend[0] ?? 0, perWeek: split.spend };
}

export function monthSavingTotal(month, savePerWeek) {
  return round2(mondaysOfMonth(month).length * Number(savePerWeek));
}

export function monthProgressFraction(progress) {
  if (!progress || !(progress.received > 0)) return 0;
  return Math.min(1, Math.max(0, (progress.spent + progress.saved) / progress.received));
}

export function monthProgressPercent(progress) {
  return monthProgressFraction(progress) * 100;
}

export function isMonthFullyPlanned(data, monthId) {
  const summary = monthPlanSummary(data, monthId);
  return Boolean(summary && Math.abs(summary.planned - summary.income) <= 0.005);
}

export function monthEditOverage(data, monthId, weekId, { spend, saved }) {
  const summary = monthPlanSummary(data, monthId);
  if (!summary) return 0;
  const week = summary.weeks.find((item) => item.id === weekId);
  if (!week) return 0;
  const newReceived = round2(Number(spend) + Number(saved));
  const planned = round2(summary.planned - (week.spend + week.saved) + newReceived);
  return Math.max(0, round2(planned - summary.income));
}

export function monthWeekPreview(data, monthId, weekId, values) {
  const month = (data.months || []).find((item) => item.id === monthId);
  const summary = monthPlanSummary(data, monthId);
  const week = summary?.weeks.find((item) => item.id === weekId);
  if (!month || !week) return { result: { ok: false, error: "Week not found in this month." }, overage: 0, planned: 0, income: 0 };
  const proposedReceived = round2(Number(values.spend) + Number(values.saved));
  const planned = round2(summary.planned - (week.spend + week.saved) + proposedReceived);
  const result = editMonthWeek(structuredClone(data), monthId, weekId, values);
  return {
    result,
    overage: Math.max(0, round2(planned - summary.income)),
    planned,
    income: summary.income,
  };
}

export function stepMonthValue(value, direction) {
  return Math.max(0, round2(Number(value) + (direction < 0 ? -1 : 1)));
}

export function monthName(label, language = "en") {
  if (!validMonth(label)) return String(label || "");
  const locale = { en: "en-GB", fr: "fr-FR", ar: "ar-TN-u-nu-latn" }[language] || "en-GB";
  return new Date(`${label}-01T12:00:00`).toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function addMonth(data, { month, income, saveTotal, savePerWeek }) {
  return applyChange(data, (draft) => {
    const mondays = mondaysOfMonth(month);
    const effectiveSaveTotal =
      saveTotal !== undefined
        ? saveTotal
        : (savePerWeek !== undefined && mondays.length ? Number(savePerWeek) * mondays.length : undefined);

    if (!Number.isFinite(Number(income)) || Number(income) <= 0) return t("month.errIncome");
    if (!Number.isFinite(Number(effectiveSaveTotal)) || Number(effectiveSaveTotal) < 0) return t("month.errSave");
    if (!validMonth(month) || !mondays.length) return t("month.errMonth");

    const cleanIncome = round2(Number(income));
    const cleanSave = round2(Number(effectiveSaveTotal));
    if (cleanIncome <= 0) return t("month.errIncome");
    if (cleanSave - cleanIncome > 0.005) return t("month.errLow");
    if (mondays.some((date) => draft.weeks.some((week) => week.startDate === date))) return t("month.errExists");

    const { spend, save } = splitMonth({ month, income: cleanIncome, saveTotal: cleanSave });
    const createdWeeks = mondays.map((startDate, index) => ({
      id: newId(),
      startDate,
      received: round2(spend[index] + save[index]),
      saved: save[index],
      expenses: [],
    }));
    draft.weeks.push(...createdWeeks);
    draft.months.push({
      id: newId(),
      label: month,
      income: cleanIncome,
      weekIds: createdWeeks.map((week) => week.id),
    });
  });
}

export function editMonthWeek(data, monthId, weekId, { spend, saved }) {
  return applyChange(data, (draft) => {
    const month = (draft.months || []).find((item) => item.id === monthId);
    const week = draft.weeks.find((item) => item.id === weekId);
    if (!month || !week || !month.weekIds.includes(weekId)) return "Week not found in this month.";
    if (!Number.isFinite(Number(spend)) || Number(spend) < 0) return t("month.errSpend");
    if (!Number.isFinite(Number(saved)) || Number(saved) < 0) return t("month.errSave");
    const cleanSpend = round2(Number(spend));
    const cleanSaved = round2(Number(saved));
    const received = round2(cleanSpend + cleanSaved);
    const planned = draft.weeks
      .filter((item) => month.weekIds.includes(item.id))
      .reduce((sum, item) => sum + Number(item.received), 0)
      - Number(week.received) + received;
    if (planned > month.income + 0.005) {
      return t("month.errOver", { x: round2(planned - month.income).toFixed(2) });
    }
    week.received = received;
    week.saved = cleanSaved;
  });
}

export function monthPlanSummary(data, monthId) {
  const month = (data.months || []).find((item) => item.id === monthId);
  if (!month) return null;
  const weeks = month.weekIds
    .map((id) => data.weeks.find((week) => week.id === id))
    .filter(Boolean)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((week) => ({
      id: week.id,
      startDate: week.startDate,
      endDate: addDays(week.startDate, 6),
      spend: round2(Number(week.received) - Number(week.saved ?? 0)),
      saved: Number(week.saved ?? 0),
    }));
  const planned = round2(month.weekIds
    .map((id) => data.weeks.find((week) => week.id === id))
    .filter(Boolean)
    .reduce((sum, week) => sum + Number(week.received), 0));
  const toSpend = round2(weeks.reduce((sum, week) => sum + week.spend, 0));
  const toSave = round2(weeks.reduce((sum, week) => sum + week.saved, 0));
  return {
    income: Number(month.income),
    planned,
    unplanned: Math.max(0, round2(Number(month.income) - planned)),
    toSpend,
    toSave,
    weeks,
  };
}

export function monthProgress(data, monthId, todayIso) {
  const month = (data.months || []).find((item) => item.id === monthId);
  const summary = monthPlanSummary(data, monthId);
  if (!month || !summary || !summary.weeks.length) return null;
  const today = String(todayIso || "");
  let index = summary.weeks.findIndex((week) => today >= week.startDate && today <= week.endDate);
  if (index < 0) index = today < summary.weeks[0].startDate ? 0 : summary.weeks.length - 1;
  const ids = new Set(month.weekIds);
  const monthWeeks = data.weeks.filter((week) => ids.has(week.id));
  return {
    index: index + 1,
    total: summary.weeks.length,
    received: Number(month.income),
    spent: round2(monthWeeks.reduce((sum, week) => sum + week.expenses.reduce((sub, expense) => sub + Number(expense.amount), 0), 0)),
    saved: round2(monthWeeks
      .filter((week) => week.startDate <= today)
      .reduce((sum, week) => sum + Number(week.saved ?? 0), 0)),
  };
}

export function monthOfWeek(data, weekId) {
  return (data.months || []).find((month) => month.weekIds.includes(weekId)) || null;
}

export function deleteMonth(data, monthId) {
  return applyChange(data, (draft) => {
    const month = (draft.months || []).find((item) => item.id === monthId);
    if (!month) return "Month not found.";
    const ids = new Set(month.weekIds);
    draft.weeks = draft.weeks.filter((week) => !ids.has(week.id));
    draft.months = draft.months.filter((item) => item.id !== monthId);
  });
}
