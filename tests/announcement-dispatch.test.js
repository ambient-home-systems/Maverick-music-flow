import { describe, expect, it, vi } from "vitest";
import { sendMobileAnnouncement } from "../src/core/media/announcements.js";

const players = ["Computer", "Kitchen"].map((name) => ({ entity_id: name, state: "playing", attributes: { friendly_name: name } }));
function context() {
  return {
    _state: { mobileAnnouncementText: "Test", mobileAnnouncementTarget: "all", mobileAnnouncementVolume: 20, mobileAnnouncementTtsEntity: "tts.test", mobileAnnouncementTtsLanguage: "en-US", players },
    _config: {}, _hass: { states: {} },
    _playerVolumeLevel: () => 0.2,
    _hapticTap: vi.fn(), _i18n: (key, data) => `${key} ${JSON.stringify(data || {})}`,
    _m: (text) => text, _toast: vi.fn(), _toastError: vi.fn(), _toastSuccess: vi.fn(),
    _callMaverickEnginePlayerCommand: vi.fn(async () => true),
    _maverickEngineAnnounce: vi.fn(async () => ({ ok: true, results: [{ player: "Computer", ok: true }, { player: "Kitchen", ok: true }] })),
  };
}
describe("truthful announcement dispatch", () => {
  it("passes each player's boosted volume to MA without changing its normal volume", async () => {
    const card = context();
    card._playerVolumeLevel = (entityId) => (entityId === "Computer" ? 0.25 : 0.5);
    await sendMobileAnnouncement(card);
    expect(card._maverickEngineAnnounce).toHaveBeenCalledWith(expect.objectContaining({ players: ["Computer"], volume: 45, tts_entity: "tts.test", language: "en-US" }));
    expect(card._maverickEngineAnnounce).toHaveBeenCalledWith(expect.objectContaining({ players: ["Kitchen"], volume: 70 }));
    expect(card._callMaverickEnginePlayerCommand).not.toHaveBeenCalled();
    expect(card._announcementVolumeRestoreTimers).toBeUndefined();
  });
  it("lets MA restore audio without a browser volume timer", async () => {
    const card = context();
    await sendMobileAnnouncement(card);
    expect(card._toastSuccess).toHaveBeenCalledOnce();
    expect(card._callMaverickEnginePlayerCommand).not.toHaveBeenCalled();
    expect(card._announcementSendPending).toBe(false);
  });
  it("does not announce success when only one target accepted the request", async () => {
    const card = context();
    card._maverickEngineAnnounce.mockResolvedValue({ ok: true, sent: true, results: [{ player: "Computer", ok: true }, { player: "Kitchen", ok: false }] });
    await sendMobileAnnouncement(card);
    expect(card._toastSuccess).not.toHaveBeenCalled();
    expect(card._toastError).toHaveBeenCalledWith(expect.stringContaining("Kitchen"));
  });
  it("rejects an empty acknowledgement", async () => {
    const card = context();
    card._maverickEngineAnnounce.mockResolvedValue({});
    await sendMobileAnnouncement(card);
    expect(card._toastSuccess).not.toHaveBeenCalled();
    expect(card._toastError).toHaveBeenCalledOnce();
  });
  it("suppresses duplicate dispatch while a request is pending and allows retry after failure", async () => {
    const card = context();
    let reject;
    card._maverickEngineAnnounce.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    const first = sendMobileAnnouncement(card);
    await sendMobileAnnouncement(card);
    expect(card._maverickEngineAnnounce).toHaveBeenCalledOnce();
    reject(new Error("Connection lost"));
    await first;
    await sendMobileAnnouncement(card);
    expect(card._maverickEngineAnnounce).toHaveBeenCalledTimes(2);
  });
});
