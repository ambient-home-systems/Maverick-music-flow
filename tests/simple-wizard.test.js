// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSimpleWizardState,
  handleSimpleWizardChange,
  handleSimpleWizardClick,
  resetSimpleWizardState,
  showSimpleWizardPopup,
  simpleWizardBuildCandidates,
  simpleWizardCandidateFromItem,
  simpleWizardDefaultPlayerIds,
  simpleWizardFindCandidates,
  simpleWizardHtml,
  simpleWizardPlay,
  simpleWizardPlayerPool,
  simpleWizardState,
} from "../src/core/media/simple-wizard.js";
import { loadScheduledStartPlaylists } from "../src/core/media/timers.js";

vi.mock("../src/core/media/timers.js", () => ({ loadScheduledStartPlaylists: vi.fn(async () => [{ uri: "lib://playlist/scheduled", name: "Scheduled" }]) }));

const { document } = globalThis;
const player = (entityId, name, extra = {}) => ({ entity_id: entityId, state: "idle", attributes: { friendly_name: name }, ...extra });
const empty = () => ({ playlists: [], tracks: [], albums: [], artists: [], radio: [], podcasts: [] });
const STYLES = [
  { id: "pop", label: "Pop", icon: "wand", subtitle: "Hits", queries: ["pop hits", "top 40", "pop mix", "extra"] },
  { id: "jazz", label: "Jazz", icon: "wand", subtitle: "Smooth", queries: ["jazz"] },
];

function stubCard(state = {}) {
  const root = document.createElement("div");
  root.innerHTML = '<div id="mobileMenuBody"></div><div class="surprise-popup" id="surprisePopup"></div>';
  document.body.append(root);
  const players = [player("media_player.computer", "Computer"), player("media_player.kitchen", "Kitchen", { state: "playing", attributes: { friendly_name: "Kitchen", media_title: "Now spinning" } })];
  const card = {
    shadowRoot: root,
    $: (id) => root.querySelector(`#${id}`),
    _state: { players, selectedPlayer: "media_player.computer", simpleWizard: null, ...state },
    _simpleWizardToken: 0,
    _simpleWizardPopupTimer: null,
    _i18n: (key) => key,
    _m: (text) => text,
    _esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    _iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
    _imgHtml: (src) => `<img src="${src}">`,
    _loadPlayers: vi.fn(),
    _resolvedPinnedPlayerEntities: () => [],
    _isLikelyBrowserPlayer: () => false,
    _pinnedPlayersExclusive: () => false,
    _isPlayerActive: (p) => p.state === "playing",
    _playerByEntityId(id) { return this._state.players.find((p) => p.entity_id === id) || null; },
    _playerArtworkUrl: () => "",
    _playerStateLabel: (p) => p.state,
    _musicStyleCatalog: ({ includeCustom = false } = {}) => (includeCustom ? [...STYLES, { id: "custom", label: "Custom", icon: "wand", subtitle: "Your words" }] : STYLES),
    _normalizeMediaItem: (item) => ({ uri: item.uri, name: item.name, media_type: item.media_type, image: item.image, artist: item.artist }),
    _artistName: () => "",
    _artUrl: () => "",
    _shuffleDiscoveryItems: (items) => items,
    _search: vi.fn(async () => empty()),
    _fetchLibrary: vi.fn(async () => []),
    _fetchRadioBrowserStations: vi.fn(async () => []),
    _mobileRadioBrowserCountry: () => "IL",
    _renderMobileMenu: null,
    _flashInteraction: vi.fn(),
    _applySpeakerGroupFor: vi.fn(async () => true),
    _playMediaOnPlayers: vi.fn(async () => true),
    _selectPlayer: vi.fn(),
    _timeout: (fn, ms) => setTimeout(fn, ms),
    _closeMobileMenu: vi.fn(),
    _syncNowPlayingUI: vi.fn(),
    _toastError: vi.fn(),
  };
  card._renderMobileMenu = vi.fn(async () => { root.querySelector("#mobileMenuBody").innerHTML = simpleWizardHtml(card); });
  return { card, root, body: root.querySelector("#mobileMenuBody") };
}

async function click(card, root, selector) {
  const target = root.querySelector(selector);
  return handleSimpleWizardClick(card, { target, preventDefault: vi.fn(), stopPropagation: vi.fn() });
}

afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); vi.useRealTimers(); });

