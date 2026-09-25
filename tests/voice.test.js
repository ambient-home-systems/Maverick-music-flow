// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindEmptyVoiceButton,
  bindSmartVoiceBackdrop,
  closeSmartVoiceConfirm,
  closeVoiceAssistantDialog,
  emptyVoiceButtonHtml,
  flowAssistantLabel,
  handleVoiceAssistantTranscript,
  handleVoiceSettingsChange,
  handleVoiceSettingsClick,
  playVoiceAssistantMusic,
  speechRecognitionCtor,
  startControlRoomLibraryVoice,
  startMobileVoiceSearch,
  startVoiceAssistantCommand,
  stopVoiceAssistantRecognition,
  syncVoiceAssistantDialog,
  voiceAssistantAgentId,
  voiceAssistantBestCandidate,
  voiceAssistantCommandIntent,
  voiceAssistantEnabled,
  voiceAssistantFabHtml,
  voiceAssistantMentionedPlayers,
  voiceAssistantMode,
  voiceAssistantQueueIntent,
  voiceAssistantSettingsSectionHtml,
  voiceAssistantSpeakerGroupIntent,
  voiceAssistantSpeakFeedbackEnabled,
} from "../src/core/media/voice.js";
import { resetScreensaverTimer } from "../src/core/media/screensaver.js";

vi.mock("../src/core/media/screensaver.js", () => ({ resetScreensaverTimer: vi.fn() }));

const { document, window, MouseEvent } = globalThis;

class FakeRecognition {
  static instances = [];
  constructor() { this.started = 0; this.aborted = 0; FakeRecognition.instances.push(this); }
  start() { this.started += 1; }
  abort() { this.aborted += 1; }
  result(transcript, isFinal = true) {
    const alternative = [{ transcript }];
    alternative.isFinal = isFinal;
    this.onresult?.({ results: [alternative] });
  }
}

const player = (entityId, name, extra = {}) => ({ entity_id: entityId, state: "idle", attributes: { friendly_name: name }, ...extra });
const empty = () => ({ playlists: [], tracks: [], albums: [], artists: [], radio: [], podcasts: [] });

