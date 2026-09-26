// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyControlRoomScene,
  bindControlRoom,
  closeControlRoom,
  controlRoomActionTargetIds,
  controlRoomBackdropHtml,
  controlRoomCustomScenes,
  controlRoomEnabled,
  controlRoomHtml,
  controlRoomLabel,
  controlRoomMixPresets,
  controlRoomNormalizeMediaEntry,
  controlRoomPanelLabel,
  controlRoomPlayerCountLabel,
  controlRoomPlayerName,
  controlRoomPlayers,
  controlRoomPrimaryPlayerId,
  controlRoomSelectedPlayerIds,
  controlRoomUniqueEntries,
  controlRoomVisiblePlayerIds,
  loadControlRoomQueues,
  loadControlRoomScenesFromStorage,
  openControlRoom,
  openControlRoomLibrary,
  playControlRoomLibraryEntry,
  revealControlRoomThisDevicePlayer,
  searchControlRoomLibrary,
  setControlRoomPrimary,
  setControlRoomSelection,
  setControlRoomVisiblePlayers,
  startControlRoomMix,
  syncControlRoomChrome,
  syncControlRoomUi,
  toggleControlRoomPanel,
  toggleControlRoomPlayerSelection,
  toggleControlRoomVisiblePlayer,
} from "../src/core/media/control-room.js";
import { sendControlRoomAnnouncement } from "../src/core/media/announcements.js";
import { startControlRoomLibraryVoice } from "../src/core/media/voice.js";
import { syncScreenDock } from "../src/core/media/screen-dock.js";

vi.mock("../src/core/media/announcements.js", () => ({
  handleStudioAnnouncementInput: vi.fn(() => false),
  sendControlRoomAnnouncement: vi.fn(async () => {}),
  studioAnnouncePanelHtml: vi.fn(() => '<div class="control-room-tray open" id="announcePanel"></div>'),
}));
vi.mock("../src/core/media/voice.js", () => ({ startControlRoomLibraryVoice: vi.fn() }));
vi.mock("../src/core/media/screen-dock.js", () => ({ syncScreenDock: vi.fn() }));

