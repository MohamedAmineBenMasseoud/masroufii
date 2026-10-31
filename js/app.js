// app.js: connects everything. Holds the state, draws the current screen, and reacts to clicks.
// Expects in index.html: <main id="view"></main> and nav buttons with data-page="dashboard|history|savings".
import { canAfford, computeWeeks, WEEKLY_SAVINGS } from "./calc.js";
import { pressKey } from "./amountInput.js";
import { slideProgress, shouldConfirm } from "./slide.js";
import { CATEGORIES, DEFAULT_CATEGORY, addExpense, deleteExpense, editExpense } from "./expenses.js";
import { addMonth, deleteMonth, editMonthWeek, isMonthFullyPlanned, mondaysOfMonth, monthEditOverage, monthName, monthPlanSummary, monthProgress, monthProgressPercent, monthWeekPreview, splitMonth, stepMonthValue, monthOfWeek } from "./months.js";
import { icon } from "./icons.js";
import { confirmDialog, openActionModal, openForm } from "./modal.js";
import { clear, createEmpty, exportData, importFile, load, save } from "./store.js";
import { applyLanguage, getLanguage, setLanguage, t } from "./i18n.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderHistory } from "./views/history.js";
import { renderOnboarding } from "./views/onboarding.js";
import { renderSavings } from "./views/savings.js";
import { renderAddExpense } from "./views/addExpense.js";
import { renderMonthPlan } from "./views/monthPlan.js";
import { renderProfile } from "./views/profile.js";
import { THEMES, applyTheme } from "./theme.js";
import { addWeek, deleteWeek, editWeek, suggestSaved, suggestedStart } from "./weeks.js";
import { money, num, toISO } from "./utils.js";
import { initLottie, playLottie, showLoadingOverlay, showSuccessOverlay } from "./lottie.js";
import { addMoney, removeMoney } from "./daily.js";
import { formatEveningMessage, markReminderShown, moneyReminderDue, moneyReminderMessage, nightReminderDue, nightSummary } from "./reminders.js";

// ---------- state ----------
let data = load();
setLanguage(data.profile.language || "en");
applyLanguage();
let page = "dashboard";
let lastPage = "dashboard";
let activeReminder = null;
const PAGE_ORDER = {
  dashboard: 0,
  history: 1,
  savings: 2,
  profile: 3,
};
let isClosingExpense = false;
let isClosingMonth = false;
let pullStartY = null;
let pullStartX = null;
let pullDistance = 0;
let isRefreshing = false;
let openIds = null; // which History cards are open (null = only the latest)
let onboardingStep = "splash";
let onboardingTutorialIndex = 0;
let bootSplash = true;
let bootTimer = null;
let tutorialTouchStartX = null;
let expenseScreen = null;
let expenseConfirming = false;
let expenseDrag = null;
let activeMonthId = null;
let monthEdit = null;

const view = document.getElementById("view");

function startBootSplash() {
  bootSplash = true;
  if (bootTimer) clearTimeout(bootTimer);
  bootTimer = setTimeout(() => {
    bootSplash = false;
    render();
  }, 1500);
}

function showOnboarding() {
  return (!data.profile.onboarded || onboardingStep === "reminders") && data.weeks.length === 0;
}

function renderIcons() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.dataset.icon;
    if (!name) return;
    el.innerHTML = icon(name, Number(el.dataset.size || 20));
  });
}

function renderProfilePlaceholder() {
  return `
    <div class="screen-header"><h3>${t("tabs.profile")}</h3></div>
    <section class="card profile-placeholder">
      <h3>${t("profile.placeholder.title")}</h3>
      <p>${t("profile.placeholder.text")}</p>
    </section>`;
}

function syncTabBar() {
  const labels = {
    dashboard: "tabs.home",
    history: "tabs.history",
    savings: "tabs.savings",
    profile: "tabs.profile",
  };

  document.querySelectorAll(".tab").forEach((button) => {
    const isActive = button.dataset.page === page;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
    const label = button.querySelector(".tab-label");
    if (label) label.textContent = t(labels[button.dataset.page] || button.dataset.page);
  });
}

function render() {
  applyLanguage(getLanguage());
  document.body.classList.toggle("onboarding", showOnboarding() || bootSplash);
  applyTheme(data.profile.theme);

  if (bootSplash) {
    view.innerHTML = renderOnboarding({
      step: "boot",
      tutorialIndex: onboardingTutorialIndex,
      profile: data.profile,
      theme: data.profile.theme,
    });
    renderIcons();
    initLottie(view);
    return;
  }

  if (showOnboarding()) {
    view.innerHTML = renderOnboarding({
      step: onboardingStep,
      tutorialIndex: onboardingTutorialIndex,
      profile: data.profile,
      theme: data.profile.theme,
    });
    renderIcons();
    initLottie(view);
    return;
  }
  const prevPage = lastPage;
  const isPageChange =
    prevPage !== page &&
    PAGE_ORDER[prevPage] !== undefined &&
    PAGE_ORDER[page] !== undefined &&
    !showOnboarding() &&
    !bootSplash &&
    !expenseScreen &&
    !activeMonthId;
  lastPage = page;
  const enterClass = isPageChange
    ? PAGE_ORDER[page] > PAGE_ORDER[prevPage]
      ? "page-enter-next"
      : "page-enter-prev"
    : null;

  const computed = computeWeeks(data.weeks);
  document.body.classList.toggle("expense-open", Boolean(expenseScreen));
  document.body.classList.toggle("month-plan-open", Boolean(activeMonthId));
  syncTabBar();
  const targetWeek = expenseScreen && computed.find((week) => week.id === expenseScreen.weekId);
  const selectedMonth = activeMonthId && data.months.find((month) => month.id === activeMonthId);
  const monthContextWeek = computed.at(-1);
  const currentMonth = data.profile.incomeMode === "monthly" && monthContextWeek ? monthOfWeek(data, monthContextWeek.id) : null;
  const progress = currentMonth ? monthProgress(data, currentMonth.id, toISO(new Date())) : null;
  const monthContext = currentMonth && progress
    ? { month: currentMonth, progress, progressPercent: monthProgressPercent(progress) }
    : null;
  view.innerHTML = targetWeek ? renderAddExpense(targetWeek, expenseScreen) :
    selectedMonth ? renderMonthPlan({
      name: monthName(selectedMonth.label, data.profile.language),
      summary: monthPlanSummary(data, selectedMonth.id),
      fullyPlanned: isMonthFullyPlanned(data, selectedMonth.id),
      edit: monthEdit ? monthEditPresentation() : null,
    })
      : page === "history" ? renderHistory(computed, openIds, data.months, data.profile.language)
        : page === "savings" ? renderSavings(computed, data.goal, data.profile)
          : page === "profile" ? renderProfile(data.profile, data.goal)
            : renderDashboard(computed, data.goal, data.profile, monthContext, activeReminder);
  renderIcons();
  initLottie(view);

  if (enterClass && !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    view.classList.remove("page-enter-next", "page-enter-prev");
    void view.offsetWidth;
    view.classList.add(enterClass);
    const onAnimationEnd = (e) => {
      if (e.target !== view) return;
      view.classList.remove(enterClass);
      view.removeEventListener("animationend", onAnimationEnd);
    };
    view.addEventListener("animationend", onAnimationEnd);
  }
}

