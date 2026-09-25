// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindNightQuickRow,
  cycleNightMode,
  handleNightFormChange,
  handleNightSettingsClick,
  isNightModeActive,
  mobileNightMode,
  nightModeDayOptions,
  nightModeDays,
  nightModeWindow,
  nightQuickRowHtml,
  nightTabHtml,
  playNightMix,
  syncNightModeUi,
} from "../src/core/media/night-mode.js";
import { saveNightPreferences } from "../src/core/media/listening-tools.js";

vi.mock("../src/core/media/listening-tools.js", () => ({ saveNightPreferences: vi.fn(async () => true) }));

const { document, MouseEvent } = globalThis;
// Tuesday 2026-09-22
const at = (hours, minutes = 0, day = 22) => new Date(2026, 8, day, hours, minutes);

function stubCard(state = {}) {
  const root = document.createElement("div");
  root.innerHTML = '<div class="card"><div id="playerRow"></div><div id="mobileMenuBody"></div></div>';
  document.body.append(root);
  const card = {
    shadowRoot: root,
    $: (id) => root.querySelector(`#${id}`),
    _state: { mobileNightMode: "auto", mobileNightModeStart: "22:00", mobileNightModeEnd: "06:00", mobileNightModeDays: [0, 1, 2, 3, 4, 5, 6], mobileSleepTimerEndsAt: 0, menuOpen: false, menuPage: "", controlRoomOpen: false, ...state },
    _i18n: (key, params) => (params ? `${key}:${Object.values(params).join(",")}` : key),
    _esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    _iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
    _settingsPill: (label, value, current, attr) => `<button class="settings-pill ${value === current ? "active" : ""}" ${attr}="${value}">${label}</button>`,
    _pressUiButton: () => true,
    _persistMobileAppearance: vi.fn(),
    _rebuildMobileUi: vi.fn(),
    _syncTabletAutoFitUi: vi.fn(),
    _flashInteraction: vi.fn(),
    _fetchLibrary: vi.fn(async () => []),
    _playRandomFromPlaylists: vi.fn(async () => true),
    _playMedia: vi.fn(async () => true),
    _build: vi.fn(),
    _init: vi.fn(),
    _openMobileMenu: vi.fn(),
    _toastSuccess: vi.fn(),
    _toastError: vi.fn(),
  };
  return { card, root };
}

afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); vi.restoreAllMocks(); });

describe("readers", () => {
  it("normalises the mode, days and window from state", () => {
    const { card } = stubCard({ mobileNightMode: "bogus", mobileNightModeDays: "1, 3, 9", mobileNightModeStart: "7", mobileNightModeEnd: "nope" });
    expect(mobileNightMode(card)).toBe("auto");
    expect(nightModeDays(card)).toEqual([1, 3]);
    expect(nightModeWindow(card)).toEqual({ start: "07:00", end: "06:00" });
    card._state.mobileNightModeStart = "";
    expect(nightModeWindow(card).start).toBe("22:00");
    expect(nightModeDayOptions(card).map(([value, label]) => `${value}${label}`)).toEqual(["0ui.sun", "1ui.mon", "2ui.tue", "3ui.wed", "4ui.thu", "5ui.fri", "6ui.sat"]);
  });
  it("resolves the active window across midnight and honours the days", () => {
    const { card } = stubCard();
    expect(isNightModeActive(card, at(23))).toBe(true);
    expect(isNightModeActive(card, at(5, 30, 23))).toBe(true);
    expect(isNightModeActive(card, at(12))).toBe(false);
    card._state.mobileNightModeDays = [1];
    expect(isNightModeActive(card, at(23))).toBe(false);
    card._state.mobileNightModeDays = [2];
    expect(isNightModeActive(card, at(23))).toBe(true);
    expect(isNightModeActive(card, at(5, 30, 23))).toBe(true);
    card._state.mobileNightMode = "on";
    expect(isNightModeActive(card, at(12))).toBe(true);
    card._state.mobileNightMode = "off";
    expect(isNightModeActive(card, at(23))).toBe(false);
  });
});