describe("state", () => {
  it("normalises a partial or stale state in place", () => {
    const { card } = stubCard({ simpleWizard: { step: "review", selectedPlayers: ["media_player.gone", "media_player.kitchen", "media_player.kitchen"], source: "other", genre: "nope", contentType: "video" } });
    const state = simpleWizardState(card);
    expect(state).toBe(card._state.simpleWizard);
    expect(state).toMatchObject({ step: "review", selectedPlayers: ["media_player.kitchen"], source: "genre", genre: "pop", contentType: "playlist", query: "", candidates: [], loading: false });
    card._state.simpleWizard = "junk";
    expect(simpleWizardState(card).selectedPlayers).toEqual(["media_player.computer"]);
    expect(createSimpleWizardState({ step: "source" }).step).toBe("source");
    resetSimpleWizardState(card);
    expect(card._simpleWizardToken).toBe(1);
    expect(card._state.simpleWizard.selectedPlayers).toEqual(["media_player.computer"]);
  });
  it("builds the player pool and default selection", () => {
    const { card } = stubCard({ selectedPlayer: "" });
    card._state.players.push(player("media_player.browser", "Browser"), player("media_player.off", "Off", { state: "unavailable" }));
    card._isLikelyBrowserPlayer = (p) => p.entity_id === "media_player.browser";
    expect(simpleWizardPlayerPool(card).map((p) => p.entity_id)).toEqual(["media_player.computer", "media_player.kitchen"]);
    expect(card._loadPlayers).toHaveBeenCalled();
    expect(simpleWizardDefaultPlayerIds(card)).toEqual(["media_player.kitchen"]);
    card._state.selectedPlayer = "media_player.computer";
    expect(simpleWizardDefaultPlayerIds(card)).toEqual(["media_player.computer"]);
    card._pinnedPlayersExclusive = () => true;
    card._resolvedPinnedPlayerEntities = () => ["media_player.kitchen"];
    expect(simpleWizardPlayerPool(card).map((p) => p.entity_id)).toEqual(["media_player.kitchen"]);
    card._state.players = [];
    expect(simpleWizardDefaultPlayerIds(card)).toEqual([]);
  });
});

describe("render", () => {
  it("renders the three steps from the state", () => {
    const { card } = stubCard();
    const players = simpleWizardHtml(card);
    expect(players).toContain('data-simple-step="players"');
    expect(players).toContain("simple-wizard-progress-step active");
    expect(players.match(/data-simple-player=/g)).toHaveLength(2);
    expect(players).toContain('class="simple-wizard-player active " data-simple-player="media_player.computer"');
    expect(players).toContain('class="simple-wizard-player  is-playing" data-simple-player="media_player.kitchen"');
    expect(players).toContain("Now spinning");
    card._state.simpleWizard.step = "source";
    const genre = simpleWizardHtml(card);
    expect(genre).toContain('id="simpleWizardGenreSelect"');
    expect(genre).toContain('<option value="pop" selected>');
    expect(genre).not.toContain("simpleWizardCustomGenreInput");
    card._state.simpleWizard.genre = "custom";
    card._state.simpleWizard.customGenre = "quiet <jazz>";
    expect(simpleWizardHtml(card)).toContain('id="simpleWizardCustomGenreInput" type="text" value="quiet &lt;jazz>"');
    card._state.simpleWizard.source = "content";
    card._state.simpleWizard.contentType = "artist_radio";
    card._state.simpleWizard.query = "miles";
    const content = simpleWizardHtml(card);
    expect(content).toContain('class="simple-wizard-option active" data-simple-content="artist_radio"');
    expect(content).toContain('id="simpleWizardQueryInput" type="text" value="miles"');
    card._state.simpleWizard.step = "review";
    card._state.simpleWizard.loading = true;
    expect(simpleWizardHtml(card)).toContain("ui.finding_music");
    card._state.simpleWizard.loading = false;
    card._state.simpleWizard.error = "Boom";
    expect(simpleWizardHtml(card)).toContain('<div class="notice open">Boom</div>');
    card._state.simpleWizard.candidates = [{ uri: "a", name: "Alpha", media_type: "playlist", image: "https://art/a.jpg" }, { uri: "b", name: "Beta", media_type: "radio", subtitle: "FM" }];
    card._state.simpleWizard.selectedIndex = 1;
    card._state.simpleWizard.selectedPlayers = ["media_player.computer", "media_player.kitchen"];
    const review = simpleWizardHtml(card);
    expect(review).toContain('<span class="simple-wizard-review-kicker">2 players</span>');
    expect(review).toContain('<span class="simple-wizard-review-title">Beta</span>');
    expect(review).toContain('class="simple-wizard-result active" data-simple-candidate="1"');
    expect(review).toContain('<img src="https://art/a.jpg">');
    card._state.players = [];
    card._state.simpleWizard.step = "players";
    expect(simpleWizardHtml(card)).toContain("ui.no_players_found_yet");
  });
  it("normalises candidates from search and library items", () => {
    const { card } = stubCard();
    expect(simpleWizardCandidateFromItem(card, { name: "No uri" })).toBe(null);
    expect(simpleWizardCandidateFromItem(card, { uri: "lib://track/1", name: "Song", media_type: "track", artist: "Band" }))
      .toEqual({ uri: "lib://track/1", media_type: "track", name: "Song", subtitle: "Band", image: "", radioMode: false });
    card._normalizeMediaItem = () => { throw new Error("nope"); };
    expect(simpleWizardCandidateFromItem(card, { media_item: { uri: "lib://artist/2", name: "Artist", image: "x.jpg" } }, "playlist", { mediaType: "artist", radioMode: true, subtitle: "ui.artist_radio" }))
      .toEqual({ uri: "lib://artist/2", media_type: "artist", name: "Artist", subtitle: "ui.artist_radio", image: "x.jpg", radioMode: true });
  });
});