function stubCard(state = {}) {
  const root = document.createElement("div");
  root.innerHTML = `
    <div class="card">
      <div id="npArt"></div>
      <button id="mobileVoiceAssistantBtn"></button>
      <button id="screensaverVoiceBtn"></button>
      <div id="voiceAssistantDialog"></div>
      <div class="menu-backdrop" id="mobileSmartVoiceModal"><div id="mobileSmartVoiceSheet"></div></div>
      <input id="mobileMediaSearchInput"><button id="mobileVoiceSearchBtn"></button>
      <input id="controlRoomLibraryInput">
    </div>`;
  document.body.append(root);
  const players = [player("media_player.computer", "Computer"), player("media_player.kitchen", "Kitchen", { state: "playing" })];
  const card = {
    shadowRoot: root,
    $: (id) => root.querySelector(`#${id}`),
    _config: {},
    _hass: { states: {} },
    _state: { voiceAssistantEnabled: true, voiceAssistantMode: "hybrid", voiceAssistantAgentId: "", voiceAssistantSpeakFeedback: false, mobileMicMode: "on", players, selectedPlayer: "media_player.computer", ...state },
    _i18n: (key, params = {}) => Object.keys(params).length ? `${key}:${Object.values(params).join(",")}` : key,
    _m: (text) => text,
    _esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    _iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
    _tabletBrandSignatureHtml: () => "<svg></svg>",
    _settingsPill: (label, value, current, attr) => `<button class="settings-pill ${value === current ? "active" : ""}" ${attr}="${value}">${label}</button>`,
    _clampedConfigNumber: (_key, fallback) => fallback,
    _mobileMicMode() { return this._state.mobileMicMode; },
    _loadPlayers: vi.fn(),
    _isMusicAssistantPlayer: () => true,
    _isLikelyBrowserPlayer: () => false,
    _isLocalSendspinPlayer: () => false,
    _isAvailableThisDevicePlayer: () => true,
    _getSelectedPlayer() { return this._state.players.find((p) => p.entity_id === this._state.selectedPlayer) || null; },
    _selectPlayer: vi.fn(function (entityId) { this._state.selectedPlayer = entityId; }),
    _selectedPlayerName: () => "Computer",
    _controlRoomPlayerName: (id) => id.replace("media_player.", ""),
    _artistName: (item = {}) => item.artist || "",
    _artUrl: () => "",
    _emptySearchResults: empty,
    _hasSearchResults: (results) => Object.values(results || {}).some((group) => Array.isArray(group) && group.length),
    _mergeSearchResults: (a, b) => { const out = empty(); Object.keys(out).forEach((k) => { out[k] = [...(a?.[k] || []), ...(b?.[k] || [])]; }); return out; },
    _normalizeSearchResponse: (raw) => raw,
    _search: vi.fn(async () => empty()),
    _callService: vi.fn(async () => empty()),
    _playMediaOnPlayer: vi.fn(async () => true),
    _playMedia: vi.fn(async () => true),
    _playerCmdFor: vi.fn(async () => true),
    _callMaverickEnginePlayerCommand: vi.fn(async () => true),
    _transferQueueBetween: vi.fn(async () => true),
    _applySpeakerGroupFor: vi.fn(async () => true),
    _clearSpeakerGroupFor: vi.fn(async () => true),
    _disconnectPlayerGroups: vi.fn(async () => ({ ok: true, count: 1 })),
    _callHomeAssistantWs: vi.fn(async () => ({ response: { speech: { plain: { speech: "Lights are on" } } } })),
    _withTimeout: (promise) => promise,
    _timeoutMessage: (label) => `${label} timed out`,
    _timeout: (fn, ms) => setTimeout(fn, ms),
    _refreshGroupingState: vi.fn(),
    _renderMobileMenu: vi.fn(),
    _renderMobileMediaResults: vi.fn(),
    _syncControlRoomUi: vi.fn(),
    _searchControlRoomLibrary: vi.fn(),
    _closeMobileMenu: vi.fn(),
    _hapticTap: vi.fn(),
    _flashInteraction: vi.fn(),
    _lockUiButton: vi.fn(() => true),
    _persistMobileAppearance: vi.fn(),
    _reopenSettingsMenuPreservingScroll: vi.fn(),
    _toast: vi.fn(),
    _toastError: vi.fn(),
    _toastSuccess: vi.fn(),
    _debugLog: vi.fn(),
  };
  return { card, root };
}

