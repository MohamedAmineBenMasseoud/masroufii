import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import { computeWeeks } from "../js/calc.js";

const KEY = "savings-budget-v1";
const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await fs.readFile(new URL("../css/style.css", import.meta.url), "utf8");

async function boot({ profile = {}, weeks = [], months = [] } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  virtualConsole.on("error", (...args) => errors.push(args));
  const dom = new JSDOM(html, {
    url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only", virtualConsole,
    beforeParse(window) {
      const store = new Map([[KEY, JSON.stringify({
        goal: 700,
        weeks,
        months,
        profile: { name: "", language: "en", theme: "dark", incomeMode: "weekly", onboarded: true, ...profile },
      })]]);
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: (key) => store.get(key) ?? null,
          setItem: (key, value) => store.set(key, String(value)),
          removeItem: (key) => store.delete(key),
        },
        configurable: true,
      });
      window.alert = () => { throw new Error("alert must not be used"); };
      window.scrollTo = () => {};
    },
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  await import(new URL(`../js/app.js?home-weekly=${Date.now()}-${Math.random()}`, import.meta.url));
  await new Promise((resolve) => setTimeout(resolve, 1550));
  return {
    dom,
    document: dom.window.document,
    errors,
    data: () => JSON.parse(dom.window.localStorage.getItem(KEY)),
  };
}

const first = await boot({ weeks: [{ id: "only-week", startDate: "2026-10-05", received: 40, saved: 10, expenses: [] }] });
const home = first.document;
const state = first.data();
const headerControls = [...home.querySelectorAll(".home-header button")].map((button) => ({
  text: button.textContent.trim(),
  action: button.dataset.action || null,
  ariaLabel: button.getAttribute("aria-label"),
}));
const report = {
  headerControls,
  existingRoundAddExpenseButtonInDom: Boolean(home.querySelector(".home-fab[data-action='add-expense']")),
  homeSubline: home.querySelector(".home-subtitle")?.textContent.trim() ?? null,
  incomeMode: state.profile.incomeMode,
  months: state.months,
};
console.log("WEEKLY HOME REGRESSION REPRO:", JSON.stringify(report, null, 2));

assert.equal(state.profile.incomeMode, "weekly", "reproduction uses weekly mode");
assert.deepEqual(state.months, [], "reproduction has no monthly plans");
assert.ok(headerControls.some((button) => button.action === "add-week"), "Home header shows + Week");
assert.ok(headerControls.some((button) => button.action === "go-profile"), "Home header shows the avatar");
assert.match(report.homeSubline, /^Week 1 : 5 Oct – 11 Oct$/, "Home range has no leading zero and matches the Home design");
assert.equal(home.querySelector(".home-week-pill").textContent.trim(), "Week", "the icon supplies the pill's only plus sign");
assert.ok(home.querySelector(".home-fab[data-action='add-expense']"), "existing round + add-expense button is rendered");
assert.match(css, /\.home-screen-weekly \.home-fab\s*\{[^}]*width:\s*60px;[^}]*height:\s*60px/s);
assert.match(css, /\.home-screen-weekly \.home-greeting\s*\{[^}]*font-size:\s*22px;[^}]*font-weight:\s*700/s);
assert.match(css, /\.home-week-pill\s*\{[^}]*height:\s*40px/s);
assert.equal(home.querySelector(".home-hero-weekly").classList.contains("card"), false, "weekly hero is not inside a card");
assert.equal(home.querySelector(".home-hero-weekly .home-link"), null, "hero has no See all link");
assert.match(home.querySelector(".home-weekly-progress").textContent, /Spent 0\.00/);
assert.match(home.querySelector(".home-weekly-progress").textContent, /Available 30\.00/);
assert.equal(home.querySelectorAll(".home-goal-card-compact").length, 1);
assert.match(home.querySelector(".home-goal-card-compact").textContent, /Savings goal/);
assert.match(home.querySelector(".home-goal-card-compact").textContent, /1\.4% of your goal/);
assert.equal((home.querySelector(".home-goal-card-compact").textContent.match(/1\.4% of your goal/g) || []).length, 1);
assert.equal(home.querySelector('.home-goal-card-compact [data-action="edit-goal"]'), null, "compact goal card has no nested edit action");
assert.doesNotMatch(home.querySelector(".home-goal-card-compact").textContent, /Savings\s*$/);
assert.doesNotMatch(home.querySelector("#view").textContent, /SAVINGS GOAL/);
assert.match(home.querySelector(".home-week-section").textContent, /This week[\s\S]*See all[\s\S]*No expenses yet\./);