describe("click routing", () => {
  it("walks the players and music steps", async () => {
    const { card, root } = stubCard();
    await card._renderMobileMenu();
    const outside = document.createElement("button");
    root.append(outside);
    expect(await handleSimpleWizardClick(card, { target: outside })).toBe(false);
    expect(await click(card, root, '[data-simple-player="media_player.computer"] span')).toBe(true);
    expect(card._toastError).toHaveBeenCalledWith("ui.choose_at_least_one_player");
    await click(card, root, '[data-simple-player="media_player.kitchen"]');
    expect(card._state.simpleWizard.selectedPlayers).toEqual(["media_player.computer", "media_player.kitchen"]);
    expect(root.querySelector('[data-simple-all-players]').classList.contains("active")).toBe(true);
    await click(card, root, "[data-simple-all-players]");
    expect(card._state.simpleWizard.selectedPlayers).toEqual(["media_player.computer"]);
    await click(card, root, "[data-simple-all-players]");
    expect(card._state.simpleWizard.selectedPlayers).toEqual(["media_player.computer", "media_player.kitchen"]);
    await click(card, root, '[data-simple-player="media_player.computer"]');
    expect(card._state.simpleWizard.selectedPlayers).toEqual(["media_player.kitchen"]);
    await click(card, root, '[data-simple-next="source"]');
    expect(card._state.simpleWizard.step).toBe("source");
    await click(card, root, '[data-simple-source="content"]');
    expect(card._state.simpleWizard.source).toBe("content");
    await click(card, root, '[data-simple-content="library_radio"]');
    expect(card._state.simpleWizard.contentType).toBe("library_radio");
    await click(card, root, '[data-simple-back="players"]');
    expect(card._state.simpleWizard.step).toBe("players");
    card._state.simpleWizard.step = "review";
    card._state.simpleWizard.candidates = [{ uri: "a", name: "A" }, { uri: "b", name: "B" }];
    await card._renderMobileMenu();
    await click(card, root, '[data-simple-candidate="1"]');
    expect(card._state.simpleWizard.selectedIndex).toBe(1);
    await click(card, root, "[data-simple-reset]");
    expect(card._state.simpleWizard).toMatchObject({ step: "players", candidates: [], selectedPlayers: ["media_player.computer"] });
    expect(card._simpleWizardToken).toBe(1);
  });
});

