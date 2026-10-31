import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";

const KEY = "savings-budget-v1";
async function boot(profile, weeks = [], months = []) {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const consoleErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => consoleErrors.push(error));
  virtualConsole.on("error", (...args) => consoleErrors.push(args));
  const dom = new JSDOM(html, {
    url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only", virtualConsole,
    beforeParse(window) {
      const store = new Map([[KEY, JSON.stringify({ goal: 700, weeks, months, profile: { name: "", language: "en", theme: "dark", incomeMode: "monthly", onboarded: true, ...profile } })]]);
      Object.defineProperty(window, "localStorage", { value: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: (key) => store.delete(key) }, configurable: true });
      window.alert = () => { throw new Error("alert must not be used"); };
      window.scrollTo = () => {};
    },
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  await import(new URL(`../js/app.js?months-screen=${Date.now()}-${Math.random()}`, import.meta.url));
  await new Promise((resolve) => setTimeout(resolve, 1550));
  return { dom, document: dom.window.document, consoleErrors, data: () => JSON.parse(dom.window.localStorage.getItem(KEY)) };
}

const app = await boot({});
const doc = app.document;
assert.equal(doc.documentElement.dir, "ltr");
assert.match(doc.querySelector("#view").textContent, /No month yet/);
doc.querySelector('[data-action="add-month"]').click();
const monthInput = doc.querySelector('input[name="month"]');
const incomeInput = doc.querySelector('input[name="income"]');
const savingInput = doc.querySelector('input[name="saveTotal"]');
monthInput.value = "2026-10";
incomeInput.value = "20";
savingInput.value = "40";
doc.querySelector(".form").dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
assert.ok(doc.querySelector(".add-month-preview-card"), "form previews the monthly split");
assert.match(doc.querySelector(".add-month-preview-card").textContent, /4 weeks/);
doc.querySelector(".form").dispatchEvent(new doc.defaultView.Event("submit", { bubbles: true, cancelable: true }));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.match(doc.querySelector(".form-error").textContent, /low/i);
assert.equal(app.data().weeks.length, 0, "invalid plan does not create weeks");

incomeInput.value = "160";
savingInput.value = "40";
doc.querySelector(".form").dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
assert.match(doc.querySelector(".add-month-preview-card").textContent, /4 weeks[\s\S]*30\.00 TND to spend[\s\S]*10\.00 TND to save/);
assert.match(doc.querySelector(".add-month-preview-card").textContent, /Total saved this month: 40\.00 TND/);
doc.querySelector(".form").dispatchEvent(new doc.defaultView.Event("submit", { bubbles: true, cancelable: true }));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(doc.querySelector(".modal-backdrop"), null);
assert.equal(doc.querySelectorAll(".month-week-row").length, 4);
assert.equal(doc.querySelector(".month-plan-total").textContent, "160.00 TND");
assert.match(doc.querySelector(".month-plan-status").textContent, /planned/i);
assert.deepEqual(app.data().weeks.map((week) => week.received), [40, 40, 40, 40]);
assert.equal(app.data().months[0].weekIds.length, 4);

doc.querySelector(".month-week-row").click();
for (let step = 0; step < 5; step += 1) doc.querySelector('[data-action="step-month-value"][data-field="spend"][data-direction="1"]').click();
assert.match(doc.querySelector(".month-edit-check").textContent, /Over by 5.00 TND/i);
assert.equal(doc.querySelector('[data-action="save-month-edit"]').disabled, true);
assert.equal(app.data().weeks[0].received, 40, "preview does not mutate stored weeks");
for (let step = 0; step < 5; step += 1) doc.querySelector('[data-action="step-month-value"][data-field="spend"][data-direction="-1"]').click();
assert.equal(doc.querySelector('[data-action="save-month-edit"]').disabled, false);
doc.querySelector('[data-action="save-month-edit"]').click();
assert.equal(app.data().weeks[0].received, 40);
assert.equal(doc.querySelector(".month-edit-sheet"), null);