describe("actions", () => {
  it("cycles auto, on, off and rebuilds around the open menu", () => {
    const { card } = stubCard({ menuOpen: true, menuPage: "settings", controlRoomOpen: true });
    cycleNightMode(card);
    expect(card._state.mobileNightMode).toBe("on");
    expect(card._rebuildMobileUi).toHaveBeenLastCalledWith({ reopenPage: "settings", reopenStudio: true });
    card._state.menuOpen = false;
    cycleNightMode(card);
    expect(card._state.mobileNightMode).toBe("off");
    expect(card._rebuildMobileUi).toHaveBeenLastCalledWith({ reopenPage: "", reopenStudio: true });
    cycleNightMode(card);
    expect(card._state.mobileNightMode).toBe("auto");
    expect(card._persistMobileAppearance).toHaveBeenCalledTimes(3);
  });
  it("plays a chill playlist, preferring keyword matches, with fallbacks", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { card } = stubCard();
    card._fetchLibrary.mockImplementation(async (_type, _sort, _limit, liked) => (liked
      ? [{ uri: "lib://playlist/2", name: "Late Night Lo-Fi" }]
      : [{ uri: "lib://playlist/1", name: "Workout" }, { uri: "lib://playlist/2", name: "Late Night Lo-Fi" }]));
    await playNightMix(card);
    expect(card._fetchLibrary.mock.calls).toEqual([["playlist", "sort_name", 500, false], ["playlist", "sort_name", 220, true]]);
    expect(card._playMedia).toHaveBeenCalledWith("lib://playlist/2", "playlist", "play", { label: "Late Night Lo-Fi", silent: true });
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.starting_a_chill_mix");
    card._fetchLibrary.mockResolvedValue([{ uri: "lib://playlist/1", name: "Workout", media_type: "playlist" }]);
    card._playMedia.mockResolvedValueOnce(false);
    await playNightMix(card);
    expect(card._playMedia).toHaveBeenLastCalledWith("lib://playlist/1", "playlist", "play", { label: "Workout", silent: true });
    expect(card._toastSuccess).toHaveBeenCalledTimes(1);
    card._fetchLibrary.mockResolvedValue([]);
    await playNightMix(card);
    expect(card._playRandomFromPlaylists).toHaveBeenCalledTimes(1);
    card._fetchLibrary.mockRejectedValue(new Error("offline"));
    card._playRandomFromPlaylists.mockRejectedValueOnce(new Error("no library"));
    await playNightMix(card);
    expect(card._toastError).toHaveBeenCalledWith("no library");
  });
});