home.querySelector(".home-goal-card-compact").click();
assert.equal(home.querySelector('[data-page="savings"]').classList.contains("active"), true, "goal card opens Savings");
home.querySelector('[data-page="dashboard"]').click();
home.querySelector(".home-fab").click();
assert.ok(home.querySelector(".add-expense-screen"), "existing round + opens existing add-expense screen");
home.querySelector('[data-action="expense-back"]').click();

home.querySelector('[data-action="add-week"]').click();
assert.ok(home.querySelector(".modal-backdrop"), "+ Week from Home opens Add Week");
assert.equal(home.querySelector('input[name="startDate"]').value, "2026-10-12", "default Add Week date follows the latest Monday");
assert.equal(home.querySelector('input[name="saved"]').value, "10", "suggested saving is preserved");
home.querySelector("[data-cancel]").click();

home.querySelector('[data-page="history"]').click();
home.querySelector('[data-action="add-week"]').click();
assert.ok(home.querySelector(".modal-backdrop"), "+ Week from History opens Add Week");
assert.equal(home.querySelector('input[name="startDate"]').value, "2026-10-12");
home.querySelector("[data-cancel]").click();
home.querySelector('[data-page="dashboard"]').click();

home.querySelector('[data-action="add-week"]').click();
home.querySelector('input[name="received"]').value = "20";
home.querySelector('input[name="saved"]').value = "10";
home.querySelector(".form").dispatchEvent(new home.defaultView.Event("submit", { bubbles: true, cancelable: true }));
await new Promise((resolve) => setTimeout(resolve, 0));
const afterSecondWeek = computeWeeks(first.data().weeks);
assert.equal(afterSecondWeek[1].carry, 30);
assert.equal(afterSecondWeek[1].remaining, 40);
assert.match(home.querySelector(".home-subtitle").textContent, /^Week 2 : 12 Oct – 18 Oct$/);
assert.equal(home.querySelector(".home-amount span").textContent, "40.00");
assert.match(home.querySelector(".home-daily").textContent, /^About .+ TND per day$/);

const figma = await boot({ weeks: [
  { id: "prior", startDate: "2026-09-21", received: 16.5, saved: 10, expenses: [] },
  { id: "latest", startDate: "2026-09-28", received: 40, saved: 10, expenses: [{ name: "Lunch", amount: 12, category: "Food" }] },
] });
assert.equal(figma.document.querySelector(".home-amount span").textContent, "24.50");
assert.match(figma.document.querySelector(".home-weekly-progress").textContent, /Spent 12\.00/);
assert.match(figma.document.querySelector(".home-weekly-progress").textContent, /Available 36\.50/);

const empty = await boot();
assert.ok(empty.document.querySelector('[data-action="add-week"]'), "weekly empty state retains Add Week");
empty.document.querySelector(".home-fab").click();
assert.ok(empty.document.querySelector(".modal-backdrop"), "round + with no week uses the existing Add Week flow");
empty.document.querySelector("[data-cancel]").click();
empty.document.querySelector('[data-action="add-week"]').click();
assert.ok(empty.document.querySelector(".modal-backdrop"), "empty-state Add Week opens the existing popup");

const monthWeeks = [
  { id: "m1", startDate: "2026-10-05", received: 40, saved: 10, expenses: [] },
  { id: "m2", startDate: "2026-10-12", received: 40, saved: 10, expenses: [] },
  { id: "m3", startDate: "2026-10-19", received: 40, saved: 10, expenses: [] },
  { id: "m4", startDate: "2026-10-26", received: 40, saved: 10, expenses: [] },
];
const monthly = await boot({
  profile: { incomeMode: "monthly" },
  weeks: monthWeeks,
  months: [{ id: "oct", label: "2026-10", income: 160, weekIds: monthWeeks.map((week) => week.id) }],
});
assert.equal(monthly.document.querySelector(".home-month-pill").textContent, "+ Month");
assert.ok(monthly.document.querySelector(".home-month-budget"), "monthly budget card remains rendered");

for (const [language, expectedWeek, expectedExpense] of [["fr", "+ Semaine", "Ajouter une dépense"], ["ar", "+ أسبوع", "إضافة مصروف"]]) {
  const localized = await boot({ profile: { language }, weeks: [{ id: `week-${language}`, startDate: "2026-10-05", received: 40, saved: 10, expenses: [] }] });
  assert.equal(localized.document.querySelector(".home-week-pill").getAttribute("aria-label"), expectedWeek);
  assert.equal(localized.document.querySelector(".home-week-pill").textContent.trim(), language === "fr" ? "Semaine" : "أسبوع");
  assert.equal(localized.document.querySelector(".home-fab").getAttribute("aria-label"), expectedExpense);
  assert.deepEqual(localized.errors, []);
}

for (const instance of [first, figma, empty, monthly]) assert.deepEqual(instance.errors, [], "no JSDOM console errors");
console.log("PASS weekly Home regression and add-week flows");
