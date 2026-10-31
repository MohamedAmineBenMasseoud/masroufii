import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM } from "jsdom";
import { loadLottieJson, playLottie, showSuccessOverlay, showLoadingOverlay, initLottie } from "../js/lottie.js";
import { renderHistory } from "../js/views/history.js";
import { renderDashboard } from "../js/views/dashboard.js";

// --- 1. Vendor file and Assets exist ---
const vendorStat = await fs.stat(new URL("../js/vendor/lottie_light.min.js", import.meta.url));
assert.ok(vendorStat.size > 100000, "lottie_light.min.js exists and is non-empty");

const expectedFiles = ["empty.json", "loading.json", "refresh.json", "success.json"];
for (const file of expectedFiles) {
  const content = await fs.readFile(new URL(`../assets/lottie/${file}`, import.meta.url), "utf8");
  const parsed = JSON.parse(content);
  assert.ok(parsed.v, `${file} has lottie version`);
  assert.ok(Array.isArray(parsed.layers), `${file} has layers`);
}

// --- 2. index.html loads vendor script ---
const indexHtml = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
assert.match(indexHtml, /<script\s+src="js\/vendor\/lottie_light\.min\.js"><\/script>/, "index.html loads lottie_light.min.js");

// --- 3. sw.js includes all lottie assets and vendor script ---
const swJs = await fs.readFile(new URL("../sw.js", import.meta.url), "utf8");
assert.match(swJs, /masrofi-v0\.1-step4-lottie/, "CACHE_NAME bumped for lottie release");
for (const path of [
  "./js/lottie.js",
  "./js/vendor/lottie_light.min.js",
  "./assets/lottie/empty.json",
  "./assets/lottie/loading.json",
  "./assets/lottie/refresh.json",
  "./assets/lottie/success.json",
]) {
  assert.ok(swJs.includes(path), `sw.js APP_SHELL includes ${path}`);
}

// Verify ALL files in sw.js APP_SHELL exist on disk
const match = swJs.match(/const APP_SHELL = \[([\s\S]*?)\];/);
assert.ok(match, "APP_SHELL found in sw.js");
const shellUrls = match[1]
  .split("\n")
  .map((line) => line.trim().replace(/^['".\/]+/, "").replace(/['",]+$/, ""))
  .filter((line) => line && line !== ".");

for (const url of shellUrls) {
  const stat = await fs.stat(new URL(`../${url}`, import.meta.url));
  assert.ok(stat.size >= 0, `File exists on disk: ${url}`);
}

// --- 4. CSS rules check ---
const css = await fs.readFile(new URL("../css/style.css", import.meta.url), "utf8");
assert.match(css, /\.lottie\s*\{[^}]*width:\s*110px/, "css has 110px width for .lottie");
assert.match(css, /\.lottie\s+path\s*\{[^}]*stroke:\s*var\(--green\);/, "css sets stroke to var(--green)");
assert.match(css, /\.lottie--muted\s+path\s*\{[^}]*stroke:\s*var\(--muted\);/, "css sets muted stroke to var(--muted)");
assert.match(css, /\.lottie-overlay/, "css has .lottie-overlay rule");

// --- 5. Empty states render empty.json container ---
const emptyHistoryHtml = renderHistory([]);
assert.match(emptyHistoryHtml, /data-lottie="empty"/, "History renders empty lottie container when no weeks");
assert.match(emptyHistoryHtml, /lottie--muted/, "History empty lottie container has lottie--muted class");
assert.match(emptyHistoryHtml, /No weeks recorded yet/, "History keeps existing empty text");

const dummyWeek = {
  id: "w-1",
  startDate: "2026-10-05",
  number: 1,
  received: 50,
  carry: 0,
  saved: 10,
  available: 40,
  spent: 0,
  remaining: 40,
  expenses: [],
};
const emptyHomeHtml = renderDashboard([dummyWeek], 700, { incomeMode: "weekly", language: "en" });
assert.match(emptyHomeHtml, /data-lottie="empty"/, "Home renders empty lottie container when week has no expenses");
assert.match(emptyHomeHtml, /lottie--muted/, "Home empty lottie container has lottie--muted class");
assert.match(emptyHomeHtml, /No expenses yet/, "Home keeps existing empty text");

// --- 6. playLottie behavior in JSDOM / reduced motion ---
const dom = new JSDOM("<!DOCTYPE html><html><body><div id='box'></div></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.fetch = async (url) => {
  const content = await fs.readFile(new URL(`../${url}`, import.meta.url), "utf8");
  return {
    ok: true,
    json: async () => JSON.parse(content),
  };
};

const box = dom.window.document.getElementById("box");

// A. window.lottie is undefined -> does nothing and returns null
const noLottieRes = await playLottie(box, "empty");
assert.equal(noLottieRes, null, "Returns null when window.lottie is undefined");

// B. window.lottie defined -> loadAnimation called with SVG renderer
let loadedArgs = null;
dom.window.lottie = {
  loadAnimation(args) {
    loadedArgs = args;
    return { destroy() { }, play() { } };
  },
};

const anim = await playLottie(box, "empty", { loop: true });
assert.ok(anim, "Returns animation instance when lottie is available");
assert.equal(loadedArgs.renderer, "svg", "Uses SVG renderer");
assert.equal(loadedArgs.loop, true, "Passes loop option");
assert.ok(loadedArgs.animationData, "Passes cached animationData");

// C. prefers-reduced-motion -> returns null
dom.window.matchMedia = (q) => ({
  matches: q.includes("prefers-reduced-motion: reduce"),
});
const reducedRes = await playLottie(box, "empty");
assert.equal(reducedRes, null, "Does nothing when prefers-reduced-motion is enabled");
dom.window.matchMedia = () => ({ matches: false });

// D. showSuccessOverlay appends to document.body (not #view)
const overlay = showSuccessOverlay();
assert.ok(overlay, "showSuccessOverlay creates overlay");
assert.equal(overlay.parentElement, dom.window.document.body, "Overlay appended directly to document.body");
assert.ok(overlay.querySelector(".lottie"), "Overlay contains .lottie element");
overlay.remove();

// E. showLoadingOverlay appends to document.body and can be dismissed
const dismissLoading = showLoadingOverlay();
const loadingOverlay = dom.window.document.querySelector(".lottie-overlay--loading");
assert.ok(loadingOverlay, "Loading overlay exists in document.body");
dismissLoading();
assert.equal(dom.window.document.querySelector(".lottie-overlay--loading"), null, "Dismiss removes overlay");

console.log("PASS lottie logic, DOM mounting, reduced-motion, and offline caching tests");
