// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  announcementRestoreDelayMs,
  announcementTargetValue,
  announcementsPageHtml,
  announcementsSettingsSectionHtml,
  announcementTtsEntity,
  handleAnnouncementFormChange,
  handleAnnouncementMenuClick,
  handleStudioAnnouncementInput,
  isDefaultAnnouncementPresetSet,
  normalizeAnnouncementLanguage,
  sendControlRoomAnnouncement,
  startAnnouncementDictation,
  studioAnnouncePanelHtml,
} from "../src/core/media/announcements.js";
import { controlRoomPrimaryPlayerId, controlRoomSelectedPlayerIds } from "../src/core/media/control-room.js";
import { speechRecognitionCtor } from "../src/core/media/voice.js";

vi.mock("../src/core/media/control-room.js", () => ({ controlRoomSelectedPlayerIds: vi.fn(), controlRoomPrimaryPlayerId: vi.fn() }));
vi.mock("../src/core/media/voice.js", () => ({ speechRecognitionCtor: vi.fn() }));
beforeEach(() => {
  controlRoomSelectedPlayerIds.mockReset().mockReturnValue([]);
  controlRoomPrimaryPlayerId.mockReset().mockReturnValue("media_player.kitchen");
  speechRecognitionCtor.mockReset().mockReturnValue(null);
});

const { document, MouseEvent } = globalThis;
const players = [
  { entity_id: "media_player.kitchen", state: "playing", attributes: { friendly_name: "Kitchen <Speaker>" } },
  { entity_id: "media_player.bedroom", state: "idle", attributes: { friendly_name: "Bedroom" } },
  { entity_id: "media_player.offline", state: "unavailable", attributes: { friendly_name: "Offline" } },
];

function stubCard(state = {}) {
  const root = document.createElement("div");
  root.innerHTML = '<div class="card"><div id="mobileMenuBody"></div><div id="controlRoomBody"></div></div>';
  document.body.append(root);
  const volumes = { "media_player.kitchen": 0.3, "media_player.bedroom": 0.5 };
  const card = {
    shadowRoot: root,
    $: (id) => root.querySelector(`#${id}`),
    _config: {},
    _hass: { states: { "tts.cloud": {} }, locale: { language: "de-DE" } },
    _state: {
      players, selectedPlayer: "media_player.bedroom",
      mobileAnnouncementText: "", mobileAnnouncementTarget: "", mobileAnnouncementVolume: 20,
      mobileAnnouncementPresets: ["Dinner", "", "Bed \"time\""], mobileAnnouncementTtsEntity: "", mobileAnnouncementTtsLanguage: "auto",
      controlRoomAnnouncementText: "", controlRoomAnnouncementVolume: 20,
      ...state,
    },
    _m: (text) => text,
    _i18n: (key, params) => (params ? `${key}:${Object.values(params).join("|")}` : key),
    _esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    _iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
    _playerVolumeLevel: (entityId) => volumes[entityId],
    _selectedPlayerName: () => "Bedroom",
    _pressUiButton: vi.fn(() => true),
    _maverickEngineEnabled: () => true,
    _maverickEngineAnnounce: vi.fn(async ({ players: ids }) => ({ ok: true, results: ids.map((player) => ({ player, ok: true })) })),
    _callMaverickEnginePlayerCommand: vi.fn(async () => true),
    _persistMobileAppearance: vi.fn(),
    _flashInteraction: vi.fn(),
    _hapticTap: vi.fn(),
    _toast: vi.fn(), _toastError: vi.fn(), _toastSuccess: vi.fn(),
  };
  return { card, root };
}
const clickOn = async (card, el) => { const event = new MouseEvent("click", { bubbles: true, cancelable: true }); Object.defineProperty(event, "target", { value: el }); return handleAnnouncementMenuClick(card, event, el); };
afterEach(() => { document.body.innerHTML = ""; vi.useRealTimers(); });