describe("quick row", () => {
  it("renders the row from the mode and binds the mode and chill buttons", async () => {
    const { card, root } = stubCard({ mobileNightMode: "off" });
    expect(nightQuickRowHtml(card)).toBe("");
    card._state.mobileNightMode = "auto";
    vi.useFakeTimers({ now: at(12) });
    let html = nightQuickRowHtml(card);
    expect(html).toContain('class="night-quick-row auto-mode" id="nightQuickRow"');
    expect(html).toContain('class="night-quick-btn icon-only soft" id="nightModeQuickBtn"');
    expect(html).toContain('id="nightSleepBtn" title="ui.sleep_timer" hidden');
    expect(html).toContain('id="nightChillBtn" title="ui.chill_mix" hidden');
    card._state.mobileNightMode = "on";
    card._state.mobileSleepTimerEndsAt = Date.now() + 60000;
    html = nightQuickRowHtml(card);
    expect(html).toContain('class="night-quick-row on-mode"');
    expect(html).toContain('class="night-quick-btn icon-only active" id="nightModeQuickBtn"');
    expect(html).toContain('class="night-quick-btn icon-only active" id="nightSleepBtn" title="ui.sleep_timer" >');
    vi.useRealTimers();
    root.querySelector("#playerRow").innerHTML = html;
    bindNightQuickRow(card);
    root.querySelector("#nightModeQuickBtn").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(card._state.mobileNightMode).toBe("off");
    card._fetchLibrary.mockResolvedValue([{ uri: "lib://playlist/1", name: "Calm" }]);
    root.querySelector("#nightChillBtn").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => expect(card._playMedia).toHaveBeenCalledTimes(1));
  });
  it("rebuilds when the rendered mode changes, otherwise syncs in place", () => {
    vi.useFakeTimers({ now: at(23) });
    const { card, root } = stubCard({ mobileNightMode: "auto", mobileNightRenderedActive: false, mobileNightRenderedMode: "auto", menuOpen: true, menuPage: "sleep_timer", mobileScheduleControlActiveUntil: Date.now() + 1000 });
    syncNightModeUi(card);
    expect(card._state.mobileNightRenderedActive).toBe(true);
    expect(card._rebuildMobileUi).not.toHaveBeenCalled();
    expect(root.querySelector(".card").classList.contains("night-mode")).toBe(true);
    card._state.mobileScheduleControlActiveUntil = 0;
    card._state.mobileNightMode = "on";
    syncNightModeUi(card);
    expect(card._rebuildMobileUi).toHaveBeenCalledWith({ reopenPage: "sleep_timer", reopenStudio: false });
    expect(card._state.mobileNightRenderedMode).toBe("on");
    root.querySelector("#playerRow").innerHTML = nightQuickRowHtml(card);
    card._state.mobileNightMode = "auto";
    card._state.mobileNightRenderedMode = "auto";
    card._state.mobileSleepTimerEndsAt = Date.now() + 5 * 60000;
    syncNightModeUi(card);
    expect(card._rebuildMobileUi).toHaveBeenCalledTimes(1);
    expect(card._syncTabletAutoFitUi).toHaveBeenCalledTimes(1);
    const row = root.querySelector("#nightQuickRow");
    expect(row.hidden).toBe(false);
    expect(row.classList.contains("auto-mode")).toBe(true);
    expect(row.classList.contains("on-mode")).toBe(false);
    const modeBtn = root.querySelector("#nightModeQuickBtn");
    expect(modeBtn.classList.contains("active")).toBe(true);
    expect(modeBtn.title).toBe("ui.night_mode_auto_window:22:00,06:00");
    const sleepBtn = root.querySelector("#nightSleepBtn");
    expect(sleepBtn.hidden).toBe(true);
    expect(sleepBtn.classList.contains("active")).toBe(true);
    expect(sleepBtn.title).toBe("ui.sleep_timer_active_remaining:5m");
    card._state.mobileNightMode = "on";
    card._state.mobileNightRenderedMode = "on";
    card._state.mobileSleepTimerEndsAt = 0;
    syncNightModeUi(card);
    expect(sleepBtn.hidden).toBe(false);
    expect(sleepBtn.title).toBe("ui.tap_to_start_a_sleep_timer");
    expect(root.querySelector("#nightChillBtn").hidden).toBe(false);
    expect(modeBtn.title).toBe("ui.night_mode_is_always_on");
  });
});