describe("candidates", () => {
  it("searches a style across its queries and falls back to the library", async () => {
    const { card } = stubCard();
    card._search.mockImplementation(async (query) => ({ ...empty(), playlists: query === "top 40" ? [{ uri: "lib://playlist/top", name: "Top" }] : [], tracks: query === "pop hits" ? [{ uri: "lib://track/hit", name: "Hit", media_type: "track" }] : [] }));
    const found = await simpleWizardFindCandidates(card, createSimpleWizardState());
    expect(card._search.mock.calls.map((c) => c[0])).toEqual(["pop hits", "top 40", "pop mix"]);
    expect(found.map((c) => [c.uri, c.subtitle])).toEqual([["lib://track/hit", "Pop"], ["lib://playlist/top", "Pop"]]);
    card._search.mockResolvedValue(empty());
    card._fetchLibrary.mockImplementation(async (type) => (type === "radio" ? [{ uri: "lib://radio/1", name: "FM" }] : []));
    const fallback = await simpleWizardFindCandidates(card, createSimpleWizardState({ genre: "custom", customGenre: "quiet jazz" }));
    expect(card._search).toHaveBeenLastCalledWith("quiet jazz");
    expect(card._fetchLibrary.mock.calls).toEqual([["playlist", "random", 18, false], ["album", "random", 12, false], ["radio", "random", 12, false]]);
    expect(fallback).toEqual([{ uri: "lib://radio/1", media_type: "radio", name: "FM", subtitle: "quiet jazz", image: "", radioMode: false }]);
  });
  it("resolves content types with and without a keyword", async () => {
    const { card } = stubCard();
    card._search.mockResolvedValue({ ...empty(), playlists: [{ uri: "p" , name: "P" }], radio: [{ uri: "r", name: "R" }], artists: [{ uri: "a", name: "A" }] });
    card._fetchRadioBrowserStations.mockResolvedValue([{ uri: "rb", name: "RB" }]);
    card._fetchLibrary.mockImplementation(async (type) => [{ uri: `lib://${type}/x`, name: type }]);
    expect((await simpleWizardFindCandidates(card, createSimpleWizardState({ source: "content", query: "x" }))).map((c) => c.uri)).toEqual(["p"]);
    expect((await simpleWizardFindCandidates(card, createSimpleWizardState({ source: "content" }))).map((c) => c.uri)).toEqual(["lib://playlist/scheduled", "lib://playlist/x"]);
    expect(loadScheduledStartPlaylists).toHaveBeenCalledWith(card);
    const radio = await simpleWizardFindCandidates(card, createSimpleWizardState({ source: "content", contentType: "library_radio", query: "fm" }));
    expect(radio.map((c) => c.uri)).toEqual(["r", "rb"]);
    expect(card._fetchRadioBrowserStations).toHaveBeenCalledWith("fm", 18, { countryCode: "IL" });
    expect((await simpleWizardFindCandidates(card, createSimpleWizardState({ source: "content", contentType: "library_radio" }))).map((c) => c.uri)).toEqual(["lib://radio/x", "rb"]);
    const artistRadio = await simpleWizardFindCandidates(card, createSimpleWizardState({ source: "content", contentType: "artist_radio", query: "a" }));
    expect(artistRadio).toEqual([{ uri: "a", media_type: "artist", name: "A", subtitle: "ui.artist_radio", image: "", radioMode: true }]);
    expect((await simpleWizardFindCandidates(card, createSimpleWizardState({ source: "content", contentType: "artist" })))[0]).toMatchObject({ uri: "lib://artist/x", radioMode: false, subtitle: "ui.artist" });
  });
  it("builds candidates with guards and a stale-token check", async () => {
    const { card, root } = stubCard();
    card._state.simpleWizard = createSimpleWizardState({ step: "source", genre: "custom" });
    await simpleWizardBuildCandidates(card);
    expect(card._toastError).toHaveBeenLastCalledWith("ui.type_a_free_style_first");
    expect(card._state.simpleWizard.step).toBe("source");
    root.querySelector("#simpleWizardCustomGenreInput").value = "lo-fi";
    let resolveSearch;
    card._search.mockImplementation(() => new Promise((resolve) => { resolveSearch = resolve; }));
    const build = simpleWizardBuildCandidates(card, root.querySelector("[data-simple-build]"));
    await Promise.resolve();
    expect(card._flashInteraction).toHaveBeenCalled();
    expect(card._state.simpleWizard).toMatchObject({ step: "review", loading: true, customGenre: "lo-fi" });
    const stale = card._state.simpleWizard;
    resetSimpleWizardState(card);
    resolveSearch({ ...empty(), playlists: [{ uri: "p", name: "P" }] });
    await build;
    expect(stale.candidates).toEqual([]);
    expect(card._state.simpleWizard.step).toBe("players");
    card._state.simpleWizard.step = "source";
    card._search.mockRejectedValue(new Error("down"));
    card._fetchLibrary.mockResolvedValue([]);
    await simpleWizardBuildCandidates(card);
    expect(card._state.simpleWizard).toMatchObject({ step: "review", loading: false, candidates: [], error: "ui.no_matching_content_was_found" });
    card._search.mockResolvedValue({ ...empty(), playlists: [{ uri: "p", name: "P" }] });
    await simpleWizardBuildCandidates(card);
    expect(card._state.simpleWizard.candidates).toHaveLength(1);
    expect(root.querySelector(".simple-wizard-result-title").textContent).toBe("P");
    card._state.players = [];
    await simpleWizardBuildCandidates(card);
    expect(card._toastError).toHaveBeenLastCalledWith("ui.choose_at_least_one_player");
    expect(card._state.simpleWizard.step).toBe("players");
  });
});

