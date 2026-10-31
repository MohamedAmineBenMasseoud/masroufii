import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import { cleanProfile, DEFAULT_NOTIFICATIONS } from "../js/store.js";
import {
  isTimeOnOrAfter,
  moneyReminderDue,
  nightReminderDue,
  nightSummary,
  markReminderShown,
  formatEveningMessage,
  moneyReminderMessage,
} from "../js/reminders.js";
import { setLanguage, t } from "../js/i18n.js";
import { addExpense, editExpense } from "../js/expenses.js";
import { toISO } from "../js/utils.js";
import en from "../js/lang/en.js";
import fr from "../js/lang/fr.js";
import ar from "../js/lang/ar.js";

// ==========================================
// 1. Translation checks
// ==========================================
const requiredKeys = [
  "onboarding.reminders.title",
  "onboarding.reminders.subtitle",
  "onboarding.reminders.enable",
  "onboarding.reminders.iosPrompt",
  "onboarding.reminders.denied",
  "onboarding.reminders.continue",
  "onboarding.reminders.skip",
  "profile.section.reminders",
  "profile.reminders.permission",
  "profile.reminders.granted",
  "profile.reminders.denied",
  "profile.reminders.default",
  "profile.reminders.unsupported",
  "profile.reminders.request",
  "profile.reminders.money",
  "profile.reminders.night",
  "profile.reminders.time",
  "profile.reminders.editMoneyTime",
  "profile.reminders.editNightTime",
  "reminders.daily",
  "reminders.weekly",
  "reminders.monthly",
  "reminders.eveningEmpty",
  "reminders.eveningSummary",
  "reminders.andMore",
  "reminders.dismiss",
  "reminders.titleMoney",
  "reminders.titleNight",
];

for (const key of requiredKeys) {
  assert.ok(en[key], `Missing en: ${key}`);
  assert.ok(fr[key], `Missing fr: ${key}`);
  assert.ok(ar[key], `Missing ar: ${key}`);
}

// ==========================================
// 2. Migration of old reminder boolean
// ==========================================
// Old backup with reminder: true -> money: true
const migrated1 = cleanProfile({ reminder: true });
assert.equal(migrated1.notifications.money, true);
assert.equal(migrated1.notifications.night, true);
assert.equal(migrated1.notifications.moneyTime, "12:00");
assert.equal(migrated1.notifications.nightTime, "21:30");

// Old backup with no reminder -> defaults
const migrated2 = cleanProfile({});
assert.equal(migrated2.notifications.money, true);
assert.equal(migrated2.notifications.night, true);

// Explicit notifications override
const explicit = cleanProfile({
  notifications: {
    money: false,
    night: true,
    moneyTime: "10:15",
    nightTime: "22:00",
  },
});
assert.equal(explicit.notifications.money, false);
assert.equal(explicit.notifications.moneyTime, "10:15");
assert.equal(explicit.notifications.nightTime, "22:00");

// ==========================================
// 3. Time comparison helper
// ==========================================
const d1 = new Date(2026, 10, 2, 11, 59); // 11:59
assert.equal(isTimeOnOrAfter(d1, "12:00"), false);
const d2 = new Date(2026, 10, 2, 12, 0); // 12:00
assert.equal(isTimeOnOrAfter(d2, "12:00"), true);
const d3 = new Date(2026, 10, 2, 12, 1); // 12:01
assert.equal(isTimeOnOrAfter(d3, "12:00"), true);

// ==========================================
// 4. moneyReminderDue tests
// ==========================================
// 4.1 Daily mode
const dailyDataNoTopup = {
  profile: {
    incomeMode: "daily",
    notifications: { money: true, moneyTime: "12:00", lastShown: { money: null } },
  },
  weeks: [],
};
// Before time -> false
assert.equal(moneyReminderDue(dailyDataNoTopup, new Date(2026, 10, 3, 11, 30)).due, false);
// After time -> true
const dailyCheck = moneyReminderDue(dailyDataNoTopup, new Date(2026, 10, 3, 13, 0));
assert.equal(dailyCheck.due, true);
assert.equal(dailyCheck.kind, "daily");

// Already added money today -> false
const dailyDataWithTopup = {
  profile: {
    incomeMode: "daily",
    notifications: { money: true, moneyTime: "12:00", lastShown: { money: null } },
  },
  weeks: [
    {
      id: "w1",
      startDate: "2026-11-02",
      topups: [{ id: "tp1", date: "2026-11-03", amount: 20, saved: 5 }],
    },
  ],
};
assert.equal(moneyReminderDue(dailyDataWithTopup, new Date(2026, 10, 3, 13, 0)).due, false);