const { document, MouseEvent, Event, localStorage } = globalThis;
const player = (entityId, name, extra = {}) => ({ entity_id: entityId, state: "idle", attributes: { friendly_name: name, volume_level: 0.4 }, ...extra });
const empty = () => ({ playlists: [], tracks: [], albums: [], artists: [], radio: [], podcasts: [] });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function stubCard(state = {}) {
  const root = document.createElement("div");
  root.innerHTML = '<div class="card"></div>';
  document.body.append(root);
  const players = [
    player("media_player.kitchen", "Kitchen", { state: "playing", attributes: { friendly_name: "Kitchen", volume_level: 0.5, media_title: "Song A", entity_picture: "https://art/k.jpg" } }),
    player("media_player.office", "Office"),
    player("media_player.browser", "Browser"),
  ];
  const card = {
    shadowRoot: root,
    $: (id) => root.querySelector(`#${id}`),
    _config: {},
    _lastCardWidth: 1400,
    _lastCardHeight: 800,
    _controlRoomVolumeTimer: null,
    _searchTimer: null,
    _state: {
      players, selectedPlayer: "media_player.kitchen", controlRoomOpen: false, controlRoomPanel: "", controlRoomSelectedPlayers: [], controlRoomVisiblePlayers: [],
      controlRoomRevealThisDevicePending: false, controlRoomRestoreAfterMenu: false, controlRoomRenderedHtml: "", controlRoomRenderSignature: "",
      controlRoomQueueSnapshots: {}, controlRoomQueueLoading: false, controlRoomRecentItems: [], controlRoomRecentLoading: false,
      controlRoomFavoritesItems: [], controlRoomFavoritesLoading: false, controlRoomSmartQuery: "", controlRoomCustomScenes: [], controlRoomSceneName: "",
      controlRoomLibraryQuery: "", controlRoomLibraryResults: [], controlRoomLibraryLoading: false, controlRoomTransferSource: "", controlRoomTransferTarget: "",
      queueItems: [], maQueueState: null, ...state,
    },
    _layoutModeConfig: () => "tablet",
    _isCompactTileMode: () => false,
    _isHotelMode: () => false,
    _i18n: (key, params) => (params ? `${key}:${Object.values(params).join(",")}` : key),
    _m: (text) => text,
    _esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    _iconSvg: (name) => `<svg data-icon="${name}"></svg>`,
    _imgHtml: (src) => `<img src="${src}">`,
    _tabletBrandSignatureHtml: () => "<svg></svg>",
    _playerByEntityId(id) { return this._state.players.find((p) => p.entity_id === id) || null; },
    _playerDisplayName: (p) => p?.attributes?.friendly_name || p?.entity_id || "",
    _playerStateLabel: (p) => p?.state || "",
    _playerArtworkUrl: (p) => p?.attributes?.entity_picture || "",
    _bestArtworkUrl: (list) => list.find(Boolean) || "",
    _currentArtworkCacheKey: (p) => p?.entity_id || "",
    _queueItemImageUrl: () => "",
    _artUrl: (item) => item?.image || "",
    _loadPlayers: vi.fn(),
    _isLikelyBrowserPlayer: (p) => p.entity_id === "media_player.browser",
    _isLocalSendspinPlayer: () => false,
    _isAvailableThisDevicePlayer: () => false,
    _playerGroupMemberIds: () => [],
    _isMuted: (p) => p?.attributes?.is_volume_muted === true,
    _volumeIconName: () => "volume_up",
    _getViewportHeight: () => 800,
    _getCardWidth: (w) => w,
    _getAllocatedCardHeight: (h) => h,
    _lsKey: (key) => `test_${key}`,
    _selectPlayer: vi.fn(function (id) { this._state.selectedPlayer = id; }),
    _suppressHomeShortcutNavigation: vi.fn(),
    _openMobileMenu: vi.fn(),
    _ensureQueueSnapshot: vi.fn(async () => {}),
    _fetchMusicAssistantQueueSnapshot: vi.fn(async (p) => ({ state: { items: 2, current_index: 1 }, items: [{ sort_index: 0, name: "First" }, { sort_index: 1, name: "Second" }], player: p.entity_id })),
    _maverickEngineRequired: () => true,
    _useMaLikedMode: () => false,
    _loadMaLikedEntries: vi.fn(async () => []),
    _likedEntries: () => [{ uri: "lib://track/liked", name: "Liked", media_type: "track" }],
    _nativeMixEntriesForPreset: vi.fn(async () => []),
    _fetchLibrary: vi.fn(async () => [{ uri: "lib://track/random", name: "Random" }]),
    _search: vi.fn(async () => ({ ...empty(), playlists: [{ uri: "lib://playlist/1", name: "Mix One" }], tracks: [{ uri: "lib://track/2", name: "Song Two" }] })),
    _fetchRecentlyPlayed: vi.fn(async () => [{ uri: "lib://album/recent", name: "Recent", media_type: "album" }]),
    _hasMusicAssistantCommandBridge: () => true,
    _callEngineMaCommand: vi.fn(async () => ({ items: [{ uri: "lib://podcast/1", name: "Pod", media_type: "podcast" }] })),
    _isEntryLiked: () => false,
    _supportsMusicAssistantRadioMode: (type) => type === "track" || type === "artist",
    _applySpeakerGroupFor: vi.fn(async () => true),
    _playMediaOnPlayer: vi.fn(async () => true),
    _timeout: (fn, ms) => setTimeout(fn, ms),
    _updateNowPlayingState: vi.fn(),
    _pressUiButton: vi.fn(() => true),
    _setPlayerVolumeFor: vi.fn(async () => true),
    _toggleLikeEntry: vi.fn(async () => true),
    _togglePlayFor: vi.fn(async () => true),
    _playerCmdFor: vi.fn(async () => true),
    _toggleMuteFor: vi.fn(async () => true),
    _transferQueueBetween: vi.fn(async () => true),
    _cloneQueueBetween: vi.fn(async () => true),
    _clearQueueForPlayer: vi.fn(async () => true),
    _disconnectThisDevicePlayer: vi.fn(),
    _connectThisDevicePlayer: vi.fn(),
    _launchMusicAssistant: vi.fn(),
    _stopPlayer: vi.fn(async () => true),
    _runControlRoomPlayerBatch: vi.fn(async (ids, action) => { await Promise.all(ids.map(action)); return true; }),
    _stopAllPlayers: vi.fn(async () => {}),
    _clearSpeakerGroupFor: vi.fn(async () => true),
    _toast: vi.fn(),
    _toastSuccess: vi.fn(),
    _toastError: vi.fn(),
  };
  return { card, root };
}

