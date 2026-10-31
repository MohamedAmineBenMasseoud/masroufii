// views/dashboard.js: savings goal, current week, available to spend, expenses.
// Input: `computed` = computeWeeks(...) result, `goal` = savings goal. Output: an HTML string.
import { dailyAllowance, savingsSummary } from "../calc.js";
import { categoryLabel, expenseLabel, iconFor } from "../expenses.js";
import { icon } from "../icons.js";
import { t } from "../i18n.js";
import { monthName } from "../months.js";
import { escapeHtml, formatRange, money, num, toISO } from "../utils.js";

const expenseSubtitle = (expense) => {
  const name = (expense?.name || "").trim();
  const category = (expense?.category || "").trim();
  if (!name || !category) return "";
  if (name.toLowerCase() === category.toLowerCase()) return "";
  return categoryLabel(category);
};

function emptyState(profile, reminderBanner = null) {
  const isDaily = profile?.incomeMode === "daily";
  const monthly = profile?.incomeMode === "monthly";
  const name = (profile?.name || "").trim();
  const greeting = name ? t("home.hi", { name: escapeHtml(name) }) : t("home.hi.there");
  const avatarKey = escapeHtml(name ? name.charAt(0).toUpperCase() : "M");
  const bannerHtml = reminderBanner ? `
    <div class="reminder-card card" role="alert">
      <div class="reminder-card-icon">${icon("bell", 20)}</div>
      <div class="reminder-card-content">
        <strong class="reminder-card-title">${escapeHtml(reminderBanner.title)}</strong>
        <p class="reminder-card-message">${escapeHtml(reminderBanner.message)}</p>
      </div>
      <button type="button" class="reminder-card-dismiss" data-action="dismiss-reminder" aria-label="${t("reminders.dismiss")}">
        ${icon("minus", 16)}
      </button>
    </div>
  ` : "";

  if (isDaily) {
    return `
      <div class="home-screen home-screen-daily">
        <header class="home-header">
          <div class="home-greeting-wrap">
            <div class="home-greeting">${greeting}</div>
            <div class="home-subtitle">${t("home.daily.title")}</div>
          </div>
          <div class="home-header-actions">
            <button class="home-avatar" type="button" data-action="go-profile" aria-label="${t("tabs.profile")}">${avatarKey}</button>
          </div>
        </header>
        ${bannerHtml}
        <section class="card empty-card home-daily-empty">
          <div class="lottie lottie--muted" data-lottie="empty" aria-hidden="true"></div>
          <p>${t("home.daily.emptyText")}</p>
          <button class="btn primary full-width daily-income-btn" type="button" data-action="add-daily-money">
            ${icon("plus", 18)} <span>${t("home.daily.gotMoney")}</span>
          </button>
        </section>
      </div>`;
  }

  return `
    <div class="home-screen ${monthly ? "" : "home-screen-weekly"}">
      <header class="home-header">
        <div class="home-greeting-wrap">
          <div class="home-greeting">${greeting}</div>
          <div class="home-subtitle">${t(monthly ? "home.noMonth" : "home.no.weeks.title")}</div>
        </div>
        <div class="home-header-actions">
          ${monthly ? "" : `<button class="home-week-pill" type="button" data-action="add-week" aria-label="${t("home.add.week")}">${icon("plus", 16)}<span>${t("home.add.week.label")}</span></button>`}
          <button class="home-avatar" type="button" data-action="go-profile" aria-label="${t("tabs.profile")}">${avatarKey}</button>
        </div>
      </header>
      ${bannerHtml}
      <section class="card empty-card">
        <h3>${t(monthly ? "home.noMonth" : "home.no.weeks.title")}</h3>
        <p>${t(monthly ? "home.noMonthText" : "home.no.weeks.text")}</p>
        <button class="btn" data-action="${monthly ? "add-month" : "add-week"}">${t(monthly ? "home.addMonth" : "home.add.week")}</button>
      </section>
      ${monthly ? "" : `<button class="home-fab" type="button" data-action="home-add-expense" aria-label="${t("home.add.expense")}">${icon("plus", 24)}</button>`}
    </div>`;
}

