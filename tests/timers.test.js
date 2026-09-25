// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindSleepTimerCorner,
  handleTimersFormChange,
  handleTimersMenuClick,
  isScheduleFormControl,
  isScheduleFormEditing,
  markScheduleFormControlActive,
  renderTimersPage,
  sleepTimerCornerInnerHtml,
  sleepTimerFabHtml,
  syncMobileTimerAction,
  syncScheduledStartState,
  syncSleepTimerChip,
  syncSleepTimerState,
  timersPageHtml,
} from "../src/core/media/timers.js";

const { document, MouseEvent } = globalThis;
const players = [
  { entity_id: "media_player.kitchen", state: "playing", attributes: { friendly_name: "Kitchen <Speaker>", app_id: "music_assistant" } },
  { entity_id: "media_player.bedroom", state: "idle", attributes: { friendly_name: "Bedroom", app_id: "music_assistant" } },
];
const schedule = (extra = {}) => ({
  id: "wake_1", enabled: true, time: "07:30", player: "media_player.kitchen", playlist: "library://playlist/1",
  playlistName: "Morning \"Mix\"", volume: 40, days: [1, 2, 3, 4, 5], lastRunKey: "", afterRun: "keep", ...extra,
});

// A card stub with only the helpers the module reaches for. Engine sync is off,
// so actions resolve locally the way they do when no Engine is configured.
function stubCard(state = {}) {
  const root = document.createElement("div");
  root.innerHTML = '<div class="card"><div id="sleepTimerCorner" hidden></div><div id="mobileMenuBody"></div></div>';
  document.body.append(root);
  const card = {
    shadowRoot: root,
    $: (id) => root.querySelector(`#${id}`),
    _config: {},
    _hass: { entities: {} },
    _state: {
      mobileSleepTimerEndsAt: 0, mobileSleepTimerPlayer: "", mobileSleepTimerOrigin: "", mobileSleepTimerMenuOpen: false,
      mobileStartSchedules: [], mobileStartScheduleEditId: "", mobileStartTimerEnabled: false, mobileStartTimerDays: [0, 1, 2, 3, 4, 5, 6],
      mobileStartTimerPlaylists: [], mobileSchedulesTab: "timers", selectedPlayer: "media_player.kitchen", players, menuOpen: true, menuPage: "sleep_timer",
      ...state,
    },
    _m: (text) => text,
    _i18n: (key, params) => (params ? `${key}:${Object.values(params).join(",")}` : key),
    _esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    _iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
    _settingsPill: (label, value, current, attr) => `<button ${attr}="${value}" class="settings-pill ${value === current ? "active" : ""}">${label}</button>`,
    _normalizeClockTime: (value, fallback) => (/^\d\d:\d\d$/.test(String(value || "")) ? value : fallback),
    _normalizeNightModeDays: (days) => (Array.isArray(days) && days.length ? days.map(Number) : [0, 1, 2, 3, 4, 5, 6]),
    _nightModeDayOptions: () => [[0, "Sun"], [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"]],
    _mobileNightMode: () => "off",
    _nightModeWindow: () => ({ start: "22:00", end: "06:00" }),
    _nightModeDays: () => [0, 1, 2, 3, 4, 5, 6],
    _mobileQuickActions: () => ["timer"],
    _loadPlayers: vi.fn(),
    _playerByEntityId: (id) => players.find((player) => player.entity_id === id) || null,
    _getSelectedPlayer: () => players[0],
    _isDirectMaPlayer: () => true,
    _normalizeMediaItem: (item) => item,
    _loadingStateHtml: (text) => `<div class="notice">${text}</div>`,
    _maverickEngineEnabled: () => false,
    _maverickEngineRequired: () => false,
    _callMaverickEnginePlayerCommand: vi.fn(async () => true),
    _setPlayerVolumeFor: vi.fn(async () => true),
    _playMediaOnPlayer: vi.fn(async () => true),
    _fetchLibrary: vi.fn(async () => [{ uri: "library://playlist/1", name: "Morning Mix", media_type: "playlist" }]),
    _persistMobileAppearance: vi.fn(),
    _writeSchedulesToLocalStorage: vi.fn(),
    _syncNightModeUi: vi.fn(),
    _rebuildMobileUi: vi.fn(),
    _renderMobileMenu: vi.fn(async () => {}),
    _flashInteraction: vi.fn(),
    _pressUiButton: () => true,
    _toast: vi.fn(), _toastError: vi.fn(), _toastSuccess: vi.fn(),
  };
  return { card, root };
}
const click = (el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
afterEach(() => { document.body.innerHTML = ""; });

describe("timers page render", () => {
  it("shows presets without a cancel button until a timer is running", () => {
    const { card } = stubCard();
    let html = timersPageHtml(card);
    expect(html).toContain("ui.no_sleep_timer_is_active");
    expect(html.match(/data-sleep-timer-start="(\d+)"/g)).toEqual(['data-sleep-timer-start="15"', 'data-sleep-timer-start="30"', 'data-sleep-timer-start="60"']);
    expect(html).not.toContain("data-sleep-timer-cancel");
    card._state.mobileSleepTimerEndsAt = Date.now() + 15 * 60000;
    html = timersPageHtml(card);
    expect(html).toContain("Active for 15m");
    expect(html).toContain("data-sleep-timer-cancel");
    expect(card._loadPlayers).toHaveBeenCalled();
  });
  it("lists wake schedules with escaped names and opens the editor for a draft", () => {
    const { card } = stubCard({ mobileSchedulesTab: "wake", mobileStartSchedules: [schedule(), schedule({ id: "wake_2", enabled: false })] });
    let html = timersPageHtml(card);
    expect(html).toContain('data-start-schedule-edit="wake_1"');
    expect(html).toContain("Kitchen &lt;Speaker>");
    expect(html).toContain("Morning &quot;Mix&quot;");
    expect(html.match(/class="schedule-row disabled/g)).toHaveLength(1);
    expect(html).not.toContain("scheduledStartTimeInput");
    card._state.mobileStartScheduleEditId = "__new__";
    card._state.mobileStartTimerTime = "06:45";
    html = timersPageHtml(card);
    expect(html).toContain('id="scheduledStartTimeInput"');
    expect(html).toContain('value="06:45"');
    expect(html).toContain('<option value="media_player.kitchen" selected>');
    expect(html).toContain("ui.create_schedule");
    expect(html).not.toContain("data-start-timer-clear");
  });
  it("renders the night tab from the card's night mode", () => {
    const { card } = stubCard({ mobileSchedulesTab: "night" });
    expect(timersPageHtml(card)).toContain("ui.night_mode_is_off_until_you_choose_another_mode");
    card._mobileNightMode = () => "auto";
    const html = timersPageHtml(card);
    expect(html).toContain('id="mobileNightStartInput"');
    expect(html).toContain("data-setting-night-window-save");
    expect(html).toContain('data-schedule-tab="night"');
  });
  it("renders the corner chip and the quick-action button from the same timer state", () => {
    const { card } = stubCard();
    expect(sleepTimerCornerInnerHtml(card)).toBe("");
    expect(sleepTimerFabHtml(card)).toContain('class="mobile-timer-label" hidden');
    card._state.mobileSleepTimerEndsAt = Date.now() + 90 * 1000;
    const chip = sleepTimerCornerInnerHtml(card);
    expect(chip).toContain('id="sleepTimerMenu" hidden');
    expect(chip.match(/data-sleep-timer-add="(\d+)"/g)).toHaveLength(3);
    expect(chip).toMatch(/<span id="sleepTimerChipLabel">1:(29|30)<\/span>/);
    card._state.mobileSleepTimerMenuOpen = true;
    expect(sleepTimerCornerInnerHtml(card)).toContain('id="sleepTimerMenu">');
    expect(sleepTimerFabHtml(card)).toContain("mobile-timer-fab active");
  });
  it("hydrates, loads playlists and renders the page only while still current", async () => {
    const { card } = stubCard();
    const body = document.createElement("div");
    await renderTimersPage(card, body, () => false);
    expect(body.innerHTML).toContain("ui.loading_schedules");
    expect(card._fetchLibrary).toHaveBeenCalled();
    await renderTimersPage(card, body, () => true);
    expect(body.querySelector(".schedule-tabs")).not.toBeNull();
  });
});

describe("timers page bind", () => {
  it("toggles the corner menu, extends the timer and closes on an outside click", async () => {
    const { card, root } = stubCard({ mobileSleepTimerEndsAt: Date.now() + 10 * 60000 });
    bindSleepTimerCorner(card);
    syncSleepTimerChip(card);
    const corner = root.querySelector("#sleepTimerCorner");
    expect(corner.hidden).toBe(false);
    click(corner.querySelector("#sleepTimerChip"));
    expect(card._state.mobileSleepTimerMenuOpen).toBe(true);
    expect(corner.querySelector("#sleepTimerMenu").hidden).toBe(false);
    click(corner.querySelector('[data-sleep-timer-add="30"]'));
    await vi.waitFor(() => expect(card._toastSuccess).toHaveBeenCalledWith("ui.sleep_timer_added_minutes:30"));
    expect(card._state.mobileSleepTimerEndsAt).toBeGreaterThan(Date.now() + 39 * 60000);
    expect(card._state.mobileSleepTimerMenuOpen).toBe(false);
    click(corner.querySelector("#sleepTimerChip"));
    expect(card._state.mobileSleepTimerMenuOpen).toBe(true);
    click(root.querySelector("#mobileMenuBody"));
    expect(card._state.mobileSleepTimerMenuOpen).toBe(false);
    click(corner.querySelector("[data-sleep-timer-clear]"));
    await vi.waitFor(() => expect(card._toast).toHaveBeenCalledWith("ui.sleep_timer_cleared"));
    expect(card._state.mobileSleepTimerEndsAt).toBe(0);
    expect(corner.hidden).toBe(true);
  });
  it("handles tab, preset and cancel clicks and re-renders the page", async () => {
    const { card, root } = stubCard();
    const body = root.querySelector("#mobileMenuBody");
    body.innerHTML = timersPageHtml(card);
    const dispatch = (selector) => { const target = body.querySelector(selector); const event = new MouseEvent("click", { bubbles: true, cancelable: true }); Object.defineProperty(event, "target", { value: target }); return handleTimersMenuClick(card, event, target); };
    expect(await dispatch('[data-schedule-tab="wake"]')).toBe(true);
    expect(card._state.mobileSchedulesTab).toBe("wake");
    expect(card._renderMobileMenu).toHaveBeenCalledTimes(1);
    expect(await dispatch('[data-sleep-timer-start="30"]')).toBe(true);
    expect(card._state.mobileSleepTimerPlayer).toBe("media_player.kitchen");
    expect(card._state.mobileSleepTimerEndsAt).toBeGreaterThan(Date.now() + 29 * 60000);
    card._state.mobileSchedulesTab = "timers";
    body.innerHTML = timersPageHtml(card);
    expect(await dispatch("[data-sleep-timer-cancel]")).toBe(true);
    expect(card._state.mobileSleepTimerEndsAt).toBe(0);
    const unrelated = document.createElement("button");
    body.append(unrelated);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(await handleTimersMenuClick(card, event, unrelated)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });
  it("creates, edits, toggles and deletes wake schedules from the editor", async () => {
    const { card, root } = stubCard({ mobileSchedulesTab: "wake" });
    const body = root.querySelector("#mobileMenuBody");
    const dispatch = async (selector) => { body.innerHTML = timersPageHtml(card); const target = body.querySelector(selector); const event = new MouseEvent("click", { bubbles: true, cancelable: true }); Object.defineProperty(event, "target", { value: target }); return handleTimersMenuClick(card, event, target); };
    await dispatch("[data-start-schedule-new]");
    expect(card._state.mobileStartScheduleEditId).toBe("__new__");
    body.innerHTML = timersPageHtml(card);
    body.querySelector("#scheduledStartTimeInput").value = "06:15";
    body.querySelector("#scheduledStartVolumeInput").value = "55";
    body.querySelector("#scheduledStartAfterRunSelect").value = "disable";
    body.querySelector('[data-start-timer-day="0"]').checked = false;
    const save = body.querySelector("[data-start-timer-save]");
    const saveEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(saveEvent, "target", { value: save });
    await handleTimersMenuClick(card, saveEvent, save);
    expect(card._state.mobileStartSchedules).toHaveLength(1);
    expect(card._state.mobileStartSchedules[0]).toMatchObject({ time: "06:15", player: "media_player.kitchen", volume: 55, afterRun: "disable", days: [1, 2, 3, 4, 5, 6], enabled: true });
    expect(card._state.mobileStartScheduleEditId).toBe("");
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.scheduled_start_saved");
    const id = card._state.mobileStartSchedules[0].id;
    await dispatch(`[data-start-schedule-edit="${id}"]`);
    expect(card._state.mobileStartScheduleEditId).toBe(id);
    expect(card._state.mobileStartTimerTime).toBe("06:15");
    await dispatch(`[data-start-schedule-toggle="${id}"]`);
    expect(card._state.mobileStartSchedules[0].enabled).toBe(false);
    expect(card._state.mobileStartTimerEnabled).toBe(false);
    await dispatch("[data-start-timer-clear]");
    expect(card._state.mobileStartSchedules).toHaveLength(0);
    expect(card._toast).toHaveBeenCalledWith("ui.scheduled_start_cleared");
    card._state.mobileStartSchedules = [schedule()];
    await dispatch('[data-start-schedule-delete="wake_1"]');
    expect(card._state.mobileStartSchedules).toHaveLength(0);
  });
  it("writes editor changes into the draft without touching unrelated inputs", () => {
    const { card, root } = stubCard({ mobileSchedulesTab: "wake", mobileStartScheduleEditId: "__new__" });
    const body = root.querySelector("#mobileMenuBody");
    body.innerHTML = timersPageHtml(card);
    const change = (el) => handleTimersFormChange(card, { target: el });
    const time = body.querySelector("#scheduledStartTimeInput"); time.value = "05:50";
    expect(change(time)).toBe(true);
    expect(card._state.mobileStartTimerTime).toBe("05:50");
    const player = body.querySelector("#scheduledStartPlayerSelect"); player.value = "media_player.bedroom";
    expect(change(player)).toBe(true);
    expect(card._state.mobileStartTimerPlayer).toBe("media_player.bedroom");
    const volume = body.querySelector("#scheduledStartVolumeInput"); volume.value = "70";
    expect(change(volume)).toBe(true);
    expect(card._state.mobileStartTimerVolume).toBe(70);
    expect(body.querySelector(".scheduled-volume-field .settings-value").textContent).toBe("70%");
    body.querySelector('[data-start-timer-day="6"]').checked = false;
    expect(change(body.querySelector('[data-start-timer-day="6"]'))).toBe(true);
    expect(card._state.mobileStartTimerDays).toEqual([0, 1, 2, 3, 4, 5]);
    const other = document.createElement("input"); other.id = "somethingElse";
    expect(change(other)).toBe(false);
  });
  it("recognises schedule form controls and holds rebuilds while one is being edited", () => {
    const { card, root } = stubCard();
    const input = document.createElement("input"); input.id = "scheduledStartTimeInput";
    const day = document.createElement("input"); day.dataset.startTimerDay = "1";
    const other = document.createElement("input");
    root.append(input, day, other);
    expect(isScheduleFormControl(input)).toBe(true);
    expect(isScheduleFormControl(day)).toBe(true);
    expect(isScheduleFormControl(other)).toBe(false);
    expect(isScheduleFormEditing(card)).toBe(false);
    expect(markScheduleFormControlActive(card, other)).toBe(false);
    expect(markScheduleFormControlActive(card, input)).toBe(true);
    expect(isScheduleFormEditing(card)).toBe(true);
    card._state.menuPage = "main";
    expect(isScheduleFormEditing(card)).toBe(false);
  });
});

describe("timers sync", () => {
  it("finishes an expired sleep timer once, pausing the player it was set for", () => {
    const { card } = stubCard({ mobileSleepTimerEndsAt: Date.now() + 5000, mobileSleepTimerPlayer: "media_player.bedroom" });
    syncSleepTimerState(card);
    expect(card._toastSuccess).not.toHaveBeenCalled();
    card._state.mobileSleepTimerEndsAt = Date.now() - 1;
    syncSleepTimerState(card);
    expect(card._callMaverickEnginePlayerCommand).toHaveBeenCalledWith("media_player.bedroom", "pause");
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.sleep_timer_finished");
    expect(card._state).toMatchObject({ mobileSleepTimerEndsAt: 0, mobileSleepTimerPlayer: "", mobileSleepTimerMenuOpen: false });
    syncSleepTimerState(card);
    expect(card._toastSuccess).toHaveBeenCalledOnce();
  });
  it("keeps the chip, the card class and the quick-action button in step with the timer", () => {
    const { card, root } = stubCard();
    root.querySelector(".card").insertAdjacentHTML("beforeend", sleepTimerFabHtml(card));
    syncSleepTimerChip(card);
    const host = root.querySelector(".card");
    const corner = root.querySelector("#sleepTimerCorner");
    const fab = root.querySelector("#mobileTimerBtn");
    expect(host.classList.contains("has-sleep-timer")).toBe(false);
    expect(corner.hidden).toBe(true);
    expect(fab.hidden).toBe(false);
    expect(fab.title).toBe("ui.schedules");
    card._state.mobileSleepTimerEndsAt = Date.now() + 2 * 60000;
    syncSleepTimerChip(card);
    expect(host.classList.contains("has-sleep-timer")).toBe(true);
    expect(corner.hidden).toBe(false);
    expect(corner.querySelector("#sleepTimerChipLabel").textContent).toMatch(/^(1:59|2:00)$/);
    expect(fab.classList.contains("active")).toBe(true);
    expect(fab.querySelector(".mobile-timer-label").hidden).toBe(false);
    card._mobileQuickActions = () => [];
    card._state.mobileSleepTimerEndsAt = 0;
    syncMobileTimerAction(card);
    expect(fab.hidden).toBe(true);
    expect(card._rebuildMobileUi).not.toHaveBeenCalled();
  });
  it("runs a due wake schedule once per day and disables it when asked", async () => {
    const { card } = stubCard({ mobileStartSchedules: [schedule({ afterRun: "disable" })] });
    const due = new Date(2026, 8, 23, 7, 30);
    syncScheduledStartState(card, new Date(2026, 8, 23, 7, 29));
    expect(card._setPlayerVolumeFor).not.toHaveBeenCalled();
    syncScheduledStartState(card, due);
    await vi.waitFor(() => expect(card._toastSuccess).toHaveBeenCalledWith("ui.scheduled_start_activated_label:Morning Mix"));
    expect(card._setPlayerVolumeFor).toHaveBeenCalledWith("media_player.kitchen", 0.4);
    expect(card._playMediaOnPlayer).toHaveBeenCalledWith("media_player.kitchen", "library://playlist/1", "playlist", "play", expect.objectContaining({ silent: true }));
    expect(card._state.mobileStartSchedules[0]).toMatchObject({ enabled: false, lastRunKey: "wake_1-2026-9-23-07:30" });
    expect(card._state.mobileStartTimerEnabled).toBe(false);
    card._setPlayerVolumeFor.mockClear();
    syncScheduledStartState(card, due);
    expect(card._setPlayerVolumeFor).not.toHaveBeenCalled();
  });
  it("leaves scheduling to the Engine while it is reachable", () => {
    const { card } = stubCard({ mobileStartSchedules: [schedule()], engineAvailable: true });
    card._maverickEngineEnabled = () => true;
    syncScheduledStartState(card, new Date(2026, 8, 23, 7, 30));
    expect(card._setPlayerVolumeFor).not.toHaveBeenCalled();
    expect(card._state.mobileStartSchedules[0].lastRunKey).toBe("");
  });
});