// 4.2 Weekly mode
const weeklyDataNoWeek = {
  profile: {
    incomeMode: "weekly",
    notifications: { money: true, moneyTime: "12:00", lastShown: { money: null } },
  },
  weeks: [],
};
// Monday 2026-11-02 at 10:00 -> before moneyTime
assert.equal(moneyReminderDue(weeklyDataNoWeek, new Date(2026, 10, 2, 10, 0)).due, false);
// Monday 2026-11-02 at 14:00 -> due
const weeklyCheck = moneyReminderDue(weeklyDataNoWeek, new Date(2026, 10, 2, 14, 0));
assert.equal(weeklyCheck.due, true);
assert.equal(weeklyCheck.kind, "weekly");
// Tuesday 2026-11-03 without week -> due
assert.equal(moneyReminderDue(weeklyDataNoWeek, new Date(2026, 10, 3, 9, 0)).due, true);
// Week already exists -> false
const weeklyDataWithWeek = {
  ...weeklyDataNoWeek,
  weeks: [{ id: "w-current", startDate: "2026-11-02", received: 50, saved: 10 }],
};
assert.equal(moneyReminderDue(weeklyDataWithWeek, new Date(2026, 10, 2, 14, 0)).due, false);

// 4.3 Monthly mode
const monthlyDataNoPlan = {
  profile: {
    incomeMode: "monthly",
    notifications: { money: true, moneyTime: "12:00", lastShown: { money: null } },
  },
  months: [],
  weeks: [],
};
// 2026-11-01 at 08:30 -> before 09:00
assert.equal(moneyReminderDue(monthlyDataNoPlan, new Date(2026, 10, 1, 8, 30)).due, false);
// 2026-11-01 at 09:15 -> due
const monthlyCheck = moneyReminderDue(monthlyDataNoPlan, new Date(2026, 10, 1, 9, 15));
assert.equal(monthlyCheck.due, true);
assert.equal(monthlyCheck.kind, "monthly");
// Day 2 at 10:00 without plan -> due
assert.equal(moneyReminderDue(monthlyDataNoPlan, new Date(2026, 10, 2, 10, 0)).due, true);
// Plan exists -> false
const monthlyDataWithPlan = {
  ...monthlyDataNoPlan,
  months: [{ id: "m1", label: "2026-11", income: 200, weekIds: ["w1"] }],
};
assert.equal(moneyReminderDue(monthlyDataWithPlan, new Date(2026, 10, 2, 10, 0)).due, false);

// 4.4 Last shown today prevents re-showing
const alreadyShownData = {
  ...weeklyDataNoWeek,
  profile: {
    ...weeklyDataNoWeek.profile,
    notifications: { money: true, moneyTime: "12:00", lastShown: { money: "2026-11-02" } },
  },
};
assert.equal(moneyReminderDue(alreadyShownData, new Date(2026, 10, 2, 14, 0)).due, false);

// ==========================================
// 5. nightReminderDue & nightSummary
// ==========================================
const nightProfile = {
  notifications: { night: true, nightTime: "21:30", lastShown: { night: null } },
};
// Before 21:30 -> false
assert.equal(nightReminderDue(nightProfile, new Date(2026, 10, 2, 20, 0)), false);
// At or after 21:30 -> true
assert.equal(nightReminderDue(nightProfile, new Date(2026, 10, 2, 21, 35)), true);
// Night disabled -> false
assert.equal(nightReminderDue({ notifications: { night: false } }, new Date(2026, 10, 2, 22, 0)), false);
// Already shown today -> false
assert.equal(
  nightReminderDue(
    { notifications: { night: true, nightTime: "21:30", lastShown: { night: "2026-11-02" } } },
    new Date(2026, 10, 2, 22, 0)
  ),
  false
);

// 5.1 No expenses
const emptySummary = nightSummary({ weeks: [] }, new Date(2026, 10, 2));
assert.equal(emptySummary.count, 0);
assert.equal(emptySummary.total, 0);
setLanguage("en");
assert.equal(
  formatEveningMessage(emptySummary),
  "No expenses recorded today. Did you forget something?"
);

// 5.2 More than 3 expenses (e.g. 4 expenses)
const multiExpenseData = {
  weeks: [
    {
      id: "w-exp",
      startDate: "2026-11-02",
      expenses: [
        { name: "Food", amount: 6.5, category: "Food", date: "2026-11-02" },
        { name: "Coffee", amount: 2.5, category: "Coffee", date: "2026-11-02" },
        { name: "Water", amount: 1.0, category: "Water", date: "2026-11-02" },
        { name: "Snack", amount: 3.0, category: "Snacks", date: "2026-11-02" },
      ],
    },
  ],
};
const fourSummary = nightSummary(multiExpenseData, new Date(2026, 10, 2));
assert.equal(fourSummary.count, 4);
assert.equal(fourSummary.total, 13.0);
const eveningText = formatEveningMessage(fourSummary);
assert.equal(eveningText, "Today you spent 13.00 TND: Food, Coffee and 2 more.");

