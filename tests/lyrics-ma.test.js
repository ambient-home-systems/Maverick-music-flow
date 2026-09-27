// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { syncLyricsForCurrentTrack } from "../src/core/media/lyrics.js";
import { extractCurrentLyricsRawText } from "../src/core/media/presentation.js";
function context() {
  const track = { uri: "spotify://track/1", name: "Song", media_type: "track" };
  return {
    _config: {}, _state: { maQueueState: { current_item: { media_item: track } }, screensaverLyricsOpen: true }, $: () => null,
    _cache: { lyrics: new Map() }, _currentTrackInfo: () => ({ title: "Song", key: "song" }), _getSelectedPlayer: () => null,
    _callEngineMaCommand: vi.fn(async command => command === "music/item_by_uri" ? track : ["Plain line", "[00:01.00]Synced line"]),
  };
}
// The screensaver lyrics session fetches without a modal to render; the cache holds what it got.
async function refresh(card) {
  syncLyricsForCurrentTrack(card, { force: true });
  await card._lyricsRefreshPromise;
  return card._cache.lyrics.get("song") || null;
}
describe("Music Assistant lyrics", () => {
  it("fetches native MA lyrics without browser LRCLIB opt-in and prefers synchronized lyrics", async () => {
    const card = context();
    const payload = await refresh(card);
    expect(payload.source).toBe("music_assistant");
    expect(payload.lrc).toEqual([{ time: 1, text: "Synced line" }]);
    expect(card._state.lyricsLines).toEqual(payload.lrc);
    expect(card._callEngineMaCommand).toHaveBeenLastCalledWith("metadata/get_track_lyrics", { track: expect.objectContaining({ uri: "spotify://track/1" }) });
  });
  it("queues a refresh behind the one in flight and serves both from one result", async () => {
    const card = context();
    syncLyricsForCurrentTrack(card, { force: true });
    syncLyricsForCurrentTrack(card, { force: true });
    expect(card._lyricsRefreshQueued).toBe(true);
    await card._lyricsRefreshPromise;
    await (card._lyricsRefreshPromise || Promise.resolve());
    expect(card._lyricsRefreshQueued).toBe(false);
    await refresh(card);
    expect(card._callEngineMaCommand).toHaveBeenCalledTimes(2);
  });
  it("surfaces a provider failure and permits a later retry", async () => {
    const card = context();
    card._callEngineMaCommand.mockRejectedValueOnce(new Error("MA offline"));
    expect(await refresh(card)).toBe(null);
    expect(card._state).toMatchObject({ lyricsLoading: false, lyricsText: "", lyricsLines: [] });
    expect((await refresh(card)).source).toBe("music_assistant");
  });
  it("recognizes the native lrc_lyrics metadata field before plain lyrics", () => {
    expect(extractCurrentLyricsRawText({ media_item: { metadata: { lyrics: "Plain", lrc_lyrics: "[00:01.00]Synced" } } })).toBe("[00:01.00]Synced");
  });
});
