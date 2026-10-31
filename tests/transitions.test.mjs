import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";

const KEY = "savings-budget-v1";

// -----------------------------------------------------------------------------
// 1. Static CSS verification
// -----------------------------------------------------------------------------
const css = await fs.readFile(new URL("../css/style.css", import.meta.url), "utf8");

// Requirement 2: Keyframes translate3d(±18px, 0, 0) + opacity 0→1, 220ms, cubic-bezier(0.2, 0.8, 0.2, 1)
assert.match(css, /@keyframes\s+pageEnterNext\s*\{[\s\S]*?translate3d\(18px,\s*0,\s*0\)[\s\S]*?opacity:\s*0/, "pageEnterNext starts at 18px with opacity 0");
assert.match(css, /@keyframes\s+pageEnterPrev\s*\{[\s\S]*?translate3d\(-18px,\s*0,\s*0\)[\s\S]*?opacity:\s*0/, "pageEnterPrev starts at -18px with opacity 0");
assert.match(css, /#view\.page-enter-next\s*\{[\s\S]*?220ms\s+cubic-bezier\(0\.2,\s*0\.8,\s*0\.2,\s*1\)/, "page-enter-next uses 220ms cubic-bezier");
assert.match(css, /#view\.page-enter-prev\s*\{[\s\S]*?220ms\s+cubic-bezier\(0\.2,\s*0\.8,\s*0\.2,\s*1\)/, "page-enter-prev uses 220ms cubic-bezier");

// Inverted in RTL
assert.match(css, /html\[dir="rtl"\]\s+#view\.page-enter-next\s*\{[\s\S]*?animation-name:\s*pageEnterNextRTL/, "RTL inverts next direction");
assert.match(css, /html\[dir="rtl"\]\s+#view\.page-enter-prev\s*\{[\s\S]*?animation-name:\s*pageEnterPrevRTL/, "RTL inverts prev direction");
assert.match(css, /@keyframes\s+pageEnterNextRTL\s*\{[\s\S]*?translate3d\(-18px,\s*0,\s*0\)/, "pageEnterNextRTL uses -18px");
assert.match(css, /@keyframes\s+pageEnterPrevRTL\s*\{[\s\S]*?translate3d\(18px,\s*0,\s*0\)/, "pageEnterPrevRTL uses +18px");

// Requirement 3: Add expense and month plan slide up (translateY 24px -> 0) with fade, and reverse on closing
assert.match(css, /@keyframes\s+screenSlideUpFadeIn\s*\{[\s\S]*?translateY\(24px\)[\s\S]*?opacity:\s*0/, "screenSlideUpFadeIn slides up 24px with fade");
assert.match(css, /@keyframes\s+screenSlideDownFadeOut\s*\{[\s\S]*?translateY\(24px\)[\s\S]*?opacity:\s*0/, "screenSlideDownFadeOut slides down 24px with fade");
assert.match(css, /\.add-expense-screen,\s*\.month-plan-screen\s*\{[\s\S]*?screenSlideUpFadeIn/, "screens use screenSlideUpFadeIn");
assert.match(css, /\.add-expense-screen\.closing,\s*\.month-plan-screen\.closing\s*\{[\s\S]*?screenSlideDownFadeOut/, "closing screens use screenSlideDownFadeOut");
assert.match(css, /\.add-expense-screen\.closing,\s*\.month-plan-screen\.closing\s*\{[\s\S]*?pointer-events:\s*none/, "closing screens do not block taps");

// Requirement 4: Active tab icon pop (scale 0.85 -> 1, 180ms)
assert.match(css, /@keyframes\s+tabPop\s*\{[\s\S]*?scale\(0\.85\)[\s\S]*?scale\(1\)/, "tabPop keyframes scale 0.85 to 1");
assert.match(css, /\.tab\.active\s+\.tab-icon\s*\{[\s\S]*?animation:\s*tabPop\s+180ms/, "active tab icon uses tabPop in 180ms");

// Requirement 4: Popups open with scale 0.96 -> 1 + fade
assert.match(css, /@keyframes\s+modalPopupIn\s*\{[\s\S]*?scale\(0\.96\)[\s\S]*?scale\(1\)/, "modalPopupIn keyframes scale 0.96 to 1");
assert.match(css, /\.modal\s*\{[\s\S]*?animation:\s*modalPopupIn/, "modal has modalPopupIn animation");

// Requirement 4: Cards on Home appear with stagger of 40ms, capped at 5 items
assert.match(css, /\.home-screen\s*>\s*:not\(\.home-header\):not\(\.home-fab\):nth-child\(2\)\s*\{[\s\S]*?animation-delay:\s*0ms/, "card 1 has 0ms delay");
assert.match(css, /\.home-screen\s*>\s*:not\(\.home-header\):not\(\.home-fab\):nth-child\(3\)\s*\{[\s\S]*?animation-delay:\s*40ms/, "card 2 has 40ms delay");
assert.match(css, /\.home-screen\s*>\s*:not\(\.home-header\):not\(\.home-fab\):nth-child\(4\)\s*\{[\s\S]*?animation-delay:\s*80ms/, "card 3 has 80ms delay");
assert.match(css, /\.home-screen\s*>\s*:not\(\.home-header\):not\(\.home-fab\):nth-child\(5\)\s*\{[\s\S]*?animation-delay:\s*120ms/, "card 4 has 120ms delay");
assert.match(css, /\.home-screen\s*>\s*:not\(\.home-header\):not\(\.home-fab\):nth-child\(n\+6\)\s*\{[\s\S]*?animation-delay:\s*160ms/, "card 5+ capped at 160ms delay");

// Requirement 5: Prefers-reduced-motion disables all of it
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation:\s*none\s*!important/, "prefers-reduced-motion disables animations");

// Requirement 5: Nothing in the transitions & motion features runs longer than 300ms
const transitionSection = css.split("19. Transitions & Motion")[1] || "";
const transitionTimes = [...transitionSection.matchAll(/(?:animation|transition)[^;]*?(\d+)ms/g)].map((m) => Number(m[1]));
assert.ok(transitionTimes.length > 0, "Transitions section has timing rules");
for (const duration of transitionTimes) {
  assert.ok(duration <= 300, `Duration ${duration}ms must not exceed 300ms`);
}

// -----------------------------------------------------------------------------
// 2. Runtime DOM and Interaction tests
// -----------------------------------------------------------------------------
async function bootApp(profileOverrides = {}) {
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
      ...profileOverrides,
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
    },
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;

  await import(new URL(`../js/app.js?transitions-test=${Date.now()}-${Math.random()}`, import.meta.url));
  await new Promise((resolve) => setTimeout(resolve, 1550)); // wait for boot splash

  return { dom, document: dom.window.document, consoleErrors };
}

const { document: doc, consoleErrors } = await bootApp();
const viewEl = doc.getElementById("view");

// Check initial render has no transition classes
assert.equal(viewEl.classList.contains("page-enter-next"), false, "Initial load has no page-enter-next");
assert.equal(viewEl.classList.contains("page-enter-prev"), false, "Initial load has no page-enter-prev");

// Requirement 1 & 6: Switching from dashboard (0) to history (1) is a higher index -> page-enter-next
const historyTab = doc.querySelector('.tab[data-page="history"]');
assert.ok(historyTab, "History tab exists");
historyTab.click();

assert.equal(viewEl.classList.contains("page-enter-next"), true, "page-enter-next added when navigating 0 -> 1");
assert.equal(viewEl.classList.contains("page-enter-prev"), false, "page-enter-prev is NOT added when navigating 0 -> 1");

// Animationend removes the class
viewEl.dispatchEvent(new doc.defaultView.Event("animationend", { bubbles: true }));
assert.equal(viewEl.classList.contains("page-enter-next"), false, "animationend removes page-enter-next");

// Requirement 1 & 6: Switching from history (1) to dashboard (0) is a lower index -> page-enter-prev
const dashboardTab = doc.querySelector('.tab[data-page="dashboard"]');
assert.ok(dashboardTab, "Dashboard tab exists");
dashboardTab.click();

assert.equal(viewEl.classList.contains("page-enter-prev"), true, "page-enter-prev added when navigating 1 -> 0");
assert.equal(viewEl.classList.contains("page-enter-next"), false, "page-enter-next is NOT added when navigating 1 -> 0");

viewEl.dispatchEvent(new doc.defaultView.Event("animationend", { bubbles: true }));
assert.equal(viewEl.classList.contains("page-enter-prev"), false, "animationend removes page-enter-prev");

// Requirement 6: commit() redraw does NOT add transition classes
// Trigger a commit via toggle-reminder
const toggleEl = doc.createElement("button");
toggleEl.dataset.action = "toggle-reminder";
doc.body.appendChild(toggleEl);
toggleEl.click();

assert.equal(viewEl.classList.contains("page-enter-next"), false, "commit() redraw does NOT add page-enter-next");
assert.equal(viewEl.classList.contains("page-enter-prev"), false, "commit() redraw does NOT add page-enter-prev");

// Switching from dashboard (0) to profile (3)
const profileTab = doc.querySelector('.tab[data-page="profile"]');
assert.ok(profileTab, "Profile tab exists");
profileTab.click();

assert.equal(viewEl.classList.contains("page-enter-next"), true, "page-enter-next added when navigating 0 -> 3");
viewEl.dispatchEvent(new doc.defaultView.Event("animationend", { bubbles: true }));
assert.equal(viewEl.classList.contains("page-enter-next"), false, "animationend removes page-enter-next");

// Another commit redraw on profile (e.g. toggle reminder)
const toggleBtn = doc.querySelector('[data-action="toggle-reminder"]');
if (toggleBtn) {
  toggleBtn.click();
  assert.equal(viewEl.classList.contains("page-enter-next"), false, "Action commit redraw does NOT add page-enter-next");
  assert.equal(viewEl.classList.contains("page-enter-prev"), false, "Action commit redraw does NOT add page-enter-prev");
}

// Clicking the same tab again does NOT re-trigger animation
profileTab.click();
assert.equal(viewEl.classList.contains("page-enter-next"), false, "Clicking current tab does NOT add page-enter-next");
assert.equal(viewEl.classList.contains("page-enter-prev"), false, "Clicking current tab does NOT add page-enter-prev");

assert.deepEqual(consoleErrors, [], "No console errors occurred during transitions test");
console.log("PASS page transitions CSS and runtime interaction tests");
