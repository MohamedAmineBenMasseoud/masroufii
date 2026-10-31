// views/parts.js: small HTML pieces shared by several screens.
// Views only build HTML strings. Clicks are handled in app.js through data-action attributes.
import { savingsSummary } from "../calc.js";
import { categoryLabel, expenseLabel, iconFor } from "../expenses.js";
import { icon } from "../icons.js";
import { escapeHtml, money } from "../utils.js";

/** Savings goal card: saved amount, progress bar, goal. */
export function goalCard(computed, goal) {
  const s = savingsSummary(computed, goal);
  return `
    <section class="card hero-card">
      <div class="kicker">${icon("coins", 18)} <span>Savings Goal</span></div>
      <div class="goal-row">
        <div>
          <div class="eyebrow-compact">Saved so far</div>
          <h2>${money(s.saved)}</h2>
        </div>
        <button class="chip-button light" data-action="edit-goal" aria-label="Edit savings goal">${icon("pencil", 14)} Edit</button>
      </div>
      <div class="progress"><span style="width:${Math.min(100, s.percent)}%"></span></div>
      <div class="progressrow">
        <span>${s.percent.toFixed(1)}%</span>
        <span>Goal: ${goal} TND</span>
      </div>
    </section>`;
}

/** List of one week's expenses with edit and delete buttons. */
export function expenseRows(week) {
  if (!week.expenses.length) return `<div class="empty-state inline">No expenses yet.</div>`;
  return week.expenses
    .map(
      (e, i) => `
    <div class="expense-item">
      <div class="exp-icon">${icon(iconFor(e.category), 18)}</div>
      <div class="expense-main">
        <strong>${escapeHtml(expenseLabel(e))}</strong>
        <span>${escapeHtml(categoryLabel(e.category || "Other"))}</span>
      </div>
      <div class="amount">−${money(e.amount)}</div>
      <button class="iconbtn" title="Edit" data-action="edit-expense" data-week="${week.id}" data-index="${i}">${icon("pencil", 16)}</button>
      <button class="iconbtn danger" title="Delete" data-action="delete-expense" data-week="${week.id}" data-index="${i}">${icon("trash", 16)}</button>
    </div>`
    )
    .join("");
}