describe("announcement settings", () => {
  it("recognises the default preset set and normalises languages", () => {
    expect(isDefaultAnnouncementPresetSet(["Dinner is ready", "Please come to the living room", "Leaving in five minutes"])).toBe(true);
    expect(isDefaultAnnouncementPresetSet(["Dinner is ready", "Other", "Leaving in five minutes"])).toBe(false);
    expect(isDefaultAnnouncementPresetSet([])).toBe(false);
    expect(normalizeAnnouncementLanguage("en-GB")).toBe("en-GB");
    expect(normalizeAnnouncementLanguage("fr-FR")).toBe("auto");
    expect(normalizeAnnouncementLanguage("")).toBe("auto");
  });
  it("falls back to the selected player and the first TTS entity", () => {
    const { card } = stubCard();
    expect(announcementTargetValue(card)).toBe("media_player.bedroom");
    card._state.mobileAnnouncementTarget = "media_player.offline";
    expect(announcementTargetValue(card)).toBe("media_player.bedroom");
    card._state.mobileAnnouncementTarget = "all";
    expect(announcementTargetValue(card)).toBe("all");
    expect(announcementTtsEntity(card)).toBe("tts.cloud");
    card._state.mobileAnnouncementTtsEntity = "tts.piper";
    expect(announcementTtsEntity(card)).toBe("tts.piper");
  });
});

describe("announcement render", () => {
  it("renders the page with eligible targets, escaped presets and the volume boost", () => {
    const { card } = stubCard({ mobileAnnouncementText: "Hi <all>", mobileAnnouncementVolume: 35 });
    const html = announcementsPageHtml(card);
    expect(html).toContain('<option value="all" >ui.announce_to_all_players</option>');
    expect(html).toContain('<option value="media_player.bedroom" selected>Bedroom</option>');
    expect(html).toContain("Kitchen &lt;Speaker>");
    expect(html).not.toContain("media_player.offline");
    expect(html).toContain(">Hi &lt;all></textarea>");
    expect(html.match(/data-announcement-preset-fill="(\d)"/g)).toEqual(['data-announcement-preset-fill="0"', 'data-announcement-preset-fill="2"']);
    expect(html).toContain("Bed &quot;time&quot;");
    expect(html).toContain('value="35"');
    expect(html).toContain("+35%");
    expect(html).toContain("data-announcement-send");
  });
  it("renders the settings section with three preset slots and the TTS fields", () => {
    const { card } = stubCard({ mobileAnnouncementTtsLanguage: "en-GB" });
    const html = announcementsSettingsSectionHtml(card);
    expect(html.match(/data-announcement-preset-index="(\d)"/g)).toHaveLength(3);
    expect(html).toContain('id="mobileAnnouncementTtsEntity" type="text" value="tts.cloud"');
    expect(html).toContain('<option value="en-GB" selected>');
    expect(html).toContain('id="mobileAnnouncementVolumeInput"');
  });
  it("renders the studio tray around the shared context chip", () => {
    const { card } = stubCard({ controlRoomAnnouncementText: "Come <here>", controlRoomAnnouncementVolume: 80 });
    const html = studioAnnouncePanelHtml(card, '<div class="chip"></div>');
    expect(html).toContain('<div class="chip"></div>');
    expect(html).toContain(">Come &lt;here></textarea>");
    expect(html).toContain("+50%");
    expect(html).toContain('id="controlRoomAnnouncementVolumeInput" type="range" min="20" max="50" step="1" value="50"');
    expect(html).toContain("data-room-announce-send");
  });
});

