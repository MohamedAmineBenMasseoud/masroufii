import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import { cleanProfile, createEmpty, normalize, parseBackup } from "../js/store.js";
import { renderProfile } from "../js/views/profile.js";
import { setLanguage, t } from "../js/i18n.js";
import en from "../js/lang/en.js";
import fr from "../js/lang/fr.js";
import ar from "../js/lang/ar.js";

const KEY = "savings-budget-v1";
const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

// --- 1. Pure logic & store defaults ---
const defaultProfile = cleanProfile({});
assert.equal(defaultProfile.weeklySaving, 10, "default weeklySaving is 10");
assert.equal(defaultProfile.reminder, false, "default reminder is false");
assert.equal(defaultProfile.dailyAmount, 0, "default dailyAmount is 0");
assert.equal(defaultProfile.dailySaving, 0, "default dailySaving is 0");

const customDailyProfile = cleanProfile({ dailyAmount: 30, dailySaving: 5, name: "Amine", incomeMode: "daily" });
assert.equal(customDailyProfile.dailyAmount, 30);
assert.equal(customDailyProfile.dailySaving, 5);
assert.equal(customDailyProfile.incomeMode, "daily");

assert.equal(cleanProfile({ dailyAmount: -5, dailySaving: -2 }).dailyAmount, 0);
assert.equal(cleanProfile({ dailyAmount: -5, dailySaving: -2 }).dailySaving, 0);

const customProfile = cleanProfile({ weeklySaving: 25, reminder: true, name: "Amine", incomeMode: "monthly" });
assert.equal(customProfile.weeklySaving, 25);
assert.equal(customProfile.reminder, true);
assert.equal(customProfile.name, "Amine");
assert.equal(customProfile.incomeMode, "monthly");

const invalidProfile = cleanProfile({ weeklySaving: -5, reminder: "not-bool" });
assert.equal(invalidProfile.weeklySaving, 10, "negative weeklySaving falls back to default");
assert.equal(invalidProfile.reminder, false, "non-boolean reminder falls back to false");

assert.equal(cleanProfile(null).weeklySaving, 10);
assert.equal(cleanProfile(null).reminder, false);

// --- 2. Old backups backward compatibility ---
const oldBackup = JSON.stringify({
  goal: 500,
  weeks: [
    { id: "old-1", startDate: "2026-10-05", received: 50, saved: 10, expenses: [] },
  ],
});
const parsed = parseBackup(oldBackup);
assert.equal(parsed.goal, 500);
assert.equal(parsed.profile.weeklySaving, 10, "old backup gets safe weeklySaving default");
assert.equal(parsed.profile.reminder, false, "old backup gets safe reminder default");

// --- 3. Translation symmetry ---
assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort(), "en and fr have identical keys");
assert.deepEqual(Object.keys(en).sort(), Object.keys(ar).sort(), "en and ar have identical keys");

const requiredProfileKeys = [
  "profile.title",
  "profile.defaultName",
  "profile.edit",
  "profile.weeklyMode",
  "profile.monthlyMode",
  "profile.section.money",
  "profile.incomeType",
  "profile.weekly",
  "profile.monthly",
  "profile.weeklySaving",
  "profile.savingsGoal",
  "profile.section.preferences",
  "profile.theme",
  "profile.language",
  "profile.currency",
  "profile.weeklyReminder",
  "profile.section.data",
  "profile.backupReset",
  "profile.backupResetTitle",
  "profile.exportBudget",
  "profile.importBudget",
  "profile.resetAllData",
  "profile.editNameTitle",
  "profile.nameField",
  "profile.editIncomeType",
  "profile.editWeeklySaving",
  "profile.weeklySavingLabel",
  "profile.errorWeeklySaving",
  "profile.editTheme",
  "profile.editLanguage",
  "profile.currencyInfo",
  "theme.dark",
  "theme.light",
  "theme.rose",
  "theme.forest",
  "theme.ocean",
  "profile.dailyMode",
  "profile.daily",
  "profile.dailyAmount",
  "profile.dailySaving",
  "profile.editDailyAmount",
  "profile.dailyAmountLabel",
  "profile.errorDailyAmount",
  "profile.editDailySaving",
  "profile.dailySavingLabel",
  "profile.errorDailySaving",
  "onboarding.income.daily.title",
  "onboarding.income.daily.text",
  "onboarding.income.daily",
];