function showNotice(message) {
  const notice = document.createElement("div");
  notice.className = "app-notice";
  notice.setAttribute("role", "alert");
  notice.textContent = message;
  view.prepend(notice);
}

/** Take the result of a weeks/expenses function: on success store it, save it and redraw. */
function commit(result) {
  if (result.ok) {
    data = result.data;
    const saved = save(data);
    render();
    if (!saved) showNotice("Could not save on this device. Export a backup to be safe.");
  }
  return result; // forms use this to show the error inside the popup
}

function warn(result) {
  if (!result.ok) showNotice(result.error);
}

async function checkAndDeliverReminders(now = new Date()) {
  if (showOnboarding()) return;

  const moneyCheck = moneyReminderDue(data, now);
  const nightCheck = nightReminderDue(data.profile, now);

  let banner = null;
  let kindToMark = null;

  if (moneyCheck.due) {
    const msg = moneyReminderMessage(moneyCheck.kind);
    const title = t("reminders.titleMoney");
    banner = { title, message: msg, kind: "money" };
    kindToMark = "money";
  } else if (nightCheck) {
    const summary = nightSummary(data, now);
    const msg = formatEveningMessage(summary);
    const title = t("reminders.titleNight");
    banner = { title, message: msg, kind: "night" };
    kindToMark = "night";
  }

  if (banner) {
    activeReminder = banner;
    data = {
      ...data,
      profile: markReminderShown(data.profile, kindToMark, now),
    };
    save(data);
    render();

    const isBackground = typeof document !== "undefined" && document.visibilityState !== "visible";
    if (
      isBackground &&
      typeof window !== "undefined" &&
      typeof window.Notification !== "undefined" &&
      window.Notification.permission === "granted" &&
      typeof navigator !== "undefined" &&
      navigator.serviceWorker
    ) {
      try {
        const reg = navigator.serviceWorker.ready
          ? await navigator.serviceWorker.ready
          : (typeof navigator.serviceWorker.getRegistration === "function"
              ? await navigator.serviceWorker.getRegistration()
              : null);
        if (reg && typeof reg.showNotification === "function") {
          await reg.showNotification(banner.title, {
            body: banner.message,
            icon: "./assets/logo/IconOnly_Transparent.png",
            badge: "./assets/logo/IconOnly_Transparent.png",
          });
        }
      } catch (err) {
        // Notification attempt failed gracefully
      }
    }
  }
}

const findWeek = (id) => data.weeks.find((w) => w.id === id);

function addMonthPreview(values) {
  const income = Number(values.income);
  const saveTotal = Number(values.saveTotal);
  if (!values.month || !Number.isFinite(income) || income <= 0 || !Number.isFinite(saveTotal) || saveTotal < 0) return "";
  const split = splitMonth({ month: values.month, income, saveTotal });
  if (!split.weeks) return "";
  const baseSpend = split.spend[0] ?? 0;
  const baseSave = split.save[0] ?? 0;
  const lastSpend = split.spend[split.weeks - 1] ?? baseSpend;
  const lastSave = split.save[split.weeks - 1] ?? baseSave;
  const hasRemainder = lastSpend !== baseSpend || lastSave !== baseSave;
  const actualSaveTotal = split.save.reduce((sum, v) => sum + v, 0);

  const p1 = `<p>${t("addMonth.preview1", { n: split.weeks, spend: num(baseSpend), save: num(baseSave) })}</p>`;
  const pRemainder = hasRemainder
    ? `<p>${t("addMonth.preview3", { n: split.weeks, spend: num(lastSpend), save: num(lastSave) })}</p>`
    : "";
  const p2 = `<p>${t("addMonth.preview2", { x: num(actualSaveTotal) })}</p>`;
  return `<div class="add-month-preview-card">${p1}${pRemainder}${p2}</div>`;
}