function mount(card, root) {
  root.querySelector(".card").innerHTML = controlRoomBackdropHtml(card);
  bindControlRoom(card);
  openControlRoom(card);
  return root.querySelector("#controlRoomBody");
}
const click = (el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));

afterEach(() => { document.body.innerHTML = ""; localStorage.clear(); vi.clearAllMocks(); vi.useRealTimers(); });

describe("gates, labels and player pools", () => {
  it("gates on the tablet layout and labels panels and counts", () => {
    const { card } = stubCard();
    expect(controlRoomEnabled(card)).toBe(true);
    card._isCompactTileMode = () => true;
    expect(controlRoomEnabled(card)).toBe(false);
    card._isCompactTileMode = () => false;
    card._layoutModeConfig = () => "mobile";
    expect(controlRoomEnabled(card)).toBe(false);
    expect(controlRoomLabel(card)).toBe("ui.studio");
    expect(controlRoomPanelLabel(card, "mix")).toBe("ui.smart_mix");
    expect(controlRoomPanelLabel(card, "nope")).toBe("ui.studio");
    expect(controlRoomPlayerCountLabel(card, 1)).toBe("ui.player_count_one");
    expect(controlRoomPlayerCountLabel(card, 3)).toBe("ui.player_count_many:3");
    expect(controlRoomPlayerName(card, "media_player.office")).toBe("Office");
    expect(controlRoomPlayerName(card, { attributes: { friendly_name: "Direct" } })).toBe("Direct");
    expect(controlRoomPlayerName(card, "media_player.ghost")).toBe("media_player.ghost");
    expect(controlRoomPlayerName(card, "")).toBe("ui.player");
  });
  it("keeps browser players out of the room and honours visibility with the this-device reveal", () => {
    const { card } = stubCard();
    expect(controlRoomPlayers(card).map((p) => p.entity_id)).toEqual(["media_player.kitchen", "media_player.office"]);
    expect(card._loadPlayers).toHaveBeenCalled();
    expect(controlRoomVisiblePlayerIds(card)).toEqual(["media_player.kitchen", "media_player.office"]);
    card._state.controlRoomVisiblePlayers = ["media_player.office", "media_player.gone"];
    expect(controlRoomVisiblePlayerIds(card)).toEqual(["media_player.office"]);
    expect(controlRoomPlayers(card).map((p) => p.entity_id)).toEqual(["media_player.office"]);
    card._state.players.push(player("media_player.this_device", "This device"));
    card._isLocalSendspinPlayer = (p) => p.entity_id === "media_player.this_device";
    card._isAvailableThisDevicePlayer = (p) => p.entity_id === "media_player.this_device";
    card._state.controlRoomRevealThisDevicePending = true;
    expect(controlRoomVisiblePlayerIds(card)).toEqual(["media_player.office", "media_player.this_device"]);
    expect(card._state.controlRoomRevealThisDevicePending).toBe(false);
    expect(revealControlRoomThisDevicePlayer(card, "")).toBe(false);
    card._state.controlRoomSelectedPlayers = ["media_player.office"];
    expect(revealControlRoomThisDevicePlayer(card, "media_player.this_device", { sync: false })).toBe(true);
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.this_device", "media_player.office"]);
  });
});

