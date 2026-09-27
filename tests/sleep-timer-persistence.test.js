import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSleepTimer,
  renderTimersPage,
  setSleepTimerMinutes,
  syncSleepTimerChip,
} from "../src/core/media/timers.js";

const NOW = Date.parse("2026-09-27T20:00:00Z");
const state = () => ({ mobileSleepTimerEndsAt: Date.now() + 600000, mobileSleepTimerPlayer: "media_player.computer", mobileSleepTimerOrigin: "night", mobileNightMode: "off", mobileNightRenderedActive: false, mobileNightRenderedMode: "off" });
const confirming = (target) => ({ timers: [{ id: "sleep_media_player_computer", player: "media_player.computer", ends_at: new Date(target).toISOString() }] });
function context() {
  return {
    _state: state(), _config: {}, shadowRoot: null, $: () => null,
    _maverickEngineRequired: () => true, _maverickEngineEnabled: () => true, _maverickEngineReadyForPersistence: async () => true,
    _maverickEngineTimeoutMs: () => 5000, _getSelectedPlayer: () => ({ entity_id: "media_player.computer" }), _mobileQuickActions: () => [],
    _maverickEngineSetTimer: vi.fn(async () => ({ ok: true })), _maverickEngineGetTimers: vi.fn(async () => ({ timers: [] })),
    _maverickEngineDeleteTimer: vi.fn(async () => ({ ok: true })), _maverickEngineGetSchedules: vi.fn(async () => ({ schedules: [] })),
    _fetchLibrary: vi.fn(async () => []), _normalizeMediaItem: (item) => item, _loadingStateHtml: () => "", _writeSchedulesToLocalStorage: vi.fn(),
    _rebuildMobileUi: vi.fn(), _syncTabletAutoFitUi: vi.fn(), _persistMobileAppearance: vi.fn(),
    _toastError: vi.fn(), _toastSuccess: vi.fn(), _toast: vi.fn(), _m: (text) => text, _i18n: (key) => key,
  };
}
// Hydration runs when the timers page is rendered; the page itself is never built here.
const hydrate = (card) => renderTimersPage(card, { innerHTML: "" }, () => false);

describe("confirmed sleep timer persistence", () => {
  beforeEach(() => { vi.useFakeTimers({ now: NOW, toFake: ["Date"] }); });
  afterEach(() => { vi.useRealTimers(); });
  it("does not resurrect a timer removed from the authoritative Engine", async () => {
    const card = context();
    card._state.selectedPlayer = "media_player.computer";
    await hydrate(card);
    expect(card._state.mobileSleepTimerEndsAt).toBe(0);
    expect(card._maverickEngineSetTimer).not.toHaveBeenCalled();
  });
  it("does not interpret a failed timer read as an empty server list", async () => {
    const card = context();
    const before = { ...card._state };
    card._maverickEngineGetTimers = vi.fn(async () => undefined);
    await hydrate(card);
    expect(card._state).toMatchObject(before);
    expect(card._persistMobileAppearance).not.toHaveBeenCalled();
  });
  it("rolls back an unconfirmed timer without persisting a false active timer", async () => {
    const card = context();
    const before = { ...card._state };
    expect(await setSleepTimerMinutes(card, 30, "night")).toBe(false);
    expect(card._maverickEngineSetTimer).toHaveBeenCalledOnce();
    expect(card._state).toEqual(before);
    expect(card._persistMobileAppearance).not.toHaveBeenCalled();
    expect(card._toastSuccess).not.toHaveBeenCalled();
  });
  it("restores state and unlocks controls after an unexpected persistence exception", async () => {
    const card = context();
    const before = { ...card._state };
    card._maverickEngineSetTimer.mockRejectedValue(new Error("offline"));
    expect(await setSleepTimerMinutes(card, 30, "night")).toBe(false);
    expect(card._state).toEqual(before);
    expect(card._sleepTimerSavePending).toBe(false);
    expect(card._toastError).toHaveBeenCalledWith("offline");
  });
  it("persists the confirmed target", async () => {
    const card = context();
    const target = Date.now() + 1800000;
    card._maverickEngineGetTimers = vi.fn(async () => confirming(target));
    expect(await setSleepTimerMinutes(card, 30, "night")).toEqual({ ok: true, engineSaved: true });
    expect(card._state).toMatchObject({ mobileSleepTimerEndsAt: target, mobileSleepTimerPlayer: "media_player.computer", mobileSleepTimerOrigin: "night", mobileSleepTimerMenuOpen: false });
    expect(card._maverickEngineSetTimer).toHaveBeenCalledWith(expect.objectContaining({ timer_id: "sleep_media_player_computer", minutes: 30, ends_at: new Date(target).toISOString() }), { required: true });
    expect(card._persistMobileAppearance).toHaveBeenCalledOnce();
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.sleep_timer_set_minutes");
  });
  it("does not accept the old timer as confirmation of a changed deadline", async () => {
    const card = context();
    const before = { ...card._state };
    card._maverickEngineGetTimers = vi.fn(async () => confirming(before.mobileSleepTimerEndsAt));
    expect(await setSleepTimerMinutes(card, 30, "night")).toBe(false);
    expect(card._state).toEqual(before);
    expect(card._toastError).toHaveBeenCalledWith("Maverick Music Engine accepted the timer write, but it was not found when reading it back.");
  });
  it("keeps the displayed timer when cancellation is not confirmed", async () => {
    const card = context();
    const before = { ...card._state };
    card._maverickEngineGetTimers = vi.fn(async () => confirming(before.mobileSleepTimerEndsAt));
    expect(await clearSleepTimer(card, true)).toBe(false);
    expect(card._maverickEngineDeleteTimer).toHaveBeenCalledOnce();
    expect(card._state).toEqual(before);
    expect(card._toast).not.toHaveBeenCalled();
  });
});

it("does not rebuild the immersive card for a classic-only timer button", () => {
  const toggle = vi.fn();
  const card = { _state: { mobilePlayerDesign: "immersive", mobileSleepTimerEndsAt: Date.now() + 900000, mobileSleepTimerOrigin: "general" },
    shadowRoot: { querySelector: () => ({ classList: { contains: () => false, toggle } }) },
    _mobileQuickActions: () => [], $: () => null, _rebuildMobileUi: vi.fn() };
  syncSleepTimerChip(card);
  expect(card._rebuildMobileUi).not.toHaveBeenCalled();
  expect(toggle).toHaveBeenCalledWith("has-sleep-timer", true);
});