function openAddMonth() {
  const defaultMonth = toISO(new Date()).slice(0, 7);
  const mondaysCount = mondaysOfMonth(defaultMonth).length || 4;
  const weeklySaving = Number(data.profile?.weeklySaving ?? suggestSaved(data));
  const defaultSaveTotal = weeklySaving * mondaysCount;
  openForm({
    title: t("addMonth.title"),
    note: t("addMonth.sub"),
    fields: [
      { id: "month", label: t("addMonth.month"), type: "month", value: defaultMonth, attrs: "required" },
      { id: "income", label: t("addMonth.income"), type: "number", value: "", attrs: 'min="0.01" step="0.01" required' },
      { id: "saveTotal", label: t("addMonth.save"), type: "number", value: defaultSaveTotal, attrs: 'min="0" step="0.01" required' },
    ],
    submitLabel: t("addMonth.create"),
    onChange: addMonthPreview,
    onSubmit: (values) => {
      const result = addMonth(data, values);
      if (!result.ok) return result;
      activeMonthId = result.data.months.at(-1).id;
      return commit(result);
    },
  });
}

function openMonthPlan(monthId) {
  if (!data.months.some((month) => month.id === monthId)) return;
  activeMonthId = monthId;
  monthEdit = null;
  render();
}

function closeMonthPlan() {
  if (isClosingMonth) return;
  const el = view.querySelector(".month-plan-screen");
  const canAnimate =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finish = () => {
    isClosingMonth = false;
    activeMonthId = null;
    monthEdit = null;
    render();
  };
  if (!el || !canAnimate) {
    finish();
    return;
  }
  isClosingMonth = true;
  el.classList.add("closing");
  let done = false;
  const onEnd = () => {
    if (done) return;
    done = true;
    finish();
  };
  el.addEventListener("animationend", onEnd, { once: true });
  setTimeout(onEnd, 220);
}

function monthEditPresentation() {
  if (!monthEdit) return null;
  const month = data.months.find((item) => item.id === monthEdit.monthId);
  const summary = monthPlanSummary(data, monthEdit.monthId);
  const week = summary?.weeks.find((item) => item.id === monthEdit.weekId);
  if (!month || !week) return null;
  const preview = monthWeekPreview(data, month.id, week.id, monthEdit);
  return {
    ...monthEdit,
    number: summary.weeks.findIndex((item) => item.id === week.id) + 1,
    startDate: week.startDate,
    endDate: week.endDate,
    valid: preview.result.ok,
    overage: preview.overage,
    planned: preview.planned,
    income: preview.income,
  };
}

function beginMonthWeekEdit(weekId) {
  const summary = monthPlanSummary(data, activeMonthId);
  const week = summary?.weeks.find((item) => item.id === weekId);
  if (!week) return;
  monthEdit = { monthId: activeMonthId, weekId, spend: week.spend, saved: week.saved };
  render();
}

function stepMonthEdit(field, direction) {
  if (!monthEdit || !["spend", "saved"].includes(field)) return;
  monthEdit = { ...monthEdit, [field]: stepMonthValue(monthEdit[field], direction) };
  render();
}

function saveMonthEdit() {
  if (!monthEdit) return;
  const preview = monthWeekPreview(data, monthEdit.monthId, monthEdit.weekId, monthEdit);
  if (!preview.result.ok) return;
  monthEdit = null;
  commit(preview.result);
}

// ---------- forms ----------
function openAddWeek() {
  const computed = computeWeeks(data.weeks);
  const last = computed[computed.length - 1];
  const suggested = Number(data.profile?.weeklySaving ?? suggestSaved(data));
  openForm({
    title: "Add Week",
    note: last
      ? `Carry-over from Week ${last.number}: <b>${money(last.remaining)}</b> (automatic). Saving for this week: <b>${money(suggested)}</b>.`
      : `First week: carry-over <b>0.00 TND</b>. Saving for this week: <b>${money(suggested)}</b>.`,
    fields: [
      { id: "startDate", label: "Week start (Monday)", type: "date", value: suggestedStart(data) },
      { id: "received", label: "Money received (TND)", type: "number", value: last ? last.received : "", attrs: 'min="0" step="0.01" placeholder="20.00"' },
      { id: "saved", label: "How much do you want to save this week? (TND)", type: "number", value: suggested, attrs: `min="0" step="0.01" placeholder="${money(WEEKLY_SAVINGS)}"` },
    ],
    submitLabel: "Create Week",
    onSubmit: (v) => {
      const result = commit(addWeek(data, v));
      if (result.ok) openIds = null; // let the new week open by default
      return result;
    },
  });
}

function openEditWeek(id) {
  const w = findWeek(id);
  if (!w) return;
  openForm({
    title: "Edit Week",
    fields: [
      { id: "startDate", label: "Week start (Monday)", type: "date", value: w.startDate },
      { id: "received", label: "Money received (TND)", type: "number", value: w.received, attrs: 'min="0" step="0.01"' },
      { id: "saved", label: "How much do you want to save this week? (TND)", type: "number", value: w.saved ?? WEEKLY_SAVINGS, attrs: 'min="0" step="0.01"' },
    ],
    onSubmit: (v) => commit(editWeek(data, id, v)),
  });
}

function expenseForm(weekId, index) {
  const w = findWeek(weekId);
  if (!w) return;
  const editing = index !== null;
  const e = editing ? w.expenses[index] : { name: "", amount: "", category: DEFAULT_CATEGORY };
  if (!e) return;
  const categories = Object.keys(CATEGORIES);
  if (!categories.includes(e.category)) categories.push(e.category);
  openForm({
    title: editing ? "Edit Expense" : "Add Expense",
    fields: [
      { id: "name", label: "Name", value: e.name, attrs: 'placeholder="Water"' },
      { id: "amount", label: "Amount (TND)", type: "number", value: e.amount, attrs: 'min="0.01" step="0.01" placeholder="1.00"' },
      { id: "category", label: "Category", options: categories, value: e.category },
    ],
    submitLabel: editing ? "Save" : "Add Expense",
    onSubmit: (v) => {
      const res = commit(editing ? editExpense(data, weekId, index, v) : addExpense(data, weekId, v));
      if (res.ok) showSuccessOverlay();
      return res;
    },
  });
}

