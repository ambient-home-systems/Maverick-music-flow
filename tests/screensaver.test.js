// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindScreensaver,
  handleScreensaverSettingsClick,
  hideScreensaver,
  markScreensaverPageEntry,
  resetScreensaverTimer,
  restoreScreensaverIfOpen,
  screensaverBlocked,
  screensaverClockSize,
  screensaverControlButtons,
  screensaverEnabled,
  screensaverOverlayHtml,
  screensaverSettingsPillsHtml,
  screensaverTimeoutSeconds,
  showScreensaver,
  syncScreensaverClockVars,
  syncScreensaverLyricsUi,
  syncScreensaverUi,
} from "../src/core/media/screensaver.js";

// The screensaver only forwards to the lyrics module; keep those calls observable and inert here.
vi.mock("../src/core/media/dynamic-theme.js", () => ({ syncDynamicThemeArtwork: vi.fn(async () => {}) }));
vi.mock("../src/core/media/lyrics.js", async (importOriginal) => ({
  ...(await importOriginal()),
  clearLyricsState: vi.fn(), closeLyricsModal: vi.fn(), syncLyricsForCurrentTrack: vi.fn(), toggleLyricsSyncEnabled: vi.fn(), nudgeLyricsFontScale: vi.fn(),
  lyricsSessionActive: () => false,
}));

const { document, MouseEvent, KeyboardEvent } = globalThis;
const playing = { entity_id: "media_player.kitchen", state: "playing", attributes: { media_title: "Song <One>", media_artist: "Band" } };

function stubCard(state = {}) {
  const root = document.createElement("div");
  root.innerHTML = '<div class="card"><button id="mobileLikeBtn">like</button></div>';
  document.body.append(root);
  const card = {
    shadowRoot: root,
    classList: document.createElement("div").classList,
    isConnected: true,
    offsetWidth: 900,
    getBoundingClientRect: () => ({ width: 900, height: 700 }),
    $: (id) => root.querySelector(`#${id}`),
    _hass: {},
    _state: {
      screensaverEnabled: true, screensaverControlsEnabled: true, screensaverControlButtons: ["previous", "play_pause", "next"],
      screensaverClockMode: "digital", screensaverTimeoutSeconds: 60, screensaverMessage: "", screensaverClockSize: 1, screensaverClockX: 82, screensaverClockY: 24,
      screensaverOpen: false, screensaverLyricsOpen: false, lyricsOpen: false, menuOpen: false, maQueueState: null, ...state,
    },
    _isVisualEditorContext: () => false,
    _getCurrentPosition: () => 6,
    _getSelectedPlayer: () => playing,
    _i18n: (key) => key,
    _esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    _iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
    _settingsPill: (label, value, current, attr) => `<button ${attr}="${value}" class="${value === current ? "active" : ""}">${label}</button>`,
    _playPauseIconName: () => "pause",
    _volumeIconName: () => "volume",
    _powerButtonIcon: () => "power",
    _currentMediaFavoriteState: () => false,
    _flowAssistantLabel: () => "Assistant",
    _voiceAssistantEnabled: () => false,
    _syncLocalSendspinMediaSession: vi.fn(),
    _currentArtworkUrl: () => "",
    _setButtonIcon: vi.fn(),
    _isMuted: () => false,
    _mobileUpNextItem: () => ({ name: "Next song" }),
    _queueItemPrimaryTitle: (item) => item.name,
    _queueItemPrimaryArtist: () => "Next band",
    _queueItemImageUrl: () => "",
    _language: () => "en-US",
    _tabletBrandSignatureHtml: () => "<svg class=\"logo\"></svg>",
    _selectedPlayerName: () => "Kitchen",
    _ensureQueueSnapshot: vi.fn(async () => {}),
    _syncVoiceAssistantDialog: vi.fn(),
    _syncNowPlayingUI: vi.fn(),
    _pressUiButton: () => true,
    _playerCmd: vi.fn(),
    _togglePlay: vi.fn(),
    _toggleMute: vi.fn(),
    _runAuxiliaryButtonAction: vi.fn(async () => {}),
    _toggleLikeCurrentMedia: vi.fn(async () => {}),
    _startVoiceAssistantCommand: vi.fn(),
    _layoutModeConfig: () => "tablet",
    _flashInteraction: vi.fn(),
    _persistMobileAppearance: vi.fn(),
    _reopenSettingsMenuPreservingScroll: vi.fn(),
  };
  root.querySelector(".card").insertAdjacentHTML("beforeend", screensaverOverlayHtml(card));
  return { card, root, overlay: root.querySelector("#screensaverBackdrop") };
}
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ""; });