describe("announcement bind", () => {
  it("fills presets, starts dictation and sends from the page buttons", async () => {
    const { card, root } = stubCard({ mobileAnnouncementTarget: "media_player.kitchen" });
    const body = root.querySelector("#mobileMenuBody");
    body.innerHTML = announcementsPageHtml(card);
    expect(await clickOn(card, body.querySelector('[data-announcement-preset-fill="0"]'))).toBe(true);
    expect(card._state.mobileAnnouncementText).toBe("Dinner");
    expect(body.querySelector("#mobileAnnouncementText").value).toBe("Dinner");
    expect(await clickOn(card, body.querySelector("[data-announcement-voice]"))).toBe(true);
    expect(card._toastError).toHaveBeenCalledWith("ui.voice_input_is_not_supported_on_this_device");
    expect(await clickOn(card, body.querySelector("[data-announcement-send]"))).toBe(true);
    expect(card._maverickEngineAnnounce).toHaveBeenCalledWith(expect.objectContaining({ message: "Dinner", players: ["media_player.kitchen"], volume: 50, target: "media_player.kitchen" }));
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.announcement_sent_to_player:Kitchen <Speaker>");
    const other = document.createElement("button");
    expect(await clickOn(card, other)).toBe(false);
  });
  it("writes page and settings inputs into state and persists the durable ones", () => {
    const { card, root } = stubCard();
    const body = root.querySelector("#mobileMenuBody");
    body.innerHTML = announcementsPageHtml(card) + announcementsSettingsSectionHtml(card);
    const change = (el) => handleAnnouncementFormChange(card, { target: el });
    const text = body.querySelector("#mobileAnnouncementText"); text.value = "Lunch";
    expect(change(text)).toBe(true);
    expect(card._state.mobileAnnouncementText).toBe("Lunch");
    const target = body.querySelector("#mobileAnnouncementTargetSelect"); target.value = "all";
    expect(change(target)).toBe(true);
    expect(card._state.mobileAnnouncementTarget).toBe("all");
    const volume = body.querySelector("#mobileAnnouncementVolumeInput"); volume.value = "90";
    expect(change(volume)).toBe(true);
    expect(card._state.mobileAnnouncementVolume).toBe(50);
    expect(volume.closest(".announcement-volume-field").querySelector(".settings-value").textContent).toBe("+50%");
    const preset = body.querySelector('[data-announcement-preset-index="1"]'); preset.value = "Tea";
    expect(change(preset)).toBe(true);
    expect(card._state.mobileAnnouncementPresets).toEqual(["Dinner", "Tea", 'Bed "time"']);
    const tts = body.querySelector("#mobileAnnouncementTtsEntity"); tts.value = "tts.piper";
    expect(change(tts)).toBe(true);
    const language = body.querySelector("#mobileAnnouncementTtsLanguageSelect"); language.value = "en-GB";
    expect(change(language)).toBe(true);
    expect(card._state).toMatchObject({ mobileAnnouncementTtsEntity: "tts.piper", mobileAnnouncementTtsLanguage: "en-GB" });
    expect(card._persistMobileAppearance).toHaveBeenCalledTimes(4);
    const other = document.createElement("input"); other.id = "somethingElse";
    expect(change(other)).toBe(false);
  });
  it("keeps the studio tray inputs in their own state", () => {
    const { card, root } = stubCard();
    const room = root.querySelector("#controlRoomBody");
    room.innerHTML = studioAnnouncePanelHtml(card, "");
    const text = room.querySelector("#controlRoomAnnouncementText"); text.value = "Studio";
    expect(handleStudioAnnouncementInput(card, { target: text })).toBe(true);
    const volume = room.querySelector("#controlRoomAnnouncementVolumeInput"); volume.value = "5";
    expect(handleStudioAnnouncementInput(card, { target: volume })).toBe(true);
    expect(card._state).toMatchObject({ controlRoomAnnouncementText: "Studio", controlRoomAnnouncementVolume: 20, mobileAnnouncementText: "" });
    expect(room.querySelector(".announcement-volume-field .settings-value").textContent).toBe("+20%");
    expect(handleStudioAnnouncementInput(card, { target: document.createElement("input") })).toBe(false);
  });
  it("uses the browser speech API with the configured language", () => {
    const { card } = stubCard({ mobileAnnouncementTtsLanguage: "en-GB" });
    const started = vi.fn();
    class FakeRecognition { start() { started(this); } }
    speechRecognitionCtor.mockReturnValue(FakeRecognition);
    startAnnouncementDictation(card);
    const recognition = card._voiceRecognition;
    expect(recognition).toBeInstanceOf(FakeRecognition);
    expect(recognition.lang).toBe("en-GB");
    expect(started).toHaveBeenCalledOnce();
    recognition.onresult({ results: [[{ transcript: "hello there" }]] });
    expect(card._state.mobileAnnouncementText).toBe("hello there");
    recognition.onend();
    expect(card._voiceRecognition).toBeNull();
    card._state.mobileAnnouncementTtsLanguage = "auto";
    startAnnouncementDictation(card);
    expect(card._voiceRecognition.lang).toBe("de-DE");
  });
});

