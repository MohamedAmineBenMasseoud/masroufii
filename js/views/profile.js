// views/profile.js: Profile screen with user info, Money settings, Preferences, and Data actions.
import { WEEKLY_SAVINGS } from "../calc.js";
import { t } from "../i18n.js";
import { THEMES } from "../theme.js";
import { escapeHtml, money } from "../utils.js";

export function renderProfile(profile, goal) {
  const name = (profile?.name || "").trim();
  const avatarLetter = escapeHtml(name ? name.charAt(0).toUpperCase() : "M");
  const displayName = name ? escapeHtml(name) : t("profile.defaultName");
  const isMonthly = profile?.incomeMode === "monthly";
  const isDaily = profile?.incomeMode === "daily";
  const subtitle = t(isDaily ? "profile.dailyMode" : isMonthly ? "profile.monthlyMode" : "profile.weeklyMode");
  const weeklySaving = profile?.weeklySaving ?? WEEKLY_SAVINGS;
  const dailyAmount = profile?.dailyAmount ?? 0;
  const dailySaving = profile?.dailySaving ?? 0;
  const themeObj = THEMES.find((th) => th.id === profile?.theme) || THEMES[0];
  const currentTheme = t(`theme.${themeObj.id}`) || themeObj.label;
  const langLabels = { en: "English", fr: "Français", ar: "العربية" };
  const currentLang = langLabels[profile?.language] || "English";
  const notifs = profile?.notifications || {};
  const hasNotification = typeof window !== "undefined" && typeof window.Notification !== "undefined";
  const perm = hasNotification ? window.Notification.permission : "unsupported";
  const permLabel = perm === "granted"
    ? t("profile.reminders.granted")
    : perm === "denied"
    ? t("profile.reminders.denied")
    : perm === "default"
    ? t("profile.reminders.default")
    : t("profile.reminders.unsupported");
  const canRequest = perm === "default";

  const incomeTypeValue = isDaily ? t("profile.dailyMode") : t(isMonthly ? "profile.monthly" : "profile.weekly");

  return `
    <div class="profile-screen">
      <div class="screen-header">
        <h2 class="profile-title">${t("profile.title")}</h2>
      </div>

      <section class="profile-user-card card">
        <div class="profile-avatar" aria-hidden="true">${avatarLetter}</div>
        <div class="profile-user-info">
          <div class="profile-name">${displayName}</div>
          <div class="profile-subtitle">${subtitle}</div>
        </div>
        <button type="button" class="profile-edit-btn" data-action="profile-edit-name" aria-label="${t("profile.editNameTitle")}">
          <span class="profile-edit-icon" data-icon="pencil" data-size="14" aria-hidden="true"></span>
          <span>${t("profile.edit")}</span>
        </button>
      </section>

      <div class="profile-section-title">${t("profile.section.money")}</div>
      <section class="profile-card card">
        <button type="button" class="profile-row" data-action="profile-edit-income-type">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="cal" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.incomeType")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${incomeTypeValue}</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>

        ${isDaily ? `
        <button type="button" class="profile-row" data-action="profile-edit-daily-amount">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="wallet" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.dailyAmount")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${money(dailyAmount)}</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>

        <button type="button" class="profile-row" data-action="profile-edit-daily-saving">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="coins" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.dailySaving")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${money(dailySaving)}</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>
        ` : `
        <button type="button" class="profile-row" data-action="profile-edit-weekly-saving">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="coins" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.weeklySaving")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${money(weeklySaving)}</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>
        `}

        <button type="button" class="profile-row" data-action="edit-goal">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="target" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.savingsGoal")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${goal} TND</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>
      </section>

      <div class="profile-section-title">${t("profile.section.preferences")}</div>
      <section class="profile-card card">
        <button type="button" class="profile-row" data-action="profile-edit-theme">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="palette" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.theme")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${escapeHtml(currentTheme)}</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>

        <button type="button" class="profile-row" data-action="profile-edit-language">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="globe" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.language")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${escapeHtml(currentLang)}</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>

        <button type="button" class="profile-row" data-action="profile-currency">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="wallet" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.currency")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">TND</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>

      </section>

      <div class="profile-section-title">${t("profile.section.reminders")}</div>
      <section class="profile-card card">
        <div class="profile-row profile-row-static">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="bell" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.reminders.permission")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${permLabel}</span>
            ${canRequest ? `
              <button type="button" class="profile-btn-pill" data-action="request-notification-permission">${t("profile.reminders.request")}</button>
            ` : ""}
          </div>
        </div>

        <div class="profile-row profile-row-static">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="wallet" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.reminders.money")}</span>
          </div>
          <div class="profile-row-right">
            <button type="button" class="profile-switch" role="switch" aria-checked="${notifs.money ? "true" : "false"}" data-action="toggle-money-reminder" aria-label="${t("profile.reminders.money")}">
              <span class="profile-switch-knob" aria-hidden="true"></span>
            </button>
          </div>
        </div>

        <button type="button" class="profile-row" data-action="edit-money-time">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="cal" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.reminders.time")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${notifs.moneyTime || "12:00"}</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>

        <div class="profile-row profile-row-static">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="coins" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.reminders.night")}</span>
          </div>
          <div class="profile-row-right">
            <button type="button" class="profile-switch" role="switch" aria-checked="${notifs.night ? "true" : "false"}" data-action="toggle-night-reminder" aria-label="${t("profile.reminders.night")}">
              <span class="profile-switch-knob" aria-hidden="true"></span>
            </button>
          </div>
        </div>

        <button type="button" class="profile-row" data-action="edit-night-time">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="cal" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.reminders.time")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-value">${notifs.nightTime || "21:30"}</span>
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>
      </section>

      <div class="profile-section-title">${t("profile.section.data")}</div>
      <section class="profile-card card">
        <button type="button" class="profile-row" data-action="profile-backup-reset">
          <div class="profile-row-left">
            <span class="profile-row-icon" data-icon="export" data-size="20" aria-hidden="true"></span>
            <span class="profile-row-label">${t("profile.backupReset")}</span>
          </div>
          <div class="profile-row-right">
            <span class="profile-row-chevron" data-icon="chev" data-size="16" aria-hidden="true"></span>
          </div>
        </button>
      </section>
    </div>`;
}
