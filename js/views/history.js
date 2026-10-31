// views/history.js: every week, newest first, each one openable to see exactly what was spent.
// Input: `computed` = computeWeeks(...) result.
// `openIds` (optional Set of week ids) keeps weeks open after a re-render; by default only the latest is open.
import { escapeHtml, formatRange, formatTopupDate, money, num } from "../utils.js";
import { icon } from "../icons.js";
import { expenseRows } from "./parts.js";
import { monthName } from "../months.js";
import { t } from "../i18n.js";

function topupRows(w, language) {
  const topups = Array.isArray(w.topups) ? w.topups : [];
  if (!topups.length) return "";
  return `
    <div class="history-label">${t("history.topupsLabel")}</div>
    <div class="topup-list">
      ${topups
      .map((tp) => {
        const dateStr = formatTopupDate(tp.date, language);
        const text = `+${money(tp.amount)} · ${t("history.savedShort", { x: num(tp.saved) })} · ${dateStr}`;
        return `
            <div class="topup-row">
              <span class="topup-text">${escapeHtml(text)}</span>
              <button class="topup-delete-btn" type="button" data-action="delete-topup" data-week="${w.id}" data-topup="${tp.id}" aria-label="${t("history.deleteTopup")}">
                ${icon("trash", 14)}
              </button>
            </div>`;
      })
      .join("")}
    </div>`;
}

function weekCard(w, isCurrent, open, months, language) {
  const month = months.find((item) => item.weekIds.includes(w.id));
  return `
    <details class="card history-week" data-week="${w.id}" ${open ? "open" : ""}>
      <summary>
        <div class="history-summary-head">
          <div class="history-head-main">
            <div class="history-head-tags">
              <span class="history-week-badge">Week ${w.number}</span>
              ${isCurrent ? `<span class="history-current-pill">Current</span>` : ""}
              ${month ? `<span class="history-month-chip">${monthName(month.label, language)}</span>` : ""}
            </div>
            <strong class="history-date-range">${formatRange(w.startDate, language)}</strong>
          </div>
          <div class="history-head-end">
            <span class="summary-balance">${num(w.remaining)} <small>TND</small></span>
            <span class="history-chevron" aria-hidden="true">${icon("chev", 16)}</span>
          </div>
        </div>
      </summary>
      <div class="history-body">
        <div class="history-stats">
          <div class="mini"><span>Received</span><b>${num(w.received)}</b></div>
          <div class="mini"><span>Carry-over</span><b>${num(w.carry)}</b></div>
          <div class="mini"><span>Savings</span><b class="stat-saved">−${num(w.saved)}</b></div>
          <div class="mini"><span>Expenses</span><b>${num(w.spent)}</b></div>
          <div class="mini"><span>Remaining</span><b class="stat-remaining">${num(w.remaining)}</b></div>
        </div>
        ${topupRows(w, language)}
        <div class="history-label">Week ${w.number} purchase history</div>
        ${expenseRows(w)}
        <button class="add-btn secondary history-add-btn" data-action="add-expense" data-week="${w.id}">${icon("plus", 16)} Add Expense</button>
        <div class="week-actions">
          <button class="btn secondary" data-action="edit-week" data-week="${w.id}">Edit week</button>
          <button class="btn danger" data-action="delete-week" data-week="${w.id}">Delete week</button>
        </div>
      </div>
    </details>`;
}

export function renderHistory(computed, openIds = null, months = [], language = "en") {
  if (!computed.length) {
    return `
      <section class="card empty-card">
        <div class="lottie lottie--muted" data-lottie="empty" aria-hidden="true"></div>
        <h3>No weeks recorded yet</h3>
        <p>Start by adding your first week.</p>
        <button class="btn" data-action="add-week">+ Add Week</button>
      </section>`;
  }
  const latest = computed.length - 1;
  const weeks = computed
    .map((w, i) => weekCard(w, i === latest, openIds ? openIds.has(w.id) : i === latest, months, language))
    .reverse();
  return `<div class="screen-header"><h3>History</h3><button class="home-week-pill" type="button" data-action="add-week" aria-label="${t("home.add.week")}">${icon("plus", 16)}<span>${t("home.add.week.label")}</span></button></div>${weeks.join("")}`;
}