// 5.3 Only expenses whose date equals today are counted:
// An expense dated Monday does not appear in Wednesday's summary;
// An expense added today does;
// An undated old expense is ignored.
const testDatedData = {
  weeks: [
    {
      id: "w-dated-1",
      startDate: "2026-11-02",
      expenses: [
        { name: "Monday Lunch", amount: 10, category: "Food", date: "2026-11-02" },
        { name: "Wednesday Coffee", amount: 3, category: "Coffee", date: "2026-11-04" },
        { name: "Old Undated Expense", amount: 7, category: "Other" },
      ],
    },
  ],
};

// On Wednesday (2026-11-04): Monday expense and undated expense are NOT counted
const wednesdaySummary = nightSummary(testDatedData, new Date(2026, 10, 4));
assert.equal(wednesdaySummary.count, 1, "Only Wednesday expense should be counted");
assert.equal(wednesdaySummary.total, 3);
assert.equal(wednesdaySummary.items[0].label, "Wednesday Coffee");

// On Monday (2026-11-02): Wednesday expense and undated expense are NOT counted
const mondaySummary = nightSummary(testDatedData, new Date(2026, 10, 2));
assert.equal(mondaySummary.count, 1, "Only Monday expense should be counted");
assert.equal(mondaySummary.total, 10);
assert.equal(mondaySummary.items[0].label, "Monday Lunch");

// On Tuesday (2026-11-03): zero expenses (undated old expense is ignored)
const tuesdaySummary = nightSummary(testDatedData, new Date(2026, 10, 3));
assert.equal(tuesdaySummary.count, 0, "Undated old expense must be ignored");
assert.equal(tuesdaySummary.total, 0);

// 5.4 addExpense always stores date = toISO(new Date()) when no date given; editExpense keeps existing date
const baseData = {
  weeks: [
    {
      id: "w-exp-test",
      startDate: "2026-11-02",
      received: 50,
      saved: 10,
      expenses: [{ name: "Old", amount: 5, category: "Food" }],
    },
  ],
};

const addRes = addExpense(baseData, "w-exp-test", { name: "New Food", amount: 6, category: "Food" });
assert.ok(addRes.ok);
const addedExp = addRes.data.weeks[0].expenses.at(-1);
assert.equal(addedExp.date, toISO(new Date()));

const editRes = editExpense(addRes.data, "w-exp-test", 1, { name: "New Food Edited", amount: 7, category: "Food" });
assert.ok(editRes.ok);
assert.equal(editRes.data.weeks[0].expenses[1].name, "New Food Edited");
assert.equal(editRes.data.weeks[0].expenses[1].date, toISO(new Date()));

const editOldRes = editExpense(baseData, "w-exp-test", 0, { name: "Old Edited", amount: 6, category: "Food" });
assert.ok(editOldRes.ok);
assert.equal(editOldRes.data.weeks[0].expenses[0].name, "Old Edited");
assert.equal(editOldRes.data.weeks[0].expenses[0].date, undefined);

// ==========================================
// 6. Reminder messages check
// ==========================================
assert.equal(
  moneyReminderMessage("daily"),
  "Did you receive money today? Add it to keep your budget accurate."
);
assert.equal(moneyReminderMessage("weekly"), "New week! Add this week's money.");
assert.equal(
  moneyReminderMessage("monthly"),
  "New month! Add your income so we can plan your weeks."
);

// ==========================================
// 7. JSDOM & UI Integration Tests
// ==========================================
const KEY = "savings-budget-v1";
const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

async function bootApp({ profile = {}, weeks = [], notificationStub = undefined, serviceWorkerStub = undefined, visibilityState = "visible" } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(e));
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
            months: [],
            profile: {
              name: "Amine",
              language: "en",
              theme: "dark",
              incomeMode: "weekly",
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
      Object.defineProperty(window.document, "visibilityState", {
        value: visibilityState,
        configurable: true,
      });
      window.alert = () => {};
      window.scrollTo = () => {};

      if (notificationStub !== undefined) {
        window.Notification = notificationStub;
      }
      if (serviceWorkerStub !== undefined) {
        window.navigator.serviceWorker = serviceWorkerStub;
      }
    },
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  if (notificationStub !== undefined) {
    globalThis.Notification = notificationStub;
  } else {
    delete globalThis.Notification;
  }
  if (serviceWorkerStub !== undefined) {
    if (!globalThis.navigator) globalThis.navigator = {};
    globalThis.navigator.serviceWorker = serviceWorkerStub;
  }

  await import(new URL(`../js/app.js?reminders-test=${Date.now()}-${Math.random()}`, import.meta.url));
  await new Promise((resolve) => setTimeout(resolve, 1550));
  return {
    dom,
    document: dom.window.document,
    errors,
    data: () => JSON.parse(dom.window.localStorage.getItem(KEY)),
  };
}

