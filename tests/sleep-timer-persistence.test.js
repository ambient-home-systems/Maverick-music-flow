import { describe, expect, it, vi } from "vitest";
import {
  clearSleepTimer,
  confirmSleepTimerInEngine,
  hydrateSleepTimerFromEngine,
  saveSleepTimerState,
  syncSleepTimerChip,
} from "../src/core/media/timers.js";

const state = () => ({ mobileSleepTimerEndsAt: Date.now() + 600000, mobileSleepTimerPlayer: "media_player.computer", mobileSleepTimerOrigin: "night" });
const confirming = (target) => ({ timers: [{ id: "sleep_media_player_computer", player: "media_player.computer", ends_at: new Date(target).toISOString() }] });
function context() {
  return {
    _state: state(), _config: {}, shadowRoot: null, $: () => null,
    _maverickEngineRequired: () => true, _maverickEngineEnabled: () => true, _maverickEngineReadyForPersistence: async () => true,
    _maverickEngineTimeoutMs: () => 5000, _getSelectedPlayer: () => null, _mobileQuickActions: () => [],
    _maverickEngineSetTimer: vi.fn(async () => ({ ok: true })), _maverickEngineGetTimers: vi.fn(async () => ({ timers: [] })),
    _maverickEngineDeleteTimer: vi.fn(async () => ({ ok: true })),
    _syncNightModeUi: vi.fn(), _persistMobileAppearance: vi.fn(),
    _toastError: vi.fn(), _toast: vi.fn(), _m: (text) => text,
  };
}
describe("confirmed sleep timer persistence", () => {
  it("does not resurrect a timer removed from the authoritative Engine", async () => {
    const card = context();
    card._state.selectedPlayer = "media_player.computer";
    await hydrateSleepTimerFromEngine(card);
    expect(card._state.mobileSleepTimerEndsAt).toBe(0);
    expect(card._maverickEngineSetTimer).not.toHaveBeenCalled();
  });
  it("does not interpret a failed timer read as an empty server list", async () => {
    const card = context();
    const before = { ...card._state };
    card._maverickEngineGetTimers = vi.fn(async () => undefined);
    await hydrateSleepTimerFromEngine(card);
    expect(card._state).toEqual(before);
  });
  it("rolls back an unconfirmed timer without persisting a false active timer", async () => {
    const card = context();
    const before = { ...card._state };
    expect(await saveSleepTimerState(card, { mobileSleepTimerEndsAt: Date.now() + 1800000 }, 30, "night")).toBe(false);
    expect(card._maverickEngineSetTimer).toHaveBeenCalledOnce();
    expect(card._state).toEqual(before);
    expect(card._persistMobileAppearance).not.toHaveBeenCalled();
  });
  it("restores state and unlocks controls after an unexpected persistence exception", async () => {
    const card = context();
    const before = { ...card._state };
    card._maverickEngineSetTimer.mockRejectedValue(new Error("offline"));
    await saveSleepTimerState(card, { mobileSleepTimerEndsAt: Date.now() + 1800000 }, 30, "night");
    expect(card._state).toEqual(before);
    expect(card._sleepTimerSavePending).toBe(false);
    expect(card._toastError).toHaveBeenCalledWith("offline");
  });
  it("persists the confirmed target", async () => {
    const card = context();
    const target = Date.now() + 1800000;
    card._maverickEngineGetTimers = vi.fn(async () => confirming(target));
    expect(await saveSleepTimerState(card, { mobileSleepTimerEndsAt: target }, 30, "night")).toEqual({ ok: true, engineSaved: true });
    expect(card._state.mobileSleepTimerEndsAt).toBe(target);
    expect(card._persistMobileAppearance).toHaveBeenCalledOnce();
  });
  it("does not accept the old timer as confirmation of a changed deadline", async () => {
    const card = context();
    card._maverickEngineGetTimers = vi.fn(async () => confirming(Date.now() + 600000));
    expect(await confirmSleepTimerInEngine(card, "sleep_computer", "media_player.computer", Date.now() + 1800000)).toBe(false);
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
