import { icon } from "../icons.js";
import { t } from "../i18n.js";

const tutorialSlides = [
  {
    titleKey: "onboarding.tutorial.1.title",
    textKey: "onboarding.tutorial.1.text",
    ariaLabelKey: "onboarding.tutorial.1.aria",
    illustration: `
      <svg viewBox="0 0 300 300" role="img" aria-label="${t("onboarding.tutorial.1.aria")}" preserveAspectRatio="xMidYMid meet">
        <rect class="i-card" x="88" y="0" width="124" height="40" rx="20"></rect>
        <text class="i-accent" x="150" y="25" text-anchor="middle" font-size="15" font-weight="600">+ 40.00 TND</text>
        <ellipse class="i-card2" cx="150" cy="230" rx="70" ry="20"></ellipse>
        <ellipse class="i-card2" cx="150" cy="208" rx="70" ry="20"></ellipse>
        <ellipse class="i-card2" cx="150" cy="186" rx="70" ry="20"></ellipse>
        <ellipse class="i-card2" cx="150" cy="164" rx="70" ry="20"></ellipse>
        <ellipse class="i-accent" cx="150" cy="142" rx="70" ry="20"></ellipse>
        <text class="i-on" x="150" y="147" text-anchor="middle" font-size="13" font-weight="700">TND</text>
        <circle class="i-accent" cx="51" cy="71" r="11"></circle>
        <circle class="i-accent" cx="253" cy="48" r="8"></circle>
        <circle class="i-accent" cx="235" cy="120" r="10"></circle>
      </svg>
    `,
  },
  {
    titleKey: "onboarding.tutorial.2.title",
    textKey: "onboarding.tutorial.2.text",
    ariaLabelKey: "onboarding.tutorial.2.aria",
    illustration: `
      <svg viewBox="0 0 300 300" role="img" aria-label="${t("onboarding.tutorial.2.aria")}" preserveAspectRatio="xMidYMid meet">
        <rect class="i-card" x="30" y="15" width="150" height="270" rx="28" stroke-width="3"></rect>
        <text class="i-text" x="105" y="125" text-anchor="middle" font-size="38" font-weight="700">5.00</text>
        <text class="i-muted" x="105" y="152" text-anchor="middle" font-size="15" font-weight="500">TND</text>
        <rect class="i-accent" x="70" y="180" width="70" height="28" rx="14"></rect>
        <text class="i-on" x="105" y="199" text-anchor="middle" font-size="13" font-weight="600">${t("onboarding.tutorial.food")}</text>
        <rect class="i-card2" x="215" y="25" width="56" height="250" rx="28"></rect>
        <rect class="i-accent" x="215" y="115" width="56" height="160" rx="28" opacity=".35"></rect>
        <circle class="i-accent" cx="243" cy="135" r="24"></circle>
        <path d="M232 140l11-10 11 10" fill="none" stroke="var(--on-accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M232 149l11-10 11 10" fill="none" stroke="var(--on-accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".5"></path>
      </svg>
    `,
  },
  {
    titleKey: "onboarding.tutorial.3.title",
    textKey: "onboarding.tutorial.3.text",
    ariaLabelKey: "onboarding.tutorial.3.aria",
    illustration: `
      <div class="goal-card goal-card--preview" role="img" aria-label="${t("onboarding.tutorial.3.card.aria")}" dir="ltr">
        <div class="goal-card__row">
          <span>${t("onboarding.tutorial.3.card.savings")}</span>
          <span>${t("onboarding.tutorial.3.card.goal")}</span>
        </div>
        <div class="goal-card__amount">
          <strong dir="ltr">30.00</strong>
          <span dir="ltr">/ 500 TND</span>
        </div>
        <div class="goal-card__track" aria-hidden="true">
          <span class="goal-card__fill" style="width: 6%"></span>
        </div>
        <p class="goal-card__pct" dir="ltr">${t("onboarding.tutorial.3.card.pct")}</p>
      </div>
    `,
  },
];