afterEach(() => {
  document.body.innerHTML = "";
  FakeRecognition.instances = [];
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("settings", () => {
  it("reads the state fields strictly and normalizes the mode", () => {
    const { card } = stubCard({ voiceAssistantEnabled: "yes", voiceAssistantMode: "assist", voiceAssistantAgentId: "  conversation.home  ", voiceAssistantSpeakFeedback: true });
    expect(voiceAssistantEnabled(card)).toBe(false);
    expect(voiceAssistantMode(card)).toBe("assist");
    expect(voiceAssistantAgentId(card)).toBe("conversation.home");
    expect(voiceAssistantSpeakFeedbackEnabled(card)).toBe(true);
    expect(flowAssistantLabel(card)).toBe("ui.flow_assistant");
    expect(speechRecognitionCtor()).toBe(null);
    window.webkitSpeechRecognition = FakeRecognition;
    expect(speechRecognitionCtor()).toBe(FakeRecognition);
  });
  it("renders the section with sorted agents and the current selection", () => {
    const { card } = stubCard({ voiceAssistantAgentId: "conversation.zeta", voiceAssistantMode: "music" });
    card._hass.states = {
      "conversation.zeta": { entity_id: "conversation.zeta", attributes: { friendly_name: "Zeta" } },
      "conversation.alpha": { entity_id: "conversation.alpha", attributes: { friendly_name: "Alpha" } },
      "light.kitchen": { entity_id: "light.kitchen" },
    };
    const html = voiceAssistantSettingsSectionHtml(card);
    const options = [...html.matchAll(/<option value="([^"]*)"\s*(selected)?/g)].map((m) => [m[1], !!m[2]]);
    expect(options).toEqual([["", false], ["conversation.alpha", false], ["conversation.zeta", true]]);
    expect(html).toContain('class="settings-pill active" data-setting-voice-assistant="on"');
    expect(html).toContain('class="settings-pill active" data-setting-voice-assistant-mode="music"');
    expect(html).toContain('class="settings-pill active" data-setting-voice-feedback="off"');
  });
  it("handles the setting pills and the agent select", () => {
    const { card, root } = stubCard({ voiceAssistantListening: true });
    root.innerHTML += '<button data-setting-voice-assistant="off"></button><button data-setting-voice-assistant-mode="assist"></button><button data-setting-voice-feedback="on"></button><span id="other"></span>';
    expect(handleVoiceSettingsClick(card, root.querySelector("[data-setting-voice-assistant]"))).toBe(true);
    expect(card._state.voiceAssistantEnabled).toBe(false);
    expect(card._state.voiceAssistantListening).toBe(false);
    expect(card._reopenSettingsMenuPreservingScroll).toHaveBeenCalledWith({ rebuild: true, init: true });
    expect(handleVoiceSettingsClick(card, root.querySelector("[data-setting-voice-assistant-mode]"))).toBe(true);
    expect(card._state.voiceAssistantMode).toBe("assist");
    expect(handleVoiceSettingsClick(card, root.querySelector("[data-setting-voice-feedback]"))).toBe(true);
    expect(card._state.voiceAssistantSpeakFeedback).toBe(true);
    expect(handleVoiceSettingsClick(card, root.querySelector("#other"))).toBe(false);
    expect(card._persistMobileAppearance).toHaveBeenCalledTimes(3);
    expect(handleVoiceSettingsChange(card, { target: { id: "voiceAssistantAgentSelect", value: " conversation.alpha " } })).toBe(true);
    expect(card._state.voiceAssistantAgentId).toBe("conversation.alpha");
    expect(handleVoiceSettingsChange(card, { target: { id: "somethingElse", value: "x" } })).toBe(false);
  });
});

describe("intents", () => {
  it("finds mentioned players by alias in spoken order without overlaps", () => {
    const { card } = stubCard();
    card._state.players.push(player("media_player.kitchen_2", "Kitchen Two"));
    const ids = (text) => voiceAssistantMentionedPlayers(card, text).map((p) => p.entity_id);
    expect(ids("move the queue from Kitchen Two to the computer")).toEqual(["media_player.kitchen_2", "media_player.computer"]);
    expect(ids("play something")).toEqual([]);
    expect(ids("")).toEqual([]);
    card._state.players[0].state = "unavailable";
    expect(ids("computer")).toEqual([]);
  });
  it("builds queue transfer and speaker group intents", () => {
    const { card } = stubCard();
    expect(voiceAssistantQueueIntent(card, "transfer the queue from Computer to Kitchen")).toEqual({ type: "queue_transfer", sourcePlayerId: "media_player.computer", targetPlayerId: "media_player.kitchen" });
    expect(voiceAssistantQueueIntent(card, "send the queue to kitchen")).toEqual({ type: "queue_transfer", sourcePlayerId: "media_player.computer", targetPlayerId: "media_player.kitchen" });
    expect(voiceAssistantQueueIntent(card, "kitchen queue")).toBe(null);
    expect(voiceAssistantSpeakerGroupIntent(card, "ungroup all speakers")).toEqual({ type: "group_disconnect_all" });
    expect(voiceAssistantSpeakerGroupIntent(card, "ungroup the kitchen")).toEqual({ type: "group_disconnect", playerId: "media_player.kitchen" });
    expect(voiceAssistantSpeakerGroupIntent(card, "group computer with kitchen")).toEqual({ type: "group_connect", primaryPlayerId: "media_player.computer", memberPlayerIds: ["media_player.kitchen"] });
    expect(voiceAssistantSpeakerGroupIntent(card, "join the kitchen")).toEqual({ type: "group_connect", primaryPlayerId: "media_player.computer", memberPlayerIds: ["media_player.kitchen"] });
    expect(voiceAssistantSpeakerGroupIntent(card, "play jazz")).toBe(null);
  });
  it("routes transport words and music requests", () => {
    const { card } = stubCard();
    const type = (text, options) => voiceAssistantCommandIntent(card, text, card._getSelectedPlayer(), options).type;
    expect(type("next song")).toBe("next");
    expect(type("go back")).toBe("previous");
    expect(type("pause")).toBe("pause");
    expect(type("stop")).toBe("stop");
    expect(type("resume playing")).toBe("resume");
    expect(type("what time is it")).toBe("unknown");
    expect(type("")).toBe("unknown");
    const music = voiceAssistantCommandIntent(card, "play imagine on the computer", card._getSelectedPlayer());
    expect(music.type).toBe("music");
    expect(music.query).toContain("imagine");
    expect(music.query).not.toContain("computer");
    expect(voiceAssistantCommandIntent(card, "imagine", null, { forceMusic: true })).toEqual({ type: "music", query: "imagine" });
  });
});

describe("music playback", () => {
  const track = (uri, name, artist) => ({ uri, media_type: "track", name, artist });
  it("picks the best matching candidate and rejects unrelated results", () => {
    const { card } = stubCard();
    const results = { tracks: [track("spotify://track/wrong", "Middle of the Night", "Stam"), track("spotify://track/michelle", "Michelle", "Noam Bettan")] };
    expect(voiceAssistantBestCandidate(card, results, "play the song michelle by noam bettan")?.uri).toBe("spotify://track/michelle");
    expect(voiceAssistantBestCandidate(card, { tracks: [results.tracks[0]] }, "the song michelle by noam bettan")).toBe(null);
  });
  it("falls back to a focused search through the card service and selects the target player", async () => {
    const { card } = stubCard();
    card._callService.mockResolvedValueOnce({ ...empty(), playlists: [{ uri: "spotify://playlist/shlomo", media_type: "playlist", name: "This Is Shlomo Artzi" }] });
    const result = await playVoiceAssistantMusic(card, "playlist by shlomo artzi", card._state.players[1]);
    expect(result).toMatchObject({ ok: true, autoCloseMs: 1400 });
    expect(card._search).toHaveBeenCalledWith("playlist by shlomo artzi");
    expect(card._callService).toHaveBeenCalledWith("search", { name: "playlist shlomo artzi", query: "playlist shlomo artzi", limit: 30, media_type: ["playlist"] });
    expect(card._selectPlayer).toHaveBeenCalledWith("media_player.kitchen", true);
    expect(card._playMediaOnPlayer).toHaveBeenCalledWith("media_player.kitchen", "spotify://playlist/shlomo", "playlist", "play", { label: "This Is Shlomo Artzi", silent: true });
    expect(card._state.voiceAssistantResponse).toBe("ui.voice_starting_playback:This Is Shlomo Artzi");
  });
  it("reports missing players, empty queries and no matches", async () => {
    const { card } = stubCard({ selectedPlayer: "" });
    expect((await playVoiceAssistantMusic(card, "jazz")).ok).toBe(false);
    expect(card._toastError).toHaveBeenLastCalledWith("ui.voice_command_no_player");
    expect((await playVoiceAssistantMusic(card, "  ", card._state.players[0])).message).toBe("ui.voice_command_not_understood");
    card._search.mockRejectedValueOnce(new Error("offline"));
    expect((await playVoiceAssistantMusic(card, "jazz", card._state.players[0])).message).toBe("ui.no_matching_content_was_found");
    expect(card._playMediaOnPlayer).not.toHaveBeenCalled();
  });
});

describe("transcript routing", () => {
  it("runs media commands, player management and the Assist bridge by mode", async () => {
    const { card } = stubCard();
    expect(await handleVoiceAssistantTranscript(card, "pause")).toMatchObject({ ok: true, autoCloseMs: 1200, message: "ui.voice_command_completed_action:pause" });
    expect(card._callMaverickEnginePlayerCommand).toHaveBeenCalledWith("media_player.computer", "pause");
    expect(await handleVoiceAssistantTranscript(card, "skip on kitchen")).toMatchObject({ ok: true });
    expect(card._playerCmdFor).toHaveBeenCalledWith("media_player.kitchen", "next");
    expect(card._selectPlayer).toHaveBeenCalledWith("media_player.kitchen", true);
    card._state.selectedPlayer = "media_player.computer";
    expect(await handleVoiceAssistantTranscript(card, "transfer the queue from computer to kitchen")).toMatchObject({ ok: true, message: "ui.voice_queue_transferred_between:computer,kitchen" });
    expect(card._transferQueueBetween).toHaveBeenCalledWith("media_player.computer", "media_player.kitchen", { silent: true });
    expect(await handleVoiceAssistantTranscript(card, "ungroup all speakers")).toMatchObject({ ok: true, message: "ui.all_player_groups_disconnected" });
    card._state.voiceAssistantAgentId = "conversation.home";
    expect(await handleVoiceAssistantTranscript(card, "turn on the lights")).toEqual({ handled: true, ok: true, message: "Lights are on" });
    expect(card._callHomeAssistantWs).toHaveBeenCalledWith({ type: "conversation/process", text: "turn on the lights", language: "en", agent_id: "conversation.home" });
    expect(card._toast).toHaveBeenCalledWith("Lights are on", "info", { duration: 6500 });
    card._state.voiceAssistantMode = "music";
    expect(await handleVoiceAssistantTranscript(card, "turn on the lights")).toMatchObject({ ok: false, message: "ui.no_matching_content_was_found" });
    expect(card._callHomeAssistantWs).toHaveBeenCalledTimes(1);
    card._state.voiceAssistantMode = "assist";
    await handleVoiceAssistantTranscript(card, "pause");
    expect(card._callHomeAssistantWs).toHaveBeenLastCalledWith(expect.objectContaining({ text: "pause" }));
    expect(card._callMaverickEnginePlayerCommand).toHaveBeenCalledTimes(1);
    expect((await handleVoiceAssistantTranscript(card, "  ")).message).toBe("ui.no_speech_was_captured");
  });
});

describe("assistant dialog", () => {
  it("shows a disabled error and auto-closes it", () => {
    vi.useFakeTimers();
    const { card, root } = stubCard({ voiceAssistantEnabled: false });
    startVoiceAssistantCommand(card, { keepScreensaver: true });
    const host = root.querySelector("#voiceAssistantDialog");
    expect(host.className).toBe("voice-assistant-dialog open keep-screensaver status-error");
    expect(host.querySelector("#voiceAssistantDialogResponse").textContent).toBe("ui.voice_assistant_disabled");
    expect(host.querySelector("#voiceAssistantDialogRetry").hidden).toBe(false);
    expect(resetScreensaverTimer).toHaveBeenCalledWith(card, { hide: false, activity: true });
    vi.advanceTimersByTime(6999);
    expect(card._state.voiceAssistantDialogOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(card._state.voiceAssistantDialogOpen).toBe(false);
    expect(host.innerHTML).toBe("");
    card._state.voiceAssistantEnabled = true;
    card._state.mobileMicMode = "off";
    startVoiceAssistantCommand(card);
    expect(card._state.voiceAssistantResponse).toBe("ui.microphone_is_disabled");
    expect(FakeRecognition.instances).toHaveLength(0);
  });
  it("listens, handles a final transcript and speaks the feedback", async () => {
    vi.useFakeTimers();
    window.SpeechRecognition = FakeRecognition;
    const spoken = [];
    window.speechSynthesis = { cancel: vi.fn(), speak: (u) => spoken.push(u.text) };
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    const { card, root } = stubCard({ voiceAssistantSpeakFeedback: true });
    startVoiceAssistantCommand(card);
    const [rec] = FakeRecognition.instances;
    expect(rec.started).toBe(1);
    expect(rec.lang).toBe("en-US");
    expect(card._state.voiceAssistantListening).toBe(true);
    expect(root.querySelector("#mobileVoiceAssistantBtn").classList.contains("listening")).toBe(true);
    expect(resetScreensaverTimer).toHaveBeenCalledWith(card, { hide: true, activity: true });
    rec.result("pau", false);
    expect(root.querySelector("#voiceAssistantDialogTranscript").textContent).toBe("pau");
    expect(root.querySelector("#voiceAssistantDialogRetry").hidden).toBe(true);
    rec.result("pause");
    expect(card._state.voiceAssistantDialogStatus).toBe("processing");
    expect(card._state.voiceAssistantListening).toBe(false);
    expect(root.querySelector("#mobileVoiceAssistantBtn").classList.contains("listening")).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(card._state.voiceAssistantDialogStatus).toBe("success");
    expect(root.querySelector("#voiceAssistantDialogResponse").textContent).toBe("ui.voice_command_completed_action:pause");
    expect(spoken).toEqual(["ui.voice_command_completed_action:pause"]);
    rec.onend();
    expect(card._toastError).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1200);
    expect(card._state.voiceAssistantDialogOpen).toBe(false);
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });
  it("reports recognition errors, silence and the listen timeout", async () => {
    vi.useFakeTimers();
    window.SpeechRecognition = FakeRecognition;
    const { card } = stubCard();
    startVoiceAssistantCommand(card);
    FakeRecognition.instances[0].onerror({ error: "not-allowed" });
    expect(card._state.voiceAssistantResponse).toBe("ui.microphone_permission_or_browser_blocked");
    FakeRecognition.instances[0].onend();
    expect(card._toastError).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(7000);
    startVoiceAssistantCommand(card);
    FakeRecognition.instances[1].onend();
    expect(card._state.voiceAssistantResponse).toBe("ui.no_speech_was_captured");
    vi.advanceTimersByTime(7000);
    startVoiceAssistantCommand(card);
    vi.advanceTimersByTime(12000);
    expect(FakeRecognition.instances[2].aborted).toBe(1);
    expect(card._state.voiceAssistantResponse).toBe("ui.flow_assistant timed out");
    expect(card._state.voiceAssistantDialogStatus).toBe("error");
  });
  it("toggles or keeps listening on repeat presses and closes cleanly", () => {
    window.SpeechRecognition = FakeRecognition;
    const { card, root } = stubCard();
    startVoiceAssistantCommand(card);
    card._state.voiceAssistantTranscript = "hel";
    startVoiceAssistantCommand(card, { ignoreWhenListening: true });
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(card._state.voiceAssistantListening).toBe(true);
    expect(root.querySelector("#voiceAssistantDialogTranscript").textContent).toBe("hel");
    startVoiceAssistantCommand(card);
    expect(FakeRecognition.instances[0].aborted).toBe(1);
    expect(FakeRecognition.instances[0].__maverickCancelled).toBe(true);
    expect(card._state.voiceAssistantListening).toBe(false);
    expect(card._state.voiceAssistantDialogOpen).toBe(false);
    startVoiceAssistantCommand(card);
    root.querySelector("#voiceAssistantDialogClose").click();
    expect(card._state.voiceAssistantDialogOpen).toBe(false);
    expect(card._voiceAssistantRecognition).toBe(null);
    startVoiceAssistantCommand(card);
    stopVoiceAssistantRecognition(card);
    expect(FakeRecognition.instances[2].aborted).toBe(1);
    expect(card._voiceAssistantRecognition).toBe(null);
    card._state.voiceAssistantDialogOpen = true;
    card._state.voiceAssistantDialogStatus = "error";
    syncVoiceAssistantDialog(card);
    expect(root.querySelector("#voiceAssistantDialogIconSlot").dataset.iconName).toBe("close");
    root.querySelector("#voiceAssistantDialogRetry").click();
    expect(FakeRecognition.instances).toHaveLength(4);
    closeVoiceAssistantDialog(card);
    expect(root.querySelector("#voiceAssistantDialog").innerHTML).toBe("");
  });
  it("renders the mic buttons and binds the empty-state one", () => {
    window.SpeechRecognition = FakeRecognition;
    const { card, root } = stubCard({ voiceAssistantListening: true });
    expect(voiceAssistantFabHtml(card)).toContain('class="mobile-art-fab voice-assistant-fab listening" id="mobileVoiceAssistantBtn" title="ui.flow_assistant"');
    card._state.voiceAssistantListening = false;
    root.querySelector("#npArt").innerHTML = emptyVoiceButtonHtml(card);
    expect(root.querySelector("#emptyVoiceAssistantBtn").className).toBe("empty-voice-btn ");
    card._state.voiceAssistantEnabled = false;
    expect(emptyVoiceButtonHtml(card)).toBe("");
    card._state.voiceAssistantEnabled = true;
    bindEmptyVoiceButton(card);
    root.querySelector("#emptyVoiceAssistantBtn").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(card._lockUiButton).toHaveBeenCalledWith(root.querySelector("#emptyVoiceAssistantBtn"), [8, 18, 8], { lockMs: 1200, disabled: false });
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(root.querySelector("#emptyVoiceAssistantBtn").classList.contains("listening")).toBe(true);
  });
});

describe("smart voice search", () => {
  it("guards unsupported and muted devices", () => {
    const { card } = stubCard();
    startMobileVoiceSearch(card);
    expect(card._toastError).toHaveBeenLastCalledWith("ui.voice_search_is_not_supported_on_this_device");
    window.SpeechRecognition = FakeRecognition;
    card._state.mobileMicMode = "off";
    startMobileVoiceSearch(card);
    expect(card._toastError).toHaveBeenLastCalledWith("ui.microphone_is_disabled");
    expect(FakeRecognition.instances).toHaveLength(0);
  });
  it("types the transcript into the search box in plain mode", async () => {
    vi.useFakeTimers();
    window.SpeechRecognition = FakeRecognition;
    const { card, root } = stubCard();
    startMobileVoiceSearch(card);
    const [rec] = FakeRecognition.instances;
    expect(root.querySelector("#mobileVoiceSearchBtn").classList.contains("listening")).toBe(true);
    rec.result("daft punk");
    expect(card._state.mediaQuery).toBe("daft punk");
    expect(root.querySelector("#mobileMediaSearchInput").value).toBe("daft punk");
    vi.advanceTimersByTime(120);
    expect(card._renderMobileMediaResults).toHaveBeenCalledTimes(1);
    rec.onend();
    expect(root.querySelector("#mobileVoiceSearchBtn").classList.contains("listening")).toBe(false);
    expect(card._voiceRecognition).toBe(null);
  });
  it("opens the confirm sheet in smart mode with a countdown, rotation and cancel", async () => {
    vi.useFakeTimers();
    window.SpeechRecognition = FakeRecognition;
    const { card, root } = stubCard({ mobileMicMode: "smart" });
    card._search.mockResolvedValue({ ...empty(), playlists: [{ uri: "lib://playlist/1", name: "Mix One" }], tracks: [{ uri: "lib://track/2", name: "Song Two", artist: "Band" }] });
    startMobileVoiceSearch(card);
    FakeRecognition.instances[0].result("mix one");
    await vi.advanceTimersByTimeAsync(0);
    const sheet = root.querySelector("#mobileSmartVoiceSheet");
    expect(root.querySelector("#mobileSmartVoiceModal").classList.contains("open")).toBe(true);
    expect(sheet.querySelector(".smart-voice-name").textContent).toBe("Mix One");
    expect(sheet.querySelector(".smart-voice-countdown span").textContent).toBe("5");
    await vi.advanceTimersByTimeAsync(1000);
    expect(sheet.querySelector(".smart-voice-countdown span").textContent).toBe("4");
    sheet.querySelector("#smartVoiceOtherBtn").click();
    expect(sheet.querySelector(".smart-voice-name").textContent).toBe("Song Two");
    expect(sheet.querySelector(".smart-voice-sub").textContent).toBe("Band");
    expect(sheet.querySelector(".smart-voice-countdown span").textContent).toBe("5");
    sheet.querySelector("#smartVoiceCancelBtn").click();
    expect(card._state.mobileSmartVoice).toBe(null);
    expect(card._mobileSmartVoiceTimer).toBe(null);
    expect(root.querySelector("#mobileSmartVoiceModal").classList.contains("open")).toBe(false);
    expect(sheet.innerHTML).toBe("");
    await vi.advanceTimersByTimeAsync(5000);
    expect(card._playMedia).not.toHaveBeenCalled();
  });
  it("plays the candidate when the countdown ends or play is pressed and closes from the backdrop", async () => {
    vi.useFakeTimers();
    window.SpeechRecognition = FakeRecognition;
    const { card, root } = stubCard({ mobileMicMode: "smart" });
    card._search.mockResolvedValue({ ...empty(), tracks: [{ uri: "lib://track/2", media_type: "track", name: "Song Two" }] });
    startMobileVoiceSearch(card);
    FakeRecognition.instances[0].result("song two");
    await vi.advanceTimersByTimeAsync(5000);
    expect(card._playMedia).toHaveBeenCalledWith("lib://track/2", "track", "play", { label: "Song Two" });
    expect(card._closeMobileMenu).toHaveBeenCalledTimes(1);
    expect(card._state.mobileSmartVoice).toBe(null);
    startMobileVoiceSearch(card);
    FakeRecognition.instances[1].result("song two");
    await vi.advanceTimersByTimeAsync(0);
    root.querySelector("#smartVoicePlayNowBtn").click();
    await vi.advanceTimersByTimeAsync(0);
    expect(card._playMedia).toHaveBeenCalledTimes(2);
    card._search.mockResolvedValue(empty());
    startMobileVoiceSearch(card);
    FakeRecognition.instances[2].result("nothing here");
    await vi.advanceTimersByTimeAsync(0);
    expect(card._toastError).toHaveBeenLastCalledWith("ui.no_matching_content_was_found");
    bindSmartVoiceBackdrop(card);
    card._state.mobileSmartVoice = { query: "x", candidates: [{ uri: "u", name: "n" }], index: 0, countdown: 5 };
    root.querySelector("#mobileSmartVoiceModal").classList.add("open");
    root.querySelector("#mobileSmartVoiceSheet").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(card._state.mobileSmartVoice).not.toBe(null);
    root.querySelector("#mobileSmartVoiceModal").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(card._state.mobileSmartVoice).toBe(null);
    closeSmartVoiceConfirm(card);
  });
});

describe("studio library voice", () => {
  it("feeds the transcript into the library search", async () => {
    vi.useFakeTimers();
    const { card, root } = stubCard();
    await startControlRoomLibraryVoice(card);
    expect(card._toastError).toHaveBeenLastCalledWith("ui.voice_input_is_not_supported_on_this_device");
    window.SpeechRecognition = FakeRecognition;
    await startControlRoomLibraryVoice(card);
    const [rec] = FakeRecognition.instances;
    rec.result("miles davis");
    expect(card._state.controlRoomLibraryQuery).toBe("miles davis");
    expect(card._state.controlRoomPanel).toBe("library");
    expect(card._syncControlRoomUi).toHaveBeenCalledTimes(1);
    expect(root.querySelector("#controlRoomLibraryInput").value).toBe("miles davis");
    vi.advanceTimersByTime(120);
    expect(card._searchControlRoomLibrary).toHaveBeenCalledWith("miles davis");
    rec.onerror();
    expect(card._toastError).toHaveBeenLastCalledWith("ui.voice_input_failed");
    rec.onend();
    expect(card._voiceRecognition).toBe(null);
  });
});