function openAddExpenseScreen(weekId) {
  if (!findWeek(weekId)) return;
  expenseConfirming = false;
  expenseScreen = { weekId, amount: "", category: "Food", error: "" };
  render();
}

function closeAddExpenseScreen() {
  if (isClosingExpense) return;
  const el = view.querySelector(".add-expense-screen");
  const canAnimate =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finish = () => {
    isClosingExpense = false;
    expenseScreen = null;
    expenseConfirming = false;
    render();
  };
  if (!el || !canAnimate) {
    finish();
    return;
  }
  isClosingExpense = true;
  el.classList.add("closing");
  let done = false;
  const onEnd = () => {
    if (done) return;
    done = true;
    finish();
  };
  el.addEventListener("animationend", onEnd, { once: true });
  setTimeout(onEnd, 220);
}

function showExpenseError(error, dragged) {
  expenseScreen = { ...expenseScreen, error };
  if (!dragged) {
    render();
    return;
  }
  const alert = view.querySelector(".add-expense-error");
  if (alert) {
    alert.textContent = t(error);
    alert.hidden = false;
  }
  const week = computeWeeks(data.weeks).find((item) => item.id === expenseScreen.weekId);
  const affordable = canAfford(week, Number(expenseScreen.amount || 0));
  view.querySelector(".add-expense-amount")?.classList.toggle("danger", !affordable);
  view.querySelector(".add-expense-left")?.classList.toggle("danger", !affordable);
}

function confirmAddExpense(dragged = false) {
  if (!expenseScreen || expenseConfirming) return;
  if (!expenseScreen.amount || Number(expenseScreen.amount) <= 0) {
    showExpenseError("addExpense.zero", dragged);
    return;
  }
  expenseConfirming = true;
  const result = addExpense(data, expenseScreen.weekId, {
    name: expenseScreen.category,
    amount: Number(expenseScreen.amount),
    category: expenseScreen.category,
  });
  if (result.ok) {
    expenseScreen = null;
    commit(result);
    showSuccessOverlay();
  } else {
    showExpenseError("addExpense.tooHigh", dragged);
  }
  expenseConfirming = false;
}

function openEditGoal() {
  openForm({
    title: "Savings goal",
    fields: [{ id: "goal", label: "Goal (TND)", type: "number", value: data.goal, attrs: 'min="10" step="10"' }],
    onSubmit: (v) => {
      const goal = Number(v.goal);
      if (!Number.isFinite(goal) || goal < 10) return { ok: false, error: "The goal must be at least 10 TND." };
      return commit({ ok: true, data: { ...data, goal } });
    },
  });
}

