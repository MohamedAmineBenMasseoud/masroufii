/** Pure amount keypad editing. */
export function pressKey(current, key) {
  const value = String(current ?? "");
  if (key === "back") return value.slice(0, -1);
  if (key === ".") {
    if (value.includes(".")) return value;
    return value ? `${value}.` : "0.";
  }
  if (!/^[0-9]$/.test(String(key))) return value;
  if (value.replace(/\D/g, "").length >= 6) return value;
  if (value.includes(".") && value.split(".")[1].length >= 2) return value;
  if (value === "0") return key === "0" ? value : String(key);
  return `${value}${key}`;
}