describe("selection", () => {
  it("defaults to the selected player and keeps at least one target", () => {
    const { card } = stubCard();
    expect(controlRoomSelectedPlayerIds(card)).toEqual(["media_player.kitchen"]);
    expect(controlRoomPrimaryPlayerId(card)).toBe("media_player.kitchen");
    expect(controlRoomActionTargetIds(card)).toEqual(["media_player.kitchen"]);
    expect(toggleControlRoomPlayerSelection(card, "media_player.kitchen")).toBe("kept");
    expect(toggleControlRoomPlayerSelection(card, "media_player.office")).toBe("added");
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.kitchen", "media_player.office"]);
    expect(card._state.controlRoomTransferSource).toBe("media_player.kitchen");
    expect(card._state.controlRoomTransferTarget).toBe("media_player.office");
    expect(toggleControlRoomPlayerSelection(card, "media_player.kitchen")).toBe("removed");
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.office"]);
    setControlRoomSelection(card, ["media_player.ghost", "media_player.office", "media_player.office"]);
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.office"]);
    setControlRoomSelection(card, []);
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.kitchen"]);
    setControlRoomPrimary(card, "media_player.office");
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.office", "media_player.kitchen"]);
    expect(card._selectPlayer).toHaveBeenCalledWith("media_player.office", true);
    setControlRoomPrimary(card, "media_player.kitchen", { exclusive: true, selectPlayer: false });
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.kitchen"]);
    expect(card._selectPlayer).toHaveBeenCalledTimes(1);
  });
  it("re-primes the primary when it is hidden", () => {
    const { card } = stubCard();
    setControlRoomVisiblePlayers(card, ["media_player.office"]);
    expect(card._state.controlRoomVisiblePlayers).toEqual(["media_player.office"]);
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.office"]);
    expect(card._state.controlRoomTransferSource).toBe("media_player.office");
    expect(card._selectPlayer).not.toHaveBeenCalled();
    toggleControlRoomVisiblePlayer(card, "media_player.kitchen");
    expect(card._state.controlRoomVisiblePlayers).toEqual(["media_player.office", "media_player.kitchen"]);
    setControlRoomVisiblePlayers(card, []);
    expect(card._state.controlRoomVisiblePlayers).toEqual(["media_player.kitchen"]);
  });
});

describe("open, close and panels", () => {
  it("opens with a full render, primes panels and closes silently", async () => {
    const { card, root } = stubCard();
    const body = mount(card, root);
    expect(card._state.controlRoomOpen).toBe(true);
    expect(root.querySelector("#controlRoomBackdrop").classList.contains("open")).toBe(true);
    expect(root.querySelector(".card").classList.contains("control-room-open")).toBe(true);
    expect(body.querySelectorAll("[data-room-tile]")).toHaveLength(2);
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.studio_opened");
    await flush();
    expect(Object.keys(card._state.controlRoomQueueSnapshots)).toEqual(["media_player.kitchen", "media_player.office"]);
    toggleControlRoomPanel(card, "recent");
    expect(card._state.controlRoomPanel).toBe("recent");
    expect(card._state.controlRoomRecentLoading).toBe(true);
    await flush();
    expect(card._state.controlRoomRecentItems.map((e) => e.uri)).toEqual(["lib://album/recent", "lib://podcast/1"]);
    expect(body.querySelector(".control-room-media-grid")).not.toBe(null);
    toggleControlRoomPanel(card, "recent");
    expect(card._state.controlRoomPanel).toBe("");
    toggleControlRoomPanel(card, "favorites");
    await flush();
    expect(card._state.controlRoomFavoritesItems[0]).toMatchObject({ uri: "lib://track/liked", subtitle: "ui.favorite" });
    openControlRoomLibrary(card, "library_albums");
    expect(card._state.controlRoomRestoreAfterMenu).toBe(true);
    expect(card._openMobileMenu).toHaveBeenCalledWith("library_albums");
    closeControlRoom(card, { silent: true });
    expect(card._state).toMatchObject({ controlRoomOpen: false, controlRoomPanel: "", controlRoomRestoreAfterMenu: false });
    expect(card._toast).not.toHaveBeenCalledWith("ui.studio_closed");
    expect(root.querySelector("#controlRoomBackdrop").classList.contains("open")).toBe(false);
    closeControlRoom(card);
    expect(card._toast).toHaveBeenCalledWith("ui.studio_closed");
    card._layoutModeConfig = () => "mobile";
    expect(controlRoomBackdropHtml(card)).toBe("");
    expect(controlRoomHtml(card)).toBe("");
    card._state.controlRoomOpen = true;
    syncControlRoomChrome(card);
    expect(root.querySelector("#controlRoomBackdrop").classList.contains("open")).toBe(false);
  });
  it("loads queue snapshots for the selected player from the local queue and for others from Music Assistant", async () => {
    const { card } = stubCard({ queueItems: [{ name: "Local" }], maQueueState: { items: 1, current_index: 0 } });
    await loadControlRoomQueues(card, ["media_player.kitchen", "media_player.office", "media_player.ghost", ""]);
    expect(card._ensureQueueSnapshot).toHaveBeenCalledWith(true);
    expect(card._fetchMusicAssistantQueueSnapshot).toHaveBeenCalledTimes(1);
    expect(card._state.controlRoomQueueSnapshots["media_player.kitchen"].snapshot.items).toEqual([{ name: "Local" }]);
    expect(card._state.controlRoomQueueSnapshots["media_player.office"].snapshot.player).toBe("media_player.office");
    expect(card._state.controlRoomQueueSnapshots["media_player.ghost"].snapshot).toBe(null);
    expect(card._state.controlRoomQueueLoading).toBe(false);
  });
});