doc.querySelector('[data-action="close-month-plan"]').click();
assert.ok(doc.querySelector(".home-month-budget"), "Home shows this month's budget card");
assert.match(doc.querySelector(".home-month-budget").textContent, /Received[\s\S]*160\.00 TND/);
doc.querySelector('[data-page="history"]').click();
assert.equal(doc.querySelectorAll(".history-month-chip").length, 4, "History identifies each planned month week");
doc.querySelector('[data-week="' + app.data().months[0].weekIds[0] + '"] [data-action="edit-week"]').click();
doc.querySelector('input[name="received"]').value = "41";
doc.querySelector(".form").dispatchEvent(new doc.defaultView.Event("submit", { bubbles: true, cancelable: true }));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.match(doc.querySelector(".form-error").textContent, /Over by 1\.00 TND/);
assert.equal(app.data().weeks[0].received, 40, "History edit does not commit a broken month plan");
doc.querySelector("[data-cancel]").click();
doc.querySelector('[data-page="dashboard"]').click();
doc.querySelector(".home-month-budget").click();
doc.querySelector('[data-action="delete-month"]').click();
assert.ok(doc.querySelector("[data-ok]"), "deleting a plan asks for confirmation");
doc.querySelector("[data-ok]").click();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(app.data().months.length, 0);
assert.equal(app.data().weeks.length, 0);
assert.match(doc.querySelector("#view").textContent, /No month yet/);

const french = await boot(
  { language: "fr" },
  [
    { id: "fr-week-1", startDate: "2026-10-05", received: 40, saved: 10, expenses: [] },
    { id: "fr-week-2", startDate: "2026-10-12", received: 40, saved: 10, expenses: [] },
    { id: "fr-week-3", startDate: "2026-10-19", received: 40, saved: 10, expenses: [] },
    { id: "fr-week-4", startDate: "2026-10-26", received: 40, saved: 10, expenses: [] },
  ],
  [{ id: "fr-month", label: "2026-10", income: 160, weekIds: ["fr-week-1", "fr-week-2", "fr-week-3", "fr-week-4"] }],
);
assert.match(french.document.querySelector(".home-subtitle").textContent, /Semaine \d sur 4/);
french.document.querySelector('[data-action="add-month"]').click();
assert.equal(french.document.querySelector(".modal h3").textContent, "Ajouter un mois");
assert.equal(french.document.querySelector('label[for="field-month"]').textContent, "Mois");
french.document.querySelector("[data-cancel]").click();

const collision = await boot({}, [{ id: "existing", startDate: "2026-10-05", received: 40, saved: 10, expenses: [] }]);
collision.document.querySelector('[data-action="add-month"]').click();
collision.document.querySelector('input[name="month"]').value = "2026-10";
collision.document.querySelector('input[name="income"]').value = "160";
collision.document.querySelector('input[name="saveTotal"]').value = "40";
collision.document.querySelector(".form").dispatchEvent(new collision.document.defaultView.Event("submit", { bubbles: true, cancelable: true }));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.match(collision.document.querySelector(".form-error").textContent, /already exists/i);
assert.equal(collision.data().weeks.length, 1, "colliding month does not create duplicate weeks");

const arabic = await boot({ language: "ar" }, [{ id: "ar-week", startDate: "2026-10-05", received: 40, saved: 10, expenses: [] }], [{ id: "ar-month", label: "2026-10", income: 160, weekIds: ["ar-week"] }]);
assert.equal(arabic.document.documentElement.dir, "rtl");
assert.match(arabic.document.querySelector(".home-month-budget").textContent, /160\.00 TND/);
assert.doesNotMatch(arabic.document.querySelector(".home-month-budget").textContent, /[٠-٩]/);
arabic.document.querySelector('[data-action="add-month"]').click();
assert.equal(arabic.document.querySelector(".modal h3").textContent, "إضافة شهر");
arabic.document.querySelector("[data-cancel]").click();
for (const instance of [app, french, collision, arabic]) assert.deepEqual(instance.consoleErrors, [], "no JSDOM console errors");
console.log("PASS monthly screen interaction tests");
