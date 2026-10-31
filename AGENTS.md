# AGENTS.md

Instructions for AI coding assistants (GitHub Copilot, Claude, etc.) working on this project.
This file is the source of truth. It replaces the old SaveIt prototype notes.

## Project overview

**Masrofi (مصروفي)** is a personal weekly budget and savings tracker for students. It is a static browser app built with plain HTML, CSS and JavaScript ES modules. There is no framework, no build step and no backend. Data is stored in the browser (`localStorage`). It is a mobile-first PWA that can be installed on a phone. Currency: TND.

The user only does three things: says how much money they received, says what they spent, and looks at how much they can still spend. Everything else is automatic.

Constraints: free tools only, no accounts, no emails, data stays on the phone.

## Status (v0.1 in progress)

Done:
- Step 1: Renamed to Masrofi, five themes (dark, light, rose, forest, ocean), profile model, service worker.
- Step 2: Onboarding (splash, language, tutorial slides, name, income mode), 4 tabs (Home, History, Savings, Profile), keypad expense screen with slide-up confirm.
- Step 3: Monthly mode (month creation, week generation, editing plans, over-budget validation).
- Step 4: Profile screen and translations (English, French, Arabic with RTL).

In progress:
- Step 5: Restyle History, Savings and popups to match the design.

Planned:
- Step 6: Final PWA check (offline, install, icons, new Masrofi logo).

The design lives in Figma (file "Masrofi v0.1"). If a screen is not described here, ask for a screenshot instead of guessing.

## Money rules (never break these)

- Weeks run Monday to Sunday. The user creates weeks themselves.
- Per week: `total = carry + received`, `available = total - saved`, `remaining = available - expenses`.
- `saved` is chosen per week. 0 is allowed. Old data without `saved` defaults to 10 (`WEEKLY_SAVINGS`).
- `remaining` automatically becomes the next week's `carry`. The user never types a carry-over.
- No week may ever end below zero. Any change (add/edit/delete a week or an expense) that would make a week negative is refused with a clear message.
- Savings goal defaults to 700 TND and is editable.
- Reference example: Week 1: 40 received, 10 saved, 1 water -> remaining 29.00. Week 2: 20 received, 10 saved, 3.50 spent -> 6.50. Week 3: 6.50 carry + 20 = 26.50, minus 10 saved = 16.50 available, minus 1 water -> 15.50.

### Monthly mode (planned)

For people who get money once a month. The user enters the month, the money received that month and the saving per week.
- The app creates one week per Monday that falls in that month (4 or 5).
- Spend per week = `(income - saving x weeks) / weeks`. Each created week has `received = spend + saved`.
- Each week's spend and save can be edited. The plan must always add up: `sum of received <= income`. If not, show "Over by X TND" and block saving.
- Unspent money moves to the next week through the normal carry-over. Weeks stay the single source of truth for all calculations; a month is only a plan on top of them (`months: [{ id, label, income, weekIds }]`).

## Data model

```json
{
  "goal": 700,
  "weeks": [
    { "id": "uuid", "startDate": "YYYY-MM-DD", "received": 40, "saved": 10,
      "expenses": [ { "name": "Water", "amount": 1, "category": "Water" } ] }
  ],
  "profile": { "name": "", "language": "en", "theme": "dark", "incomeMode": "weekly" }
}
```

- `startDate` is always a Monday. Expenses have no id; they are addressed by index inside their week.
- `language`: `en | fr | ar`. `theme`: `dark | light | rose | ocean`. `incomeMode`: `weekly | monthly`.
- localStorage key: `savings-budget-v1` (legacy key `legacy-budget-v1` is still read). Do not rename it.
- Backup file: `masrofi-budget-YYYY-MM-DD.json`. Old backups (without `profile` or `saved`) must keep loading.

## Architecture

```text
index.html            app shell: header, <main id="view">, bottom tab bar, module script
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline app shell). Bump CACHE_NAME on every release
css/style.css         all styles; theme tokens in :root and :root[data-theme="..."]
js/app.js             state, render(), commit(), click delegation, import flow
js/calc.js            ALL money math and validation
js/store.js           localStorage, backup normalize/export/import, profile defaults
js/theme.js           THEMES list and applyTheme()
js/weeks.js           add / edit / delete week logic
js/expenses.js        add / edit / delete expense logic, categories
js/modal.js           openForm / confirmDialog / closeModal
js/utils.js           money, dates, escapeHtml
js/views/             dashboard.js, history.js, savings.js, parts.js (return HTML strings)
assets/icons/         PNG icons and logo
```

