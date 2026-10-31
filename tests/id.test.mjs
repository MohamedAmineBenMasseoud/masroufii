import assert from "node:assert/strict";
import { newId } from "../js/utils.js";
import { addWeek } from "../js/weeks.js";
import { addMonth } from "../js/months.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// 1. Standard environment (crypto.randomUUID available)
assert.match(newId(), UUID_REGEX, "newId returns a valid v4 UUID");
const set1 = new Set();
for (let i = 0; i < 1000; i++) set1.add(newId());
assert.equal(set1.size, 1000, "1000 calls give 1000 different ids");
for (const id of set1) assert.match(id, UUID_REGEX);

// 2. crypto.randomUUID stubbed to undefined (e.g. HTTP non-secure contexts)
const origRandomUUID = globalThis.crypto?.randomUUID;
const origGetRandomValues = globalThis.crypto?.getRandomValues;

try {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: undefined,
    configurable: true,
    writable: true,
  });

  assert.equal(typeof globalThis.crypto.randomUUID, "undefined");
  assert.match(newId(), UUID_REGEX, "newId returns valid UUID when randomUUID is undefined");

  const set2 = new Set();
  for (let i = 0; i < 1000; i++) set2.add(newId());
  assert.equal(set2.size, 1000, "1000 calls give 1000 unique ids without randomUUID");
  for (const id of set2) assert.match(id, UUID_REGEX);
} finally {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: origRandomUUID,
    configurable: true,
    writable: true,
  });
}

// 3. Both crypto.randomUUID and crypto.getRandomValues missing (older browsers / Math.random fallback)
try {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: undefined,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis.crypto, "getRandomValues", {
    value: undefined,
    configurable: true,
    writable: true,
  });

  assert.equal(typeof globalThis.crypto.randomUUID, "undefined");
  assert.equal(typeof globalThis.crypto.getRandomValues, "undefined");
  assert.match(newId(), UUID_REGEX, "newId returns valid UUID with Math.random fallback");

  const set3 = new Set();
  for (let i = 0; i < 1000; i++) set3.add(newId());
  assert.equal(set3.size, 1000, "1000 calls give 1000 unique ids with Math.random fallback");
  for (const id of set3) assert.match(id, UUID_REGEX);
} finally {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: origRandomUUID,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis.crypto, "getRandomValues", {
    value: origGetRandomValues,
    configurable: true,
    writable: true,
  });
}

// 4. addWeek and addMonth still work when crypto.randomUUID is undefined
try {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: undefined,
    configurable: true,
    writable: true,
  });

  const data = {
    goal: 700,
    weeks: [],
    months: [],
    profile: { name: "", language: "en", theme: "dark", incomeMode: "weekly", onboarded: true },
  };

  const weekRes = addWeek(data, { startDate: "2026-11-02", received: 100, saved: 20 });
  assert.ok(weekRes.ok, "addWeek succeeds when crypto.randomUUID is undefined");
  assert.equal(weekRes.data.weeks.length, 1);
  assert.match(weekRes.data.weeks[0].id, UUID_REGEX, "created week has valid UUID");

  const monthRes = addMonth(weekRes.data, { month: "2026-12", income: 400, saveTotal: 80 });
  assert.ok(monthRes.ok, "addMonth succeeds when crypto.randomUUID is undefined");
  assert.equal(monthRes.data.months.length, 1);
  assert.match(monthRes.data.months[0].id, UUID_REGEX, "created month has valid UUID");
  for (const w of monthRes.data.weeks) {
    assert.match(w.id, UUID_REGEX, "all month weeks have valid UUIDs");
  }
} finally {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: origRandomUUID,
    configurable: true,
    writable: true,
  });
}

console.log("PASS newId and fallback UUID tests");