// ---------- actions (buttons with data-action) ----------
const actions = {
  "add-month": () => openAddMonth(),
  "open-month-plan": (el) => openMonthPlan(el.dataset.month),
  "close-month-plan": () => closeMonthPlan(),
  "edit-month-week": (el) => beginMonthWeekEdit(el.dataset.week),
  "step-month-value": (el) => stepMonthEdit(el.dataset.field, Number(el.dataset.direction)),
  "cancel-month-edit": () => { monthEdit = null; render(); },
  "save-month-edit": () => saveMonthEdit(),
  "delete-month": async () => {
    const month = data.months.find((item) => item.id === activeMonthId);
    if (!month) return;
    const ok = await confirmDialog({
      title: t("plan.delete"),
      message: t("plan.deleteConfirm", { n: month.weekIds.length }),
      confirmLabel: t("plan.delete"),
      danger: true,
    });
    if (!ok) return;
    const result = deleteMonth(data, month.id);
    if (result.ok) {
      activeMonthId = null;
      monthEdit = null;
    }
    warn(commit(result));
  },
  "add-week": () => openAddWeek(),
  "add-daily-money": () => {
    const defaultAmount = data.profile?.dailyAmount > 0 ? data.profile.dailyAmount : "";
    const defaultSaved = data.profile?.dailySaving > 0 ? data.profile.dailySaving : 0;
    openForm({
      title: t("home.daily.addMoneyTitle"),
      fields: [
        {
          id: "amount",
          label: t("home.daily.amountLabel"),
          type: "number",
          value: defaultAmount,
          attrs: 'min="0.01" step="0.01" style="font-size: 16px;" required',
        },
        {
          id: "saved",
          label: t("home.daily.savedLabel"),
          type: "number",
          value: defaultSaved,
          attrs: 'min="0" step="0.01" style="font-size: 16px;" required',
        },
      ],
      submitLabel: t("home.daily.addMoneySubmit"),
      onSubmit: (values) => {
        const res = addMoney(data, {
          date: toISO(new Date()),
          amount: values.amount,
          saved: values.saved,
        });
        if (!res.ok) return res;
        commit(res);
        showSuccessOverlay();
      },
    });
  },
  "delete-topup": async (el) => {
    const weekId = el?.dataset?.week;
    const topupId = el?.dataset?.topup;
    if (!weekId || !topupId) return;
    const ok = await confirmDialog({
      title: t("history.deleteTopupTitle"),
      message: t("history.deleteTopupMessage"),
      confirmLabel: t("history.delete"),
      danger: true,
    });
    if (ok) warn(commit(removeMoney(data, weekId, topupId)));
  },
  "dismiss-reminder": () => {
    activeReminder = null;
    render();
  },
  "request-notification-permission": async () => {
    if (typeof window !== "undefined" && typeof window.Notification !== "undefined") {
      try {
        const perm = await window.Notification.requestPermission();
        if (perm === "granted") {
          data = {
            ...data,
            profile: {
              ...data.profile,
              notifications: {
                ...data.profile.notifications,
                money: true,
                night: true,
              },
            },
          };
          save(data);
        } else if (perm === "denied") {
          data = {
            ...data,
            profile: {
              ...data.profile,
              notifications: {
                ...data.profile.notifications,
                money: false,
                night: false,
              },
            },
          };
          save(data);
        }
        render();
      } catch (err) {
        console.warn("Permission request failed:", err);
      }
    }
  },
  "toggle-money-reminder": () => {
    const current = data.profile.notifications?.money ?? true;
    const next = !current;
    data = {
      ...data,
      profile: {
        ...data.profile,
        reminder: next,
        notifications: {
          ...data.profile.notifications,
          money: next,
        },
      },
    };
    save(data);
    render();
  },
  "toggle-night-reminder": () => {
    const current = data.profile.notifications?.night ?? true;
    data = {
      ...data,
      profile: {
        ...data.profile,
        notifications: {
          ...data.profile.notifications,
          night: !current,
        },
      },
    };
    save(data);
    render();
  },
  "edit-money-time": () => {
    openForm({
      title: t("profile.reminders.editMoneyTime"),
      fields: [
        {
          id: "moneyTime",
          label: t("profile.reminders.timeField"),
          type: "time",
          value: data.profile.notifications?.moneyTime || "12:00",
          attrs: "required",
        },
      ],
      onSubmit: (v) => {
        if (!v.moneyTime) return;
        data = {
          ...data,
          profile: {
            ...data.profile,
            notifications: {
              ...data.profile.notifications,
              moneyTime: v.moneyTime,
            },
          },
        };
        save(data);
        render();
      },
    });
  },
  "edit-night-time": () => {
    openForm({
      title: t("profile.reminders.editNightTime"),
      fields: [
        {
          id: "nightTime",
          label: t("profile.reminders.timeField"),
          type: "time",
          value: data.profile.notifications?.nightTime || "21:30",
          attrs: "required",
        },
      ],
      onSubmit: (v) => {
        if (!v.nightTime) return;
        data = {
          ...data,
          profile: {
            ...data.profile,
            notifications: {
              ...data.profile.notifications,
              nightTime: v.nightTime,
            },
          },
        };
        save(data);
        render();
      },
    });
  },
  "edit-week": (el) => openEditWeek(el.dataset.week),
  "delete-week": async (el) => {
    const ok = await confirmDialog({
      title: "Delete this week?",
      message: "Its expenses will be deleted too, and the following weeks will be recalculated.",
      confirmLabel: "Delete week",
      danger: true,
    });
    if (!ok) return;
    warn(commit(deleteWeek(data, el.dataset.week)));
  },
  "add-expense": (el) => openAddExpenseScreen(el.dataset.week),
  "expense-back": () => closeAddExpenseScreen(),
  "expense-key": (el) => {
    if (!expenseScreen || expenseConfirming) return;
    expenseScreen = { ...expenseScreen, amount: pressKey(expenseScreen.amount, el.dataset.key), error: "" };
    render();
  },
  "expense-category": (el) => {
    if (!expenseScreen) return;
    expenseScreen = { ...expenseScreen, category: el.dataset.category, error: "" };
    render();
  },
  "expense-confirm": (_el, event) => {
    if (event?.detail !== 0) return;
    confirmAddExpense();
  },
  "edit-expense": (el) => expenseForm(el.dataset.week, Number(el.dataset.index)),
  "delete-expense": async (el) => {
    const ok = await confirmDialog({ title: "Delete this expense?", message: "This cannot be undone.", confirmLabel: "Delete", danger: true });
    if (ok) warn(commit(deleteExpense(data, el.dataset.week, Number(el.dataset.index))));
  },
  "edit-goal": () => openEditGoal(),
  "set-language": (el) => {
    const lang = el?.dataset?.lang;
    if (!lang) return;
    data = { ...data, profile: { ...data.profile, language: lang } };
    save(data);
    setLanguage(lang);
    applyLanguage();
    render();
  },
  "set-income-mode": (el) => {
    const mode = el?.dataset?.mode;
    if (mode !== "weekly" && mode !== "monthly" && mode !== "daily") return;
    data = { ...data, profile: { ...data.profile, incomeMode: mode } };
    save(data);
    render();
  },
  "go-profile": () => {
    page = "profile";
    render();
  },
  "profile-edit-name": () => {
    openForm({
      title: t("profile.editNameTitle"),
      fields: [{ id: "name", label: t("profile.nameField"), value: data.profile.name || "", attrs: 'maxlength="30"' }],
      onSubmit: (v) => {
        const name = String(v.name ?? "").trim().slice(0, 30);
        data = { ...data, profile: { ...data.profile, name } };
        save(data);
        render();
      },
    });
  },
  "profile-edit-income-type": () => {
    openForm({
      title: t("profile.editIncomeType"),
      fields: [
        {
          id: "incomeMode",
          label: t("profile.incomeType"),
          options: [
            { value: "weekly", label: t("profile.weekly") },
            { value: "monthly", label: t("profile.monthly") },
            { value: "daily", label: t("profile.daily") },
          ],
          value: data.profile.incomeMode,
        },
      ],
      onSubmit: (v) => {
        const mode = ["weekly", "monthly", "daily"].includes(v.incomeMode) ? v.incomeMode : "weekly";
        data = { ...data, profile: { ...data.profile, incomeMode: mode } };
        save(data);
        render();
      },
    });
  },
  "profile-edit-weekly-saving": () => {
    openForm({
      title: t("profile.editWeeklySaving"),
      fields: [
        {
          id: "weeklySaving",
          label: t("profile.weeklySavingLabel"),
          type: "number",
          value: data.profile.weeklySaving ?? WEEKLY_SAVINGS,
          attrs: 'min="0" step="0.01" required',
        },
      ],
      onSubmit: (v) => {
        const val = Number(v.weeklySaving);
        if (!Number.isFinite(val) || val < 0) return { ok: false, error: t("profile.errorWeeklySaving") };
        data = { ...data, profile: { ...data.profile, weeklySaving: val } };
        save(data);
        render();
      },
    });
  },
  "profile-edit-daily-amount": () => {
    openForm({
      title: t("profile.editDailyAmount"),
      fields: [
        {
          id: "dailyAmount",
          label: t("profile.dailyAmountLabel"),
          type: "number",
          value: data.profile.dailyAmount ?? 0,
          attrs: 'min="0" step="0.01" required',
        },
      ],
      onSubmit: (v) => {
        const val = Number(v.dailyAmount);
        if (!Number.isFinite(val) || val < 0) return { ok: false, error: t("profile.errorDailyAmount") };
        data = { ...data, profile: { ...data.profile, dailyAmount: val } };
        save(data);
        render();
      },
    });
  },
  "profile-edit-daily-saving": () => {
    openForm({
      title: t("profile.editDailySaving"),
      fields: [
        {
          id: "dailySaving",
          label: t("profile.dailySavingLabel"),
          type: "number",
          value: data.profile.dailySaving ?? 0,
          attrs: 'min="0" step="0.01" required',
        },
      ],
      onSubmit: (v) => {
        const val = Number(v.dailySaving);
        if (!Number.isFinite(val) || val < 0) return { ok: false, error: t("profile.errorDailySaving") };
        data = { ...data, profile: { ...data.profile, dailySaving: val } };
        save(data);
        render();
      },
    });
  },
  "profile-edit-theme": () => {
    openForm({
      title: t("profile.editTheme"),
      fields: [
        {
          id: "theme",
          label: t("profile.theme"),
          options: THEMES.map((th) => ({ value: th.id, label: t(`theme.${th.id}`) || th.label })),
          value: data.profile.theme,
        },
      ],
      onSubmit: (v) => {
        commit({ ok: true, data: { ...data, profile: { ...data.profile, theme: v.theme } } });
      },
    });
  },
  "profile-edit-language": () => {
    openForm({
      title: t("profile.editLanguage"),
      fields: [
        {
          id: "language",
          label: t("profile.language"),
          options: [
            { value: "en", label: "English" },
            { value: "fr", label: "Français" },
            { value: "ar", label: "العربية" },
          ],
          value: data.profile.language,
        },
      ],
      onSubmit: (v) => {
        const lang = ["en", "fr", "ar"].includes(v.language) ? v.language : "en";
        data = { ...data, profile: { ...data.profile, language: lang } };
        save(data);
        setLanguage(lang);
        applyLanguage();
        render();
      },
    });
  },
  "profile-currency": async () => {
    await confirmDialog({
      title: t("profile.currency"),
      message: t("profile.currencyInfo"),
      confirmLabel: "OK",
    });
  },
  "toggle-reminder": () => {
    data = { ...data, profile: { ...data.profile, reminder: !data.profile.reminder } };
    save(data);
    render();
  },
  "profile-backup-reset": () => {
    openActionModal({
      title: t("profile.backupResetTitle"),
      actions: [
        { action: "export", label: t("profile.exportBudget") },
        { action: "import", label: t("profile.importBudget") },
        { action: "reset", label: t("profile.resetAllData"), variant: "danger" },
      ],
    });
  },
  "go-history": () => {
    page = "history";
    render();
  },
  "go-savings": () => {
    page = "savings";
    render();
  },
  "home-add-expense": () => {
    const current = computeWeeks(data.weeks)[computeWeeks(data.weeks).length - 1];
    if (!current) {
      openAddWeek();
      return;
    }
    openAddExpenseScreen(current.id);
  },
  "onboard-finish-income": () => {
    data = { ...data, profile: { ...data.profile, onboarded: true } };
    save(data);
    render();
  },
  export: () => {
    exportData(data);
    showSuccessOverlay();
  },
  import: () => fileInput.click(),
  reset: async () => {
    const ok = await confirmDialog({
      title: "Delete ALL data?",
      message: "Every week and expense on this device will be erased. Export a backup first if you might need it.",
      confirmLabel: "Delete everything",
      danger: true,
    });
    if (!ok) return;
    clear();
    openIds = null;
    commit({ ok: true, data: { ...createEmpty(), profile: data.profile } }); // keep name, theme and language
  },
};

