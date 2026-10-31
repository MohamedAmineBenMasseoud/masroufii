// expenses.js: add / edit / delete an expense, plus categories.
// Logic only: every function returns { ok, data } or { ok: false, error }.
import { applyChange } from "./calc.js";
import { t } from "./i18n.js";
import { toISO } from "./utils.js";

export const CATEGORIES = {
  Food: "food",
  Water: "drop",
  Transport: "car",
  Entertainment: "play",
  Shopping: "bag",
  Study: "book",
  Phone: "phone",
  "Phone/Internet": "phone",
  Coffee: "cup",
  Snacks: "snack",
  Other: "dots",
};
export const DEFAULT_CATEGORY = "Other";
export const QUICK_CATEGORIES = ["Food", "Water", "Transport", "Study", "Phone", "Other"];

const CATEGORY_KEYS = {
  Food: "expense.category.food", Water: "expense.category.water", Transport: "expense.category.transport",
  Entertainment: "expense.category.entertainment", Shopping: "expense.category.shopping", Study: "expense.category.study",
  Phone: "category.Phone", "Phone/Internet": "expense.category.phoneInternet", Coffee: "expense.category.coffee",
  Snacks: "expense.category.snacks", Other: "expense.category.other",
};

export function categoryLabel(category) {
  return t(CATEGORY_KEYS[category] || "expense.category.other");
}

export function expenseLabel(expense) {
  return expense?.name === expense?.category ? categoryLabel(expense.category) : String(expense?.name ?? "");
}

/** Icon name for a category (unknown or custom categories get the "Other" icon). */
export const iconFor = (category) => CATEGORIES[category] || CATEGORIES[DEFAULT_CATEGORY];

const TOO_MUCH = "This expense is higher than the money you have available.";

/** Clean the form values. Returns { expense } or { error }. */
function cleanInput({ name, amount, category, date }) {
  const cleanName = String(name ?? "").trim();
  if (!cleanName) return { error: "Please enter a name." };
  const value = Math.round(Number(amount) * 100) / 100; // 2 decimals
  if (!Number.isFinite(value) || value <= 0) return { error: "Amount must be more than 0." };
  const cleanDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? date.trim() : undefined;
  return {
    expense: {
      name: cleanName,
      amount: value,
      category: category || DEFAULT_CATEGORY,
      ...(cleanDate ? { date: cleanDate } : {}),
    },
  };
}

/** Run a change on one week's expense list; give a clear message if the budget refuses it. */
function change(data, weekId, edit) {
  const result = applyChange(data, (d) => {
    const week = d.weeks.find((w) => w.id === weekId);
    if (!week) return "Week not found.";
    return edit(week.expenses);
  });
  if (!result.ok && result.error.startsWith("Not allowed")) return { ok: false, error: TOO_MUCH };
  return result;
}

export function addExpense(data, weekId, input) {
  const date = input?.date || toISO(new Date());
  const { expense, error } = cleanInput({ ...input, date });
  if (error) return { ok: false, error };
  return change(data, weekId, (list) => { list.push(expense); });
}

export function editExpense(data, weekId, index, input) {
  const existing = data.weeks.find((w) => w.id === weekId)?.expenses?.[index];
  const date = input?.date !== undefined ? input.date : existing?.date;
  const { expense, error } = cleanInput({ ...input, date });
  if (error) return { ok: false, error };
  return change(data, weekId, (list) => {
    if (!list[index]) return "Expense not found.";
    list[index] = expense;
  });
}

export function deleteExpense(data, weekId, index) {
  return change(data, weekId, (list) => {
    if (!list[index]) return "Expense not found.";
    list.splice(index, 1);
  });
}