// 7.1 Profile screen renders Reminders section with permission state and toggle controls
const profileApp = await bootApp({
  notificationStub: {
    permission: "default",
    requestPermission: async () => "granted",
  },
});
const pDoc = profileApp.document;
// Navigate to Profile
pDoc.querySelector('[data-page="profile"]').click();
assert.ok(pDoc.body.innerHTML.includes("Reminders"), "Reminders section missing in profile");
assert.ok(pDoc.body.innerHTML.includes("Browser notifications"), "Permission row missing");
assert.ok(pDoc.querySelector('[data-action="toggle-money-reminder"]'), "toggle-money-reminder button missing");
assert.ok(pDoc.querySelector('[data-action="toggle-night-reminder"]'), "toggle-night-reminder button missing");
assert.ok(pDoc.querySelector('[data-action="edit-money-time"]'), "edit-money-time button missing");
assert.ok(pDoc.querySelector('[data-action="edit-night-time"]'), "edit-night-time button missing");

// Click request permission button
const reqBtn = pDoc.querySelector('[data-action="request-notification-permission"]');
assert.ok(reqBtn, "request permission button missing when default");
reqBtn.click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(profileApp.data().profile.notifications.money, true);

// 7.2 Onboarding Step "Stay on track" (reminders step)
const onboardingApp = await bootApp({
  profile: { onboarded: false },
  notificationStub: {
    permission: "default",
    requestPermission: async () => "granted",
  },
});
const oDoc = onboardingApp.document;
// Start onboarding
oDoc.querySelector('[data-action="onboard-start"]')?.click();
oDoc.querySelector('[data-action="onboard-next"]')?.click();
oDoc.querySelector('[data-action="onboard-next"]')?.click();
oDoc.querySelector('[data-action="onboard-next"]')?.click();
oDoc.querySelector('[data-action="onboard-next"]')?.click();
oDoc.querySelector('[data-action="onboard-save-name"]')?.click();
// On income screen, click continue
oDoc.querySelector('[data-action="onboard-finish-income"]')?.click();

// Should now be on the reminders screen
assert.ok(oDoc.body.innerHTML.includes("Stay on track"), "Reminders step title not found in onboarding");
const enableBtn = oDoc.querySelector('[data-action="onboard-enable-reminders"]');
assert.ok(enableBtn, "Turn on reminders button not found");
enableBtn.click();
await new Promise((resolve) => setTimeout(resolve, 50));

// Should finish onboarding and have notifications enabled
const finalized = onboardingApp.data();
assert.equal(finalized.profile.onboarded, true);
assert.equal(finalized.profile.notifications.money, true);
assert.equal(finalized.profile.notifications.night, true);

// 7.3 Foreground check: document.visibilityState === "visible" shows Home card but does NOT call showNotification
const fgNotificationCalls = [];
const fgSwStub = {
  ready: Promise.resolve({
    showNotification: async (title, opts) => {
      fgNotificationCalls.push({ title, opts });
    },
  }),
  getRegistration: async () => ({
    showNotification: async (title, opts) => {
      fgNotificationCalls.push({ title, opts });
    },
  }),
};

const fgApp = await bootApp({
  visibilityState: "visible",
  profile: {
    notifications: { money: true, moneyTime: "00:00", lastShown: { money: null } },
  },
  weeks: [],
  notificationStub: { permission: "granted" },
  serviceWorkerStub: fgSwStub,
});
assert.ok(fgApp.document.querySelector(".reminder-card"), "Home banner card should be visible in foreground");
assert.equal(fgNotificationCalls.length, 0, "showNotification should NOT be called when visible in foreground");

// 7.4 Background check: document.visibilityState === "hidden" DOES call showNotification
const bgNotificationCalls = [];
const bgSwStub = {
  ready: Promise.resolve({
    showNotification: async (title, opts) => {
      bgNotificationCalls.push({ title, opts });
    },
  }),
  getRegistration: async () => ({
    showNotification: async (title, opts) => {
      bgNotificationCalls.push({ title, opts });
    },
  }),
};

const bgApp = await bootApp({
  visibilityState: "hidden",
  profile: {
    notifications: { money: true, moneyTime: "00:00", lastShown: { money: null } },
  },
  weeks: [],
  notificationStub: { permission: "granted" },
  serviceWorkerStub: bgSwStub,
});
assert.ok(bgApp.document.querySelector(".reminder-card"), "Home banner card should exist in background");
assert.equal(bgNotificationCalls.length, 1, "showNotification SHOULD be called when hidden in background");
assert.equal(bgNotificationCalls[0].title, "Masrofi Reminder");
assert.equal(bgNotificationCalls[0].opts.body, "New week! Add this week's money.");

console.log("All reminder pure logic, migration, and screen tests passed!");