startBootSplash();

document.addEventListener("keydown", (e) => {
  if (activeMonthId && e.key === "Escape" && !document.querySelector(".modal-backdrop")) {
    e.preventDefault();
    if (monthEdit) {
      monthEdit = null;
      render();
    } else {
      closeMonthPlan();
    }
    return;
  }

  if (expenseScreen) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeAddExpenseScreen();
      return;
    }
    const handle = e.target.closest?.("[data-action='expense-confirm']");
    if (handle && e.key === "ArrowUp") {
      e.preventDefault();
      confirmAddExpense();
      return;
    }
    if (/^[0-9]$/.test(e.key) || e.key === "." || e.key === "," || e.key === "Backspace") {
      e.preventDefault();
      if (!expenseConfirming) {
        expenseScreen = {
          ...expenseScreen,
          amount: pressKey(expenseScreen.amount, e.key === "," ? "." : e.key === "Backspace" ? "back" : e.key),
          error: "",
        };
        render();
      }
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      if (handle) {
        e.preventDefault();
        confirmAddExpense();
      }
      return;
    }
  }

  if (onboardingStep === "income") {
    if (e.key === "Escape") {
      e.preventDefault();
      onboardingStep = "name";
      render();
      return;
    }

    const target = e.target.closest && e.target.closest("[data-action='set-income-mode']");
    if (target) {
      const options = [...document.querySelectorAll("[data-action='set-income-mode']")];
      const index = options.indexOf(target);
      if (index === -1) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = options[(index + 1) % options.length];
        next.focus();
        next.click();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = options[(index - 1 + options.length) % options.length];
        prev.focus();
        prev.click();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        target.click();
        return;
      }
    }
  }

  if (onboardingStep === "tutorial") {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onboardingTutorialIndex = Math.min(onboardingTutorialIndex + 1, 2);
      render();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onboardingTutorialIndex = Math.max(onboardingTutorialIndex - 1, 0);
      render();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onboardingStep = "name";
      render();
      return;
    }
  }

  const target = e.target.closest && e.target.closest("[data-action='set-language']");
  if (!target) return;
  const rows = [...document.querySelectorAll("[data-action='set-language']")];
  const index = rows.indexOf(target);
  if (index === -1) return;

  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    const next = rows[(index + 1) % rows.length];
    next.focus();
    const lang = next.dataset.lang;
    if (lang) {
      data = { ...data, profile: { ...data.profile, language: lang } };
      save(data);
      setLanguage(lang);
      applyLanguage();
      render();
    }
    return;
  }

  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    const prev = rows[(index - 1 + rows.length) % rows.length];
    prev.focus();
    const lang = prev.dataset.lang;
    if (lang) {
      data = { ...data, profile: { ...data.profile, language: lang } };
      save(data);
      setLanguage(lang);
      applyLanguage();
      render();
    }
    return;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    target.click();
  }
});