for (const key of requiredProfileKeys) {
  assert.ok(en[key], `en missing key: ${key}`);
  assert.ok(fr[key], `fr missing key: ${key}`);
  assert.ok(ar[key], `ar missing key: ${key}`);
}

// --- 4. Profile view HTML building ---
setLanguage("en");
const viewHtml = renderProfile({ name: "Amine", incomeMode: "monthly", weeklySaving: 10, reminder: false }, 700);
assert.match(viewHtml, /profile-screen/, "renders profile screen container");
assert.match(viewHtml, /Amine/, "renders user name");
assert.match(viewHtml, /Monthly income mode/, "renders monthly income mode subtitle");
assert.match(viewHtml, />A</, "renders capital initial in avatar");
assert.match(viewHtml, /10\.00 TND/, "renders weekly saving");
assert.match(viewHtml, /700 TND/, "renders savings goal");
assert.match(viewHtml, /role="switch"/, "renders reminder switch");
assert.match(viewHtml, /aria-checked="false"/, "switch starts false when reminder is false");

const dailyViewHtml = renderProfile({ name: "Amine", incomeMode: "daily", dailyAmount: 20, dailySaving: 5 }, 700);
assert.match(dailyViewHtml, /Daily income mode/, "renders daily income mode subtitle");
assert.match(dailyViewHtml, /profile-edit-daily-amount/, "renders daily amount edit row");
assert.match(dailyViewHtml, /20\.00 TND/, "renders daily amount");
assert.match(dailyViewHtml, /profile-edit-daily-saving/, "renders daily saving edit row");
assert.match(dailyViewHtml, /5\.00 TND/, "renders daily saving");
assert.doesNotMatch(dailyViewHtml, /profile-edit-weekly-saving/, "does not render weekly saving row in daily mode");

console.log("PASS profile pure logic and translation tests");

// --- 5. Screen interaction tests with JSDOM ---
async function bootApp({ profile = {}, weeks = [], months = [], goal = 700 } = {}) {
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
      const store = new Map([[KEY, JSON.stringify({
        goal,
        weeks,
        months,
        profile: {
          name: "Amine",
          language: "en",
          theme: "dark",
          incomeMode: "monthly",
          onboarded: true,
          weeklySaving: 10,
          reminder: false,
          ...profile,
        },
      })]]);

      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: (k) => store.get(k) ?? null,
          setItem: (k, v) => store.set(k, String(v)),
          removeItem: (k) => store.delete(k),
          clear: () => store.clear(),
        },
        configurable: true,
      });

      window.alert = () => { throw new Error("alert must not be used"); };
      window.scrollTo = () => { };
    },
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;

  await import(new URL(`../js/app.js?profile-test=${Date.now()}-${Math.random()}`, import.meta.url));
  await new Promise((r) => setTimeout(r, 1550));

  return {
    dom,
    document: dom.window.document,
    errors,
    data: () => JSON.parse(dom.window.localStorage.getItem(KEY)),
  };
}

const app = await bootApp();
const doc = app.document;

// 1. Navigate to Profile page
const profileTab = doc.querySelector('.tab[data-page="profile"]');
assert.ok(profileTab, "Profile tab button exists in tabbar");
profileTab.click();

assert.ok(doc.querySelector(".profile-screen"), "Profile screen rendered on tab click");
assert.equal(doc.querySelector(".profile-title").textContent.trim(), "Profile");
assert.equal(doc.querySelector(".profile-name").textContent.trim(), "Amine");
assert.equal(doc.querySelector(".profile-avatar").textContent.trim(), "A");
assert.equal(doc.querySelector(".profile-subtitle").textContent.trim(), "Monthly income mode");

