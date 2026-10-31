import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import { toISO } from "../js/utils.js";

const KEY = "savings-budget-v1";
const css = await fs.readFile(new URL("../css/style.css", import.meta.url), "utf8");
const screenRule = css.match(/\.add-expense-screen\s*\{([^}]*)\}/)?.[1] || "";
const slideRule = css.match(/\.add-expense-slide-track\s*\{([^}]*)\}/)?.[1] || "";
const labelRule = css.match(/\.add-expense-slide-label\s*\{([^}]*)\}/)?.[1] || "";
assert.match(screenRule, /padding-block-end:\s*calc\(env\(safe-area-inset-bottom\)\s*\+\s*24px\)/);
assert.match(slideRule, /inset-block-start:\s*calc\(env\(safe-area-inset-top\)\s*\+\s*8px\s*\+\s*40px\s*\+\s*16px\)/);
assert.match(slideRule, /inset-block-end:\s*calc\(env\(safe-area-inset-bottom\)\s*\+\s*24px\)/);
assert.doesNotMatch(slideRule, /(?:^|;)\s*(?:height|max-height)\s*:/);
assert.match(labelRule, /rotate\(180deg\)/);
function pointer(target, type, clientY, pointerId = 7) {
  const event = new target.ownerDocument.defaultView.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, { clientY: { value: clientY }, pointerId: { value: pointerId } });
  target.dispatchEvent(event);
}
async function boot(weeks, language = "en") {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const consoleErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => consoleErrors.push(error));
  virtualConsole.on("error", (...args) => consoleErrors.push(args));
  const dom = new JSDOM(html, {
    url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only",
    virtualConsole,
    beforeParse(window) {
      const store = new Map([[KEY, JSON.stringify({ goal: 700, weeks, profile: { name: "", language, theme: "dark", incomeMode: "weekly", onboarded: true } })]]);
      Object.defineProperty(window, "localStorage", { value: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: (key) => store.delete(key) }, configurable: true });
      window.alert = () => { throw new Error("alert must not be used"); };
      window.scrollTo = () => {};
    },
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  const appUrl = new URL(`../js/app.js?screen=${Date.now()}-${Math.random()}`, import.meta.url);
  await import(appUrl.href);
  await new Promise((resolve) => setTimeout(resolve, 1550));
  return { dom, document: dom.window.document, consoleErrors, data: () => JSON.parse(dom.window.localStorage.getItem(KEY)) };
}

const weeks = [
  { id: "prior", startDate: "2026-09-21", received: 16.5, saved: 10, expenses: [] },
  { id: "latest", startDate: "2026-09-28", received: 40, saved: 10, expenses: [{ name: "Lunch", amount: 12, category: "Food" }] },
];
const app = await boot(weeks);
const doc = app.document;
doc.querySelector('[data-action="add-expense"]').click();
assert.ok(doc.querySelector(".add-expense-screen"), "Home plus opens the add screen");
assert.equal(doc.querySelector(".add-expense-left").textContent, "Left this week: 24.50 TND");
assert.equal(doc.querySelector('[data-category="Food"]').getAttribute("aria-checked"), "true");
assert.equal(doc.querySelectorAll('.add-expense-category[role="radio"]').length, 6);
assert.equal(doc.querySelectorAll(".add-expense-key").length, 12);
assert.equal(doc.querySelector(".tabbar").hidden, false);
assert.equal(doc.querySelector(".tabbar").getClientRects().length, 0, "tab bar is hidden while the screen is open");
assert.equal(doc.body.classList.contains("expense-open"), true);
assert.equal(doc.querySelector(".add-expense-screen").dataset.week, "latest");
doc.querySelector('[data-action="expense-key"][data-key="5"]').click();
doc.querySelector('[data-action="expense-confirm"]').click();
assert.deepEqual(app.data().weeks[1].expenses.at(-1), { name: "Food", amount: 5, category: "Food", date: toISO(new Date()) });
assert.equal(doc.querySelector(".home-amount span").textContent, "19.50");
assert.ok(!doc.querySelector(".add-expense-screen"));
assert.equal(doc.body.classList.contains("expense-open"), false);