document.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest?.("[data-action='expense-confirm']");
  if (!handle || !expenseScreen || expenseDrag) return;
  const track = handle.closest(".add-expense-slide-track");
  const trackHeight = track.getBoundingClientRect().height || track.clientHeight;
  const handleHeight = handle.getBoundingClientRect().height || handle.clientHeight;
  const travel = Math.max(0, trackHeight - handleHeight - 8);
  expenseDrag = { handle, startY: e.clientY, travel, pointerId: e.pointerId, progress: 0 };
  try { handle.setPointerCapture(e.pointerId); } catch { /* Pointer capture is unavailable in some browsers and test DOMs. */ }
  e.preventDefault();
});

document.addEventListener("pointermove", (e) => {
  if (!expenseDrag || (e.pointerId !== undefined && expenseDrag.pointerId !== undefined && e.pointerId !== expenseDrag.pointerId)) return;
  const { handle, startY, travel } = expenseDrag;
  const progress = slideProgress(startY, e.clientY, travel);
  expenseDrag.progress = progress;
  handle.style.transform = `translateY(${-progress * travel}px)`;
  handle.closest(".add-expense-slide-track").style.setProperty("--slide-progress", progress);
  e.preventDefault();
});

function finishExpenseDrag(confirm) {
  if (!expenseDrag) return;
  const { handle, progress } = expenseDrag;
  expenseDrag = null;
  handle.style.transform = "translateY(0)";
  handle.closest(".add-expense-slide-track").style.setProperty("--slide-progress", 0);
  if (confirm && shouldConfirm(progress)) confirmAddExpense(true);
}

document.addEventListener("pointerup", () => finishExpenseDrag(true));
document.addEventListener("pointercancel", () => finishExpenseDrag(false));

function canPullRefresh() {
  if (isRefreshing) return false;
  if (page !== "dashboard") return false;
  if (expenseScreen || activeMonthId) return false;
  if (showOnboarding() || bootSplash) return false;
  return true;
}

function getScrollTop() {
  if (typeof window === "undefined") return 0;
  return (
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement?.scrollTop ||
    document.body?.scrollTop ||
    (view?.scrollTop ?? 0) ||
    0
  );
}

function triggerPullRefresh() {
  if (isRefreshing || !canPullRefresh()) return;
  const homeEl = view.querySelector(".home-screen");
  if (!homeEl || view.querySelector(".home-pull-refresh")) return;

  isRefreshing = true;

  const refreshContainer = document.createElement("div");
  refreshContainer.className = "home-pull-refresh";
  refreshContainer.setAttribute("data-pull-refresh", "true");
  refreshContainer.setAttribute("aria-hidden", "true");

  const animBox = document.createElement("div");
  animBox.className = "lottie";
  animBox.dataset.lottie = "refresh";
  refreshContainer.appendChild(animBox);

  homeEl.prepend(refreshContainer);

  playLottie(animBox, "refresh", { loop: true });

  setTimeout(() => {
    isRefreshing = false;
    render();
  }, 600);
}

function goToTutorialSlide(index) {
  if (onboardingStep !== "tutorial") return;
  onboardingTutorialIndex = Math.min(Math.max(0, Number(index) || 0), 2);
  render();
}

document.addEventListener("touchstart", (e) => {
  if (onboardingStep === "tutorial") {
    const touch = e.changedTouches && e.changedTouches[0];
    if (touch) tutorialTouchStartX = touch.clientX;
    return;
  }
  if (!canPullRefresh()) {
    pullStartY = null;
    pullStartX = null;
    pullDistance = 0;
    return;
  }
  const scrollTop = getScrollTop();
  if (scrollTop > 0) {
    pullStartY = null;
    pullStartX = null;
    pullDistance = 0;
    return;
  }
  const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
  if (!touch) return;
  pullStartY = touch.clientY;
  pullStartX = touch.clientX;
  pullDistance = 0;
}, { passive: true });

document.addEventListener("touchmove", (e) => {
  if (pullStartY === null || !canPullRefresh()) return;
  const scrollTop = getScrollTop();
  if (scrollTop > 0) {
    pullStartY = null;
    pullDistance = 0;
    return;
  }
  const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
  if (!touch) return;
  const dy = touch.clientY - pullStartY;
  const dx = touch.clientX - (pullStartX || 0);

  if (dy < 0 || (Math.abs(dx) > Math.abs(dy) && dy < 20)) {
    pullStartY = null;
    pullDistance = 0;
    return;
  }

  pullDistance = Math.max(0, dy);
}, { passive: true });

