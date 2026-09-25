import {
  isNightModeActive as nightModeActiveFor,
  normalizeClockTime,
  normalizeNightMode,
  normalizeNightModeDays,
  resolveNightModeWindow,
  sleepTimerRemainingLabel as remainingLabelFor,
  sleepTimerRemainingMs as remainingMsFor,
} from "../state/night-mode.js";
import { isScheduleFormEditing } from "./schedule-form.js";
import { saveNightPreferences } from "./listening-tools.js";

// Night mode: the off / auto / on switch with its time window and active
// days, the quick row under the player, the chill mix, and the Night tab of
// the timers page. The theme overrides and the persistence payload stay on
// the card and read through the getters below.

const NIGHT_START = "22:00";
const NIGHT_END = "06:00";
const CHILL_KEYWORDS = ["sleep", "night", "chill", "calm", "relax", "ambient", "meditation", "dream", "lofi", "lo-fi", "soft"];

// ---------------------------------------------------------------------------
// Readers

export function mobileNightMode(card) {
  return normalizeNightMode(card._state.mobileNightMode);
}

export function nightModeDays(card) {
  return normalizeNightModeDays(card._state.mobileNightModeDays);
}

export function nightModeDayOptions(card) {
  return [
    [0, card._i18n("ui.sun")],
    [1, card._i18n("ui.mon")],
    [2, card._i18n("ui.tue")],
    [3, card._i18n("ui.wed")],
    [4, card._i18n("ui.thu")],
    [5, card._i18n("ui.fri")],
    [6, card._i18n("ui.sat")],
  ];
}

export function nightModeWindow(card) {
  return resolveNightModeWindow(
    card._state.mobileNightModeStart || NIGHT_START,
    card._state.mobileNightModeEnd || NIGHT_END,
    { start: NIGHT_START, end: NIGHT_END },
  );
}

export function isNightModeActive(card, date = new Date()) {
  const windowRange = nightModeWindow(card);
  return nightModeActiveFor({
    mode: mobileNightMode(card),
    start: windowRange.start,
    end: windowRange.end,
    days: nightModeDays(card),
    date,
  });
}

function sleepTimerActive(card) {
  return remainingMsFor(card._state.mobileSleepTimerEndsAt || 0) > 0;
}

function rebuildAround(card) {
  card._rebuildMobileUi({ reopenPage: card._state.menuOpen ? (card._state.menuPage || "settings") : "", reopenStudio: card._state.controlRoomOpen });
}

// ---------------------------------------------------------------------------
// Actions

export function cycleNightMode(card) {
  const order = ["auto", "on", "off"];
  const current = mobileNightMode(card);
  const next = order[(order.indexOf(current) + 1) % order.length];
  card._state.mobileNightMode = next;
  card._persistMobileAppearance();
  rebuildAround(card);
}

export async function playNightMix(card) {
  try {
    const [allPlaylists, likedPlaylists] = await Promise.allSettled([
      card._fetchLibrary("playlist", "sort_name", 500, false),
      card._fetchLibrary("playlist", "sort_name", 220, true),
    ]);
    const playlists = [
      ...(Array.isArray(allPlaylists.value) ? allPlaylists.value : []),
      ...(Array.isArray(likedPlaylists.value) ? likedPlaylists.value : []),
    ]
      .filter((item) => item?.uri)
      .filter((item, index, list) => list.findIndex((candidate) => candidate?.uri === item?.uri) === index);
    if (!playlists.length) {
      await card._playRandomFromPlaylists();
      return;
    }
    const matches = playlists.filter((item) => {
      const haystack = [
        item?.name,
        item?.metadata?.description,
        item?.description,
      ].filter(Boolean).join(" ").toLowerCase();
      return CHILL_KEYWORDS.some((keyword) => haystack.includes(keyword));
    });
    const pool = matches.length ? matches : playlists;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const ok = await card._playMedia(pick.uri, pick.media_type || "playlist", "play", {
      label: pick.name || card._i18n("ui.chill_mix"),
      silent: true,
    });
    if (ok) {
      card._toastSuccess(card._i18n("ui.starting_a_chill_mix"));
    }
  } catch (error) {
    card._toastError(error?.message || card._i18n("ui.could_not_start_chill_mix"));
  }
}

// ---------------------------------------------------------------------------
// Quick row under the player

