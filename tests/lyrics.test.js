// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLyricsState,
  closeLyricsModal,
  currentLyricsActiveIndex,
  currentLyricsTrackKey,
  fetchLyricsForCurrentTrack,
  lyricsFontScale,
  lyricsSessionActive,
  nudgeLyricsFontScale,
  nudgeLyricsSyncOffset,
  openLyricsModal,
  setLyricsFontScale,
  setLyricsSyncOffset,
  syncLyricsForCurrentTrack,
  syncLyricsHighlight,
  toggleLyricsSyncEnabled,
} from "../src/core/media/lyrics.js";

const { document } = globalThis;
const LRC = "[00:01.00]First line\n[00:05.00]Second line\n[00:09.00]Third line";

function stubCard(state = {}, info = { key: "song-1", title: "Song One", artist: "Band", album: "Album", duration: 200 }) {
  const root = document.createElement("div");
  root.innerHTML = '<div class="card"><div class="lyrics-backdrop" id="lyricsBackdrop"></div></div>';
  document.body.append(root);
  const card = {
    shadowRoot: root,
    $: (id) => root.querySelector(`#${id}`),
    _config: {},
    _cache: { lyrics: new Map() },
    _state: {
      lyricsOpen: false, lyricsTrackKey: "", lyricsText: "", lyricsLoading: false, lyricsLines: [], lyricsActiveIndex: -1,
      mobileLyricsSyncEnabled: true, mobileLyricsSyncOffsetMs: 0, mobileLyricsFontScale: 1,
      maQueueState: { current_item: { media_item: { uri: "library://track/1", media_type: "track", name: "Song One" } } },
      ...state,
    },
    _currentTrackInfo: () => info,
    _getSelectedPlayer: () => ({ entity_id: "media_player.kitchen", state: "playing", attributes: { media_content_id: "library://track/1" } }),
    _getQueueItemStableId: (item) => item?.queue_item_id || "",
    _getQueueItemUri: (item) => item?.media_item?.uri || "",
    _getCurrentPosition: () => 0,
    _currentArtworkUrl: () => "https://art/cover.jpg",
    _callEngineMaCommand: vi.fn(async (command) => (command === "music/item_by_uri" ? { uri: "library://track/1" } : LRC)),
    _tabletBrandSignatureHtml: () => "<svg></svg>",
    _i18n: (key) => key,
    _m: (text) => text,
    _esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    _iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
    _persistMobileAppearance: vi.fn(),
    _syncNowPlayingUI: vi.fn(),
    _syncTabletAutoFitUi: vi.fn(),
  };
  return { card, root, backdrop: root.querySelector("#lyricsBackdrop") };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

describe("lyrics fetch", () => {
  it("prefers embedded metadata, then Music Assistant, and caches the result", async () => {
    const { card } = stubCard({ maQueueState: { current_item: { media_item: { uri: "library://track/1", media_type: "track", lrc_lyrics: "[00:02.00]Embedded" } } } });
    const embedded = await fetchLyricsForCurrentTrack(card);
    expect(embedded).toMatchObject({ source: "metadata", text: "Embedded", lrc: [{ time: 2, text: "Embedded" }] });
    expect(card._callEngineMaCommand).not.toHaveBeenCalled();
    const other = stubCard();
    const [first, second] = await Promise.all([fetchLyricsForCurrentTrack(other.card), fetchLyricsForCurrentTrack(other.card)]);
    expect(first).toBe(second);
    expect(first.source).toBe("music_assistant");
    expect(first.lrc).toHaveLength(3);
    expect(other.card._callEngineMaCommand).toHaveBeenCalledTimes(2);
    await fetchLyricsForCurrentTrack(other.card);
    expect(other.card._callEngineMaCommand).toHaveBeenCalledTimes(2);
  });
  it("stays offline without the LRCLIB opt-in and uses it when enabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ plainLyrics: "From the web" }) });
    const { card } = stubCard();
    card._callEngineMaCommand = vi.fn(async (command) => (command === "music/item_by_uri" ? { uri: "library://track/1" } : null));
    expect((await fetchLyricsForCurrentTrack(card)).source).toBe("disabled");
    expect(fetchSpy).not.toHaveBeenCalled();
    card._config.lrclib_lyrics_enabled = true;
    const external = await fetchLyricsForCurrentTrack(card);
    expect(external).toMatchObject({ source: "lrclib", text: "From the web" });
    expect(String(fetchSpy.mock.calls[0][0])).toContain("https://lrclib.net/api/get?track_name=Song+One&artist_name=Band&album_name=Album&duration=200");
    expect(card._cache.lyrics.get("song-1")).toBe(external);
  });
  it("surfaces a Music Assistant failure and allows a retry", async () => {
    const { card } = stubCard();
    card._callEngineMaCommand.mockRejectedValueOnce(new Error("MA offline"));
    await expect(fetchLyricsForCurrentTrack(card)).rejects.toThrow("MA offline");
    expect(card._cache.lyrics.size).toBe(0);
    expect((await fetchLyricsForCurrentTrack(card)).source).toBe("music_assistant");
  });
  it("builds the track key from the queue item, the player and the track info", () => {
    const { card } = stubCard();
    expect(currentLyricsTrackKey(card)).toBe("library://track/1|library://track/1|song-1|200");
    expect(lyricsSessionActive(card)).toBe(false);
    card._state.screensaverLyricsOpen = true;
    expect(lyricsSessionActive(card)).toBe(true);
  });
});