describe("mixes and media", () => {
  it("normalises entries, dedupes them and starts a preset mix on the grouped targets", async () => {
    const { card } = stubCard({ controlRoomSelectedPlayers: ["media_player.kitchen", "media_player.office"] });
    expect(controlRoomNormalizeMediaEntry(card, { uri: "u", artists: [{ name: "A" }, { name: "B" }], album: { name: "Al" } }, "track")).toMatchObject({ uri: "u", media_type: "track", name: "u", subtitle: "A, B", artist: "A, B", album: "Al", favorite_scope: "library" });
    expect(controlRoomUniqueEntries(card, [{ uri: "x" }, { uri: "X" }, { name: "n" }, {}]).length).toBe(2);
    expect(controlRoomMixPresets(card).map((p) => p.id)).toContain("calm");
    expect(await startControlRoomMix(card, "calm")).toBe(true);
    expect(card._search).toHaveBeenCalledWith("relax chill playlist");
    expect(card._applySpeakerGroupFor).toHaveBeenCalledWith("media_player.kitchen", ["media_player.office"]);
    expect(card._playMediaOnPlayer.mock.calls[0]).toEqual(["media_player.kitchen", "lib://playlist/1", "playlist", "play", { label: "Mix One", silent: true, radioMode: false }]);
    expect(card._playMediaOnPlayer.mock.calls[1].slice(0, 4)).toEqual(["media_player.kitchen", "lib://track/2", "track", "add"]);
    expect(card._state.controlRoomPanel).toBe("");
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.studio_mix_started");
    expect(await startControlRoomMix(card, "favorites")).toBe(true);
    expect(card._playMediaOnPlayer).toHaveBeenLastCalledWith("media_player.kitchen", "lib://track/liked", "track", "shuffle", expect.any(Object));
    card._search.mockResolvedValue(empty());
    card._nativeMixEntriesForPreset.mockResolvedValue([]);
    expect(await startControlRoomMix(card, "party")).toBe(false);
    expect(card._toastError).toHaveBeenCalledWith("ui.no_mix_content_found");
  });
  it("plays library entries with the requested enqueue mode and guards radio mode", async () => {
    const { card } = stubCard();
    expect(await playControlRoomLibraryEntry(card, { name: "no uri" })).toBe(false);
    expect(await playControlRoomLibraryEntry(card, { uri: "u", media_type: "album" }, "next")).toBe(true);
    expect(card._playMediaOnPlayer).toHaveBeenLastCalledWith("media_player.kitchen", "u", "album", "next", { label: "", silent: true, radioMode: false });
    expect(await playControlRoomLibraryEntry(card, { uri: "u", media_type: "album" }, "radio_mode")).toBe(false);
    expect(card._toastError).toHaveBeenCalledWith("ui.radio_mode_is_not_available_for_this_media_type");
    expect(await playControlRoomLibraryEntry(card, { uri: "t", media_type: "track" }, "radio_mode")).toBe(true);
    expect(card._playMediaOnPlayer).toHaveBeenLastCalledWith("media_player.kitchen", "t", "track", "play", { label: "", silent: true, radioMode: true });
    expect(await playControlRoomLibraryEntry(card, { uri: "t" }, "like")).toBe(true);
    expect(card._toggleLikeEntry).toHaveBeenCalledWith({ uri: "t" });
  });
  it("searches the library with a token guard and renders the results in place", async () => {
    const { card, root } = stubCard();
    const body = mount(card, root);
    toggleControlRoomPanel(card, "library");
    let resolveFirst;
    card._search.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    const first = searchControlRoomLibrary(card, "old");
    const second = searchControlRoomLibrary(card, " new ");
    await second;
    expect(body.querySelectorAll(".control-room-media-card")).toHaveLength(2);
    resolveFirst({ ...empty(), tracks: [{ uri: "stale", name: "Stale" }] });
    await first;
    expect(card._state.controlRoomLibraryResults.map((e) => e.uri)).toEqual(["lib://playlist/1", "lib://track/2"]);
    expect(card._state.controlRoomLibraryQuery).toBe(" new ");
    await searchControlRoomLibrary(card, "  ");
    expect(card._state.controlRoomLibraryResults).toEqual([]);
    expect(body.querySelector("#controlRoomLibraryResults").textContent).toContain("ui.search_and_choose_play_next_add_radio_or_like");
  });
});