describe("screensaver settings", () => {
  it("gates on the setting and the viewport, and normalises stored values in place", () => {
    const { card } = stubCard({ screensaverEnabled: false, screensaverClockSize: 9, screensaverTimeoutSeconds: 3 });
    expect(screensaverEnabled(card)).toBe(false);
    card._state.screensaverEnabled = true;
    expect(screensaverEnabled(card)).toBe(true);
    expect(screensaverClockSize(card)).toBe(1.45);
    expect(card._state.screensaverClockSize).toBe(1.45);
    expect(screensaverTimeoutSeconds(card)).toBe(15);
    syncScreensaverClockVars(card);
    expect(card.shadowRoot.querySelector(".card").style.getPropertyValue("--screensaver-clock-scale")).toBe("1.45");
  });
  it("hides the control cluster while controls are disabled but keeps the stored list", () => {
    const { card } = stubCard({ screensaverControlsEnabled: false, screensaverControlButtons: ["next", "bogus"] });
    expect(screensaverControlButtons(card)).toEqual([]);
    expect(screensaverControlButtons(card, { includeDisabled: true })).toEqual(["next"]);
  });
});

describe("screensaver render", () => {
  it("renders the overlay with the configured controls and a separate like button", () => {
    const { card } = stubCard({ screensaverControlButtons: ["previous", "like", "voice", "lyrics_sync"] });
    const html = screensaverOverlayHtml(card);
    expect(html).toContain('id="screensaverPrevBtn" data-screensaver-control="previous"');
    expect(html).toContain('screensaver-like-btn ');
    expect(html).not.toContain("screensaverVoiceBtn");
    expect(html).toContain('id="screensaverLyricsSyncBtn" data-screensaver-control="lyrics_sync"');
    expect(html.indexOf("screensaver-action-cluster")).toBeLessThan(html.indexOf("screensaver-like-btn"));
    card._voiceAssistantEnabled = () => true;
    card._state.voiceAssistantListening = true;
    expect(screensaverOverlayHtml(card)).toContain('screensaver-control-btn listening" id="screensaverVoiceBtn" data-screensaver-control="voice" data-screensaver-voice');
    card._state.screensaverControlsEnabled = false;
    expect(screensaverOverlayHtml(card)).not.toContain("screensaver-action-cluster");
  });
  it("renders the settings pills from state", () => {
    const { card } = stubCard({ screensaverAutoLyricsWhenPlaying: true });
    const html = screensaverSettingsPillsHtml(card);
    expect(html).toContain('data-setting-screensaver="on" class="active"');
    expect(html).toContain('data-setting-screensaver-auto-lyrics="on" class="active"');
    expect(html).toContain("ui.screensaver_lyrics_while_playing_helper");
  });
});

describe("screensaver bind and timer", () => {
  it("opens after the idle timeout, wires its controls and only counts real user input as activity", async () => {
    const { card, root, overlay } = stubCard();
    bindScreensaver(card);
    await vi.advanceTimersByTimeAsync(59_000);
    expect(card._state.screensaverOpen).toBe(false);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(card._state.screensaverOpen).toBe(true);
    expect(overlay.classList.contains("open")).toBe(true);
    expect(card.classList.contains("screensaver-page-open")).toBe(true);
    expect(root.querySelector("#screensaverTitle").textContent).toBe("Song <One>");
    root.querySelector("#screensaverPrevBtn").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(card._playerCmd).toHaveBeenCalledWith("previous");
    root.querySelector("#screensaverPlayPauseBtn").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(card._togglePlay).toHaveBeenCalledOnce();
    expect(card._state.screensaverOpen).toBe(true);
    // Synthetic events are untrusted and never count as activity; the gate keeps scripted DOM churn from waking the card.
    root.querySelector("#mobileLikeBtn").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    root.querySelector(".card").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    expect(card._state.screensaverOpen).toBe(true);
    resetScreensaverTimer(card, { hide: true, activity: true });
    expect(card._state.screensaverOpen).toBe(false);
    expect(overlay.classList.contains("closing")).toBe(true);
    await vi.advanceTimersByTimeAsync(600);
    expect(overlay.classList.contains("closing")).toBe(false);
    expect(card._syncNowPlayingUI).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(card._state.screensaverOpen).toBe(true);
  });
  it("honours the page-entry suppression window and retries while something blocks it", async () => {
    const { card } = stubCard({ screensaverTimeoutSeconds: 30 });
    markScreensaverPageEntry(card, "connected");
    expect(card._screensaverPageEntryPending).toBe(true);
    await vi.advanceTimersByTimeAsync(29_000);
    showScreensaver(card);
    expect(card._state.screensaverOpen).toBe(false);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(card._state.screensaverOpen).toBe(true);
    hideScreensaver(card);
    card._state.menuOpen = true;
    expect(screensaverBlocked(card)).toBe(true);
    resetScreensaverTimer(card, { delayMs: 500 });
    await vi.advanceTimersByTimeAsync(500);
    expect(card._state.screensaverOpen).toBe(false);
    card._state.menuOpen = false;
    await vi.advanceTimersByTimeAsync(2_000);
    expect(card._state.screensaverOpen).toBe(true);
    card._isVisualEditorContext = () => true;
    resetScreensaverTimer(card);
    expect(card._state.screensaverOpen).toBe(false);
    expect(card._screensaverTimer).toBeNull();
  });
  it("restores an open overlay after a rebuild without a second clock timer", () => {
    const { card, overlay } = stubCard({ screensaverOpen: true });
    restoreScreensaverIfOpen(card);
    expect(overlay.classList.contains("open")).toBe(true);
    const timer = card._screensaverClockTimer;
    expect(timer).toBeTruthy();
    restoreScreensaverIfOpen(card);
    expect(card._screensaverClockTimer).toBe(timer);
    hideScreensaver(card);
    expect(card._screensaverClockTimer).toBeNull();
  });
});