describe("night tab", () => {
  it("renders the mode pills with the window form only in auto", () => {
    const { card } = stubCard({ mobileNightMode: "off" });
    const off = nightTabHtml(card);
    expect(off).toContain('class="settings-pill active" data-setting-night-mode="off"');
    expect(off).toContain("ui.night_mode_is_off_until_you_choose_another_mode");
    expect(off).not.toContain("mobileNightStartInput");
    card._state.mobileNightMode = "on";
    expect(nightTabHtml(card)).toContain("ui.night_mode_stays_on_until_you_choose_another_mode");
    card._state.mobileNightMode = "auto";
    card._state.mobileNightModeDays = [1, 5];
    const auto = nightTabHtml(card);
    expect(auto).toContain('id="mobileNightStartInput" data-schedule-form-control type="time" value="22:00" step="60"');
    expect(auto).toContain('id="mobileNightEndInput" data-schedule-form-control type="time" value="06:00" step="60"');
    expect(auto.match(/data-setting-night-day="\d" checked/g)).toEqual(['data-setting-night-day="1" checked', 'data-setting-night-day="5" checked']);
    expect(auto).toContain("data-setting-night-window-save");
  });
  it("handles the mode pills and the window save", async () => {
    const { card, root } = stubCard({ menuOpen: true, menuPage: "sleep_timer", mobileScheduleControlActiveUntil: 99 });
    root.querySelector("#mobileMenuBody").innerHTML = nightTabHtml(card) + '<span id="other"></span>';
    expect(await handleNightSettingsClick(card, root.querySelector("#other"))).toBe(false);
    expect(await handleNightSettingsClick(card, root.querySelector('[data-setting-night-mode="on"]'))).toBe(true);
    expect(card._state.mobileNightMode).toBe("on");
    expect(card._state.mobileScheduleControlActiveUntil).toBe(0);
    expect(saveNightPreferences).toHaveBeenCalledWith(card, { night_mode: "auto", night_start: "22:00", night_end: "06:00", night_days: [0, 1, 2, 3, 4, 5, 6] });
    expect(card._persistMobileAppearance).toHaveBeenCalledTimes(1);
    expect(card._rebuildMobileUi).toHaveBeenCalledWith({ reopenPage: "sleep_timer", reopenStudio: false });
    saveNightPreferences.mockResolvedValueOnce(false);
    expect(await handleNightSettingsClick(card, root.querySelector('[data-setting-night-mode="auto"]'))).toBe(true);
    expect(card._persistMobileAppearance).toHaveBeenCalledTimes(1);
    root.querySelector("#mobileNightStartInput").value = "21:30";
    root.querySelector("#mobileNightEndInput").value = "";
    root.querySelectorAll("[data-setting-night-day]").forEach((input) => { input.checked = ["2", "4"].includes(input.dataset.settingNightDay); });
    expect(await handleNightSettingsClick(card, root.querySelector("[data-setting-night-window-save]"))).toBe(true);
    expect(card._state).toMatchObject({ mobileNightModeStart: "21:30", mobileNightModeEnd: "06:00", mobileNightModeDays: [2, 4] });
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.night_schedule_updated");
    expect(card._build).toHaveBeenCalledTimes(1);
    expect(card._init).toHaveBeenCalledTimes(1);
    expect(card._openMobileMenu).toHaveBeenCalledWith("sleep_timer");
  });
  it("tracks the day checkboxes and the time inputs as they change", () => {
    const { card, root } = stubCard();
    root.querySelector("#mobileMenuBody").innerHTML = nightTabHtml(card);
    const day = root.querySelector('[data-setting-night-day="3"]');
    root.querySelectorAll("[data-setting-night-day]").forEach((input) => { input.checked = input === day; });
    expect(handleNightFormChange(card, { target: day })).toBe(true);
    expect(card._state.mobileNightModeDays).toEqual([3]);
    expect(handleNightFormChange(card, { target: { id: "mobileNightStartInput", value: "23:15" } })).toBe(true);
    expect(card._state.mobileNightModeStart).toBe("23:15");
    expect(handleNightFormChange(card, { target: { id: "mobileNightEndInput", value: "" } })).toBe(true);
    expect(card._state.mobileNightModeEnd).toBe("06:00");
    expect(handleNightFormChange(card, { target: { id: "mobileNightEndInput", value: "7" } })).toBe(true);
    expect(card._state.mobileNightModeEnd).toBe("07:00");
    expect(handleNightFormChange(card, { target: { id: "other", value: "x" } })).toBe(false);
  });
});