document.addEventListener("touchend", (e) => {
  if (onboardingStep === "tutorial" && tutorialTouchStartX !== null) {
    const touch = e.changedTouches && e.changedTouches[0];
    if (touch) {
      const deltaX = touch.clientX - tutorialTouchStartX;
      tutorialTouchStartX = null;
      if (Math.abs(deltaX) >= 52) {
        if (deltaX < 0) {
          onboardingTutorialIndex = Math.min(onboardingTutorialIndex + 1, 2);
        } else {
          onboardingTutorialIndex = Math.max(onboardingTutorialIndex - 1, 0);
        }
        render();
      }
    }
    return;
  }

  if (pullStartY !== null && pullDistance >= 70 && canPullRefresh()) {
    triggerPullRefresh();
  }
  pullStartY = null;
  pullStartX = null;
  pullDistance = 0;
}, { passive: true });

document.addEventListener("touchcancel", () => {
  tutorialTouchStartX = null;
  pullStartY = null;
  pullStartX = null;
  pullDistance = 0;
}, { passive: true });

document.addEventListener("click", async (e) => {
  const onboardingEl = e.target.closest("[data-action]");
  if (onboardingEl && onboardingEl.dataset.action.startsWith("onboard-")) {
    const action = onboardingEl.dataset.action;
    if (action === "onboard-next") {
      if (onboardingStep === "language") {
        onboardingStep = "tutorial";
      } else if (onboardingStep === "tutorial") {
        onboardingTutorialIndex += 1;
        if (onboardingTutorialIndex >= 3) {
          onboardingTutorialIndex = 0;
          onboardingStep = "name";
        }
      } else if (onboardingStep === "name") {
        onboardingStep = "income";
      } else if (onboardingStep === "income") {
        data = { ...data, profile: { ...data.profile, onboarded: true } };
        save(data);
        onboardingStep = "reminders";
        render();
        return;
      } else if (onboardingStep === "reminders") {
        data = { ...data, profile: { ...data.profile, onboarded: true } };
        save(data);
        onboardingStep = "splash";
        render();
        return;
      }
      render();
      return;
    }
    if (action === "onboard-prev") {
      if (onboardingStep === "reminders") {
        onboardingStep = "income";
      } else if (onboardingStep === "tutorial") {
        onboardingTutorialIndex = Math.max(0, onboardingTutorialIndex - 1);
      } else if (onboardingStep === "language") {
        onboardingStep = "splash";
      } else if (onboardingStep === "name") {
        onboardingStep = "tutorial";
      } else if (onboardingStep === "income") {
        onboardingStep = "name";
      }
      render();
      return;
    }
    if (action === "onboard-skip") {
      onboardingStep = "name";
      render();
      return;
    }
    if (action === "onboard-dot") {
      if (onboardingStep === "tutorial") {
        goToTutorialSlide(onboardingEl.dataset.index);
      }
      return;
    }
    if (action === "onboard-save-name") {
      const input = view.querySelector("input[name='name']");
      const name = (input?.value ?? "").trim();
      data = { ...data, profile: { ...data.profile, name } };
      save(data);
      onboardingStep = "income";
      render();
      return;
    }
    if (action === "onboard-save-income" || action === "onboard-finish-income") {
      data = { ...data, profile: { ...data.profile, onboarded: true } };
      save(data);
      onboardingStep = "reminders";
      render();
      return;
    }
    if (action === "onboard-enable-reminders") {
      if (typeof window !== "undefined" && typeof window.Notification !== "undefined") {
        try {
          const perm = await window.Notification.requestPermission();
          const isGranted = perm === "granted";
          data = {
            ...data,
            profile: {
              ...data.profile,
              notifications: {
                ...data.profile.notifications,
                money: isGranted,
                night: isGranted,
              },
              onboarded: true,
            },
          };
          save(data);
          onboardingStep = "splash";
          render();
          return;
        } catch (err) {
          console.warn("Permission request failed:", err);
        }
      }
      data = { ...data, profile: { ...data.profile, onboarded: true } };
      save(data);
      onboardingStep = "splash";
      render();
      return;
    }
    if (action === "onboard-finish") {
      data = { ...data, profile: { ...data.profile, onboarded: true } };
      save(data);
      onboardingStep = "splash";
      render();
      return;
    }
    if (action === "onboard-start") {
      onboardingStep = "language";
      render();
      return;
    }
  }
  const pageBtn = e.target.closest("[data-page]");
  if (pageBtn) {
    expenseScreen = null;
    isClosingExpense = false;
    activeMonthId = null;
    monthEdit = null;
    isClosingMonth = false;
    page = pageBtn.dataset.page;
    render();
    window.scrollTo(0, 0);
    return;
  }
  const el = e.target.closest("[data-action]");
  if (el && actions[el.dataset.action]) actions[el.dataset.action](el, e);
});

// remember which History cards are open so they stay open after a redraw
document.addEventListener(
  "toggle",
  (e) => {
    if (e.target.matches && e.target.matches("details.history-week")) {
      openIds = new Set([...document.querySelectorAll("details.history-week[open]")].map((d) => d.dataset.week));
    }
  },
  true
);

// ---------- import ----------
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".json,application/json";
fileInput.hidden = true;
document.body.appendChild(fileInput);
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  fileInput.value = "";
  if (!file) return;
  const hideLoading = showLoadingOverlay();
  try {
    const imported = await importFile(file);
    hideLoading();
    const ok = await confirmDialog({
      title: "Import this backup?",
      message: `It contains ${imported.weeks.length} week(s). It will replace the budget currently on this device.`,
      confirmLabel: "Replace my data",
      danger: true,
    });
    if (ok) {
      openIds = null;
      commit({ ok: true, data: imported });
      showSuccessOverlay();
    }
  } catch (err) {
    hideLoading();
    showNotice("Import failed: " + err.message);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    checkAndDeliverReminders();
  }
});

render();
checkAndDeliverReminders();