describe("screensaver sync", () => {
  it("fills the clock, track, next-up and mode classes from the player", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 9, 30, 15));
    const { card, root, overlay } = stubCard({ screensaverClockMode: "analog", screensaverMessage: "  Welcome  " });
    syncScreensaverUi(card);
    expect(root.querySelector("#screensaverClock").textContent).toMatch(/09:30/);
    expect(root.querySelector("#screensaverArtist").textContent).toBe("Band");
    expect(root.querySelector("#screensaverNext").hidden).toBe(false);
    expect(root.querySelector("#screensaverNextTitle").textContent).toBe("Next song");
    expect(root.querySelector("#screensaverMessage").textContent).toBe("Welcome");
    expect(overlay.classList.contains("analog-mode")).toBe(true);
    expect(overlay.classList.contains("empty-mode")).toBe(false);
    expect(root.querySelector("#screensaverSecond").style.getPropertyValue("--hand-rotation")).toBe("90deg");
    expect(root.querySelector("#screensaverPlayPauseBtn").disabled).toBe(false);
    card._getSelectedPlayer = () => null;
    card._mobileUpNextItem = () => null;
    syncScreensaverUi(card);
    expect(overlay.classList.contains("empty-mode")).toBe(true);
    expect(root.querySelector("#screensaverTitle").textContent).toBe("ui.nothing_playing");
    expect(root.querySelector("#screensaverNext").hidden).toBe(true);
    expect(root.querySelector("#screensaverPlayPauseBtn").disabled).toBe(true);
    expect(root.querySelector("#screensaverArt").innerHTML).toContain('class="logo"');
  });
  it("shows three lyric rows while playing and drops lyrics mode thirty seconds after a pause", () => {
    const { card, root, overlay } = stubCard({ screensaverOpen: true, screensaverLyricsOpen: true, lyricsLines: [{ time: 0, text: "Before" }, { time: 5, text: "Now" }, { time: 10, text: "After" }] });
    syncScreensaverLyricsUi(card, playing);
    expect(overlay.classList.contains("lyrics-mode")).toBe(true);
    expect(root.querySelectorAll(".screensaver-lyric-line")).toHaveLength(3);
    expect(root.querySelector(".screensaver-lyric-line.current").textContent).toBe("Now");
    syncScreensaverLyricsUi(card, { ...playing, state: "paused" });
    expect(overlay.classList.contains("lyrics-mode")).toBe(true);
    vi.advanceTimersByTime(31_000);
    syncScreensaverLyricsUi(card, { ...playing, state: "paused" });
    expect(overlay.classList.contains("lyrics-mode")).toBe(false);
    expect(card._state.screensaverLyricsOpen).toBe(false);
    expect(card._state.lyricsLines).toEqual([]);
    expect(card._state.lyricsTrackKey).toBe("");
  });
  it("applies the settings pills and re-arms or clears the timer", () => {
    const { card } = stubCard();
    const pills = document.createElement("div");
    pills.innerHTML = screensaverSettingsPillsHtml(card);
    expect(handleScreensaverSettingsClick(card, pills.querySelector('[data-setting-screensaver="off"]'))).toBe(true);
    expect(card._state.screensaverEnabled).toBe(false);
    expect(card._screensaverTimer).toBeNull();
    expect(card._persistMobileAppearance).toHaveBeenCalledOnce();
    expect(handleScreensaverSettingsClick(card, pills.querySelector('[data-setting-screensaver-auto-lyrics="on"]'))).toBe(true);
    expect(card._state.screensaverAutoLyricsWhenPlaying).toBe(true);
    expect(handleScreensaverSettingsClick(card, document.createElement("button"))).toBe(false);
  });
});