describe("lyrics modal", () => {
  it("opens with a loading shell, renders the synced timeline and closes cleanly", async () => {
    const { card, root, backdrop } = stubCard();
    const open = openLyricsModal(card);
    expect(card._state.lyricsOpen).toBe(true);
    expect(backdrop.classList.contains("open")).toBe(true);
    expect(backdrop.classList.contains("has-lyrics-art")).toBe(true);
    expect(backdrop.querySelector(".lyrics-state").textContent).toBe("ui.loading_lyrics");
    expect(backdrop.querySelector("#lyricsRetryBtn").disabled).toBe(true);
    expect(backdrop.querySelector("#lyricsSyncBtn").hidden).toBe(true);
    await open;
    expect(card._state.lyricsLoading).toBe(false);
    expect(root.querySelectorAll(".lyrics-line")).toHaveLength(3);
    expect(root.querySelector(".lyrics-line").textContent.trim()).toBe("First line");
    expect(backdrop.querySelector("#lyricsSyncBtn").hidden).toBe(false);
    expect(backdrop.querySelector(".lyrics-title").textContent).toBe("Song One");
    expect(backdrop.querySelector(".lyrics-sub").textContent).toBe("Band · Album");
    expect(root.querySelector(".card").classList.contains("lyrics-modal-open")).toBe(true);
    closeLyricsModal(card, { sync: false });
    expect(card._state.lyricsOpen).toBe(false);
    expect(card._state.lyricsText).toBe("");
    expect(backdrop.innerHTML).toBe("");
    expect(root.querySelector(".card").classList.contains("lyrics-modal-open")).toBe(false);
  });
  it("shows plain text or the not-found state and escapes lyrics", async () => {
    const { card, backdrop } = stubCard();
    card._callEngineMaCommand = vi.fn(async (command) => (command === "music/item_by_uri" ? { uri: "library://track/1" } : "Plain <b>line</b>"));
    await openLyricsModal(card);
    expect(backdrop.querySelector(".lyrics-pre").textContent).toBe("Plain <b>line</b>");
    expect(backdrop.querySelector(".lyrics-pre b")).toBeNull();
    card._cache.lyrics.clear();
    card._callEngineMaCommand = vi.fn(async (command) => (command === "music/item_by_uri" ? { uri: "library://track/1" } : null));
    await openLyricsModal(card);
    expect(backdrop.querySelector(".lyrics-state").textContent).toBe("ui.no_lyrics_found");
    card._cache.lyrics.clear();
    card._callEngineMaCommand = vi.fn(async () => { throw new Error("boom"); });
    await openLyricsModal(card);
    expect(backdrop.querySelector(".lyrics-state").textContent).toBe("ui.lyrics_unavailable_right_now");
  });
  it("keeps the lyrics when the screensaver still shows them and ignores stale responses", async () => {
    const { card } = stubCard({ screensaverLyricsOpen: true });
    let resolveLyrics;
    card._callEngineMaCommand = vi.fn((command) => (command === "music/item_by_uri" ? Promise.resolve({ uri: "library://track/1" }) : new Promise((resolve) => { resolveLyrics = resolve; })));
    const first = openLyricsModal(card);
    await flush();
    closeLyricsModal(card, { sync: false });
    expect(card._state.lyricsTrackKey).toBe("library://track/1|library://track/1|song-1|200");
    resolveLyrics(LRC);
    await first;
    expect(card._state.lyricsLines).toHaveLength(3);
    expect(card._state.lyricsOpen).toBe(false);
    clearLyricsState(card);
    expect(card._state).toMatchObject({ lyricsTrackKey: "", lyricsLines: [], lyricsActiveIndex: -1 });
  });
  it("refreshes once per track change and queues a change that lands mid-refresh", async () => {
    const { card } = stubCard({ lyricsOpen: true, lyricsTrackKey: "library://track/1|library://track/1|song-1|200" });
    syncLyricsForCurrentTrack(card);
    expect(card._lyricsRefreshPromise).toBeFalsy();
    expect(card._callEngineMaCommand).not.toHaveBeenCalled();
    card._currentTrackInfo = () => ({ key: "song-2", title: "Song Two", duration: 100 });
    syncLyricsForCurrentTrack(card);
    expect(card._lyricsRefreshPromise).toBeTruthy();
    card._currentTrackInfo = () => ({ key: "song-3", title: "Song Three", duration: 100 });
    syncLyricsForCurrentTrack(card);
    expect(card._lyricsRefreshQueued).toBe(true);
    await card._lyricsRefreshPromise;
    await flush();
    await (card._lyricsRefreshPromise || Promise.resolve());
    expect(card._state.lyricsTrackKey).toBe("library://track/1|library://track/1|song-3|100");
    expect(card._lyricsRefreshQueued).toBe(false);
  });
});

