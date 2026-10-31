import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import { addMoney, removeMoney } from "../js/daily.js";
import { computeWeeks } from "../js/calc.js";
import { cleanProfile, createEmpty, normalize, parseBackup } from "../js/store.js";
import { renderDashboard } from "../js/views/dashboard.js";
import { renderHistory } from "../js/views/history.js";
import { setLanguage, t } from "../js/i18n.js";
import en from "../js/lang/en.js";
import fr from "../js/lang/fr.js";
import ar from "../js/lang/ar.js";

// ==========================================
// 1. Translation completeness
// ==========================================
const dailyKeys = [
  "home.daily.spendToday",
  "home.daily.weekRemaining",
  "home.daily.gotMoney",
  "home.daily.title",
  "home.daily.emptyText",
  "home.daily.addMoneyTitle",
  "home.daily.amountLabel",
  "home.daily.savedLabel",
  "home.daily.addMoneySubmit",
  "history.topupsLabel",
  "history.savedShort",
  "history.deleteTopup",
  "history.deleteTopupTitle",
  "history.deleteTopupMessage",
  "history.delete",
];

for (const key of dailyKeys) {
  assert.ok(en[key], `Missing en translation for ${key}`);
  assert.ok(fr[key], `Missing fr translation for ${key}`);
  assert.ok(ar[key], `Missing ar translation for ${key}`);
}

// ==========================================
// 2. Pure logic tests: addMoney & removeMoney
// ==========================================
const emptyState = createEmpty();

// 2.1 Automatically creates week if it does not exist (date 2026-11-03 is a Tuesday -> Monday is 2026-11-02)
const step1 = addMoney(emptyState, { date: "2026-11-03", amount: 30, saved: 5 });
assert.ok(step1.ok, `addMoney failed: ${step1.error}`);
assert.equal(step1.data.weeks.length, 1);
const w1 = step1.data.weeks[0];
assert.equal(w1.startDate, "2026-11-02");
assert.equal(w1.received, 30);
assert.equal(w1.saved, 5);
assert.equal(w1.topups.length, 1);
assert.equal(w1.topups[0].amount, 30);
assert.equal(w1.topups[0].saved, 5);
assert.equal(w1.topups[0].date, "2026-11-03");

// 2.2 Two entries on the same day accumulate on that week
const step2 = addMoney(step1.data, { date: "2026-11-03", amount: 20, saved: 5 });
assert.ok(step2.ok);
assert.equal(step2.data.weeks.length, 1);
const w2 = step2.data.weeks[0];
assert.equal(w2.received, 50);
assert.equal(w2.saved, 10);
assert.equal(w2.topups.length, 2);

// 2.3 An entry on Sunday (2026-11-08) goes to the week starting the previous Monday (2026-11-02)
const step3 = addMoney(step2.data, { date: "2026-11-08", amount: 15, saved: 3 });
assert.ok(step3.ok);
assert.equal(step3.data.weeks.length, 1);
const w3 = step3.data.weeks[0];
assert.equal(w3.startDate, "2026-11-02");
assert.equal(w3.received, 65);
assert.equal(w3.saved, 13);
assert.equal(w3.topups.length, 3);

// 2.4 Carry-over to the next week
// Add money to the following week (Monday 2026-11-09)
const step4 = addMoney(step3.data, { date: "2026-11-09", amount: 25, saved: 5 });
assert.ok(step4.ok);
assert.equal(step4.data.weeks.length, 2);
const computed = computeWeeks(step4.data.weeks);
// Week 1: received 65, saved 13 -> available 52, spent 0 -> remaining 52
assert.equal(computed[0].remaining, 52);
// Week 2: carry = 52, received 25, total = 77, saved 5 -> available 72, remaining 72
assert.equal(computed[1].carry, 52);
assert.equal(computed[1].remaining, 72);

// 2.5 saved > amount is refused
const stepErr = addMoney(emptyState, { date: "2026-11-03", amount: 10, saved: 15 });
assert.equal(stepErr.ok, false);
assert.ok(stepErr.error.includes("higher"));

// 2.6 negative amount or saved is refused
assert.equal(addMoney(emptyState, { date: "2026-11-03", amount: -10, saved: 0 }).ok, false);
assert.equal(addMoney(emptyState, { date: "2026-11-03", amount: 10, saved: -1 }).ok, false);

// 2.7 removeMoney reverses received and saved money
const topupToRemove = w3.topups[0];
const stepRemoved = removeMoney(step3.data, w3.id, topupToRemove.id);
assert.ok(stepRemoved.ok, `removeMoney failed: ${stepRemoved.error}`);
const wRemoved = stepRemoved.data.weeks[0];
assert.equal(wRemoved.received, 35);
assert.equal(wRemoved.saved, 8);
assert.equal(wRemoved.topups.length, 2);

// 2.8 removeMoney refused when money was already spent
// Suppose week has 20 received, 0 saved, 15 spent. Remaining is 5.
// If we try to remove a 10 topup, received becomes 10, remaining becomes -5 -> refused!
const stateWithExpense = {
  ...emptyState,
  weeks: [
    {
      id: "w-spent",
      startDate: "2026-11-02",
      received: 20,
      saved: 0,
      topups: [{ id: "tp-1", date: "2026-11-02", amount: 20, saved: 0 }],
      expenses: [{ name: "Food", amount: 15, category: "Food" }],
    },
  ],
};
const stepRefused = removeMoney(stateWithExpense, "w-spent", "tp-1");
assert.equal(stepRefused.ok, false);