export function nightQuickRowHtml(card) {
  const nightMode = mobileNightMode(card);
  if (nightMode === "off") return ``;
  const nightActive = isNightModeActive(card);
  return `
      <div class="night-quick-row ${nightMode === "auto" ? "auto-mode" : "on-mode"}" id="nightQuickRow" >
        <button class="night-quick-btn icon-only ${nightActive || nightMode === "on" ? "active" : "soft"}" id="nightModeQuickBtn" title="${card._esc(card._i18n("ui.night_mode"))}">
          ${card._iconSvg("moon")}
        </button>
        <button class="night-quick-btn icon-only ${sleepTimerActive(card) ? "active" : ""}" id="nightSleepBtn" title="${card._esc(card._i18n("ui.sleep_timer"))}" ${nightMode === "on" ? "" : "hidden"}>
          ${card._iconSvg("timer")}
        </button>
        <button class="night-quick-btn icon-only soft" id="nightChillBtn" title="${card._esc(card._i18n("ui.chill_mix"))}" ${nightMode === "on" ? "" : "hidden"}>
          ${card._iconSvg("wand")}
        </button>
      </div>`;
}

// The sleep button between them is bound by the card, next to the other
// sleep-timer controls.
export function bindNightQuickRow(card) {
  card.$("nightModeQuickBtn")?.addEventListener("click", (e) => {
    if (!card._pressUiButton(e.currentTarget)) return;
    cycleNightMode(card);
  });
  card.$("nightChillBtn")?.addEventListener("click", async (e) => {
    if (!card._pressUiButton(e.currentTarget)) return;
    await playNightMix(card);
  });
}

export function syncNightModeUi(card) {
  const host = card.shadowRoot?.querySelector(".card");
  const active = isNightModeActive(card);
  const mode = mobileNightMode(card);
  const sleepActive = sleepTimerActive(card);
  if (card._state.mobileNightRenderedActive !== active || card._state.mobileNightRenderedMode !== mode) {
    card._state.mobileNightRenderedActive = active;
    card._state.mobileNightRenderedMode = mode;
    if (isScheduleFormEditing(card)) {
      if (host) {
        host.classList.toggle("night-mode", active);
        host.classList.toggle("night-mode-enabled", mode !== "off");
      }
      return;
    }
    rebuildAround(card);
    return;
  }
  if (host) {
    host.classList.toggle("night-mode", active);
    host.classList.toggle("night-mode-enabled", mode !== "off");
  }
  card._syncTabletAutoFitUi();
  const row = card.$("nightQuickRow");
  if (row) {
    row.hidden = mode === "off";
    row.classList.toggle("auto-mode", mode === "auto");
    row.classList.toggle("on-mode", mode === "on");
  }
  const modeBtn = card.$("nightModeQuickBtn");
  if (modeBtn) {
    modeBtn.hidden = mode === "off";
    modeBtn.classList.toggle("active", active || mode === "on");
    modeBtn.classList.toggle("soft", mode === "auto" && !active);
    modeBtn.title = mode === "auto"
      ? card._i18n("ui.night_mode_auto_window", {
        start: nightModeWindow(card).start,
        end: nightModeWindow(card).end,
      })
      : mode === "on"
        ? card._i18n("ui.night_mode_is_always_on")
        : card._i18n("ui.night_mode_is_off");
  }
  const sleepBtn = card.$("nightSleepBtn");
  if (sleepBtn) {
    sleepBtn.hidden = mode !== "on";
    sleepBtn.classList.toggle("active", sleepActive);
    sleepBtn.title = sleepActive
      ? card._i18n("ui.sleep_timer_active_remaining", { remaining: remainingLabelFor(remainingMsFor(card._state.mobileSleepTimerEndsAt || 0)) })
      : card._i18n("ui.tap_to_start_a_sleep_timer");
  }
  const chillBtn = card.$("nightChillBtn");
  if (chillBtn) {
    chillBtn.hidden = mode !== "on";
  }
}

// ---------------------------------------------------------------------------
// Night tab on the timers page

