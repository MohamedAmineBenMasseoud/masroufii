import { icon } from "../icons.js";
import { t } from "../i18n.js";
import { escapeHtml, formatDate, money, num } from "../utils.js";

export function renderMonthPlan({ name, summary, fullyPlanned, edit = null }) {
  const weeks = summary.weeks.map((week, index) => `
    <button type="button" class="month-week-row" data-action="edit-month-week" data-week="${escapeHtml(week.id)}">
      <span class="month-week-main"><strong>${t("plan.week", { n: index + 1 })}</strong><small>${formatDate(week.startDate)} – ${formatDate(week.endDate)}</small></span>
      <span class="month-week-values"><span class="month-spend-pill">${t("plan.spend", { x: num(week.spend) })}</span><span class="month-save-pill">${t("plan.save", { x: num(week.saved) })}</span>${icon("pencil", 16)}</span>
    </button>`).join("");
  const status = fullyPlanned
    ? `<div class="month-plan-status full">${icon("check", 17)}<span>${t("plan.full", { a: num(summary.planned), b: num(summary.income) })}</span></div>`
    : `<div class="month-plan-status unplanned">${t("plan.unplanned", { x: num(summary.unplanned) })}</div>`;

  return `
    <section class="month-plan-screen" aria-label="${t("plan.title", { month: escapeHtml(name) })}">
      <header class="month-plan-header">
        <button type="button" class="month-plan-back" data-action="close-month-plan" aria-label="${t("onboarding.back")}">${icon("back", 20)}</button>
        <h1>${t("plan.title", { month: escapeHtml(name) })}</h1>
      </header>
      <section class="month-plan-summary">
        <span class="month-plan-summary-label">${t("plan.received")}</span>
        <strong class="month-plan-total">${money(summary.income)}</strong>
        <div class="month-plan-stats">
          <span><small>${t("plan.toSpend")}</small><b>${money(summary.toSpend)}</b></span>
          <span><small>${t("plan.toSave")}</small><b>${money(summary.toSave)}</b></span>
          <span><small>${t("plan.weeks")}</small><b>${summary.weeks.length}</b></span>
        </div>
      </section>
      ${status}
      <h2 class="month-plan-section-title">${t("plan.yourWeeks")}</h2>
      <div class="month-plan-weeks">${weeks}</div>
      <p class="month-plan-hint">${t("plan.hint")}</p>
      <div class="month-plan-actions">
        <button type="button" class="month-plan-delete" data-action="delete-month">${t("plan.delete")}</button>
        <button type="button" class="btn month-plan-done" data-action="close-month-plan">${t("plan.done")}</button>
      </div>
      ${edit ? renderEditSheet(edit) : ""}
    </section>`;
}

function renderEditSheet(edit) {
  let checkCard;
  if (edit.overage > 0.005) {
    checkCard = `<div class="month-edit-check over" role="alert">${icon("alert", 20)}<span><strong>${t("editWeek.overTitle", { x: num(edit.overage) })}</strong><small>${t("editWeek.overText", { a: num(edit.planned), b: num(edit.income) })}</small></span></div>`;
  } else if (edit.valid) {
    checkCard = `<div class="month-edit-check valid">${icon("check", 20)}<span><strong>${t("editWeek.ok")}</strong><small>${t("editWeek.okText", { a: num(edit.planned), b: num(edit.income) })}</small></span></div>`;
  } else {
    checkCard = `<div class="month-edit-check over" role="alert">${icon("alert", 20)}<span><strong>${t("editWeek.weekInvalid")}</strong></span></div>`;
  }
  const stepper = (field, label, value) => `
    <div class="month-edit-field">
      <label>${label}</label>
      <div class="month-stepper">
        <button type="button" class="month-step-button" data-action="step-month-value" data-field="${field}" data-direction="-1" aria-label="${t("editWeek.decrease")}">${icon("minus", 18)}</button>
        <strong>${money(value)}</strong>
        <button type="button" class="month-step-button plus" data-action="step-month-value" data-field="${field}" data-direction="1" aria-label="${t("editWeek.increase")}">${icon("plus", 18)}</button>
      </div>
    </div>`;
  return `
    <div class="month-edit-backdrop">
      <section class="month-edit-sheet" role="dialog" aria-modal="true" aria-label="${t("editWeek.title", { n: edit.number })}">
        <span class="month-edit-handle" aria-hidden="true"></span>
        <header class="month-edit-header"><h2>${t("editWeek.title", { n: edit.number })}</h2><small>${formatDate(edit.startDate)} – ${formatDate(edit.endDate)}</small></header>
        ${stepper("spend", t("editWeek.spend"), edit.spend)}
        ${stepper("saved", t("editWeek.save"), edit.saved)}
        ${checkCard}
        <div class="month-edit-actions">
          <button type="button" class="btn secondary" data-action="cancel-month-edit">${t("onboarding.back")}</button>
          <button type="button" class="btn" data-action="save-month-edit" ${edit.valid ? "" : "disabled"}>${t("editWeek.submit")}</button>
        </div>
      </section>
    </div>`;
}