describe("scenes", () => {
  it("loads, saves, applies and deletes scenes", async () => {
    localStorage.setItem("test_maverick_music_control_room_scenes_v1", JSON.stringify([{ id: "abc", name: "Old", playerIds: ["media_player.office"], volumes: { "media_player.office": 0.2 }, media: { uri: "lib://playlist/old", name: "Old mix" } }, { name: "Empty" }]));
    const { card, root } = stubCard();
    loadControlRoomScenesFromStorage(card);
    expect(controlRoomCustomScenes(card)).toHaveLength(1);
    expect(controlRoomCustomScenes(card)[0]).toMatchObject({ id: "custom:abc", primaryId: "media_player.office", group: true, media: { uri: "lib://playlist/old", media_type: "track" } });
    const body = mount(card, root);
    toggleControlRoomPanel(card, "scenes");
    body.querySelector("#controlRoomSceneNameInput").value = "Evening";
    click(body.querySelector("[data-room-save-scene]"));
    expect(controlRoomCustomScenes(card).map((s) => s.name)).toEqual(["Evening", "Old"]);
    expect(controlRoomCustomScenes(card)[0]).toMatchObject({ playerIds: ["media_player.kitchen"], volumes: { "media_player.kitchen": 0.5 }, media: { name: "Song A" } });
    expect(JSON.parse(localStorage.getItem("test_maverick_music_control_room_scenes_v1"))).toHaveLength(2);
    expect(await applyControlRoomScene(card, "custom:abc")).toBe(true);
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.office"]);
    expect(card._setPlayerVolumeFor).toHaveBeenCalledWith("media_player.office", 0.2);
    expect(card._playMediaOnPlayer).toHaveBeenCalledWith("media_player.office", "lib://playlist/old", "track", "play", { label: "Old mix", silent: true });
    expect(await applyControlRoomScene(card, "custom:missing")).toBe(false);
    expect(await applyControlRoomScene(card, "home")).toBe(true);
    expect(card._setPlayerVolumeFor).toHaveBeenLastCalledWith("media_player.office", 0.35);
    expect(await applyControlRoomScene(card, "night")).toBe(true);
    expect(card._setPlayerVolumeFor).toHaveBeenLastCalledWith("media_player.office", 0.18);
    expect(card._search).toHaveBeenCalledWith("night chill playlist");
    click(body.querySelector('[data-room-delete-scene="custom:abc"]'));
    expect(controlRoomCustomScenes(card).map((s) => s.name)).toEqual(["Evening"]);
  });
});

describe("render and sync", () => {
  it("renders once per signature and updates live fields in place", () => {
    const { card, root } = stubCard();
    const body = mount(card, root);
    const rendered = body.innerHTML;
    expect(rendered).toContain('data-room-tile="media_player.kitchen"');
    expect(body.querySelector('[data-room-tile="media_player.kitchen"]').classList.contains("primary")).toBe(true);
    expect(body.querySelector(".control-room-now-name").textContent).toBe("Kitchen");
    const tile = body.querySelector('[data-room-tile="media_player.office"]');
    card._state.players[1].attributes.volume_level = 0.9;
    card._state.players[1].state = "playing";
    syncControlRoomUi(card);
    expect(body.querySelector('[data-room-tile="media_player.office"]')).toBe(tile);
    expect(tile.querySelector("[data-room-volume-value]").textContent).toBe("90%");
    expect(tile.classList.contains("is-playing")).toBe(true);
    expect(syncScreenDock).toHaveBeenCalled();
    card._state.controlRoomOpen = false;
    card._state.controlRoomPanel = "actions";
    syncControlRoomUi(card);
    expect(body.querySelector(".control-room-action-console")).toBe(null);
    syncControlRoomUi(card, { force: true });
    expect(body.querySelector(".control-room-action-console")).not.toBe(null);
    card._state.controlRoomPanel = "announce";
    syncControlRoomUi(card, { force: true });
    expect(body.querySelector("#announcePanel")).not.toBe(null);
  });
});

