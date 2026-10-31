// reminders.js: pure logic for money and night reminders, and notification helpers.
// Takes data, profile and now (Date). Never reads the system clock directly.
import { expenseLabel } from "./expenses.js";
import { money, mondayOf, toISO } from "./utils.js";
import { t } from "./i18n.js";

const round2 = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;

/**
 * Returns true if the time of `date` is at or past `timeStr` ("HH:MM").
 */
export function isTimeOnOrAfter(date, timeStr = "12:00") {
  if (!date || !(date instanceof Date)) return false;
  const [targetH, targetM] = String(timeStr || "12:00").split(":").map(Number);
  const currentH = date.getHours();
  const currentM = date.getMinutes();
  if (currentH > targetH) return true;
  if (currentH === targetH && currentM >= targetM) return true;
  return false;
}

/**
 * Check if the money reminder is due for the current income mode.
 * Returns { due: boolean, kind: "daily" | "weekly" | "monthly" }.
 */
export function moneyReminderDue(data, now = new Date()) {
  const profile = data?.profile || {};
  const notifs = profile.notifications || {};
  const kind = profile.incomeMode || "weekly";

  if (notifs.money === false) return { due: false, kind };

  const todayIso = toISO(now);
  if (notifs.lastShown?.money === todayIso) return { due: false, kind };

  const moneyTime = notifs.moneyTime || "12:00";

  if (kind === "daily") {
    if (!isTimeOnOrAfter(now, moneyTime)) return { due: false, kind };
    const targetMonday = mondayOf(now);
    const week = (data.weeks || []).find((w) => w.startDate === targetMonday);
    const hasTopupToday = Boolean(week?.topups?.some((tp) => tp.date === todayIso));
    return { due: !hasTopupToday, kind };
  }

  if (kind === "weekly") {
    // Week of this Monday does not exist and it is Monday or later
    // If today is Monday, wait until moneyTime; if later in the week, it's already past Monday moneyTime
    if (now.getDay() === 1 && !isTimeOnOrAfter(now, moneyTime)) {
      return { due: false, kind };
    }
    const targetMonday = mondayOf(now);
    const weekExists = (data.weeks || []).some((w) => w.startDate === targetMonday);
    return { due: !weekExists, kind };
  }

  if (kind === "monthly") {
    // Current month has no plan and now is on or after day 1 at 09:00
    const day = now.getDate();
    const afterNine = day > 1 || (day === 1 && isTimeOnOrAfter(now, "09:00"));
    if (!afterNine) return { due: false, kind };

    const currentMonthLabel = todayIso.slice(0, 7);
    const hasPlan = (data.months || []).some(
      (m) => m.label === currentMonthLabel && Array.isArray(m.weekIds) && m.weekIds.length > 0
    );
    return { due: !hasPlan, kind };
  }

  return { due: false, kind };
}

/**
 * Check if evening summary reminder is due.
 * Returns boolean.
 */
export function nightReminderDue(profile, now = new Date()) {
  const notifs = profile?.notifications || {};
  if (notifs.night === false) return false;

  const todayIso = toISO(now);
  if (notifs.lastShown?.night === todayIso) return false;

  const nightTime = notifs.nightTime || "21:30";
  return isTimeOnOrAfter(now, nightTime);
}

/**
 * Summary of today's expenses.
 * Returns { total, items: [{ label, amount }], count }.
 */
export function nightSummary(data, now = new Date()) {
  const todayIso = toISO(now);

  const matched = [];
  for (const w of data?.weeks || []) {
    for (const e of w.expenses || []) {
      if (e?.date && e.date === todayIso) {
        matched.push(e);
      }
    }
  }

  const items = matched.map((e) => ({
    label: expenseLabel(e),
    amount: round2(Number(e.amount || 0)),
  }));

  const total = round2(items.reduce((sum, it) => sum + it.amount, 0));
  return { total, items, count: items.length };
}

/**
 * Mark a reminder as shown today. Returns updated profile.
 */
export function markReminderShown(profile, kind, now = new Date()) {
  const todayIso = toISO(now);
  const notifs = profile?.notifications || {};
  return {
    ...profile,
    notifications: {
      ...notifs,
      lastShown: {
        ...(notifs.lastShown || {}),
        [kind]: todayIso,
      },
    },
  };
}

/**
 * Format evening summary text.
 */
export function formatEveningMessage(summary) {
  if (!summary || summary.count === 0) {
    return t("reminders.eveningEmpty");
  }

  const items = summary.items || [];
  let itemsStr = "";
  if (items.length === 1) {
    itemsStr = items[0].label;
  } else if (items.length === 2) {
    itemsStr = `${items[0].label}, ${items[1].label}`;
  } else {
    const firstTwo = `${items[0].label}, ${items[1].label}`;
    const remainder = items.length - 2;
    itemsStr = `${firstTwo} ${t("reminders.andMore", { n: remainder })}`;
  }

  return t("reminders.eveningSummary", { x: money(summary.total), items: itemsStr });
}

/**
 * Message for money reminder by kind.
 */
export function moneyReminderMessage(kind) {
  if (kind === "daily") return t("reminders.daily");
  if (kind === "monthly") return t("reminders.monthly");
  return t("reminders.weekly");
}