doc.querySelector('[data-page="history"]').click();
doc.querySelector('[data-week="latest"] [data-action="add-expense"]').click();
assert.equal(doc.querySelector(".add-expense-screen") !== null, true, "History card opens add screen");
doc.querySelector('[data-action="expense-key"][data-key="3"]').click();
doc.querySelector('[data-action="expense-key"][data-key="0"]').click();
assert.ok(doc.querySelector(".add-expense-amount").classList.contains("danger"));
assert.ok(doc.querySelector(".add-expense-left").classList.contains("danger"));
doc.querySelector('[data-action="expense-confirm"]').click();
assert.match(doc.querySelector('[role="alert"]').textContent, /higher than the money/);
assert.equal(app.data().weeks[1].expenses.length, 2);
doc.querySelector('[data-action="expense-back"]').click();

doc.querySelector('[data-page="dashboard"]').click();
doc.querySelector('[data-action="add-expense"]').click();
doc.querySelector('[data-action="expense-key"][data-key="0"]').click();
doc.querySelector('[data-action="expense-confirm"]').click();
assert.match(doc.querySelector('[role="alert"]').textContent, /more than 0/);
doc.dispatchEvent(new doc.defaultView.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
assert.equal(app.data().weeks[1].expenses.length, 2);

doc.querySelector('[data-action="add-expense"]').click();
doc.querySelector('[data-action="expense-confirm"]').click();
assert.match(doc.querySelector('[role="alert"]').textContent, /more than 0/);
doc.querySelector('[data-action="expense-back"]').click();
assert.equal(app.data().weeks[1].expenses.length, 2, "empty amount is refused without saving");

doc.querySelector('[data-action="add-expense"]').click();
doc.querySelector('[data-action="expense-category"][data-category="Water"]').click();
doc.querySelector('[data-action="expense-key"][data-key="1"]').click();
doc.querySelector('[data-action="expense-confirm"]').click();
assert.deepEqual(app.data().weeks[1].expenses.at(-1), { name: "Water", amount: 1, category: "Water", date: toISO(new Date()) });

doc.querySelector('[data-action="add-expense"]').click();
doc.querySelector('[data-action="expense-key"][data-key="2"]').click();
let handle = doc.querySelector('[data-action="expense-confirm"]');
let track = doc.querySelector(".add-expense-slide-track");
Object.defineProperty(track, "clientHeight", { value: 300, configurable: true });
Object.defineProperty(handle, "clientHeight", { value: 48, configurable: true });
pointer(handle, "pointerdown", 300);
pointer(handle, "pointermove", 300 - 0.9 * (300 - 48 - 8));
pointer(handle, "pointerup", 300 - 0.9 * (300 - 48 - 8));
assert.equal(app.data().weeks[1].expenses.at(-1).amount, 2, "90% drag confirms the expense");
const afterLongDrag = app.data().weeks[1].expenses.length;
doc.dispatchEvent(new doc.defaultView.Event("pointerup"));
assert.equal(app.data().weeks[1].expenses.length, afterLongDrag, "releasing twice adds only one expense");

doc.querySelector('[data-action="add-expense"]').click();
doc.querySelector('[data-action="expense-key"][data-key="1"]').click();
handle = doc.querySelector('[data-action="expense-confirm"]');
track = doc.querySelector(".add-expense-slide-track");
Object.defineProperty(track, "clientHeight", { value: 300, configurable: true });
Object.defineProperty(handle, "clientHeight", { value: 48, configurable: true });
const beforeShortDrag = app.data().weeks[1].expenses.length;
pointer(handle, "pointerdown", 300, 8);
pointer(handle, "pointermove", 300 - 0.8 * (300 - 48 - 8), 8);
pointer(handle, "pointerup", 300 - 0.8 * (300 - 48 - 8), 8);
assert.equal(app.data().weeks[1].expenses.length, beforeShortDrag, "80% drag does not confirm");
assert.equal(handle.style.transform, "translateY(0)", "short drag returns the handle");
pointer(handle, "pointerdown", 300, 9);
pointer(handle, "pointermove", 320, 9);
assert.equal(handle.style.transform, "translateY(0px)", "dragging down does not move the handle");
pointer(handle, "pointercancel", 320, 9);
assert.equal(handle.style.transform, "translateY(0)", "pointer cancel returns the handle");
handle.dispatchEvent(new doc.defaultView.MouseEvent("click", { bubbles: true, detail: 1 }));
assert.equal(app.data().weeks[1].expenses.length, beforeShortDrag, "tap does not confirm");
handle.focus();
handle.dispatchEvent(new doc.defaultView.KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
assert.equal(app.data().weeks[1].expenses.at(-1).amount, 1, "keyboard confirmation still works");

doc.querySelector('[data-action="add-expense"]').click();
const countBeforeBack = app.data().weeks[1].expenses.length;
doc.dispatchEvent(new doc.defaultView.KeyboardEvent("keydown", { key: "8", bubbles: true }));
assert.equal(doc.querySelector(".add-expense-amount").textContent, "8", "physical keyboard enters digits");
doc.querySelector('[data-action="expense-back"]').click();
assert.equal(app.data().weeks[1].expenses.length, countBeforeBack, "back closes without saving");

doc.querySelector('[data-page="history"]').click();
doc.querySelector('[data-week="prior"] [data-action="add-expense"]').click();
assert.equal(doc.querySelector(".add-expense-screen").dataset.week, "prior", "History opens the selected week's expense screen");
assert.match(doc.querySelector(".add-expense-left").textContent, /6\.50 TND/);
doc.querySelector('[data-action="expense-back"]').click();

doc.querySelector('[data-page="dashboard"]').click();
doc.querySelector('[data-action="add-expense"]').click();
doc.querySelector('[data-action="expense-key"][data-key="2"]').click();
doc.querySelector('[data-action="expense-key"][data-key="0"]').click();
handle = doc.querySelector('[data-action="expense-confirm"]');
track = doc.querySelector(".add-expense-slide-track");
Object.defineProperty(track, "clientHeight", { value: 300, configurable: true });
Object.defineProperty(handle, "clientHeight", { value: 48, configurable: true });
pointer(handle, "pointerdown", 300, 10);
pointer(handle, "pointermove", 80, 10);
pointer(handle, "pointerup", 80, 10);
assert.match(doc.querySelector('[role="alert"]').textContent, /higher than the money/);
assert.equal(handle.style.transform, "translateY(0)", "failed drag springs the handle back");
doc.querySelector('[data-action="expense-back"]').click();

const frenchWeeks = structuredClone(weeks);
frenchWeeks[1].expenses.push({ name: "Food", amount: 1, category: "Food" });
const french = await boot(frenchWeeks, "fr");
french.document.querySelector('[data-action="add-expense"]').click();
assert.equal(french.document.querySelector('[data-category="Food"]').textContent, "Nourriture");
french.document.querySelector('[data-action="expense-back"]').click();
assert.equal(french.document.querySelector(".home-expense-row strong").textContent, "Nourriture");
french.document.querySelector('[data-page="history"]').click();
assert.ok([...french.document.querySelectorAll(".expense-main strong")].some((label) => label.textContent === "Nourriture"));

const arabic = await boot(weeks, "ar");
arabic.document.querySelector('[data-action="add-expense"]').click();
assert.equal(arabic.document.documentElement.dir, "rtl");
assert.equal(arabic.document.querySelector(".add-expense-slide-track").style.left, "");
arabic.document.querySelector('[data-action="expense-back"]').click();

const empty = await boot([]);
empty.document.querySelector('[data-action="add-week"]').click();
assert.ok(empty.document.querySelector(".modal-backdrop"), "no-week add flow opens Add Week popup");
for (const instance of [app, french, arabic, empty]) assert.deepEqual(instance.consoleErrors, [], "no JSDOM console errors");
console.log("PASS step2b screen interaction tests");
