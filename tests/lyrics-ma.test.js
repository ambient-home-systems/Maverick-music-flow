import { describe, expect, it, vi } from "vitest";
import { fetchLyricsForCurrentTrack } from "../src/core/media/lyrics.js";
import { extractCurrentLyricsRawText } from "../src/core/media/presentation.js";
function context() {
  const track = { uri: "spotify://track/1", name: "Song", media_type: "track" };
  return {
    _config: {}, _state: { maQueueState: { current_item: { media_item: track } } },
    _cache: { lyrics: new Map() }, _currentTrackInfo: () => ({ title: "Song", key: "song" }),
    _callEngineMaCommand: vi.fn(async command => command === "music/item_by_uri" ? track : ["Plain line", "[00:01.00]Synced line"]),
  };
}
describe("Music Assistant lyrics", () => {
  it("fetches native MA lyrics without browser LRCLIB opt-in and prefers synchronized lyrics", async () => {
    const card = context();
    const payload = await fetchLyricsForCurrentTrack(card);
    expect(payload.source).toBe("music_assistant");
    expect(payload.lrc).toEqual([{ time: 1, text: "Synced line" }]);
    expect(card._callEngineMaCommand).toHaveBeenLastCalledWith("metadata/get_track_lyrics", { track: expect.objectContaining({ uri: "spotify://track/1" }) });
  });
  it("coalesces concurrent lyric consumers and caches successful results", async () => {
    const card = context();
    await Promise.all([fetchLyricsForCurrentTrack(card), fetchLyricsForCurrentTrack(card)]);
    await fetchLyricsForCurrentTrack(card);
    expect(card._callEngineMaCommand).toHaveBeenCalledTimes(2);
  });
  it("surfaces a provider failure and permits a later retry", async () => {
    const card = context();
    card._callEngineMaCommand.mockRejectedValueOnce(new Error("MA offline"));
    await expect(fetchLyricsForCurrentTrack(card)).rejects.toThrow("MA offline");
    expect(card._cache.lyrics.size).toBe(0);
    expect((await fetchLyricsForCurrentTrack(card)).source).toBe("music_assistant");
  });
  it("recognizes the native lrc_lyrics metadata field before plain lyrics", () => {
    expect(extractCurrentLyricsRawText({ media_item: { metadata: { lyrics: "Plain", lrc_lyrics: "[00:01.00]Synced" } } })).toBe("[00:01.00]Synced");
  });
});