describe("event routing", () => {
  it("routes tile and dock clicks to the player commands", async () => {
    vi.useFakeTimers();
    const { card, root } = stubCard();
    const body = mount(card, root);
    click(body.querySelector('[data-room-select="media_player.office"]'));
    expect(card._state.controlRoomSelectedPlayers).toEqual(["media_player.kitchen", "media_player.office"]);
    expect(card._toastSuccess).toHaveBeenCalledWith("Office added to studio selection");
    click(body.querySelector('[data-room-primary="media_player.office"]'));
    expect(card._selectPlayer).toHaveBeenCalledWith("media_player.office", true);
    click(body.querySelector('[data-room-toggle-play="media_player.kitchen"]'));
    await vi.advanceTimersByTimeAsync(300);
    expect(card._togglePlayFor).toHaveBeenCalledWith("media_player.kitchen");
    expect(card._toastSuccess).toHaveBeenCalledWith("Kitchen paused");
    expect(card._updateNowPlayingState).toHaveBeenCalledTimes(1);
    click(body.querySelector('[data-room-next="media_player.kitchen"]'));
    await vi.advanceTimersByTimeAsync(300);
    expect(card._playerCmdFor).toHaveBeenCalledWith("media_player.kitchen", "next");
    click(body.querySelector('[data-room-mute="media_player.kitchen"]'));
    await vi.advanceTimersByTimeAsync(200);
    expect(card._toggleMuteFor).toHaveBeenCalledWith("media_player.kitchen");
    expect(card._toastSuccess).toHaveBeenCalledWith("Kitchen muted");
    click(body.querySelector('[data-room-selection-action="music"]'));
    expect(card._state.controlRoomPanel).toBe("music");
    expect(card._toast).toHaveBeenCalledWith("ui.music_hub opened");
    click(body.querySelector('[data-room-selection-action="browse_artists"]'));
    expect(card._openMobileMenu).toHaveBeenCalledWith("library_artists");
    click(body.querySelector('[data-room-selection-action="close_panel"]'));
    expect(card._state.controlRoomPanel).toBe("");
    click(body.querySelector('[data-room-selection-action="actions"]'));
    click(body.querySelector('[data-room-selection-action="playpause"]'));
    await vi.advanceTimersByTimeAsync(300);
    expect(card._runControlRoomPlayerBatch).toHaveBeenCalledTimes(1);
    expect(card._togglePlayFor).toHaveBeenCalledTimes(3);
    expect(card._toastSuccess).toHaveBeenCalledWith("Play / pause sent to ui.player_count_many:2");
    click(body.querySelector('[data-room-selection-action="group"]'));
    await vi.advanceTimersByTimeAsync(400);
    expect(card._applySpeakerGroupFor).toHaveBeenCalledWith("media_player.office", ["media_player.kitchen"]);
    click(body.querySelector('[data-room-selection-action="ungroup"]'));
    await vi.advanceTimersByTimeAsync(400);
    expect(card._clearSpeakerGroupFor).toHaveBeenCalledTimes(2);
    click(body.querySelector('[data-room-selection-action="stop_all"]'));
    await vi.advanceTimersByTimeAsync(400);
    expect(card._stopAllPlayers).toHaveBeenCalledTimes(1);
    click(body.querySelector('[data-room-selection-action="open_ma"]'));
    expect(card._launchMusicAssistant).toHaveBeenCalledTimes(1);
    click(body.querySelector('[data-room-selection-action="player_next"]'));
    await vi.advanceTimersByTimeAsync(300);
    expect(card._playerCmdFor).toHaveBeenLastCalledWith("media_player.office", "next");
    click(root.querySelector("#controlRoomCloseBtn"));
    expect(card._state.controlRoomOpen).toBe(false);
  });
  it("routes transfer, library, scene, announce and voice clicks", async () => {
    vi.useFakeTimers();
    const { card, root } = stubCard();
    const body = mount(card, root);
    click(body.querySelector('[data-room-selection-action="transfer"]'));
    await vi.advanceTimersByTimeAsync(10);
    expect(card._state.controlRoomTransferSource).toBe("media_player.kitchen");
    click(body.querySelector('[data-room-transfer-source="media_player.office"]'));
    expect(card._state.controlRoomTransferSource).toBe("media_player.office");
    expect(card._state.controlRoomTransferTarget).toBe("media_player.kitchen");
    click(body.querySelector('[data-room-transfer-target="media_player.kitchen"]'));
    expect(card._toast).toHaveBeenLastCalledWith("Transfer target: Kitchen");
    click(body.querySelector("[data-room-transfer]"));
    await vi.advanceTimersByTimeAsync(400);
    expect(card._transferQueueBetween).toHaveBeenCalledWith("media_player.office", "media_player.kitchen", { silent: true });
    expect(card._state.controlRoomPanel).toBe("");
    click(body.querySelector('[data-room-selection-action="transfer"]'));
    click(body.querySelector("[data-room-clone]"));
    await vi.advanceTimersByTimeAsync(400);
    expect(card._cloneQueueBetween).toHaveBeenCalledTimes(1);
    click(body.querySelector("[data-room-refresh-queues]"));
    await vi.advanceTimersByTimeAsync(10);
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.queues_refreshed");
    click(body.querySelector("[data-room-clear-queue]"));
    await vi.advanceTimersByTimeAsync(10);
    expect(card._clearQueueForPlayer).toHaveBeenCalledWith("media_player.kitchen");
    toggleControlRoomPanel(card, "library");
    click(body.querySelector("[data-room-library-mic]"));
    expect(startControlRoomLibraryVoice).toHaveBeenCalledWith(card);
    await searchControlRoomLibrary(card, "song");
    click(body.querySelector('[data-room-library-action="next"]'));
    await vi.advanceTimersByTimeAsync(400);
    expect(card._playMediaOnPlayer).toHaveBeenLastCalledWith("media_player.kitchen", "lib://playlist/1", "playlist", "next", expect.any(Object));
    expect(card._toastSuccess).toHaveBeenCalledWith("ui.will_play_next_in_studio");
    toggleControlRoomPanel(card, "scenes");
    click(body.querySelector('[data-room-scene="party"]'));
    await vi.advanceTimersByTimeAsync(10);
    expect(card._setPlayerVolumeFor).toHaveBeenCalledWith("media_player.kitchen", 0.55);
    body.innerHTML += '<button data-room-announce-send></button><button data-room-this-device="disconnect"></button>';
    click(body.querySelector("[data-room-announce-send]"));
    await vi.advanceTimersByTimeAsync(0);
    expect(sendControlRoomAnnouncement).toHaveBeenCalledTimes(1);
    click(body.querySelector("[data-room-this-device]"));
    expect(card._disconnectThisDevicePlayer).toHaveBeenCalledTimes(1);
    click(root.querySelector("#controlRoomBackdrop"));
    expect(card._state.controlRoomOpen).toBe(false);
  });
  it("routes volume, query and transfer inputs with their debounces", async () => {
    vi.useFakeTimers();
    const { card, root } = stubCard();
    const body = mount(card, root);
    const volume = body.querySelector('[data-room-volume="media_player.office"]');
    volume.value = "72";
    volume.dispatchEvent(new Event("input", { bubbles: true }));
    expect(body.querySelector('[data-room-volume-value="media_player.office"]').textContent).toBe("72%");
    expect(card._setPlayerVolumeFor).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(card._setPlayerVolumeFor).toHaveBeenCalledWith("media_player.office", 0.72);
    toggleControlRoomPanel(card, "mix");
    const smart = body.querySelector("#controlRoomSmartQueryInput");
    smart.value = "quiet jazz";
    smart.dispatchEvent(new Event("input", { bubbles: true }));
    expect(card._state.controlRoomSmartQuery).toBe("quiet jazz");
    click(body.querySelector("[data-room-smart-custom]"));
    await vi.advanceTimersByTimeAsync(10);
    expect(card._search).toHaveBeenCalledWith("quiet jazz");
    toggleControlRoomPanel(card, "library");
    const input = body.querySelector("#controlRoomLibraryInput");
    input.value = "abba";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(card._state.controlRoomLibraryQuery).toBe("abba");
    const stop = vi.fn();
    const keydown = new Event("keydown", { bubbles: true });
    keydown.stopPropagation = stop;
    input.dispatchEvent(keydown);
    expect(stop).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(card._search).toHaveBeenLastCalledWith("abba");
  });
});
