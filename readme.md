# Masrofi (مصروفي)

A simple weekly budget and savings tracker for students.

Tell the app how much money you received, add what you spend, and always see how much you can still spend. Saving for your goal happens automatically. No account, no email, no server: everything stays on your phone.

> **Version 0.1 (in progress).** Onboarding, 4 tabs (Home, History, Savings, Profile), monthly income mode, translations (English, French, Arabic with RTL) and the Profile screen are done. Restyling History, Savings and popups is underway (see [Roadmap](#roadmap)).

## How it works

- Weeks run Monday to Sunday. You create each week yourself with **+ Week** and enter the money received.
- For each week you choose how much to save (0 is allowed).
- `available = carry-over + received - saved`, and `remaining = available - expenses`.
- What is left at the end of a week becomes the next week's carry-over. You never type it.
- The app never lets a week end below zero. A change that would break a week is refused with a message.

Example: Week 1: 40 received, 10 saved, 1 spent gives 29.00 TND left. If you add Week 2 with 20 received and 10 saved, you start it with 29.00 carried over.

## Features

Working now:

- Weekly budget with automatic carry-over and a per-week savings amount
- Protection against negative balances
- Add, edit and delete weeks and expenses, with categories
- Savings goal (700 TND by default, editable) with progress and weeks-to-goal
- History of all weeks, each one expandable
- JSON backup: export and import
- Four themes: Dark (default), Light, Rose, Ocean
- Works offline and can be installed on a phone (PWA)
- Data saved in the browser (`localStorage`), nothing is sent anywhere

Done: onboarding, 4 tabs (Home, History, Savings, Profile), keypad expense entry with "slide to confirm", monthly income mode, Profile screen, English / French / Arabic with RTL.

## Run it locally

The app uses ES modules, so it must be served by a local server. Opening `index.html` by double-click will not work.

1. Open the folder in VS Code and install the **Live Server** extension, then click **Go Live**.
2. Or, with Python installed, run this in the project folder and open http://localhost:8000:

```bash
python -m http.server 8000
```

## Install on a phone

1. Host the folder on any free static host (GitHub Pages or Netlify).
2. Open the link in the phone browser.
3. iPhone: Share, then **Add to Home Screen**. Android: menu, then **Install app**.

Each time files change, bump `CACHE_NAME` in `sw.js` so phones download the new version.

## Your data

- Everything is stored on the device, in the browser's `localStorage`.
- Clearing the browser data erases the budget. Use **Export my budget** now and then to save a backup file (`masrofi-budget-YYYY-MM-DD.json`), and **Import** to restore it.
- Backups made by the older SaveIt prototype still load.

## Project structure

```text
index.html            app shell: header, main view, bottom tab bar
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline cache)
css/style.css         all styles and the four theme color sets
js/app.js             state, screen drawing, clicks
js/calc.js            all money math and validation
js/store.js           saving, loading, backup, profile
js/theme.js           theme list and switcher
js/weeks.js           add / edit / delete week
js/expenses.js        add / edit / delete expense, categories
js/modal.js           popups (forms and confirmations)
js/utils.js           money and date helpers
js/views/             dashboard, history, savings, shared parts
assets/icons/         icons and logo
```

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Themes

Dark, Light, Rose and Ocean. The theme is chosen from the Savings screen for now (it moves to Profile later). Each theme is a block of CSS variables in `css/style.css`, and all of them keep readable text contrast.

## Roadmap

1. Onboarding: splash, language, tutorial slides, first name, income type (Done)
2. Four tabs (Home, History, Savings, Profile), new Home, keypad expense screen with "slide to confirm" (Done)
3. Monthly income mode: enter what you got this month and the app splits it into weeks (Done)
4. Profile (name, income type, weekly saving, goal, theme, language, reminder) and translations with Arabic right-to-left (Done)
5. Restyle History, Savings and popups to match the new design
6. Final PWA check with the new Masrofi logo

## For contributors and AI assistants

Read [AGENTS.md](AGENTS.md) first. It lists the money rules, data model, module boundaries and the rules to follow when changing the code.