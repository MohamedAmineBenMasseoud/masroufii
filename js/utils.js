// utils.js: small shared helpers. No app logic and no DOM access.

/** 6.5 -> "6.50 TND" */
export const money = (n) => Number(n || 0).toFixed(2) + " TND";

/** 6.5 -> "6.50" (for tight spaces where the unit is already shown) */
export const num = (n) => Number(n || 0).toFixed(2);

/** "YYYY-MM-DD" -> Date at noon local time (avoids timezone day shifts) */
export const parseDate = (s) => new Date(s + "T12:00:00");

/** Date -> "YYYY-MM-DD" using local time, not UTC */
export function toISO(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Add days to an ISO date string */
export function addDays(iso, days) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Sunday of the week that starts on this Monday */
export const endDate = (startIso) => addDays(startIso, 6);

/** True if the ISO date is a Monday */
export const isMonday = (iso) => parseDate(iso).getDay() === 1;

/** The Monday of the week containing the given date (default: today) */
export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return toISO(d);
}

/** "2026-10-05" -> "05 Oct" (add year with withYear = true) */
export function formatDate(iso, withYear = false) {
  return parseDate(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/** "05 Oct – 11 Oct"; pass a language for Home's locale-aware, unpadded dates. */
export function formatRange(startIso, language = null) {
  if (!language) return `${formatDate(startIso)} – ${formatDate(endDate(startIso))}`;
  const locale = { en: "en-GB", fr: "fr-FR", ar: "ar-TN-u-nu-latn" }[language] || "en-GB";
  const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  return `${formatter.format(parseDate(startIso))} – ${formatter.format(parseDate(endDate(startIso)))}`;
}

/** "Tue 3 Nov"; day without leading zero, short weekday, short month, Latin digits */
export function formatTopupDate(iso, language = "en") {
  const locale = { en: "en-GB", fr: "fr-FR", ar: "ar-TN-u-nu-latn" }[language] || "en-GB";
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });
  return formatter.format(parseDate(iso));
}

/** Escape text before putting it in innerHTML */
export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

export function newId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