// 2. Edit Name
const editNameBtn = doc.querySelector('[data-action="profile-edit-name"]');
assert.ok(editNameBtn, "Edit name button exists");
editNameBtn.click();

const modalBackdrop = doc.querySelector(".modal-backdrop.open");
assert.ok(modalBackdrop, "Modal opened for edit name");
const nameInput = modalBackdrop.querySelector('input[name="name"]');
assert.ok(nameInput, "Name input field exists in modal");
assert.equal(nameInput.value, "Amine");
nameInput.value = "Sami";
modalBackdrop.querySelector('button[type="submit"]').click();

assert.equal(doc.querySelector(".profile-name").textContent.trim(), "Sami", "Profile name updated in DOM");
assert.equal(doc.querySelector(".profile-avatar").textContent.trim(), "S", "Avatar updated with new initial");
assert.equal(app.data().profile.name, "Sami", "Name saved to localStorage");

// 3. Toggle Reminder
const reminderSwitch = doc.querySelector('[data-action="toggle-money-reminder"]');
assert.ok(reminderSwitch, "Reminder switch exists");
assert.equal(reminderSwitch.getAttribute("aria-checked"), "false");
reminderSwitch.click();

assert.equal(doc.querySelector('[data-action="toggle-money-reminder"]').getAttribute("aria-checked"), "true", "Reminder switch toggled to true");
assert.equal(app.data().profile.reminder, true, "profile.reminder saved as true in localStorage");

// 4. Edit Weekly Saving
const editSavingBtn = doc.querySelector('[data-action="profile-edit-weekly-saving"]');
assert.ok(editSavingBtn, "Weekly saving button exists");
editSavingBtn.click();

const savingModal = doc.querySelector(".modal-backdrop.open");
assert.ok(savingModal, "Modal opened for weekly saving");
const savingInput = savingModal.querySelector('input[name="weeklySaving"]');
assert.ok(savingInput, "Weekly saving input field exists");
savingInput.value = "25";
savingModal.querySelector('button[type="submit"]').click();

assert.equal(app.data().profile.weeklySaving, 25, "weeklySaving saved as 25 in localStorage");
assert.match(doc.querySelector('[data-action="profile-edit-weekly-saving"]').textContent, /25\.00 TND/, "DOM updated with 25.00 TND");

// 5. Edit Income Type
const editIncomeBtn = doc.querySelector('[data-action="profile-edit-income-type"]');
assert.ok(editIncomeBtn, "Income type button exists");
editIncomeBtn.click();

const incomeModal = doc.querySelector(".modal-backdrop.open");
assert.ok(incomeModal, "Modal opened for income type");
const incomeSelect = incomeModal.querySelector('select[name="incomeMode"]');
assert.ok(incomeSelect, "Income mode select dropdown exists");
incomeSelect.value = "weekly";
incomeModal.querySelector('button[type="submit"]').click();

assert.equal(app.data().profile.incomeMode, "weekly", "incomeMode saved as weekly in localStorage");
assert.equal(doc.querySelector(".profile-subtitle").textContent.trim(), "Weekly income mode", "Subtitle updated to weekly");

// 6. Backup & Reset popup
const backupBtn = doc.querySelector('[data-action="profile-backup-reset"]');
assert.ok(backupBtn, "Backup & reset button exists");
backupBtn.click();

const backupModal = doc.querySelector(".modal-backdrop.open");
assert.ok(backupModal, "Modal opened for Backup & reset");
assert.ok(backupModal.querySelector('[data-action="export"]'), "Export button exists in modal");
assert.ok(backupModal.querySelector('[data-action="import"]'), "Import button exists in modal");
assert.ok(backupModal.querySelector('[data-action="reset"]'), "Reset button exists in modal");
backupModal.querySelector("[data-cancel]").click();
assert.equal(doc.querySelector(".modal-backdrop"), null, "Modal closed on cancel");

