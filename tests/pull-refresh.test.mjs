import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";

const KEY = "savings-budget-v1";

// -----------------------------------------------------------------------------
// 1. Static CSS Verification
// -----------------------------------------------------------------------------
const css = await fs.readFile(new URL("../css/style.css", import.meta.url), "utf8");

assert.match(css, /\.home-pull-refresh\s*\{[\s\S]*?height:\s*70px/, ".home-pull-refresh styled with 70px height");
assert.match(css, /\.home-pull-refresh\s*\{[\s\S]*?display:\s*flex/, ".home-pull-refresh is flex centered");
assert.match(css, /@keyframes\s+pullRefreshIn/, "pullRefreshIn keyframes exist");
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.home-pull-refresh/, "prefers-reduced-motion covers .home-pull-refresh");

// -----------------------------------------------------------------------------
// 2. Runtime DOM & Touch Gesture Tests
// -----------------------------------------------------------------------------
async function bootApp() {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const consoleErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => consoleErrors.push(error));
  virtualConsole.on("error", (...args) => consoleErrors.push(args));

  const initialData = {
    goal: 700,
    weeks: [
      {
        id: "w-1",
        startDate: "2026-10-05",
        number: 1,
        received: 50,
        carry: 0,
        saved: 10,
        available: 40,
        spent: 5,
        remaining: 35,
        expenses: [{ name: "Snack", amount: 5, category: "Food" }],
      },
    ],
    months: [],
    profile: {
      name: "Amine",
      language: "en",
      theme: "dark",
      incomeMode: "weekly",
      onboarded: true,
    },
  };

  const dom = new JSDOM(html, {
    url: "http://localhost/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
    virtualConsole,
    beforeParse(window) {
      const store = new Map([[KEY, JSON.stringify(initialData)]]);
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
      window.scrollY = 0;
    },
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;

  await import(new URL(`../js/app.js?pull-refresh-test=${Date.now()}-${Math.random()}`, import.meta.url));
  await new Promise((resolve) => setTimeout(resolve, 1550)); // wait for boot splash

  return { dom, document: dom.window.document, consoleErrors, data: () => JSON.parse(dom.window.localStorage.getItem(KEY)) };
}

function touchEvent(dom, type, clientX, clientY) {
  const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
  event.touches = [{ clientX, clientY }];
  event.changedTouches = [{ clientX, clientY }];
  return event;
}

const { dom, document: doc, consoleErrors, data: getData } = await bootApp();
const initialSnapshot = JSON.stringify(getData());

// A. Pull down >= 70px on Home with scrollTop === 0 triggers refresh indicator
const homeScreen = doc.querySelector(".home-screen");
assert.ok(homeScreen, "Home screen is rendered");

doc.dispatchEvent(touchEvent(dom, "touchstart", 100, 50));
doc.dispatchEvent(touchEvent(dom, "touchmove", 100, 130)); // dy = 80 (>= 70 threshold)
doc.dispatchEvent(touchEvent(dom, "touchend", 100, 130));

const refreshEl = doc.querySelector("[data-pull-refresh]");
assert.ok(refreshEl, "Refresh container is displayed above content");
assert.equal(homeScreen.firstElementChild, refreshEl, "Refresh container is prepended at the top of Home content");
assert.ok(refreshEl.querySelector('[data-lottie="refresh"]'), "Refresh container contains refresh lottie element");

// Wait for re-render after timer
await new Promise((resolve) => setTimeout(resolve, 650));
assert.equal(doc.querySelector("[data-pull-refresh]"), null, "Refresh container dismissed after re-render");

// Confirm data was never mutated
assert.equal(JSON.stringify(getData()), initialSnapshot, "Data is never touched during pull-to-refresh");

// B. Pull down < 70px does NOT trigger refresh
doc.dispatchEvent(touchEvent(dom, "touchstart", 100, 50));
doc.dispatchEvent(touchEvent(dom, "touchmove", 100, 100)); // dy = 50 (< 70)
doc.dispatchEvent(touchEvent(dom, "touchend", 100, 100));
assert.equal(doc.querySelector("[data-pull-refresh]"), null, "Sub-threshold pull does not show refresh");

// C. Pull down when scrollTop > 0 does NOT trigger refresh
dom.window.scrollY = 120;
doc.dispatchEvent(touchEvent(dom, "touchstart", 100, 50));
doc.dispatchEvent(touchEvent(dom, "touchmove", 100, 150)); // dy = 100
doc.dispatchEvent(touchEvent(dom, "touchend", 100, 150));
assert.equal(doc.querySelector("[data-pull-refresh]"), null, "Pull down when scrolled down does not show refresh");
dom.window.scrollY = 0;

// D. Pull down on non-Home tabs (e.g. History) does NOT trigger refresh
doc.querySelector('.tab[data-page="history"]').click();
doc.dispatchEvent(touchEvent(dom, "touchstart", 100, 50));
doc.dispatchEvent(touchEvent(dom, "touchmove", 100, 150)); // dy = 100
doc.dispatchEvent(touchEvent(dom, "touchend", 100, 150));
assert.equal(doc.querySelector("[data-pull-refresh]"), null, "Pull down on History does not show refresh");

// E. Normal scrolling up (dy < 0) or horizontal swipes cancel cleanly
doc.querySelector('.tab[data-page="dashboard"]').click();
doc.dispatchEvent(touchEvent(dom, "touchstart", 100, 150));
doc.dispatchEvent(touchEvent(dom, "touchmove", 100, 100)); // scrolling up (dy = -50)
doc.dispatchEvent(touchEvent(dom, "touchend", 100, 100));
assert.equal(doc.querySelector("[data-pull-refresh]"), null, "Scroll up does not trigger refresh");

assert.deepEqual(consoleErrors, [], "No console errors occurred during pull-refresh tests");
console.log("PASS pull-to-refresh on Home screen tests");