describe("studio announcement send", () => {
  it("sends to each selected player and restores their volumes afterwards", async () => {
    vi.useFakeTimers();
    const { card, root } = stubCard({ mobileAnnouncementText: "keep me", mobileAnnouncementTarget: "all", mobileAnnouncementVolume: 25 });
    controlRoomSelectedPlayerIds.mockReturnValue(["media_player.kitchen", "media_player.bedroom"]);
    root.querySelector("#controlRoomBody").innerHTML = studioAnnouncePanelHtml(card, "");
    root.querySelector("#controlRoomAnnouncementText").value = "Studio message";
    root.querySelector("#controlRoomAnnouncementVolumeInput").value = "30";
    const send = root.querySelector("[data-room-announce-send]");
    expect(await sendControlRoomAnnouncement(card, send)).toBe(true);
    expect(card._pressUiButton).toHaveBeenCalledWith(send);
    expect(card._maverickEngineAnnounce).toHaveBeenCalledTimes(2);
    expect(card._maverickEngineAnnounce).toHaveBeenNthCalledWith(1, expect.objectContaining({ message: "Studio message", players: ["media_player.kitchen"], volume: 60 }));
    expect(card._maverickEngineAnnounce).toHaveBeenNthCalledWith(2, expect.objectContaining({ players: ["media_player.bedroom"], volume: 80 }));
    expect(card._state).toMatchObject({ mobileAnnouncementText: "keep me", mobileAnnouncementTarget: "all", mobileAnnouncementVolume: 25 });
    expect(card._announcementVolumeRestoreTimers.size).toBe(2);
    expect(announcementRestoreDelayMs("Studio message")).toBe(5000);
    await vi.advanceTimersByTimeAsync(5000 + 9000 - 1);
    expect(card._callMaverickEnginePlayerCommand).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(1);
    expect(card._callMaverickEnginePlayerCommand).toHaveBeenCalledTimes(6);
    expect(card._callMaverickEnginePlayerCommand).toHaveBeenCalledWith("media_player.kitchen", "volume", { volume_level: 0.3 });
    expect(card._callMaverickEnginePlayerCommand).toHaveBeenCalledWith("media_player.bedroom", "volume", { volume_level: 0.5 });
    expect(card._announcementVolumeRestoreTimers.size).toBe(0);
  });
  it("refuses to send without a message or a studio player", async () => {
    const { card } = stubCard();
    expect(await sendControlRoomAnnouncement(card)).toBe(false);
    expect(card._toastError).toHaveBeenCalledWith("ui.enter_an_announcement_first");
    card._state.controlRoomAnnouncementText = "Hello";
    controlRoomPrimaryPlayerId.mockReturnValue("");
    expect(await sendControlRoomAnnouncement(card)).toBe(false);
    expect(card._toastError).toHaveBeenCalledWith("ui.select_at_least_one_studio_player");
    expect(card._maverickEngineAnnounce).not.toHaveBeenCalled();
  });
});