New modules planned: `i18n.js` (translations and RTL), `months.js` (monthly plan logic), `onboarding` and `profile` views.

### Key contracts

- `calc.js`: `computeWeeks(weeks)` sorts by date and adds `number, carry, total, available, spent, remaining, saved`. `isValid(computed)`, `savingsSummary(computed, goal)`, `totals(computed)`, and `applyChange(data, mutate)` which clones the data, runs `mutate(copy)` (it may return an error string to refuse), validates, and returns `{ ok: true, data }` or `{ ok: false, error }`. The original data is never mutated.
- `store.js`: `createEmpty()`, `cleanProfile(raw)` (never throws), `normalize(raw)` (throws readable errors), `load()`, `save(data)` (true/false), `clear()`, `exportData(data)`, `parseBackup(text)`, `importFile(file)`.
- `modal.js`: `openForm({ title, fields, onSubmit, note, submitLabel })`; `onSubmit` may return `{ ok: false, error }` to keep the popup open. `confirmDialog({ title, message, confirmLabel, danger })` returns a Promise of true/false.
- `app.js`: `render()` draws the current page; `commit(result)` saves and re-renders on success and returns the result so forms can show errors. One document-level click handler: `[data-page]` switches screens, `[data-action]` runs the `actions` table.

## Change rules

- Work on ONE step or ONE file at a time. Never generate the whole project in one go.
- Prefer minimal diffs over rewrites. Do not rewrite working code to improve style.
- Keep module boundaries. Do not merge unrelated logic into one file.
- Do not add frameworks, libraries, build tools or backend dependencies (the only allowed exception is lottie-web / lottie_light.min.js for UI animations). Free tools only.
- Do not rename or move files and folders.
- If a change could break existing behavior (money math, saved data, backups), say so before doing it.
- Keep old saved data and old backups loading. Any new field must have a safe default.
- If a fact cannot be determined from the repository, answer: `Not identified in the current project.`

## JavaScript rules

- Views only build HTML strings. Clicks use `data-action` / `data-page`. No inline event handlers.
- All money rules live in `calc.js` and `store.js`. No arithmetic in views or forms.
- Logic functions never mutate their input and return `{ ok, data }` or `{ ok: false, error }`.
- Always escape user text with `escapeHtml`.
- No `alert()` for new features; show errors inside the popup or screen.
- Dashboard "current week" = the latest week by date. History cards are `<details class="history-week" data-week="id">` and the latest is open by default.

## CSS rules

- Colors come from the CSS variables in `:root` and `:root[data-theme="..."]`. Never hard-code a color in a component rule. A new color means a new token in all four themes.
- Every theme must keep text contrast of at least 4.5:1 (text, muted text, text on accent, accent text, danger text).
- Keep the mobile-first shell (`max-width: 480px`), the fixed bottom tab bar, safe-area support, and inputs at `font-size: 16px` (stops iOS zoom).
- Arabic needs `dir="rtl"`. Use logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline`) in new CSS so RTL works without extra rules.

## i18n rules (planned)

- Languages: English, French, Arabic. All user-facing text goes through a translation function, never hard-coded in views.
- Numbers and TND amounts keep Latin digits in every language.

## Running and testing

- Open the folder in VS Code and use Live Server, or run `python -m http.server`. Opening `index.html` by double-click does not work (ES modules).
- Test money logic with Node and screens with jsdom when possible. Report what was tested and the results.

## Before finishing any change

1. Confirm only the intended files were edited, and list them.
2. Confirm every file listed in `sw.js` exists, and bump `CACHE_NAME`.
3. Confirm `data-page` navigation and `data-action` buttons still work.
4. Confirm popups still open, show errors inline, and close.
5. Confirm the money rules above still hold, including the reference example.
6. Confirm an old backup and old saved data still load.
7. Confirm all four themes still look right and keep the contrast rule.
8. Confirm there are no JavaScript errors in the browser console.