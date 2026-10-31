import assert from "node:assert/strict";
import { addMonth, deleteMonth, editMonthWeek, monthOfWeek, monthPlanSummary, monthProgress, mondaysOfMonth, splitMonth } from "../js/months.js";
import { parseBackup, createEmpty, normalize, exportData } from "../js/store.js";
import { setLanguage } from "../js/i18n.js";
import { deleteWeek, editWeek, addWeek } from "../js/weeks.js";
import en from "../js/lang/en.js";
import fr from "../js/lang/fr.js";
import ar from "../js/lang/ar.js";

setLanguage("en");
assert.deepEqual(mondaysOfMonth("2026-10"), ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
assert.equal(mondaysOfMonth("2026-03").length, 5);
assert.equal(mondaysOfMonth("2026-13").length, 0);

const octoberSplit = splitMonth({ month: "2026-10", income: 160, saveTotal: 40 });
assert.deepEqual(octoberSplit, { weeks: 4, spend: [30, 30, 30, 30], save: [10, 10, 10, 10] });

// November 2026 (5 Mondays), income 100, save 10 -> spend 18.00 and save 2.00 each week.
const novSplit = splitMonth({ month: "2026-11", income: 100, saveTotal: 10 });
assert.deepEqual(novSplit, {
  weeks: 5,
  spend: [18, 18, 18, 18, 18],
  save: [2, 2, 2, 2, 2],
});

// A month with a remainder (for example income 100, save 10 in a 3-Monday month) -> the sums are exact.
const remainderSplit = splitMonth({ month: "custom", income: 100, saveTotal: 10, mondays: ["2026-02-02", "2026-02-09", "2026-02-16"] });
assert.equal(remainderSplit.weeks, 3);
assert.deepEqual(remainderSplit.spend, [30, 30, 30]);
assert.deepEqual(remainderSplit.save, [3.33, 3.33, 3.34]);
assert.equal(remainderSplit.save.reduce((sum, v) => sum + v, 0), 10);
assert.equal(remainderSplit.spend.reduce((sum, v) => sum + v, 0) + remainderSplit.save.reduce((sum, v) => sum + v, 0), 100);

// saveTotal = income -> spend 0 each week
const saveAllSplit = splitMonth({ month: "2026-10", income: 100, saveTotal: 100 });
assert.deepEqual(saveAllSplit, {
  weeks: 4,
  spend: [0, 0, 0, 0],
  save: [25, 25, 25, 25],
});

const empty = createEmpty();
const created = addMonth(empty, { month: "2026-10", income: 160, saveTotal: 40 });
assert.equal(created.ok, true);
assert.equal(empty.weeks.length, 0, "addMonth does not mutate its input");
assert.equal(created.data.weeks.length, 4);
assert.equal(created.data.weeks.reduce((sum, week) => sum + week.received, 0), 160);
assert.equal(created.data.months[0].weekIds.length, 4);
assert.equal(monthOfWeek(created.data, created.data.weeks[0].id).label, "2026-10");
assert.deepEqual(monthPlanSummary(created.data, created.data.months[0].id), {
  income: 160,
  planned: 160,
  unplanned: 0,
  toSpend: 120,
  toSave: 40,
  weeks: [
    { id: created.data.weeks[0].id, startDate: "2026-10-05", endDate: "2026-10-11", spend: 30, saved: 10 },
    { id: created.data.weeks[1].id, startDate: "2026-10-12", endDate: "2026-10-18", spend: 30, saved: 10 },
    { id: created.data.weeks[2].id, startDate: "2026-10-19", endDate: "2026-10-25", spend: 30, saved: 10 },
    { id: created.data.weeks[3].id, startDate: "2026-10-26", endDate: "2026-11-01", spend: 30, saved: 10 },
  ],
});
created.data.weeks[0].expenses.push({ name: "Lunch", amount: 2, category: "Food" });
assert.deepEqual(monthProgress(created.data, created.data.months[0].id, "2026-10-12"), {
  index: 2, total: 4, received: 160, spent: 2, saved: 20,
});
assert.equal(monthProgress(created.data, created.data.months[0].id, "2026-12-01").index, 4);

const over = editMonthWeek(created.data, created.data.months[0].id, created.data.weeks[0].id, { spend: 35, saved: 10 });
assert.deepEqual(over, { ok: false, error: "Over by 5.00 TND." });
const underAnotherWeek = editMonthWeek(created.data, created.data.months[0].id, created.data.weeks[1].id, { spend: 25, saved: 10 });
assert.equal(underAnotherWeek.ok, true);
const nowBalanced = editMonthWeek(underAnotherWeek.data, created.data.months[0].id, created.data.weeks[0].id, { spend: 35, saved: 10 });
assert.equal(nowBalanced.ok, true);
assert.equal(nowBalanced.data.weeks[0].received + nowBalanced.data.weeks[1].received, 80);

const invalidExpenseData = structuredClone(created.data);
invalidExpenseData.weeks[0].expenses = [{ name: "Large", amount: 31, category: "Other" }];
const belowExpenses = editMonthWeek(invalidExpenseData, invalidExpenseData.months[0].id, invalidExpenseData.weeks[0].id, { spend: 30, saved: 10 });
assert.equal(belowExpenses.ok, false);
assert.match(belowExpenses.error, /Not allowed/);

assert.equal(addMonth(createEmpty(), { month: "2026-10", income: 160, saveTotal: 0 }).ok, true);
assert.equal(addMonth(createEmpty(), { month: "2026-10", income: 0, saveTotal: 0 }).error, en["month.errIncome"]);
assert.equal(addMonth(createEmpty(), { month: "2026-10", income: 160, saveTotal: -1 }).error, en["month.errSave"]);
assert.equal(addMonth(createEmpty(), { month: "2026-10", income: 20, saveTotal: 40 }).error, en["month.errLow"]);
assert.equal(addMonth(createEmpty(), { month: "2026-10", income: 100, saveTotal: 101 }).error, en["month.errLow"]);
const collision = { ...createEmpty(), weeks: [{ id: "existing", startDate: "2026-10-05", received: 20, saved: 10, expenses: [] }] };
const collisionSnapshot = structuredClone(collision);
assert.equal(addMonth(collision, { month: "2026-10", income: 160, saveTotal: 40 }).error, en["month.errExists"]);
assert.deepEqual(collision, collisionSnapshot);

const afterDeleteWeek = deleteWeek(created.data, created.data.weeks[0].id);
assert.equal(afterDeleteWeek.data.months[0].weekIds.length, 3);
const removeMonth = deleteMonth(created.data, created.data.months[0].id);
assert.equal(removeMonth.data.weeks.length, 0);
assert.equal(removeMonth.data.months.length, 0);
const withFollowingWeek = addWeek(created.data, { startDate: "2026-11-02", received: 0, saved: 10 });
assert.equal(withFollowingWeek.ok, true);
assert.equal(deleteMonth(withFollowingWeek.data, created.data.months[0].id).ok, false, "month deletion preserves the no-negative-week rule");

const editedWeekOverPlan = editWeek(created.data, created.data.weeks[0].id, { startDate: "2026-10-05", received: 41, saved: 10 });
assert.deepEqual(editedWeekOverPlan, { ok: false, error: "Over by 1.00 TND." });

const oldBackup = normalize({ goal: 700, weeks: [{ id: "old", startDate: "2026-10-05", received: 20, expenses: [] }] });
assert.deepEqual(oldBackup.months, []);
assert.equal(oldBackup.weeks[0].saved, 10);
const droppedRefs = normalize({ goal: 700, weeks: [], months: [{ id: "m", label: "2026-10", income: 100, weekIds: ["ghost"] }] });
assert.deepEqual(droppedRefs.months[0].weekIds, []);
assert.throws(() => normalize({ weeks: [], months: [{ id: "m", label: "2026-13", income: 100, weekIds: [] }] }), /invalid label/i);
assert.equal(parseBackup(JSON.stringify(created.data)).months[0].weekIds.length, 4);
const previousDocument = globalThis.document;
const previousCreateObjectURL = URL.createObjectURL;
const previousRevokeObjectURL = URL.revokeObjectURL;
let exportedBlob;
const anchor = { click() {} };
globalThis.document = { createElement: () => anchor };
URL.createObjectURL = (blob) => { exportedBlob = blob; return "blob:monthly-test"; };
URL.revokeObjectURL = () => {};
try {
  exportData(created.data);
  const exported = JSON.parse(await exportedBlob.text());
  assert.equal(parseBackup(JSON.stringify(exported)).months[0].weekIds.length, 4, "export/import keeps month links");
} finally {
  globalThis.document = previousDocument;
  URL.createObjectURL = previousCreateObjectURL;
  URL.revokeObjectURL = previousRevokeObjectURL;
}

assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort());
assert.deepEqual(Object.keys(en).sort(), Object.keys(ar).sort());
for (const key of Object.keys(en).filter((name) => name.startsWith("addMonth.") || name.startsWith("month.") || name.startsWith("plan.") || name.startsWith("editWeek.") || name.startsWith("home.month") || name.startsWith("home.addMonth") || name.startsWith("home.noMonth") || name === "home.leftThisWeek" || name === "home.received" || name === "home.spentLabel" || name === "home.savedLabel")) {
  assert.ok(en[key] && fr[key] && ar[key], `missing monthly translation ${key}`);
}
console.log("PASS monthly logic, persistence, and translation tests");