describe("playback", () => {
  it("groups the targets, plays on the primary, shows the popup and closes the menu", async () => {
    vi.useFakeTimers();
    const { card, root } = stubCard();
    card._state.simpleWizard = createSimpleWizardState({ step: "review", selectedPlayers: ["media_player.kitchen", "media_player.computer"], candidates: [{ uri: "lib://playlist/1", name: "Mix", media_type: "playlist", radioMode: true }] });
    const play = simpleWizardPlay(card, root);
    await vi.advanceTimersByTimeAsync(250);
    await play;
    expect(card._applySpeakerGroupFor).toHaveBeenCalledWith("media_player.kitchen", ["media_player.computer"]);
    expect(card._playMediaOnPlayers).toHaveBeenCalledWith(["media_player.kitchen"], "lib://playlist/1", "playlist", "play", { label: "Mix", silent: true, radioMode: true });
    expect(card._selectPlayer).toHaveBeenCalledWith("media_player.kitchen", true);
    const popup = root.querySelector("#surprisePopup");
    expect(popup.classList.contains("simple-wizard-popup")).toBe(true);
    expect(popup.querySelector(".surprise-popup-player").textContent).toBe("ui.playing_on_2: 2 players");
    expect(card._closeMobileMenu).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1750);
    expect(card._closeMobileMenu).toHaveBeenCalledTimes(1);
    expect(card._syncNowPlayingUI).toHaveBeenCalledTimes(1);
    expect(popup.classList.contains("open")).toBe(false);
  });
  it("reports grouping and playback failures and builds when nothing is chosen", async () => {
    const { card } = stubCard();
    card._state.simpleWizard = createSimpleWizardState({ step: "review", selectedPlayers: ["media_player.kitchen", "media_player.computer"], candidates: [{ uri: "u", name: "U" }] });
    card._applySpeakerGroupFor.mockResolvedValueOnce(false);
    await simpleWizardPlay(card);
    expect(card._toastError).toHaveBeenLastCalledWith("ui.select_at_least_two_players_to_create_a_group");
    card._applySpeakerGroupFor.mockRejectedValueOnce(new Error("no group"));
    await simpleWizardPlay(card);
    expect(card._toastError).toHaveBeenLastCalledWith("no group");
    card._state.simpleWizard.selectedPlayers = ["media_player.kitchen"];
    card._playMediaOnPlayers.mockResolvedValueOnce(false);
    await simpleWizardPlay(card);
    expect(card._toastError).toHaveBeenLastCalledWith("ui.could_not_start_playback");
    expect(card._selectPlayer).not.toHaveBeenCalled();
    card._state.simpleWizard.candidates = [];
    card._search.mockResolvedValue({ ...empty(), playlists: [{ uri: "p", name: "P" }] });
    await simpleWizardPlay(card);
    expect(card._state.simpleWizard.candidates).toHaveLength(1);
    expect(card._playMediaOnPlayers).toHaveBeenCalledTimes(1);
    showSimpleWizardPopup(card, { name: "Solo" }, ["media_player.kitchen"]);
    expect(card.$("surprisePopup").querySelector(".surprise-popup-player").textContent).toBe("ui.playing_on_2: Kitchen");
    clearTimeout(card._simpleWizardPopupTimer);
  });
});

describe("change handler", () => {
  it("stores the inputs and re-renders on a style change", async () => {
    const { card } = stubCard();
    expect(await handleSimpleWizardChange(card, { target: { id: "simpleWizardQueryInput", value: "abba" } })).toBe(true);
    expect(card._state.simpleWizard).toMatchObject({ query: "abba", step: "players" });
    card._state.simpleWizard.candidates = [{ uri: "x" }];
    expect(await handleSimpleWizardChange(card, { target: { id: "simpleWizardGenreSelect", value: "jazz" } })).toBe(true);
    expect(card._state.simpleWizard).toMatchObject({ genre: "jazz", candidates: [], selectedIndex: 0 });
    expect(card._renderMobileMenu).toHaveBeenCalledTimes(1);
    await handleSimpleWizardChange(card, { target: { id: "simpleWizardGenreSelect", value: "unknown" } });
    expect(card._state.simpleWizard.genre).toBe("pop");
    expect(await handleSimpleWizardChange(card, { target: { id: "simpleWizardCustomGenreInput", value: "lo-fi" } })).toBe(true);
    expect(card._state.simpleWizard.customGenre).toBe("lo-fi");
    expect(await handleSimpleWizardChange(card, { target: { id: "other" } })).toBe(false);
  });
});