// 7. Edit Theme (e.g. switch to forest)
const editThemeBtn = doc.querySelector('[data-action="profile-edit-theme"]');
assert.ok(editThemeBtn, "Edit theme button exists");
editThemeBtn.click();

const themeModal = doc.querySelector(".modal-backdrop.open");
assert.ok(themeModal, "Modal opened for theme");
const themeSelect = themeModal.querySelector('select[name="theme"]');
assert.ok(themeSelect, "Theme select dropdown exists");
const options = [...themeSelect.options].map((o) => o.value);
assert.deepEqual(options, ["dark", "light", "rose", "forest", "ocean"], "Includes forest and all 5 themes");
themeSelect.value = "forest";
themeModal.querySelector('button[type="submit"]').click();

assert.equal(app.data().profile.theme, "forest", "Theme saved as forest in localStorage");
assert.equal(doc.documentElement.dataset.theme, "forest", "html dataset theme set to forest");

// 8. Edit Income Type to Daily and edit daily amount & daily saving
const editIncomeToDailyBtn = doc.querySelector('[data-action="profile-edit-income-type"]');
editIncomeToDailyBtn.click();
const dailyIncomeModal = doc.querySelector(".modal-backdrop.open");
assert.ok(dailyIncomeModal, "Modal opened for income type");
const dailyIncomeSelect = dailyIncomeModal.querySelector('select[name="incomeMode"]');
const incomeOptions = [...dailyIncomeSelect.options].map((o) => o.value);
assert.deepEqual(incomeOptions, ["weekly", "monthly", "daily"], "Includes daily in income options");
dailyIncomeSelect.value = "daily";
dailyIncomeModal.querySelector('button[type="submit"]').click();

assert.equal(app.data().profile.incomeMode, "daily", "incomeMode saved as daily in localStorage");
assert.equal(doc.querySelector(".profile-subtitle").textContent.trim(), "Daily income mode", "Subtitle updated to daily");
assert.match(doc.querySelector('[data-action="profile-edit-income-type"]').textContent, /Daily income mode/, "Income-type row shows Daily income mode");

// Edit Daily Amount
const editDailyAmountBtn = doc.querySelector('[data-action="profile-edit-daily-amount"]');
assert.ok(editDailyAmountBtn, "Daily amount button exists in daily mode");
editDailyAmountBtn.click();

const dailyAmountModal = doc.querySelector(".modal-backdrop.open");
assert.ok(dailyAmountModal, "Modal opened for daily amount");
const dailyAmountInput = dailyAmountModal.querySelector('input[name="dailyAmount"]');
assert.ok(dailyAmountInput, "Daily amount input field exists");
dailyAmountInput.value = "30";
dailyAmountModal.querySelector('button[type="submit"]').click();

assert.equal(app.data().profile.dailyAmount, 30, "dailyAmount saved as 30 in localStorage");
assert.match(doc.querySelector('[data-action="profile-edit-daily-amount"]').textContent, /30\.00 TND/, "DOM updated with 30.00 TND");

// Edit Daily Saving
const editDailySavingBtn = doc.querySelector('[data-action="profile-edit-daily-saving"]');
assert.ok(editDailySavingBtn, "Daily saving button exists in daily mode");
editDailySavingBtn.click();

const dailySavingModal = doc.querySelector(".modal-backdrop.open");
assert.ok(dailySavingModal, "Modal opened for daily saving");
const dailySavingInput = dailySavingModal.querySelector('input[name="dailySaving"]');
assert.ok(dailySavingInput, "Daily saving input field exists");
dailySavingInput.value = "8";
dailySavingModal.querySelector('button[type="submit"]').click();

assert.equal(app.data().profile.dailySaving, 8, "dailySaving saved as 8 in localStorage");
assert.match(doc.querySelector('[data-action="profile-edit-daily-saving"]').textContent, /8\.00 TND/, "DOM updated with 8.00 TND");

console.log("PASS profile screen interaction tests");

