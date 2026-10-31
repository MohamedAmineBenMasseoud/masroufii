import assert from "node:assert/strict";
import { pressKey } from "../js/amountInput.js";
import { canAfford, computeWeeks, yearTotals } from "../js/calc.js";
import { categoryLabel, expenseLabel } from "../js/expenses.js";
import { setLanguage, t } from "../js/i18n.js";
import en from "../js/lang/en.js";
import fr from "../js/lang/fr.js";
import ar from "../js/lang/ar.js";
import { shouldConfirm, slideProgress } from "../js/slide.js";
import { renderSavings } from "../js/views/savings.js";

assert.equal(pressKey("5", "."), "5.");
assert.equal(pressKey("5.5", "5"), "5.55");
assert.equal(pressKey("5.55", "6"), "5.55");
assert.equal(pressKey("123456", "7"), "123456");
assert.equal(pressKey("0", "5"), "5");
assert.equal(pressKey("", "."), "0.");
assert.equal(pressKey("1", "back"), "");
assert.equal(slideProgress(100, 16, 100), 0.84);
assert.equal(slideProgress(100, 15, 100), 0.85);
assert.equal(shouldConfirm(0.84), false);
assert.equal(shouldConfirm(0.85), true);
assert.equal(slideProgress(100, 150, 100), 0);
assert.equal(slideProgress(100, -50, 100), 1);
assert.equal(canAfford({ remaining: 24.5 }, 24.5), true);
assert.equal(canAfford({ remaining: 24.5 }, 24.51), false);
setLanguage("en");
assert.equal(expenseLabel({ name: "Food", category: "Food" }), "Food");
setLanguage("fr");
assert.equal(expenseLabel({ name: "Food", category: "Food" }), "Nourriture");
assert.equal(expenseLabel({ name: "Snack special", category: "Food" }), "Snack special");
assert.equal(categoryLabel("Food"), "Nourriture");
assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort());
assert.deepEqual(Object.keys(en).sort(), Object.keys(ar).sort());
for (const key of ["addExpense.title", "addExpense.back", "addExpense.delete", "addExpense.categories", "addExpense.keypad", "addExpense.slide", "addExpense.left", "addExpense.zero", "addExpense.tooHigh", "category.Food", "category.Water", "category.Transport", "category.Study", "category.Phone", "category.Other"]) {
  assert.ok(en[key] && fr[key] && ar[key], `missing translation ${key}`);
}
assert.equal(en["addExpense.title"], "Add expense");
assert.equal(fr["addExpense.title"], "Ajouter une dépense");
assert.equal(ar["addExpense.title"], "إضافة مصروف");
assert.equal(t("addExpense.left", { x: "24.50" }), "Reste cette semaine : 24.50 TND");

for (const key of ["savings.thisYear.title", "savings.thisYear.received", "savings.thisYear.spent", "savings.thisYear.saved"]) {
  assert.ok(en[key] && fr[key] && ar[key], `missing translation ${key}`);
}

const multiYearWeeks = computeWeeks([
  { id: "w1", startDate: "2025-12-22", received: 50, saved: 10, expenses: [{ amount: 5 }] },
  { id: "w2", startDate: "2025-12-29", received: 60, saved: 10, expenses: [{ amount: 15 }] },
  { id: "w3", startDate: "2026-01-05", received: 100, saved: 20, expenses: [{ amount: 25 }, { amount: 5 }] },
  { id: "w4", startDate: "2026-01-12", received: 80, saved: 15, expenses: [{ amount: 10 }] },
]);

const y2026 = yearTotals(multiYearWeeks, 2026);
assert.equal(y2026.year, 2026);
assert.equal(y2026.count, 2);
assert.equal(y2026.received, 180);
assert.equal(y2026.spent, 40);
assert.equal(y2026.saved, 35);

const y2025 = yearTotals(multiYearWeeks, 2025);
assert.equal(y2025.year, 2025);
assert.equal(y2025.count, 2);
assert.equal(y2025.received, 110);
assert.equal(y2025.spent, 20);
assert.equal(y2025.saved, 20);

const y2024 = yearTotals(multiYearWeeks, 2024);
assert.equal(y2024.year, 2024);
assert.equal(y2024.count, 0);
assert.equal(y2024.received, 0);
assert.equal(y2024.spent, 0);
assert.equal(y2024.saved, 0);

setLanguage("en");
const savingsHtmlEn = renderSavings(multiYearWeeks, 700, {}, 2026);
assert.match(savingsHtmlEn, /this-year-card/);
assert.match(savingsHtmlEn, /This year/);
assert.match(savingsHtmlEn, /180\.00 TND/);
assert.match(savingsHtmlEn, /40\.00 TND/);
assert.match(savingsHtmlEn, /35\.00 TND/);

setLanguage("fr");
const savingsHtmlFr = renderSavings(multiYearWeeks, 700, {}, 2026);
assert.match(savingsHtmlFr, /Cette année/);
assert.match(savingsHtmlFr, /Argent reçu/);
assert.match(savingsHtmlFr, /Dépensé/);
assert.match(savingsHtmlFr, /Épargné/);

setLanguage("ar");
const savingsHtmlAr = renderSavings(multiYearWeeks, 700, {}, 2026);
assert.match(savingsHtmlAr, /هذا العام/);
assert.match(savingsHtmlAr, /المبلغ المستلم/);
assert.match(savingsHtmlAr, /المصروف/);
assert.match(savingsHtmlAr, /المدّخر/);

setLanguage("en");
console.log("PASS step2b pure logic and translation tests");