export function renderDashboard(computed, goal, profile, monthContext = null, reminderBanner = null) {
  if (!computed.length) return emptyState(profile, reminderBanner);

  const current = computed[computed.length - 1];
  const summary = savingsSummary(computed, goal);
  const name = (profile?.name || "").trim();
  const greeting = name ? t("home.hi", { name: escapeHtml(name) }) : t("home.hi.there");
  const avatarKey = escapeHtml(name ? name.charAt(0).toUpperCase() : "M");
  const spent = Math.max(0, Number(current.spent || 0));
  const available = Math.max(0, Number(current.available || 0));
  const remaining = Number(current.remaining || 0);
  const daily = Math.max(0, dailyAllowance(current, toISO(new Date())));
  const progress = available > 0 ? Math.min(100, Math.max(0, (remaining / available) * 100)) : 0;
  const expenseRows = [...current.expenses].reverse().slice(0, 3);
  const isDaily = profile?.incomeMode === "daily";
  const monthlyMode = profile?.incomeMode === "monthly";
  const weeklyHome = !monthlyMode && !isDaily;

  return `
    <div class="home-screen ${weeklyHome ? "home-screen-weekly" : isDaily ? "home-screen-daily" : ""}">
      <header class="home-header">
        <div class="home-greeting-wrap">
          <div class="home-greeting">${greeting}</div>
        <div class="home-subtitle">${monthContext
          ? t("home.monthWeek", { month: monthName(monthContext.month.label, profile.language), i: monthContext.progress.index, n: monthContext.progress.total })
          : t("home.week", { n: current.number, range: formatRange(current.startDate, profile?.language) })}</div>
        </div>
        ${monthlyMode
          ? `<button class="home-month-pill" type="button" data-action="add-month">${t("home.addMonth")}</button>`
          : isDaily
          ? `<div class="home-header-actions"><button class="home-avatar" type="button" data-action="go-profile" aria-label="${t("tabs.profile")}">${avatarKey}</button></div>`
          : `<div class="home-header-actions"><button class="home-week-pill" type="button" data-action="add-week" aria-label="${t("home.add.week")}">${icon("plus", 16)}<span>${t("home.add.week.label")}</span></button><button class="home-avatar" type="button" data-action="go-profile" aria-label="${t("tabs.profile")}">${avatarKey}</button></div>`}
      </header>
      ${reminderBanner ? `
      <div class="reminder-card card" role="alert">
        <div class="reminder-card-icon">${icon("bell", 20)}</div>
        <div class="reminder-card-content">
          <strong class="reminder-card-title">${escapeHtml(reminderBanner.title)}</strong>
          <p class="reminder-card-message">${escapeHtml(reminderBanner.message)}</p>
        </div>
        <button type="button" class="reminder-card-dismiss" data-action="dismiss-reminder" aria-label="${t("reminders.dismiss")}">
          ${icon("minus", 16)}
        </button>
      </div>` : ""}

      ${isDaily ? `
      <section class="home-hero home-hero-daily card">
        <div class="home-hero-top">
          <span>${t("home.daily.spendToday")}</span>
        </div>
        <div class="home-amount ${daily <= 0 ? "danger" : ""}">
          <span>${num(daily)}</span>
          <small>TND</small>
        </div>
        <div class="home-daily-remaining">${t("home.daily.weekRemaining", { x: num(remaining) })}</div>
      </section>

      <button type="button" class="btn primary full-width daily-income-btn" data-action="add-daily-money">
        ${icon("plus", 18)} <span>${t("home.daily.gotMoney")}</span>
      </button>
      ` : `
      <section class="home-hero ${weeklyHome ? "home-hero-weekly" : "card"}">
        <div class="home-hero-top">
          <span>${t(monthContext ? "home.leftThisWeek" : "home.left.to.spend")}</span>
          ${weeklyHome ? "" : `<button class="home-link" type="button" data-action="go-history">${t("home.see.all")}</button>`}
        </div>
        <div class="home-amount ${remaining <= 0 ? "danger" : ""}">
          <span>${num(remaining)}</span>
          <small>TND</small>
        </div>
        <div class="home-daily">${t("home.about.per.day", { x: num(daily) })}</div>
        ${weeklyHome ? "" : `<div class="home-progress" aria-hidden="true"><span class="home-progress-fill ${progress <= 0 ? "empty" : ""}" style="width:${progress}%"></span></div><div class="home-metrics"><span>${t("home.spent", { x: num(spent) })}</span><span>${t("home.available", { x: num(available) })}</span></div>`}
      </section>
      `}

      ${weeklyHome || isDaily ? `<section class="home-weekly-progress"><div class="home-progress" aria-hidden="true"><span class="home-progress-fill ${progress <= 0 ? "empty" : ""}" style="width:${progress}%"></span></div><div class="home-metrics"><span>${t("home.spent", { x: num(spent) })}</span><span>${t("home.available", { x: num(available) })}</span></div></section>` : ""}

      ${monthContext ? `
      <button type="button" class="home-month-budget" data-action="open-month-plan" data-month="${monthContext.month.id}" aria-label="${t("home.monthBudget", { month: monthName(monthContext.month.label, profile.language) })}">
        <span class="home-month-budget-head"><strong>${t("home.monthBudget", { month: monthName(monthContext.month.label, profile.language) })}</strong><span class="home-month-week-chip">${t("home.weekChip", { i: monthContext.progress.index, n: monthContext.progress.total })}</span></span>
        <span class="home-month-stats">
          <span><small>${t("home.received")}</small><b>${money(monthContext.progress.received)}</b></span>
          <span><small>${t("home.spentLabel")}</small><b>${money(monthContext.progress.spent)}</b></span>
          <span><small>${t("home.savedLabel")}</small><b>${money(monthContext.progress.saved)}</b></span>
        </span>
        <span class="home-month-progress"><span style="width:${monthContext.progressPercent}%"></span></span>
      </button>` : weeklyHome || isDaily ? `
      <button type="button" class="home-goal-card home-goal-card-compact" data-action="go-savings" aria-label="${t("home.savings.goal")}">
        <span class="home-goal-icon">${icon("coins", 20)}</span>
        <span class="home-goal-copy"><strong>${t("home.savings.goal")}</strong><small>${t("home.goal.percent", { p: Number(summary.percent || 0).toFixed(1) })}</small></span>
        <span class="home-goal-values"><strong>${money(summary.saved)}</strong><small>/ ${money(goal)}</small></span>
        <span class="home-goal-progress" aria-hidden="true"><span style="width:${Math.min(100, Number(summary.percent || 0))}%"></span></span>
      </button>` : `
      <div class="home-goal-card" data-action="go-savings" tabindex="0" role="button" aria-label="${t("home.savings.goal")}">
        <div class="home-goal-head">
          <span>${icon("coins", 16)}</span>
          <strong>${t("home.savings.goal")}</strong>
        </div>
        <div class="home-goal-row">
          <div>
            <div class="home-goal-label">${money(summary.saved)}</div>
            <div class="home-goal-percent">${t("home.goal.percent", { p: Number(summary.percent || 0).toFixed(1) })}</div>
          </div>
          <span class="chip-button light" data-action="edit-goal" aria-label="${t("home.savings.goal")}">${icon("pencil", 14)} ${t("tabs.savings")}</span>
        </div>
        <div class="progress"><span style="width:${Math.min(100, Number(summary.percent || 0))}%"></span></div>
        <div class="progressrow">
          <span>${money(summary.saved)}</span>
          <span>${t("home.goal.percent", { p: Number(summary.percent || 0).toFixed(1) })}</span>
        </div>
      </div>`}

      <section class="home-week-section">
        <div class="home-section-row">
          <strong>${t("home.this.week")}</strong>
          <button class="home-link" type="button" data-action="go-history">${t("home.see.all")}</button>
        </div>
        <div class="home-expense-list">
          ${
            expenseRows.length
              ? expenseRows
                  .map((expense, index) => {
                    const itemIndex = current.expenses.length - 1 - index;
                    const subtitle = expenseSubtitle(expense);
                    const showSubtitle = Boolean(subtitle);
                    return `
                      <button class="home-expense-row" type="button" data-action="edit-expense" data-week="${current.id}" data-index="${itemIndex}">
                        <span class="home-expense-icon">${icon(iconFor(expense.category), 18)}</span>
                        <span class="home-expense-copy ${showSubtitle ? "" : "single"}">
                          <strong>${escapeHtml(expenseLabel(expense))}</strong>
                          ${showSubtitle ? `<span>${escapeHtml(subtitle)}</span>` : ""}
                        </span>
                        <span class="home-expense-amount">−${money(expense.amount)}</span>
                      </button>`;
                  })
                  .join("")
              : `<div class="home-empty-mini"><div class="lottie lottie--muted" data-lottie="empty" aria-hidden="true"></div><span>${t("home.no.expenses")}</span></div>`
          }
        </div>
      </section>

      <button class="home-fab" type="button" data-action="add-expense" data-week="${current.id}" aria-label="${t("home.add.expense")}">${icon("plus", 24)}</button>
    </div>`;
}
