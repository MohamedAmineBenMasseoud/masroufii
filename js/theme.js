// theme.js: the list of themes and the function that switches between them.
// The colors themselves live in css/style.css (one block per theme, selected by <html data-theme="...">).
// No money logic and no storage here.

export const THEMES = [
  { id: "dark", label: "Dark", dot: "#46e5d1", bg: "#080d10" },
  { id: "light", label: "Light", dot: "#08736b", bg: "#edf4f5" },
  { id: "rose", label: "Rose", dot: "#e8d2c4", bg: "#3e3239" },
  { id: "forest", label: "Forest", dot: "#8eb69b", bg: "#051f20" },
  { id: "ocean", label: "Ocean", dot: "#3dd7f4", bg: "#06141b" },
];
export const DEFAULT_THEME = "dark";
export const THEME_IDS = THEMES.map((t) => t.id);

/** Switch the whole app to a theme. Unknown ids fall back to the default theme. */
export function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === DEFAULT_THEME);
  document.documentElement.dataset.theme = theme.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.bg); // colors the phone's status bar in the installed app
}
