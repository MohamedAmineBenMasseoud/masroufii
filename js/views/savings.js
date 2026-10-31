// views/savings.js: savings goal, progress, savings history, and data backup buttons.
// Input: `computed` = computeWeeks(...) result, `goal` = savings goal. Output: an HTML string.
import { savingsSummary, yearTotals } from "../calc.js";
import { t } from "../i18n.js";
import { icon } from "../icons.js";
import { formatDate, money } from "../utils.js";
import { goalCard } from "./parts.js";

function thisYearCard(computed, year = new Date().getFullYear()) {
  const yt = yearTotals(computed, year);
  return `
    <section class="card panel-card this-year-card">
      <div class="section-head compact">
        <h3>${t("savings.thisYear.title")}</h3>
        <span class="tiny-badge">${yt.year}</span>
      </div>
      <div class="stat-list">
        <div class="stat-row">
          <span>${icon("cal", 16)} ${t("savings.thisYear.received")}</span>
          <b>${money(yt.received)}</b>
        </div>
        <div class="stat-row">
          <span>${icon("minus", 16)} ${t("savings.thisYear.spent")}</span>
          <b>${money(yt.spent)}</b>
        </div>
        <div class="stat-row">
          <span>${icon("target", 16)} ${t("savings.thisYear.saved")}</span>
          <b>${money(yt.saved)}</b>
        </div>
      </div>
    </section>`;
}

function allocationCard(computed, goal) {
  const s = savingsSummary(computed, goal);
  const pace = computed.length ? computed[computed.length - 1].saved : null;
  const paceLabel = pace !== null && pace !== undefined ? `${money(pace)} / week` : "Chosen each week";
  return `
    <section class="card panel-card">
      <div class="section-head compact">
        <h3>Allocation</h3>
        <span class="tiny-badge">Automatic</span>
      </div>
      <div class="stat-list">
        <div class="stat-row"><span>${icon("coins", 16)} Savings</span><b>${paceLabel}</b></div>
        <div class="stat-row"><span>${icon("cal", 16)} Weeks recorded</span><b>${computed.length}</b></div>
        <div class="stat-row"><span>${icon("target", 16)} Total saved</span><b>${money(s.saved)}</b></div>
        <div class="stat-row"><span>${icon("target", 16)} Weeks to goal</span><b>${s.weeksLeft}</b></div>
      </div>
      <button class="add-btn" data-action="edit-goal">Change goal (${goal} TND)</button>
    </section>`;
}

function historyCard(computed) {
  const rows = computed.length
    ? [...computed]
      .reverse()
      .map(
        (w) => `
      <div class="stat-row compact-row">
        <span>Week ${w.number} · ${formatDate(w.startDate, true)}</span>
        <b>+${money(w.saved)}</b>
      </div>`
      )
      .join("")
    : `<div class="empty-state inline">Savings will appear here after you add your first week.</div>`;
  return `
    <section class="card panel-card">
      <div class="section-head compact"><h3>Savings history</h3></div>
      ${rows}
    </section>`;
}

function dataCard() {
  return `
    <section class="card panel-card">
      <div class="section-head compact"><h3>${icon("export", 16)} My data</h3><span class="tiny-badge">Saved on this device</span></div>
      <div class="data-actions">
        <button class="btn" data-action="export">Export my budget</button>
        <button class="btn danger" data-action="reset">Reset all data</button>
      </div>
    </section>`;
}

export function renderSavings(computed, goal, profile, year = new Date().getFullYear()) {
  return `
    <div class="screen-header"><h3>Savings overview</h3></div>
    ${goalCard(computed, goal)}
    ${thisYearCard(computed, year)}
    ${allocationCard(computed, goal)}
    ${historyCard(computed)}
    ${dataCard()}`;
}
