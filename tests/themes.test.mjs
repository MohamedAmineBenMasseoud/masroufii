import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM } from "jsdom";
import { THEMES, THEME_IDS, DEFAULT_THEME, applyTheme } from "../js/theme.js";
import { cleanProfile } from "../js/store.js";
import { renderSavings } from "../js/views/savings.js";
import { renderProfile } from "../js/views/profile.js";
import en from "../js/lang/en.js";
import fr from "../js/lang/fr.js";
import ar from "../js/lang/ar.js";

// --- 1. Theme list & IDs ---
assert.equal(THEMES.length, 5, "THEMES contains 5 themes");
assert.deepEqual(THEME_IDS, ["dark", "light", "rose", "forest", "ocean"], "THEME_IDS contains expected themes in order");
assert.equal(DEFAULT_THEME, "dark");

for (const theme of THEMES) {
  assert.ok(theme.id, "Theme has id");
  assert.ok(theme.label, `Theme ${theme.id} has label`);
  assert.ok(theme.dot, `Theme ${theme.id} has dot color`);
  assert.ok(theme.bg, `Theme ${theme.id} has bg color`);
}

// --- 2. Store integration ---
assert.equal(cleanProfile({ theme: "forest" }).theme, "forest", "cleanProfile accepts forest");
assert.equal(cleanProfile({ theme: "rose" }).theme, "rose", "cleanProfile accepts rose");
assert.equal(cleanProfile({ theme: "ocean" }).theme, "ocean", "cleanProfile accepts ocean");
assert.equal(cleanProfile({ theme: "invalid-theme" }).theme, "dark", "cleanProfile falls back to dark for invalid theme");

// --- 3. applyTheme DOM test ---
const dom = new JSDOM('<!DOCTYPE html><html><head><meta name="theme-color" content="#000"></head><body></body></html>');
globalThis.document = dom.window.document;

applyTheme("forest");
assert.equal(dom.window.document.documentElement.dataset.theme, "forest");
assert.equal(dom.window.document.querySelector('meta[name="theme-color"]').getAttribute("content"), "#051f20");

applyTheme("unknown");
assert.equal(dom.window.document.documentElement.dataset.theme, "dark", "unknown theme falls back to default");

// --- 4. Translations check ---
for (const id of THEME_IDS) {
  const key = `theme.${id}`;
  assert.ok(en[key], `en has ${key}`);
  assert.ok(fr[key], `fr has ${key}`);
  assert.ok(ar[key], `ar has ${key}`);
}
assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort(), "en and fr keys match");
assert.deepEqual(Object.keys(en).sort(), Object.keys(ar).sort(), "en and ar keys match");

// --- 5. Theme selection moved to Profile screen (removed from Savings) ---
const savingsHtml = renderSavings([], 700, { theme: "forest" });
assert.doesNotMatch(savingsHtml, /theme-grid|data-action="set-theme"/, "theme picker is removed from savings view");

const profileHtml = renderProfile({ theme: "forest" }, 700);
assert.match(profileHtml, /data-action="profile-edit-theme"/, "profile view has edit-theme action");
assert.match(profileHtml, /Forest/, "profile view displays current theme");

// --- 6. WCAG 2.1 4.5:1 Contrast ratio calculation on CSS tokens ---
function hexToRgb(hex) {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const lum1 = relativeLuminance(hexToRgb(hex1));
  const lum2 = relativeLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Parse theme token blocks from css/style.css
const css = await fs.readFile(new URL("../css/style.css", import.meta.url), "utf8");

function parseTokens(selector) {
  const start = css.indexOf(selector);
  assert.ok(start !== -1, `Selector ${selector} found in css/style.css`);
  const openBrace = css.indexOf("{", start);
  const closeBrace = css.indexOf("}", openBrace);
  const block = css.slice(openBrace + 1, closeBrace);
  const tokens = {};
  for (const line of block.split("\n")) {
    const match = line.match(/--([\w-]+):\s*([^;]+);/);
    if (match) {
      tokens[match[1]] = match[2].trim();
    }
  }
  return tokens;
}

const themeTokens = {
  dark: parseTokens(":root {"),
  light: parseTokens(':root[data-theme="light"] {'),
  rose: parseTokens(':root[data-theme="rose"] {'),
  forest: parseTokens(':root[data-theme="forest"] {'),
  ocean: parseTokens(':root[data-theme="ocean"] {'),
};

for (const [themeId, tokens] of Object.entries(themeTokens)) {
  const surfaces = [
    ["bg", tokens["bg"]],
    ["bg-elevated", tokens["bg-elevated"] || tokens["bg"]],
    ["card", tokens["card"]],
    ["card-2", tokens["card-2"]],
    ["surface", tokens["surface"]],
    ["surface-strong", tokens["surface-strong"] || tokens["surface"]],
  ];

  for (const [surfaceName, surfaceHex] of surfaces) {
    if (!surfaceHex.startsWith("#")) continue;

    // Text contrast >= 4.5:1
    const textCr = contrastRatio(tokens["text"], surfaceHex);
    assert.ok(
      textCr >= 4.5,
      `Theme ${themeId}: text (${tokens["text"]}) on ${surfaceName} (${surfaceHex}) contrast is ${textCr.toFixed(2)}:1 (must be >= 4.5)`
    );

    // Muted contrast >= 4.5:1
    const mutedCr = contrastRatio(tokens["muted"], surfaceHex);
    assert.ok(
      mutedCr >= 4.5,
      `Theme ${themeId}: muted (${tokens["muted"]}) on ${surfaceName} (${surfaceHex}) contrast is ${mutedCr.toFixed(2)}:1 (must be >= 4.5)`
    );

    // Danger contrast >= 4.5:1
    const dangerCr = contrastRatio(tokens["danger"], surfaceHex);
    assert.ok(
      dangerCr >= 4.5,
      `Theme ${themeId}: danger (${tokens["danger"]}) on ${surfaceName} (${surfaceHex}) contrast is ${dangerCr.toFixed(2)}:1 (must be >= 4.5)`
    );
  }

  // Text on accent: on-accent on green >= 4.5:1
  if (tokens["on-accent"].startsWith("#") && tokens["green"].startsWith("#")) {
    const onAccentCr = contrastRatio(tokens["on-accent"], tokens["green"]);
    assert.ok(
      onAccentCr >= 4.5,
      `Theme ${themeId}: on-accent (${tokens["on-accent"]}) on green (${tokens["green"]}) contrast is ${onAccentCr.toFixed(2)}:1 (must be >= 4.5)`
    );
  }
}

console.log("PASS themes logic, translations, DOM, and WCAG contrast tests");