export function renderOnboarding({ step, tutorialIndex, profile }) {
  if (step === "boot") {
    return `
      <section class="onboarding-screen splash-screen logo-screen">
        <div class="masrofi-logo" aria-label="Masrofi logo" role="img">
          <img src="./assets/logo/IconOnly_Transparent.png" alt="Masrofi logo" />
        </div>
      </section>
    `;
  }

  if (step === "splash") {
    return `
      <section class="onboarding-screen splash-screen welcome-screen">
        <div class="onboarding-logo-wrap welcome-logo">
          <img src="./assets/logo/IconOnly_Transparent.png" alt="Masrofi logo" />
        </div>
        <h1 class="welcome-title">${t("onboarding.welcome.title")} <span>${t("onboarding.welcome.brand")}</span></h1>
        <p class="onboarding-copy welcome-copy">${t("onboarding.welcome.subtitle")}</p>
        <button class="btn onboarding-primary welcome-button" data-action="onboard-start">${t("onboarding.welcome.button")}</button>
      </section>
    `;
  }

  if (step === "language") {
    const options = [
      { lang: "en", label: "English" },
      { lang: "fr", label: "Français" },
      { lang: "ar", label: "العربية" },
    ];
    return `
      <section class="onboarding-screen language-screen" aria-label="Language selection">
        <div class="language-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path d="M12 2.5a9.5 9.5 0 1 0 9.5 9.5A9.5 9.5 0 0 0 12 2.5Zm6.45 8.5h-2.3a14.8 14.8 0 0 0-1.38-4.1A8.06 8.06 0 0 1 18.45 11Zm-7.45-6.42A12.69 12.69 0 0 1 13.4 11h-2.8a12.69 12.69 0 0 1 1.4-6.42ZM7.55 13h2.3a14.8 14.8 0 0 0 1.38 4.1A8.06 8.06 0 0 1 7.55 13Zm7.45 6.42A12.69 12.69 0 0 1 10.6 13h2.8a12.69 12.69 0 0 1-1.4 6.42ZM13.4 13h2.8a8.06 8.06 0 0 1-3.68 4.1A14.8 14.8 0 0 0 13.4 13Zm-6.8 0h2.3a14.8 14.8 0 0 0 1.38-4.1A8.06 8.06 0 0 1 6.6 13Zm8.92-6.9A14.8 14.8 0 0 1 15.9 11h2.3a8.06 8.06 0 0 0-2.68-4.9Z" fill="currentColor"/>
          </svg>
        </div>
        <h1 class="language-title">${t("onboarding.language.title")}</h1>
        <p class="language-subtitle">${t("onboarding.language.subtitle")}</p>
        <div class="language-list" role="radiogroup" aria-label="Choose your language">
          ${options.map(({ lang, label }) => `
            <button
              type="button"
              class="language-row ${profile.language === lang ? "selected" : ""}"
              role="radio"
              aria-checked="${profile.language === lang ? "true" : "false"}"
              tabindex="${profile.language === lang ? "0" : "-1"}"
              data-action="set-language"
              data-lang="${lang}"
            >
              <span class="language-text">${label}</span>
              <span class="language-check" aria-hidden="true">${profile.language === lang ? "✓" : ""}</span>
            </button>
          `).join("")}
        </div>
        <div class="language-spacer"></div>
        <button type="button" class="btn primary full-width language-continue" data-action="onboard-next">${t("onboarding.language.continue")}</button>
      </section>
    `;
  }

  if (step === "tutorial") {
    const slideIndex = Math.min(Math.max(0, tutorialIndex || 0), tutorialSlides.length - 1);
    const slide = tutorialSlides[slideIndex];
    const isLast = slideIndex === tutorialSlides.length - 1;
    const buttonText = isLast ? t("onboarding.tutorial.button.start") : t("onboarding.tutorial.button.next");
    const dir = document.documentElement.dir === "rtl" ? "rtl" : "ltr";
    const offset = dir === "rtl" ? slideIndex * 100 : -(slideIndex * 100);

    return `
      <section class="onboarding-screen tutorial-screen" aria-live="polite">
        <div class="tutorial-topbar">
          <button type="button" class="tutorial-skip" data-action="onboard-skip">${t("onboarding.tutorial.skip")}</button>
        </div>

        <div class="tutorial-viewport" data-tutorial-viewport>
          <div class="tutorial-track" style="transform: translateX(${offset}%);">
            ${tutorialSlides.map((item, index) => `
              <article class="tutorial-slide ${index === slideIndex ? "active" : ""}" data-slide-index="${index}">
                <div class="tutorial-illustration" dir="ltr" role="img" aria-label="${t(item.ariaLabelKey)}">
                  ${item.illustration}
                </div>
                <div class="tutorial-copy-block">
                  <h2 class="tutorial-title">${t(item.titleKey)}</h2>
                  <p class="tutorial-text">${t(item.textKey)}</p>
                </div>
              </article>
            `).join("")}
          </div>
        </div>

        <div class="tutorial-dots" role="tablist" aria-label="Tutorial slides">
          ${tutorialSlides.map((_, index) => `
            <button
              type="button"
              class="tutorial-dot ${index === slideIndex ? "active" : ""}"
              data-action="onboard-dot"
              data-index="${index}"
              aria-label="Slide ${index + 1} of ${tutorialSlides.length}"
              aria-current="${index === slideIndex ? "true" : "false"}"
            ></button>
          `).join("")}
        </div>

        <button type="button" class="btn onboarding-primary tutorial-button" data-action="onboard-next">${buttonText}</button>
      </section>
    `;
  }

  if (step === "name") {
    return `
      <section class="onboarding-screen">
        <p class="eyebrow">${t("onboarding.name.label")}</p>
        <h1>${t("onboarding.name.title")}</h1>
        <div class="field onboarding-field">
          <label for="onboarding-name">${t("onboarding.name.field")}</label>
          <input id="onboarding-name" name="name" type="text" value="${profile.name || ""}" maxlength="30" placeholder="${t("onboarding.name.placeholder")}" />
        </div>
        <div class="onboarding-actions">
          <button class="btn secondary" data-action="onboard-prev">${t("onboarding.back")}</button>
          <button class="btn" data-action="onboard-save-name">${t("onboarding.name.continue")}</button>
        </div>
      </section>
    `;
  }

  if (step === "income" || step !== "reminders") {
    const selectedMode = ["weekly", "monthly", "daily"].includes(profile.incomeMode) ? profile.incomeMode : "weekly";
  const weeklySelected = selectedMode === "weekly";
  const monthlySelected = selectedMode === "monthly";
  const dailySelected = selectedMode === "daily";

  return `
    <section class="onboarding-screen income-screen" aria-label="${t("onboarding.income.title")}">
      <div class="income-icon" aria-hidden="true">${icon("wallet", 24)}</div>
      <h1 class="income-title">${t("onboarding.income.title")}</h1>
      <p class="income-subtitle">${t("onboarding.income.subtitle")}</p>

      <div class="income-options" role="radiogroup" aria-label="${t("onboarding.income.title")}">
        <button
          type="button"
          class="income-option ${weeklySelected ? "selected" : ""}"
          role="radio"
          aria-checked="${weeklySelected ? "true" : "false"}"
          data-action="set-income-mode"
          data-mode="weekly"
        >
          <span class="income-option-icon" aria-hidden="true">${icon("cal", 24)}</span>
          <span class="income-option-copy">
            <span class="income-option-title">${t("onboarding.income.weekly.title")}</span>
            <span class="income-option-text">${t("onboarding.income.weekly.text")}</span>
          </span>
          <span class="income-option-check-wrap" aria-hidden="true">
            <span class="income-option-check">${icon("check", 16)}</span>
          </span>
        </button>

        <button
          type="button"
          class="income-option ${monthlySelected ? "selected" : ""}"
          role="radio"
          aria-checked="${monthlySelected ? "true" : "false"}"
          data-action="set-income-mode"
          data-mode="monthly"
        >
          <span class="income-option-icon" aria-hidden="true">${icon("cal2", 24)}</span>
          <span class="income-option-copy">
            <span class="income-option-title">${t("onboarding.income.monthly.title")}</span>
            <span class="income-option-text">${t("onboarding.income.monthly.text")}</span>
          </span>
          <span class="income-option-check-wrap" aria-hidden="true">
            <span class="income-option-check">${icon("check", 16)}</span>
          </span>
        </button>

        <button
          type="button"
          class="income-option ${dailySelected ? "selected" : ""}"
          role="radio"
          aria-checked="${dailySelected ? "true" : "false"}"
          data-action="set-income-mode"
          data-mode="daily"
        >
          <span class="income-option-icon" aria-hidden="true">${icon("coins", 24)}</span>
          <span class="income-option-copy">
            <span class="income-option-title">${t("onboarding.income.daily.title")}</span>
            <span class="income-option-text">${t("onboarding.income.daily.text")}</span>
          </span>
          <span class="income-option-check-wrap" aria-hidden="true">
            <span class="income-option-check">${icon("check", 16)}</span>
          </span>
        </button>
      </div>

      <div class="income-spacer"></div>
      <button type="button" class="btn income-continue" data-action="onboard-finish-income">${t("onboarding.income.button")}</button>
    </section>
  `;
  }

  const hasNotification = typeof window !== "undefined" && typeof window.Notification !== "undefined";
  const permission = hasNotification ? window.Notification.permission : "unsupported";

  return `
    <section class="onboarding-screen reminders-screen" aria-label="${t("onboarding.reminders.title")}">
      <div class="reminders-icon" aria-hidden="true">${icon("bell", 32)}</div>
      <h1 class="reminders-title">${t("onboarding.reminders.title")}</h1>
      <p class="reminders-subtitle">${t("onboarding.reminders.subtitle")}</p>

      ${!hasNotification ? `
        <div class="reminders-note">
          <p>${t("onboarding.reminders.iosPrompt")}</p>
        </div>
        <div class="reminders-spacer"></div>
        <button type="button" class="btn onboarding-primary full-width" data-action="onboard-finish">${t("onboarding.reminders.continue")}</button>
      ` : permission === "denied" ? `
        <div class="reminders-note">
          <p>${t("onboarding.reminders.denied")}</p>
        </div>
        <div class="reminders-spacer"></div>
        <button type="button" class="btn onboarding-primary full-width" data-action="onboard-finish">${t("onboarding.reminders.continue")}</button>
      ` : `
        <div class="reminders-spacer"></div>
        <div class="onboarding-actions-col">
          <button type="button" class="btn onboarding-primary full-width" data-action="onboard-enable-reminders">${t("onboarding.reminders.enable")}</button>
          <button type="button" class="btn text-btn full-width" data-action="onboard-finish">${t("onboarding.reminders.skip")}</button>
        </div>
      `}
    </section>
  `;
}
