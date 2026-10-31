export const SLIDE_CONFIRM_AT = 0.85;

export function slideProgress(startY, currentY, travel) {
  if (!(travel > 0)) return 0;
  return Math.min(1, Math.max(0, (startY - currentY) / travel));
}

export function shouldConfirm(progress) {
  // Require 85% travel so a short accidental movement cannot submit an expense.
  return Number(progress) >= SLIDE_CONFIRM_AT;
}
