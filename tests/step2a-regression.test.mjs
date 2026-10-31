import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const KEY = 'savings-budget-v1';

async function loadAppWithHtml(initialStorage = null) {
  const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    beforeParse(window) {
      const store = new Map();
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem(key) {
            return store.has(key) ? store.get(key) : null;
          },
          setItem(key, value) {
            store.set(String(key), String(value));
          },
          removeItem(key) {
            store.delete(key);
          },
          clear() {
            store.clear();
          },
        },
        configurable: true,
      });
      if (initialStorage) {
        for (const [key, value] of Object.entries(initialStorage)) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      }
      window.alert = () => {};
      window.confirm = async () => true;
      window.URL.createObjectURL = () => 'blob:test';
      window.URL.revokeObjectURL = () => {};
      window.navigator.serviceWorker = { register: async () => ({}) };
    },
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  globalThis.Node = window.Node;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);

  const appUrl = new URL(`../js/app.js?cacheBust=${Date.now()}-${Math.random()}`, import.meta.url);
  await import(appUrl.href);
  await new Promise((resolve) => setTimeout(resolve, 1600));

  return { window, document: window.document, dom };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

await test('dashboard tab renders with the expected home label and no onboarding shell', async () => {
  const { document } = await loadAppWithHtml({
    [KEY]: {
      goal: 700,
      weeks: [],
      profile: { name: '', language: 'en', theme: 'dark', incomeMode: 'weekly', onboarded: true },
    },
  });

  const tab = document.querySelector('[data-page="dashboard"] .tab-label');
  assert.equal(tab && tab.textContent.trim(), 'Home');
  assert.equal(document.body.classList.contains('onboarding'), false);
});

await test('set-income-mode persists the user selection and survives reload', async () => {
  const emptyState = {
    [KEY]: {
      goal: 700,
      weeks: [],
      profile: { name: '', language: 'en', theme: 'dark', incomeMode: 'weekly', onboarded: false },
    },
  };

  const first = await loadAppWithHtml(emptyState);
  const doc = first.document;
  doc.querySelector('[data-action="onboard-start"]').click();
  doc.querySelector('[data-action="onboard-next"]').click();
  doc.querySelector('[data-action="onboard-next"]').click();
  doc.querySelector('[data-action="onboard-next"]').click();
  doc.querySelector('[data-action="onboard-next"]').click();
  doc.querySelector('[data-action="onboard-save-name"]').click();

  const monthly = doc.querySelector('[data-action="set-income-mode"][data-mode="monthly"]');
  assert.ok(monthly, 'monthly income option should be present on the onboarding screen');
  monthly.click();
  doc.querySelector('[data-action="onboard-finish-income"]').click();

  const saved = JSON.parse(localStorage.getItem(KEY));
  assert.equal(saved.profile.incomeMode, 'monthly');

  const second = await loadAppWithHtml({ [KEY]: saved });
  const reloadedData = JSON.parse(second.window.localStorage.getItem(KEY));
  assert.equal(reloadedData.profile.incomeMode, 'monthly');
  assert.equal(second.document.body.classList.contains('onboarding'), false);
});

await test('set-income-mode supports daily mode during onboarding and survives reload', async () => {
  const emptyState = {
    [KEY]: {
      goal: 700,
      weeks: [],
      profile: { name: '', language: 'en', theme: 'dark', incomeMode: 'weekly', onboarded: false },
    },
  };

  const first = await loadAppWithHtml(emptyState);
  const doc = first.document;
  doc.querySelector('[data-action="onboard-start"]').click();
  doc.querySelector('[data-action="onboard-next"]').click();
  doc.querySelector('[data-action="onboard-next"]').click();
  doc.querySelector('[data-action="onboard-next"]').click();
  doc.querySelector('[data-action="onboard-next"]').click();
  doc.querySelector('[data-action="onboard-save-name"]').click();

  const daily = doc.querySelector('[data-action="set-income-mode"][data-mode="daily"]');
  assert.ok(daily, 'daily income option should be present on the onboarding screen');
  daily.click();
  doc.querySelector('[data-action="onboard-finish-income"]').click();

  const saved = JSON.parse(localStorage.getItem(KEY));
  assert.equal(saved.profile.incomeMode, 'daily');

  const second = await loadAppWithHtml({ [KEY]: saved });
  const reloadedData = JSON.parse(second.window.localStorage.getItem(KEY));
  assert.equal(reloadedData.profile.incomeMode, 'daily');
  assert.equal(second.document.body.classList.contains('onboarding'), false);
});