describe("lyrics karaoke and preferences", () => {
  it("highlights the line at the playback position, honouring the offset and the karaoke toggle", async () => {
    const { card, root } = stubCard();
    await openLyricsModal(card);
    card._getCurrentPosition = () => 5.5;
    expect(currentLyricsActiveIndex(card, card._state.lyricsLines)).toBe(1);
    syncLyricsHighlight(card, true);
    expect(root.querySelector('.lyrics-line[data-lyrics-index="1"]').classList.contains("active")).toBe(true);
    expect(root.querySelector("#lyricsTimeline").classList.contains("karaoke-active")).toBe(true);
    setLyricsSyncOffset(card, 4000);
    expect(root.querySelector("#lyricsOffsetResetBtn").textContent).toBe("+4.0s");
    expect(card._state.lyricsActiveIndex).toBe(2);
    nudgeLyricsSyncOffset(card, -20000);
    expect(card._state.mobileLyricsSyncOffsetMs).toBe(-10000);
    toggleLyricsSyncEnabled(card);
    expect(card._state.mobileLyricsSyncEnabled).toBe(false);
    expect(card._state.lyricsActiveIndex).toBe(-1);
    expect(root.querySelector("#lyricsSyncBtn").getAttribute("aria-pressed")).toBe("false");
    expect(root.querySelectorAll(".lyrics-line.active")).toHaveLength(0);
    expect(currentLyricsActiveIndex(card, card._state.lyricsLines)).toBe(-1);
  });
  it("clamps the font scale, updates the sheet variable and the label, and persists", async () => {
    const { card, root } = stubCard();
    await openLyricsModal(card);
    expect(lyricsFontScale(card)).toBe(1);
    nudgeLyricsFontScale(card, 0.08);
    expect(card._state.mobileLyricsFontScale).toBeCloseTo(1.08);
    expect(root.querySelector(".lyrics-sheet").style.getPropertyValue("--lyrics-font-scale")).toBe("1.08");
    expect(root.querySelector("#lyricsFontResetBtn").textContent).toBe("108%");
    setLyricsFontScale(card, 9);
    expect(lyricsFontScale(card)).toBe(1.4);
    setLyricsFontScale(card, 0.1);
    expect(lyricsFontScale(card)).toBe(0.75);
    expect(card._persistMobileAppearance).toHaveBeenCalledTimes(3);
    root.querySelector("#lyricsFontResetBtn").click();
    expect(lyricsFontScale(card)).toBe(1);
  });
});