// ==========================================
// 3. store.js backwards compatibility & profile defaults
// ==========================================
// Old backup without topups
const oldBackupRaw = {
  goal: 700,
  weeks: [
    {
      id: "old-w1",
      startDate: "2026-10-05",
      received: 40,
      saved: 10,
      expenses: [{ name: "Water", amount: 1, category: "Water" }],
    },
  ],
  profile: { name: "Med", language: "en", theme: "dark", incomeMode: "weekly" },
};

const parsed = parseBackup(JSON.stringify(oldBackupRaw));
assert.ok(Array.isArray(parsed.weeks[0].topups));
assert.equal(parsed.weeks[0].topups.length, 0);

// Profile daily defaults
const prof = cleanProfile({});
assert.equal(prof.dailyAmount, 0);
assert.equal(prof.dailySaving, 0);

const profCustom = cleanProfile({ dailyAmount: 25.5, dailySaving: 5 });
assert.equal(profCustom.dailyAmount, 25.5);
assert.equal(profCustom.dailySaving, 5);

// ==========================================
// 4. View Rendering Tests
// ==========================================
setLanguage("en");

// 4.1 Daily Home Empty State
const emptyDailyHtml = renderDashboard([], 700, { incomeMode: "daily", name: "Sarah" });
assert.ok(emptyDailyHtml.includes("home-screen-daily"));
assert.ok(emptyDailyHtml.includes('data-lottie="empty"'));
assert.ok(emptyDailyHtml.includes("Tap the button when you receive money today"));
assert.ok(emptyDailyHtml.includes('data-action="add-daily-money"'));
assert.ok(emptyDailyHtml.includes("I got money today"));

// 4.2 Daily Home with active week
const computedDaily = computeWeeks([
  {
    id: "dw-1",
    startDate: "2026-11-02",
    received: 70,
    saved: 14,
    expenses: [{ name: "Lunch", amount: 14, category: "Food" }],
    topups: [{ id: "dtp-1", date: "2026-11-02", amount: 70, saved: 14 }],
  },
]);
const activeDailyHtml = renderDashboard(computedDaily, 700, { incomeMode: "daily", name: "Sarah" });
assert.ok(activeDailyHtml.includes("home-hero-daily"));
assert.ok(activeDailyHtml.includes("You can spend today"));
// Remaining money is 70 - 14 - 14 = 42.00 TND
assert.ok(activeDailyHtml.includes("Left this week: 42.00 TND"));
assert.ok(activeDailyHtml.includes('data-action="add-daily-money"'));

// 4.3 History rendering with top-ups
const historyHtml = renderHistory(computedDaily, null, [], "en");
assert.ok(historyHtml.includes("Top-ups"));
assert.ok(historyHtml.includes("+70.00 TND · saved 14.00 ·"));
assert.ok(historyHtml.includes('data-action="delete-topup"'));
assert.ok(historyHtml.includes('data-topup="dtp-1"'));

// ==========================================
// 5. JSDOM Screen & Interaction Tests
// ==========================================
const KEY = "savings-budget-v1";
const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

async function boot({ profile = {}, weeks = [], months = [] } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  virtualConsole.on("error", (...args) => errors.push(args));
  const dom = new JSDOM(html, {
    url: "http://localhost/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
    virtualConsole,
    beforeParse(window) {
      const store = new Map([
        [
          KEY,
          JSON.stringify({
            goal: 700,
            weeks,
            months,
            profile: {
              name: "Amine",
              language: "en",
              theme: "dark",
              incomeMode: "daily",
              dailyAmount: 15,
              dailySaving: 3,
              onboarded: true,
              ...profile,
            },
          }),
        ],
      ]);
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: (key) => store.get(key) ?? null,
          setItem: (key, value) => store.set(key, String(value)),
          removeItem: (key) => store.delete(key),
        },
        configurable: true,
      });
      window.alert = () => {
        throw new Error("alert must not be used");
      };
      window.scrollTo = () => {};
    },
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  await import(new URL(`../js/app.js?daily-test=${Date.now()}-${Math.random()}`, import.meta.url));
  await new Promise((resolve) => setTimeout(resolve, 1550));
  return {
    dom,
    document: dom.window.document,
    errors,
    data: () => JSON.parse(dom.window.localStorage.getItem(KEY)),
  };
}

// 5.1 Click "I got money today" button opens popup prefilled with profile.dailyAmount and profile.dailySaving
const appInstance = await boot();
const doc = appInstance.document;

const gotMoneyBtn = doc.querySelector("[data-action='add-daily-money']");
assert.ok(gotMoneyBtn, "add-daily-money button not found");
gotMoneyBtn.click();

const modal = doc.querySelector(".modal");
assert.ok(modal, "Modal did not open");
const amountInput = modal.querySelector("input[name='amount']");
const savedInput = modal.querySelector("input[name='saved']");
assert.ok(amountInput, "amount input missing");
assert.ok(savedInput, "saved input missing");
assert.equal(amountInput.value, "15");
assert.equal(savedInput.value, "3");
assert.ok(amountInput.getAttribute("style")?.includes("font-size: 16px") || amountInput.getAttribute("style")?.includes("16px"));

// Submit the form
const form = modal.querySelector("form");
form.dispatchEvent(new doc.defaultView.Event("submit", { bubbles: true, cancelable: true }));
await new Promise((resolve) => setTimeout(resolve, 100));

// Check that data was saved to localStorage with the new topup
const updatedData = appInstance.data();
assert.equal(updatedData.weeks.length, 1);
assert.equal(updatedData.weeks[0].received, 15);
assert.equal(updatedData.weeks[0].saved, 3);
assert.equal(updatedData.weeks[0].topups.length, 1);

console.log("All daily mode logic and screen tests passed!");

