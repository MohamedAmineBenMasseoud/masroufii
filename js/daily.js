// daily.js: add and remove daily money entries (top-ups).
// Logic only: pure functions returning { ok: true, data } or { ok: false, error }.
import { applyChange } from "./calc.js";
import { mondayOf, newId, parseDate, toISO } from "./utils.js";

const round2 = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;

/**
 * Add a daily money top-up.
 * Finds or creates the week containing `date` (starting on its Monday).
 * Increments week.received by amount, week.saved by saved, and adds a record to week.topups.
 */
export function addMoney(data, { date, amount, saved }) {
  const cleanDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
    ? date.trim()
    : toISO(new Date());

  const d = parseDate(cleanDate);
  if (isNaN(d.getTime())) return { ok: false, error: "Please choose a valid date." };

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, error: "Amount must be more than 0." };
  }

  const svd = Number(saved ?? 0);
  if (!Number.isFinite(svd) || svd < 0) {
    return { ok: false, error: "Savings cannot be negative." };
  }

  if (svd > amt) {
    return { ok: false, error: "Savings cannot be higher than the amount received." };
  }

  const targetMonday = mondayOf(d);

  return applyChange(data, (draft) => {
    let week = draft.weeks.find((w) => w.startDate === targetMonday);
    if (!week) {
      week = {
        id: newId(),
        startDate: targetMonday,
        received: 0,
        saved: 0,
        expenses: [],
        topups: [],
      };
      draft.weeks.push(week);
    }

    if (!Array.isArray(week.topups)) {
      week.topups = [];
    }

    const cleanAmt = round2(amt);
    const cleanSvd = round2(svd);

    week.topups.push({
      id: newId(),
      date: cleanDate,
      amount: cleanAmt,
      saved: cleanSvd,
    });

    week.received = round2(Number(week.received || 0) + cleanAmt);
    week.saved = round2(Number(week.saved || 0) + cleanSvd);
  });
}

/**
 * Remove a previously added daily money top-up.
 * Reverses the received and saved amounts on the week, and removes the topup from week.topups.
 * Refused if this or subsequent weeks would end below zero.
 */
export function removeMoney(data, weekId, topupId) {
  return applyChange(data, (draft) => {
    const week = draft.weeks.find((w) => w.id === weekId);
    if (!week) return "Week not found.";

    const list = Array.isArray(week.topups) ? week.topups : [];
    const index = list.findIndex((t) => t.id === topupId);
    if (index === -1) return "Top-up entry not found.";

    const entry = list[index];
    const newReceived = round2(Number(week.received || 0) - Number(entry.amount || 0));
    const newSaved = round2(Number(week.saved || 0) - Number(entry.saved || 0));

    if (newReceived < 0 || newSaved < 0) {
      return "Not allowed: week totals cannot be negative.";
    }

    week.received = newReceived;
    week.saved = newSaved;
    week.topups.splice(index, 1);
  });
}