export function nightTabHtml(card) {
  const nightMode = mobileNightMode(card);
  const nightWindow = nightModeWindow(card);
  const nightDays = new Set(nightModeDays(card));
  const nightScheduleControlsHtml = nightMode === "auto"
    ? `
        <div class="scheduled-start-grid two-col">
          <label class="night-time-card" for="mobileNightStartInput">
            <span class="night-time-label">${card._esc(card._i18n("ui.start_time_2"))}</span>
            <input class="night-time-input" id="mobileNightStartInput" data-schedule-form-control type="time" value="${card._esc(nightWindow.start)}" step="60" aria-label="${card._esc(card._i18n("ui.start_time_2"))}">
          </label>
          <label class="night-time-card" for="mobileNightEndInput">
            <span class="night-time-label">${card._esc(card._i18n("ui.end_time"))}</span>
            <input class="night-time-input" id="mobileNightEndInput" data-schedule-form-control type="time" value="${card._esc(nightWindow.end)}" step="60" aria-label="${card._esc(card._i18n("ui.end_time"))}">
          </label>
        </div>
        <div class="settings-label">${card._esc(card._i18n("ui.active_days"))}</div>
        <div class="settings-check-grid">
          ${nightModeDayOptions(card).map(([value, label]) => `
            <label class="settings-check-pill">
              <input type="checkbox" data-schedule-form-control data-setting-night-day="${card._esc(String(value))}" ${nightDays.has(value) ? "checked" : ""}>
              <span>${card._esc(label)}</span>
            </label>`).join("")}
        </div>
        <div class="settings-actions">
          <button class="settings-pill active" data-setting-night-window-save>${card._esc(card._i18n("ui.apply_schedule"))}</button>
        </div>
      `
    : `<div class="notice open">${card._esc(nightMode === "on"
        ? card._i18n("ui.night_mode_stays_on_until_you_choose_another_mode")
        : card._i18n("ui.night_mode_is_off_until_you_choose_another_mode"))}</div>`;
  return `
      <div class="settings-group scheduled-start-card schedule-panel-card schedule-night-card">
        <div class="settings-label">${card._esc(card._i18n("ui.night_mode"))}</div>
        <div class="settings-pills">
          ${card._settingsPill(card._i18n("ui.off"), "off", nightMode, "data-setting-night-mode")}
          ${card._settingsPill("Auto", "auto", nightMode, "data-setting-night-mode")}
          ${card._settingsPill(card._i18n("ui.on"), "on", nightMode, "data-setting-night-mode")}
        </div>
        ${nightScheduleControlsHtml}
      </div>
    `;
}

function checkedNightDays(card) {
  return Array.from(card.shadowRoot?.querySelectorAll("input[data-setting-night-day]:checked") || [])
    .map((input) => Number(input.dataset.settingNightDay))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

function previousNightPreferences(card) {
  return { night_mode: mobileNightMode(card), night_start: card._state.mobileNightModeStart, night_end: card._state.mobileNightModeEnd, night_days: [...nightModeDays(card)] };
}

export async function handleNightSettingsClick(card, eventTarget) {
  const nightModeBtn = eventTarget.closest("[data-setting-night-mode]");
  if (nightModeBtn?.dataset.settingNightMode) {
    const previousNight = previousNightPreferences(card);
    card._state.mobileScheduleControlActiveUntil = 0;
    card._flashInteraction(nightModeBtn);
    card._state.mobileNightMode = ["off", "auto", "on"].includes(nightModeBtn.dataset.settingNightMode)
      ? nightModeBtn.dataset.settingNightMode
      : "auto";
    if (!(await saveNightPreferences(card, previousNight))) return true;
    card._persistMobileAppearance();
    card._rebuildMobileUi({ reopenPage: card._state.menuOpen ? (card._state.menuPage || "sleep_timer") : "sleep_timer", reopenStudio: card._state.controlRoomOpen });
    return true;
  }
  const nightWindowSaveBtn = eventTarget.closest("[data-setting-night-window-save]");
  if (nightWindowSaveBtn) {
    const previousNight = previousNightPreferences(card);
    card._state.mobileScheduleControlActiveUntil = 0;
    card._flashInteraction(nightWindowSaveBtn);
    const startInput = card.$("mobileNightStartInput");
    const endInput = card.$("mobileNightEndInput");
    const checkedDays = checkedNightDays(card);
    card._state.mobileNightModeStart = normalizeClockTime(startInput?.value || NIGHT_START, NIGHT_START);
    card._state.mobileNightModeEnd = normalizeClockTime(endInput?.value || NIGHT_END, NIGHT_END);
    card._state.mobileNightModeDays = normalizeNightModeDays(checkedDays);
    if (!(await saveNightPreferences(card, previousNight))) return true;
    card._persistMobileAppearance();
    card._toastSuccess(card._i18n("ui.night_schedule_updated"));
    card._build();
    card._init();
    card._openMobileMenu(card._state.menuPage || "sleep_timer");
    return true;
  }
  return false;
}

export function handleNightFormChange(card, e) {
  const nightDayCheckbox = e.target?.closest?.("input[data-setting-night-day]");
  if (nightDayCheckbox) {
    card._state.mobileNightModeDays = normalizeNightModeDays(checkedNightDays(card));
    return true;
  }
  if (e.target?.id === "mobileNightStartInput" || e.target?.id === "mobileNightEndInput") {
    if (e.target.value) {
      if (e.target.id === "mobileNightStartInput") {
        card._state.mobileNightModeStart = normalizeClockTime(e.target.value, card._state.mobileNightModeStart || NIGHT_START);
      } else {
        card._state.mobileNightModeEnd = normalizeClockTime(e.target.value, card._state.mobileNightModeEnd || NIGHT_END);
      }
    }
    return true;
  }
  return false;
}
