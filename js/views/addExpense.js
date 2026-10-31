import { canAfford } from "../calc.js";
import { QUICK_CATEGORIES } from "../expenses.js";
import { icon } from "../icons.js";
import { t } from "../i18n.js";
import { escapeHtml, num } from "../utils.js";

export function renderAddExpense(week, { amount, category, error }) {
  const affordable = canAfford(week, Number(amount || 0));
  const left = num(week.remaining);
  const digitKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  return `
    <section class="add-expense-screen" data-week="${escapeHtml(week.id)}" aria-label="${t("addExpense.title")}">
      <header class="add-expense-header">
        <button class="add-expense-back" type="button" data-action="expense-back" aria-label="${t("addExpense.back")}">${icon("back", 20)}</button>
        <h1>${t("addExpense.title")}</h1>
      </header>
      <div class="add-expense-amount-area">
        <div class="add-expense-amount ${!amount ? "empty" : ""} ${affordable ? "" : "danger"}">${escapeHtml(amount || "0")}</div>
        <div class="add-expense-currency">TND</div>
        <div class="add-expense-error" role="alert" ${error ? "" : "hidden"}>${error ? t(error) : ""}</div>
        <div class="add-expense-left ${affordable ? "" : "danger"}">${t("addExpense.left", { x: left })}</div>
      </div>
      <div class="add-expense-categories" role="radiogroup" aria-label="${t("addExpense.categories")}">
        ${QUICK_CATEGORIES.map((item) => `<button type="button" class="add-expense-category ${category === item ? "selected" : ""}" role="radio" aria-checked="${category === item}" data-action="expense-category" data-category="${item}">${t(`category.${item}`)}</button>`).join("")}
      </div>
      <div class="add-expense-keypad" aria-label="${t("addExpense.keypad")}">
        ${digitKeys.map((key) => `<button type="button" class="add-expense-key" data-action="expense-key" data-key="${key}" aria-label="${key === "back" ? t("addExpense.delete") : key}">${key === "back" ? icon("backspace", 24) : key}</button>`).join("")}
      </div>
      <div class="add-expense-slide-track">
        <span class="add-expense-slide-fill" aria-hidden="true"></span>
        <span class="add-expense-slide-label" aria-hidden="true">${t("addExpense.slide")}</span>
        <button type="button" class="add-expense-slide-handle" data-action="expense-confirm" aria-label="${t("addExpense.slide")}">${icon("up", 22)}</button>
      </div>
    </section>`;
}
