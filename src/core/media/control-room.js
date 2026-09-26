import { handleStudioAnnouncementInput, sendControlRoomAnnouncement, studioAnnouncePanelHtml } from "./announcements.js";
import { startControlRoomLibraryVoice } from "./voice.js";
import { syncScreenDock } from "./screen-dock.js";
import { cssUrl } from "../theme/css-url.js";
import { isLikelyBrowserPlayer, isPlayerAvailable } from "../state/players.js";
import { sortQueueItems } from "../state/media-queue.js";

// Control room (Studio): the tablet overlay that drives several players at
// once. Selection, visibility, panels, queue snapshots, mixes, scenes, the
// library search, the render with its signature cache and the event routing
// all live here. State stays in card._state.controlRoom*; the volume debounce
// timer keeps its name on the card instance.


export function controlRoomEnabled(card) {
  return card._layoutModeConfig() === "tablet" && !card._isCompactTileMode();
}

export function controlRoomLabel(card) {
  return card._i18n("ui.studio");
}

export function controlRoomPlayerName(card, entityOrPlayer = "") {
  const player = entityOrPlayer && typeof entityOrPlayer === "object"
    ? entityOrPlayer
    : card._playerByEntityId(String(entityOrPlayer || ""));
  return player ? card._playerDisplayName(player) : (String(entityOrPlayer || "") || card._i18n("ui.player"));
}

export function controlRoomPlayerCountLabel(card, count = 0) {
  const amount = Math.max(0, Number(count) || 0);
  if (amount === 1) return card._i18n("ui.player_count_one");
  return card._i18n("ui.player_count_many", { count: amount });
}

export function controlRoomPanelLabel(card, panel = "") {
  const labels = {
    selection: card._i18n("ui.connected_players"),
    visible: card._i18n("ui.visible_tiles"),
    music: card._i18n("ui.music_hub"),
    actions: card._i18n("ui.actions"),
    library: card._i18n("ui.studio_search"),
    transfer: card._i18n("ui.queue_cockpit"),
    mix: card._i18n("ui.smart_mix"),
    recent: card._i18n("ui.recent_listening"),
    favorites: card._i18n("ui.favorite_center"),
    scenes: card._i18n("ui.scene_presets"),
    announce: card._i18n("ui.announcement_studio"),
    pro: card._i18n("ui.studio_pro"),
  };
  return labels[String(panel || "")] || controlRoomLabel(card);
}

export function controlRoomActionTargetIds(card) {
  const selectedIds = controlRoomSelectedPlayerIds(card);
  if (selectedIds.length) return selectedIds;
  const primaryId = controlRoomPrimaryPlayerId(card);
  return primaryId ? [primaryId] : [];
}

function controlRoomFocusTarget(card) {
  const selectedIds = controlRoomSelectedPlayerIds(card);
  const selectedPlayers = selectedIds.map((entityId) => card._playerByEntityId(entityId)).filter(Boolean);
  const primary = controlRoomPrimaryPlayer(card);
  const players = selectedPlayers.length ? selectedPlayers : (primary ? [primary] : []);
  const first = players[0] || null;
  const art = card._bestArtworkUrl([first?.attributes?.entity_picture_local, first?.attributes?.entity_picture], {
    size: 160,
    cacheKey: card._currentArtworkCacheKey(first),
  });
  if (players.length > 1) {
    const names = players.map((player) => card._playerDisplayName(player, players)).filter(Boolean);
    return {
      art,
      count: players.length,
      kicker: card._i18n("ui.controlling"),
      name: controlRoomPlayerCountLabel(card, players.length),
      track: names.slice(0, 3).join(" · ") + (names.length > 3 ? "..." : ""),
    };
  }
  const name = card._playerDisplayName(first, players) || card._i18n("ui.selected_player_2");
  return {
    art,
    count: first ? 1 : 0,
    kicker: selectedIds.length ? card._i18n("ui.controlling") : card._i18n("ui.primary_target"),
    name,
    track: first?.attributes?.media_title || first?.attributes?.media_artist || card._playerStateLabel(first) || card._i18n("ui.idle_2"),
  };
}

function controlRoomContextChipHtml(card) {
  const target = controlRoomFocusTarget(card);
  return `
    <div class="control-room-context-chip">
      <span class="control-room-context-art">${target.art ? card._imgHtml(target.art, "", { fallbackIcon: "speaker" }) : card._iconSvg("speaker")}</span>
      <span class="control-room-context-copy">
        <span class="control-room-context-kicker">${card._esc(target.kicker)}</span>
        <span class="control-room-context-name">${card._esc(target.name)}</span>
      </span>
    </div>
  `;
}

function controlRoomAllPlayers(card) {
  card._loadPlayers();
  const players = (Array.isArray(card._state.players) ? card._state.players : []).filter(isPlayerAvailable);
  const visible = players.filter((player) => !card._isLikelyBrowserPlayer(player) || card._isLocalSendspinPlayer(player));
  return visible.length ? visible : players;
}

export function controlRoomVisiblePlayerIds(card) {
  const players = controlRoomAllPlayers(card);
  const validIds = new Set(players.map((player) => player.entity_id));
  let visibleIds = (Array.isArray(card._state.controlRoomVisiblePlayers) ? card._state.controlRoomVisiblePlayers : [])
    .filter((entityId) => validIds.has(entityId));
  const thisDevicePlayer = players.find((player) => card._isLocalSendspinPlayer(player) && card._isAvailableThisDevicePlayer(player));
  if (card._state.controlRoomRevealThisDevicePending && thisDevicePlayer?.entity_id) {
    if (!visibleIds.length && card._state.controlRoomVisiblePlayers?.length) visibleIds = [thisDevicePlayer.entity_id];
    else if (!visibleIds.includes(thisDevicePlayer.entity_id)) visibleIds.push(thisDevicePlayer.entity_id);
    card._state.controlRoomRevealThisDevicePending = false;
  }
  if (!visibleIds.length) visibleIds = players.map((player) => player.entity_id);
  if (!visibleIds.length && players[0]?.entity_id) visibleIds = [players[0].entity_id];
  card._state.controlRoomVisiblePlayers = visibleIds;
  return visibleIds;
}

export function revealControlRoomThisDevicePlayer(card, entityId = "", options = {}) {
  const id = String(entityId || "").trim();
  if (!id) return false;
  const visible = Array.isArray(card._state.controlRoomVisiblePlayers)
    ? card._state.controlRoomVisiblePlayers.filter(Boolean)
    : [];
  if (visible.length && !visible.includes(id)) card._state.controlRoomVisiblePlayers = [...visible, id];
  const selected = Array.isArray(card._state.controlRoomSelectedPlayers)
    ? card._state.controlRoomSelectedPlayers.filter(Boolean)
    : [];
  card._state.controlRoomSelectedPlayers = [id, ...selected.filter((value) => value !== id)];
  card._state.controlRoomRevealThisDevicePending = false;
  if (options.sync !== false && card._state.controlRoomOpen) {
    syncControlRoomTransferDefaults(card);
    syncControlRoomUi(card, { force: true });
  }
  return true;
}

export function controlRoomPlayers(card) {
  const players = controlRoomAllPlayers(card);
  const visibleIds = new Set(controlRoomVisiblePlayerIds(card));
  const filtered = players.filter((player) => visibleIds.has(player.entity_id));
  return filtered.length ? filtered : players;
}

function controlRoomGroupKey(card, player = null) {
  const attrs = player?.attributes || {};
  const candidates = [
    attrs.group_id,
    attrs.group,
    attrs.group_leader,
    attrs.group_parent,
    attrs.group_master,
    attrs.group_entity_id,
    attrs.sync_group,
    attrs.active_group,
    attrs.synced_to,
  ];
  const key = candidates
    .map((value) => String(value || "").trim())
    .find((value) => value && !/^(false|true|none|null|unknown|unavailable)$/i.test(value));
  return key || "";
}

function controlRoomGroupInfo(card, player = null) {
  if (!player?.entity_id || isLikelyBrowserPlayer(player)) return { ids: [], count: 0, label: "" };
  const allPlayers = controlRoomAllPlayers(card);
  const byId = new Map(allPlayers.map((entry) => [entry?.entity_id, entry]).filter(([entityId]) => !!entityId));
  let ids = card._playerGroupMemberIds(player);
  if (ids.length <= 1) {
    const owner = allPlayers.find((candidate) => {
      const members = card._playerGroupMemberIds(candidate);
      return members.length > 1 && members.includes(player.entity_id);
    });
    if (owner) ids = card._playerGroupMemberIds(owner);
  }
  if (ids.length <= 1) {
    const key = controlRoomGroupKey(card, player);
    if (key) {
      ids = allPlayers
        .filter((candidate) => controlRoomGroupKey(card, candidate) === key)
        .map((candidate) => candidate.entity_id);
    }
  }
  ids = [...new Set(ids)]
    .filter((entityId) => entityId && byId.has(entityId))
    .filter((entityId) => !isLikelyBrowserPlayer(byId.get(entityId)));
  const names = ids
    .map((entityId) => byId.get(entityId)?.attributes?.friendly_name || entityId)
    .filter(Boolean);
  return {
    ids,
    count: ids.length > 1 ? ids.length : 0,
    label: names.length > 1 ? names.join(" · ") : "",
  };
}

function controlRoomGroupSummaries(card, players = []) {
  const visible = Array.isArray(players) ? players : [];
  const byKey = new Map();
  visible.forEach((player) => {
    const info = controlRoomGroupInfo(card, player);
    if (!info.count) return;
    const ids = [...info.ids].sort();
    const key = ids.join("|");
    if (!key || byKey.has(key)) return;
    const names = ids.map((entityId) => controlRoomPlayerName(card, entityId)).filter(Boolean);
    const primaryId = ids[0] || player.entity_id;
    const primary = card._playerByEntityId(primaryId) || player;
    byKey.set(key, {
      ids,
      count: ids.length,
      label: names.join(" · "),
      art: card._bestArtworkUrl([primary?.attributes?.entity_picture_local, primary?.attributes?.entity_picture], {
        size: 120,
        cacheKey: card._currentArtworkCacheKey(primary),
      }),
    });
  });
  return [...byKey.values()];
}

function controlRoomGroupSummaryHtml(card, players = []) {
  const groups = controlRoomGroupSummaries(card, players);
  if (!groups.length) return "";
  return `
    <div class="control-room-group-summary" data-control-room-scroll="groups">
      ${groups.map((group) => `
        <div class="control-room-group-chip" title="${card._esc(group.label)}">
          <span class="control-room-group-art">${group.art ? card._imgHtml(group.art, "", { fallbackIcon: "speaker" }) : card._iconSvg("speaker")}</span>
          <span class="control-room-group-copy">
            <span class="control-room-group-title">${card._esc(card._m(`${group.count} grouped players`))}</span>
            <span class="control-room-group-members">${card._esc(group.label)}</span>
          </span>
        </div>
      `).join("")}
    </div>
  `;
}

export function controlRoomSelectedPlayerIds(card) {
  const players = controlRoomPlayers(card);
  const validIds = new Set(players.map((player) => player.entity_id));
  let selected = (Array.isArray(card._state.controlRoomSelectedPlayers) ? card._state.controlRoomSelectedPlayers : [])
    .filter((entityId) => validIds.has(entityId));
  if (!selected.length) {
    const preferred = card._state.selectedPlayer;
    if (preferred && validIds.has(preferred)) selected = [preferred];
    else if (players[0]?.entity_id) selected = [players[0].entity_id];
  }
  card._state.controlRoomSelectedPlayers = selected;
  return selected;
}

export function controlRoomPrimaryPlayerId(card) {
  const selectedIds = controlRoomSelectedPlayerIds(card);
  if (selectedIds[0]) return selectedIds[0];
  const players = controlRoomPlayers(card);
  const validIds = new Set(players.map((player) => player.entity_id));
  const preferred = card._state.selectedPlayer;
  if (preferred && validIds.has(preferred)) return preferred;
  return players[0]?.entity_id || "";
}

function controlRoomPrimaryPlayer(card) {
  return card._playerByEntityId(controlRoomPrimaryPlayerId(card));
}

export function setControlRoomSelection(card, entityIds = []) {
  const players = controlRoomPlayers(card);
  const validIds = new Set(players.map((player) => player.entity_id));
  const next = [];
  (Array.isArray(entityIds) ? entityIds : []).forEach((entityId) => {
    if (entityId && validIds.has(entityId) && !next.includes(entityId)) next.push(entityId);
  });
  if (!next.length) {
    const preferred = card._state.selectedPlayer;
    if (preferred && validIds.has(preferred)) next.push(preferred);
    else if (players[0]?.entity_id) next.push(players[0].entity_id);
  }
  card._state.controlRoomSelectedPlayers = next;
  syncControlRoomTransferDefaults(card);
  syncControlRoomUi(card);
}

export function toggleControlRoomPlayerSelection(card, entityId) {
  if (!entityId) return "kept";
  const current = controlRoomSelectedPlayerIds(card);
  const isSelected = current.includes(entityId);
  if (isSelected && current.length <= 1) {
    setControlRoomSelection(card, current);
    return "kept";
  }
  const next = isSelected
    ? current.filter((id) => id !== entityId)
    : [...current, entityId];
  setControlRoomSelection(card, next);
  return isSelected ? "removed" : "added";
}

export function setControlRoomPrimary(card, entityId, options = {}) {
  if (!entityId) return;
  const current = controlRoomSelectedPlayerIds(card).filter((id) => id !== entityId);
  const exclusive = !!options.exclusive;
  card._state.controlRoomSelectedPlayers = [entityId, ...(exclusive ? [] : current)];
  syncControlRoomTransferDefaults(card);
  if (options.selectPlayer !== false) card._selectPlayer(entityId, true);
  else syncControlRoomUi(card);
}

export function setControlRoomVisiblePlayers(card, entityIds = []) {
  const players = controlRoomAllPlayers(card);
  const validIds = new Set(players.map((player) => player.entity_id));
  const next = [];
  (Array.isArray(entityIds) ? entityIds : []).forEach((entityId) => {
    if (entityId && validIds.has(entityId) && !next.includes(entityId)) next.push(entityId);
  });
  if (!next.length && players[0]?.entity_id) next.push(players[0].entity_id);
  card._state.controlRoomVisiblePlayers = next;
  card._state.controlRoomSelectedPlayers = controlRoomSelectedPlayerIds(card).filter((entityId) => next.includes(entityId));
  const primaryId = controlRoomPrimaryPlayerId(card);
  if (!next.includes(primaryId) && next[0]) setControlRoomPrimary(card, next[0], { exclusive: false, selectPlayer: true });
  else {
    syncControlRoomTransferDefaults(card);
    syncControlRoomUi(card);
  }
}

export function toggleControlRoomVisiblePlayer(card, entityId) {
  if (!entityId) return;
  const current = controlRoomVisiblePlayerIds(card);
  const next = current.includes(entityId)
    ? current.filter((id) => id !== entityId)
    : [...current, entityId];
  setControlRoomVisiblePlayers(card, next);
}

function controlRoomPlayerChoiceRows(card, kind = "selection") {
  const allPlayers = kind === "visible" ? controlRoomAllPlayers(card) : controlRoomPlayers(card);
  const activeIds = new Set(
    kind === "visible"
      ? controlRoomVisiblePlayerIds(card)
      : controlRoomSelectedPlayerIds(card)
  );
  return `
    <div class="control-room-picker-list" data-control-room-scroll="${card._esc(kind)}">
      ${allPlayers.map((player) => {
        const entityId = player.entity_id;
        const active = activeIds.has(entityId);
        const art = card._bestArtworkUrl([player.attributes?.entity_picture_local, player.attributes?.entity_picture], {
          size: 120,
          cacheKey: card._currentArtworkCacheKey(player),
        });
        const name = player.attributes?.friendly_name || entityId;
        const subtitle = player.attributes?.media_title || card._playerStateLabel(player);
        const attr = kind === "visible" ? "data-room-visible-toggle" : "data-room-selection-toggle";
        return `
          <button class="control-room-picker-row ${active ? "active" : ""}" ${attr}="${card._esc(entityId)}">
            <span class="control-room-picker-art">${art ? card._imgHtml(art, "", { fallbackIcon: "speaker" }) : card._iconSvg("speaker")}</span>
            <span class="control-room-picker-copy">
              <span class="control-room-picker-title">${card._esc(name)}</span>
              <span class="control-room-picker-sub">${card._esc(subtitle || "")}</span>
            </span>
            <span class="control-room-picker-check">${card._iconSvg(active ? "check" : "plus")}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function syncControlRoomTransferDefaults(card) {
  const players = controlRoomPlayers(card);
  const ids = players.map((player) => player.entity_id);
  const primaryId = controlRoomPrimaryPlayerId(card);
  if (!ids.includes(card._state.controlRoomTransferSource)) {
    card._state.controlRoomTransferSource = card._state.selectedPlayer && ids.includes(card._state.selectedPlayer)
      ? card._state.selectedPlayer
      : (ids[0] || "");
  }
  if (!ids.includes(card._state.controlRoomTransferTarget) || card._state.controlRoomTransferTarget === card._state.controlRoomTransferSource) {
    card._state.controlRoomTransferTarget = primaryId && primaryId !== card._state.controlRoomTransferSource
      ? primaryId
      : (ids.find((id) => id !== card._state.controlRoomTransferSource) || primaryId || "");
  }
}

export function syncControlRoomChrome(card) {
  const open = !!card._state.controlRoomOpen && controlRoomEnabled(card);
  card.$("controlRoomBackdrop")?.classList.toggle("open", open);
  card.shadowRoot?.querySelector(".card")?.classList.toggle("control-room-open", open);
}

export function openControlRoom(card) {
  if (!controlRoomEnabled(card)) return;
  card._state.controlRoomOpen = true;
  card._state.controlRoomPanel = "";
  controlRoomSelectedPlayerIds(card);
  syncControlRoomTransferDefaults(card);
  syncControlRoomChrome(card);
  syncControlRoomUi(card, { force: true });
  loadControlRoomQueues(card, controlRoomPlayers(card).map((player) => player.entity_id)).catch(() => {});
  card._toastSuccess(card._i18n("ui.studio_opened"));
}

export function closeControlRoom(card, options = {}) {
  card._suppressHomeShortcutNavigation();
  card._state.controlRoomOpen = false;
  card._state.controlRoomPanel = "";
  card._state.controlRoomRestoreAfterMenu = false;
  const sheet = card.$("controlRoomBackdrop");
  sheet?.querySelectorAll(".screen-all-actions").forEach(panel => panel.remove());
  sheet?.querySelectorAll(".immersive-fan").forEach(fan => { fan.hidden = true; });
  sheet?.querySelectorAll("[data-screen-wheel]").forEach(button => button.setAttribute("aria-expanded", "false"));
  syncControlRoomChrome(card);
  if (!options.silent) card._toast(card._i18n("ui.studio_closed"));
}

export function openControlRoomLibrary(card, page = "library_playlists") {
  card._state.controlRoomRestoreAfterMenu = true;
  card._state.controlRoomOpen = true;
  card._openMobileMenu(page);
}

export function toggleControlRoomPanel(card, panel = "") {
  const next = String(panel || "");
  card._state.controlRoomPanel = card._state.controlRoomPanel === next ? "" : next;
  syncControlRoomUi(card);
  primeControlRoomPanelData(card, card._state.controlRoomPanel);
}

function primeControlRoomPanelData(card, panel = "") {
  const activePanel = String(panel || "");
  if (!activePanel) return;
  if (activePanel === "transfer") {
    const ids = [
      card._state.controlRoomTransferSource,
      card._state.controlRoomTransferTarget,
      ...controlRoomSelectedPlayerIds(card),
    ].filter(Boolean);
    loadControlRoomQueues(card, ids).catch(() => {});
    return;
  }
  if (activePanel === "recent") {
    loadControlRoomRecent(card).catch(() => {});
    return;
  }
  if (activePanel === "favorites") {
    loadControlRoomFavorites(card).catch(() => {});
  }
}

function controlRoomMediaTypeIcon(card, mediaType = "") {
  const type = String(mediaType || "").toLowerCase();
  if (type === "playlist") return "playlist";
  if (type === "artist") return "artist";
  if (type === "track") return "tracks";
  if (type === "radio") return "radio";
  if (type === "podcast") return "podcast";
  return "album";
}

function controlRoomMediaTypeLabel(card, mediaType = "") {
  const type = String(mediaType || "").toLowerCase();
  const labels = {
    track: card._i18n("ui.track"),
    album: card._i18n("ui.album"),
    artist: card._i18n("ui.artist"),
    playlist: card._i18n("ui.playlist"),
    radio: card._i18n("ui.radio"),
    podcast: card._i18n("ui.podcast"),
  };
  return labels[type] || card._i18n("ui.media");
}

export function controlRoomNormalizeMediaEntry(card, item = {}, fallbackType = "album", options = {}) {
  const mediaType = String(item?.media_type || item?.type || item?.media_item?.media_type || fallbackType || "album").toLowerCase();
  const artists = Array.isArray(item?.artists)
    ? item.artists.map((artist) => artist?.name).filter(Boolean).join(", ")
    : "";
  const uri = item?.uri || item?.media_item?.uri || item?.media_content_id || "";
  return {
    uri,
    media_type: mediaType,
    name: item?.name || item?.title || item?.media_item?.name || uri || controlRoomMediaTypeLabel(card, mediaType),
    subtitle: options.subtitle || artists || item?.artist || item?.album?.name || item?.metadata?.description || item?.provider_label || controlRoomMediaTypeLabel(card, mediaType),
    artist: artists || item?.artist || "",
    album: item?.album?.name || item?.album || "",
    image: card._artUrl(item) || item?.image || item?.image_url || item?.media_item?.image || item?.media_image || "",
    favorite: !!item?.favorite,
    favorite_scope: item?.favorite_scope || options.favorite_scope || "library",
  };
}

function controlRoomEntryDataAttrs(card, entry = {}) {
  return [
    `data-room-library-uri="${card._esc(entry.uri || "")}"`,
    `data-room-library-type="${card._esc(entry.media_type || "album")}"`,
    `data-room-library-name="${card._esc(entry.name || "")}"`,
    `data-room-library-subtitle="${card._esc(entry.subtitle || "")}"`,
    `data-room-library-image="${card._esc(entry.image || "")}"`,
    `data-room-library-favorite-scope="${card._esc(entry.favorite_scope || "library")}"`,
  ].join(" ");
}

function controlRoomProtocolLabel(card, player = null) {
  const attrs = player?.attributes || {};
  return String(
    attrs.mass_player_type
    || attrs.player_type
    || attrs.provider
    || attrs.provider_name
    || attrs.source
    || attrs.app_name
    || "MA"
  ).replace(/_/g, " ").trim();
}

function controlRoomQueueCount(card, player = null, snapshot = null) {
  const attrs = player?.attributes || {};
  const candidates = [
    snapshot?.state?.items,
    attrs.queue_items,
    attrs.queue_size,
    attrs.queue_length,
    attrs.media_playlist_length,
    attrs.items_in_queue,
    attrs.active_queue_items,
  ];
  const value = candidates.map((item) => Number(item)).find((item) => Number.isFinite(item) && item >= 0);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function controlRoomQueueCache(card, entityId = "") {
  const cache = card._state.controlRoomQueueSnapshots || {};
  const entry = cache[String(entityId || "")];
  return entry?.snapshot || null;
}

export async function fetchControlRoomQueueSnapshot(card, entityId = "") {
  const player = card._playerByEntityId(entityId);
  if (!player) return null;
  if (entityId === card._state.selectedPlayer) {
    await card._ensureQueueSnapshot(true);
    const items = Array.isArray(card._state.queueItems) ? card._state.queueItems : [];
    if (items.length || card._state.maQueueState) {
      return {
        state: card._state.maQueueState || { items: items.length, current_index: 0 },
        items,
      };
    }
  }
  if (card._maverickEngineRequired?.()) {
    try { return await card._fetchMusicAssistantQueueSnapshot(player); } catch (_) { return null; }
  }
  try { return await card._fetchMusicAssistantQueueSnapshot(player); } catch (_) { return null; }
}

export async function loadControlRoomQueues(card, entityIds = []) {
  const ids = [...new Set((Array.isArray(entityIds) ? entityIds : []).filter(Boolean))];
  if (!ids.length) return;
  card._state.controlRoomQueueLoading = true;
  syncControlRoomUi(card);
  const nextCache = { ...(card._state.controlRoomQueueSnapshots || {}) };
  const results = await Promise.allSettled(ids.map(async (entityId) => {
    const snapshot = await fetchControlRoomQueueSnapshot(card, entityId);
    return { entityId, snapshot };
  }));
  results.forEach((result) => {
    if (result.status !== "fulfilled") return;
    nextCache[result.value.entityId] = {
      ts: Date.now(),
      snapshot: result.value.snapshot,
    };
  });
  card._state.controlRoomQueueSnapshots = nextCache;
  card._state.controlRoomQueueLoading = false;
  syncControlRoomUi(card, { force: true });
}

function controlRoomQueuePreviewHtml(card, entityId = "") {
  const player = card._playerByEntityId(entityId);
  const snapshot = controlRoomQueueCache(card, entityId);
  const items = sortQueueItems(snapshot?.items || []);
  const currentIndex = Number(snapshot?.state?.current_index);
  const currentItem = Number.isFinite(currentIndex)
    ? items.find((item) => Number(item?.sort_index) === currentIndex) || items[0]
    : items[0];
  const queueCount = controlRoomQueueCount(card, player, snapshot);
  const previewItems = (currentItem ? [currentItem, ...items.filter((item) => item !== currentItem)] : items).slice(0, 4);
  const title = player?.attributes?.friendly_name || entityId || card._i18n("ui.player_2");
  return `
    <div class="control-room-queue-preview" data-control-room-scroll="queue-${card._esc(entityId)}">
      <div class="control-room-queue-preview-head">
        <span class="control-room-queue-player">${card._esc(title)}</span>
        <span class="control-room-queue-count">${card._esc(queueCount ? `${queueCount}` : card._i18n("ui.no_queue"))}</span>
      </div>
      ${previewItems.length ? previewItems.map((item, index) => {
        const media = item.media_item || {};
        const art = card._queueItemImageUrl(item, 96) || card._artUrl(media) || "";
        const itemTitle = media.name || item.name || item.media_title || card._i18n("ui.queue_item");
        const artist = item.media_artist || (media.artists || []).map((artistEntry) => artistEntry?.name).filter(Boolean).join(", ") || media.album?.name || "";
        return `
          <div class="control-room-queue-row ${index === 0 ? "current" : ""}">
            <span class="control-room-queue-art">${art ? card._imgHtml(art, "", { fallbackIcon: "album" }) : card._iconSvg("album")}</span>
            <span class="control-room-queue-copy">
              <span class="control-room-queue-title">${card._esc(itemTitle)}</span>
              <span class="control-room-queue-sub">${card._esc(index === 0 ? card._i18n("ui.now_playing_2") : (artist || card._i18n("ui.up_next_2")))}</span>
            </span>
          </div>
        `;
      }).join("") : `<div class="control-room-empty subtle">${card._esc(card._state.controlRoomQueueLoading ? card._i18n("ui.loading_queue") : card._i18n("ui.queue_is_unavailable_for_this_player"))}</div>`}
    </div>
  `;
}

export function controlRoomMixPresets(card) {
  return [
    { id: "calm", icon: "moon", label: card._i18n("ui.calm"), subtitle: card._i18n("ui.soft_relaxed_music"), queries: ["relax chill playlist", "calm music", "acoustic chill"] },
    { id: "party", icon: "radio", label: card._i18n("ui.party"), subtitle: card._i18n("ui.energy_and_rhythm"), queries: ["party hits playlist", "dance playlist", "upbeat music"] },
    { id: "morning", icon: "music_note", label: card._i18n("ui.morning"), subtitle: card._i18n("ui.fresh_start"), queries: ["morning playlist", "coffee music", "feel good morning"] },
    { id: "night", icon: "moon", label: card._i18n("ui.night"), subtitle: card._i18n("ui.lower_volume_mood"), queries: ["night chill playlist", "sleep music", "quiet jazz"] },
    { id: "kids", icon: "speaker", label: card._i18n("ui.kids"), subtitle: card._i18n("ui.family_friendly"), queries: ["kids music playlist", "children songs", "family music"] },
    { id: "israeli", icon: "music_note", label: card._i18n("ui.israeli"), subtitle: card._i18n("ui.local_favorites"), queries: ["israeli music playlist", "israeli music hebrew"] },
    { id: "favorites", icon: "heart_filled", label: card._i18n("ui.liked"), subtitle: card._i18n("ui.shuffle_favorites"), favorite: true },
    { id: "random", icon: "shuffle", label: card._i18n("ui.random"), subtitle: card._i18n("ui.library_surprise"), random: true },
  ];
}

async function controlRoomFindMixEntries(card, presetId = "", customQuery = "") {
  const preset = controlRoomMixPresets(card).find((item) => item.id === presetId) || null;
  const query = String(customQuery || "").trim();
  if (preset?.favorite) {
    const favorites = card._useMaLikedMode() ? await card._loadMaLikedEntries(true) : card._likedEntries();
    return favorites.filter((item) => item?.uri).slice(0, 24);
  }
  if (preset?.random) {
    const nativeEntries = await card._nativeMixEntriesForPreset(presetId, query, 12);
    const tracks = await card._fetchLibrary("track", "random", 24, false);
    return controlRoomUniqueEntries(card, [
      ...nativeEntries,
      ...tracks.map((item) => controlRoomNormalizeMediaEntry(card, item, "track")).filter((item) => item.uri),
    ]).slice(0, 24);
  }
  const nativeEntries = await card._nativeMixEntriesForPreset(presetId, query, 12);
  if (nativeEntries.length >= 4) return nativeEntries;
  const queries = query ? [query] : (preset?.queries || ["music playlist"]);
  const entries = [];
  for (const currentQuery of queries) {
    try {
      const results = await card._search(currentQuery);
      entries.push(...controlRoomSearchEntries(card, results));
    } catch (_) {}
    if (entries.length >= 12) break;
  }
  return controlRoomUniqueEntries(card, entries).slice(0, 12);
}

export function controlRoomUniqueEntries(card, entries = []) {
  const seen = new Set();
  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    const key = String(entry?.uri || entry?.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadControlRoomRecent(card) {
  card._state.controlRoomRecentLoading = true;
  syncControlRoomUi(card);
  const items = [];
  try {
    items.push(...(await card._fetchRecentlyPlayed(18)).map((item) => controlRoomNormalizeMediaEntry(card, item, item.media_type || "album")));
  } catch (_) {}
  if (card._hasMusicAssistantCommandBridge()) {
    try {
      const inProgress = await card._callEngineMaCommand("music/in_progress_items", { limit: 12 });
      const rawItems = Array.isArray(inProgress?.items) ? inProgress.items : (Array.isArray(inProgress) ? inProgress : []);
      items.push(...rawItems.map((item) => controlRoomNormalizeMediaEntry(card, item, item.media_type || "podcast", {
        subtitle: card._i18n("ui.continue_listening"),
      })));
    } catch (_) {}
  }
  card._state.controlRoomRecentItems = controlRoomUniqueEntries(card, items).slice(0, 24);
  card._state.controlRoomRecentLoading = false;
  syncControlRoomUi(card, { force: true });
}

export async function loadControlRoomFavorites(card) {
  card._state.controlRoomFavoritesLoading = true;
  syncControlRoomUi(card);
  let items = [];
  try {
    items = card._useMaLikedMode() ? await card._loadMaLikedEntries(true) : card._likedEntries();
  } catch (_) {
    items = card._likedEntries();
  }
  card._state.controlRoomFavoritesItems = controlRoomUniqueEntries(card, 
    items.map((item) => controlRoomNormalizeMediaEntry(card, item, item.media_type || "track", {
      subtitle: card._i18n("ui.favorite"),
    }))
  ).slice(0, 36);
  card._state.controlRoomFavoritesLoading = false;
  syncControlRoomUi(card, { force: true });
}

function controlRoomMediaGridHtml(card, entries = [], options = {}) {
  const list = Array.isArray(entries) ? entries.filter((entry) => entry?.uri) : [];
  const empty = options.empty || card._i18n("ui.no_media_found");
  if (!list.length) return `<div class="control-room-empty subtle">${card._esc(empty)}</div>`;
  return `
    <div class="control-room-media-grid ${options.large ? "large" : ""}">
      ${list.map((entry) => {
        const liked = card._isEntryLiked(entry) || !!entry.favorite;
        const radioSupported = card._supportsMusicAssistantRadioMode(entry.media_type);
        const attrs = controlRoomEntryDataAttrs(card, entry);
        return `
          <article class="control-room-media-card ${liked ? "liked" : ""}">
            <button class="control-room-media-main" data-room-library-action="play" ${attrs} title="${card._esc(card._i18n("ui.play_now"))}">
              <span class="control-room-media-art">${entry.image ? card._imgHtml(entry.image, "", { fallbackIcon: controlRoomMediaTypeIcon(card, entry.media_type) }) : card._iconSvg(controlRoomMediaTypeIcon(card, entry.media_type))}</span>
              <span class="control-room-media-copy">
                <span class="control-room-media-kicker">${card._esc(controlRoomMediaTypeLabel(card, entry.media_type))}</span>
                <span class="control-room-media-title">${card._esc(entry.name || card._i18n("ui.media"))}</span>
                <span class="control-room-media-sub">${card._esc(entry.subtitle || entry.media_type || "")}</span>
              </span>
            </button>
            <span class="control-room-media-actions">
              <button type="button" class="control-room-media-action primary" data-room-library-action="play" ${attrs}>${card._esc(card._i18n("ui.play"))}</button>
              <button type="button" class="control-room-media-action" data-room-library-action="next" ${attrs}>${card._esc(card._i18n("ui.next"))}</button>
              <button type="button" class="control-room-media-action" data-room-library-action="add" ${attrs}>${card._esc(card._i18n("ui.add"))}</button>
              ${radioSupported ? `<button type="button" class="control-room-media-action" data-room-library-action="radio_mode" ${attrs}>${card._esc(card._i18n("ui.radio"))}</button>` : ``}
              <button type="button" class="control-room-media-action icon ${liked ? "active" : ""}" data-room-library-action="like" ${attrs} title="${card._esc(card._i18n("ui.like_2"))}">${card._iconSvg(liked ? "heart_filled" : "heart_outline")}</button>
            </span>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

async function prepareControlRoomPlaybackTargets(card) {
  const selectedIds = controlRoomSelectedPlayerIds(card);
  const primaryId = selectedIds[0] || controlRoomPrimaryPlayerId(card);
  if (!primaryId) return "";
  const groupMembers = selectedIds.slice(1);
  if (groupMembers.length) {
    await card._applySpeakerGroupFor(primaryId, groupMembers);
  }
  return primaryId;
}

async function playControlRoomEntries(card, entries = [], options = {}) {
  const playable = (Array.isArray(entries) ? entries : []).filter((entry) => entry?.uri);
  const primaryId = await prepareControlRoomPlaybackTargets(card);
  if (!primaryId || !playable.length) return false;
  const first = playable[0];
  const firstOk = await card._playMediaOnPlayer(primaryId, first.uri, first.media_type || "track", options.shuffle ? "shuffle" : "play", {
    label: first.name || "",
    silent: true,
    radioMode: !!options.radioMode,
  });
  if (!firstOk) return false;
  for (const entry of playable.slice(1, 40)) {
    await card._playMediaOnPlayer(primaryId, entry.uri, entry.media_type || "track", "add", {
      label: entry.name || "",
      silent: true,
    });
  }
  if (!options.silent) {
    card._toastSuccess(card._m(
      `Started ${playable.length} items in Studio`
    ));
  }
  card._timeout(() => card._updateNowPlayingState(), 500);
  return true;
}

export async function startControlRoomMix(card, presetId = "", sourceEl = null) {
  const customInput = card.$("controlRoomSmartQueryInput");
  const customQuery = customInput?.value || card._state.controlRoomSmartQuery || "";
  if (sourceEl) card._pressUiButton(sourceEl);
  card._toast(card._i18n("ui.building_studio_mix"));
  try {
    const entries = await controlRoomFindMixEntries(card, presetId, customQuery);
    if (!entries.length) {
      card._toastError(card._i18n("ui.no_mix_content_found"));
      return false;
    }
    const ok = await playControlRoomEntries(card, entries, { shuffle: presetId === "favorites" || presetId === "random" });
    if (ok) {
      card._state.controlRoomPanel = "";
      card._toastSuccess(card._i18n("ui.studio_mix_started"));
    }
    return ok;
  } catch (error) {
    card._toastError(error?.message || card._i18n("ui.could_not_build_studio_mix"));
    return false;
  }
}

function controlRoomScenesStorageKey(card) {
  return card._lsKey("maverick_music_control_room_scenes_v1");
}

function normalizeControlRoomScene(card, scene = {}, index = 0) {
  const rawId = String(scene?.id || `custom:${Date.now()}_${index}`).trim();
  const id = rawId.startsWith("custom:") ? rawId : `custom:${rawId}`;
  const playerIds = Array.isArray(scene?.playerIds)
    ? scene.playerIds.map((entityId) => String(entityId || "").trim()).filter(Boolean)
    : [];
  const visibleIds = Array.isArray(scene?.visibleIds)
    ? scene.visibleIds.map((entityId) => String(entityId || "").trim()).filter(Boolean)
    : [];
  const volumes = {};
  if (scene?.volumes && typeof scene.volumes === "object") {
    Object.entries(scene.volumes).forEach(([entityId, value]) => {
      const pct = Math.max(0, Math.min(1, Number(value)));
      if (entityId && Number.isFinite(pct)) volumes[String(entityId)] = pct;
    });
  }
  const media = scene?.media && typeof scene.media === "object"
    ? {
        uri: String(scene.media.uri || "").trim(),
        media_type: String(scene.media.media_type || scene.media.type || "track").trim() || "track",
        name: String(scene.media.name || "").trim(),
      }
    : { uri: "", media_type: "track", name: "" };
  return {
    id,
    name: String(scene?.name || "").trim() || card._i18n("ui.studio_scene"),
    primaryId: String(scene?.primaryId || playerIds[0] || "").trim(),
    playerIds: [...new Set(playerIds)],
    visibleIds: [...new Set(visibleIds)],
    volumes,
    group: scene?.group !== false,
    media,
    createdAt: Number(scene?.createdAt || Date.now()) || Date.now(),
  };
}

export function loadControlRoomScenesFromStorage(card) {
  try {
    const raw = JSON.parse(localStorage.getItem(controlRoomScenesStorageKey(card)) || "[]");
    card._state.controlRoomCustomScenes = Array.isArray(raw)
      ? raw.map((scene, index) => normalizeControlRoomScene(card, scene, index)).filter((scene) => scene.playerIds.length).slice(0, 12)
      : [];
  } catch (_) {
    card._state.controlRoomCustomScenes = [];
  }
}

function persistControlRoomScenes(card) {
  try {
    localStorage.setItem(controlRoomScenesStorageKey(card), JSON.stringify(controlRoomCustomScenes(card)));
  } catch (_) {}
}

export function controlRoomCustomScenes(card) {
  return (Array.isArray(card._state.controlRoomCustomScenes) ? card._state.controlRoomCustomScenes : [])
    .map((scene, index) => normalizeControlRoomScene(card, scene, index))
    .filter((scene) => scene.playerIds.length)
    .slice(0, 12);
}

function captureControlRoomScene(card, name = "") {
  const selectedIds = controlRoomSelectedPlayerIds(card);
  const primaryId = controlRoomPrimaryPlayerId(card);
  const targets = selectedIds.length ? selectedIds : [primaryId].filter(Boolean);
  if (!targets.length) return null;
  const primary = card._playerByEntityId(primaryId || targets[0]);
  const attrs = primary?.attributes || {};
  const volumes = {};
  targets.forEach((entityId) => {
    const player = card._playerByEntityId(entityId);
    const volume = Number(player?.attributes?.volume_level);
    if (Number.isFinite(volume)) volumes[entityId] = Math.max(0, Math.min(1, volume));
  });
  const mediaUri = String(attrs.media_content_id || attrs.media_uri || attrs.uri || "").trim();
  const mediaType = String(attrs.media_content_type || attrs.media_type || "track").trim() || "track";
  return normalizeControlRoomScene(card, {
    id: `custom:${Date.now().toString(36)}`,
    name: String(name || "").trim() || card._i18n("ui.my_studio_scene"),
    primaryId: primaryId || targets[0],
    playerIds: targets,
    visibleIds: controlRoomVisiblePlayerIds(card),
    volumes,
    group: targets.length > 1,
    media: {
      uri: mediaUri,
      media_type: mediaType,
      name: attrs.media_title || "",
    },
    createdAt: Date.now(),
  });
}

function saveControlRoomSceneFromStudio(card, sourceEl = null) {
  if (sourceEl) card._pressUiButton(sourceEl);
  const input = card.$("controlRoomSceneNameInput");
  const scene = captureControlRoomScene(card, input?.value || card._state.controlRoomSceneName || "");
  if (!scene) {
    card._toastError(card._i18n("ui.select_at_least_one_studio_player"));
    return false;
  }
  card._state.controlRoomCustomScenes = [scene, ...controlRoomCustomScenes(card)].slice(0, 12);
  card._state.controlRoomSceneName = "";
  if (input) input.value = "";
  persistControlRoomScenes(card);
  syncControlRoomUi(card, { force: true });
  card._toastSuccess(card._i18n("ui.studio_scene_saved"));
  return true;
}

function deleteControlRoomScene(card, sceneId = "", sourceEl = null) {
  if (sourceEl) card._pressUiButton(sourceEl);
  const id = String(sceneId || "").trim();
  if (!id) return false;
  card._state.controlRoomCustomScenes = controlRoomCustomScenes(card).filter((scene) => scene.id !== id);
  persistControlRoomScenes(card);
  syncControlRoomUi(card, { force: true });
  card._toastSuccess(card._i18n("ui.studio_scene_deleted"));
  return true;
}

async function applySavedControlRoomScene(card, scene = null, sourceEl = null) {
  const saved = scene ? normalizeControlRoomScene(card, scene) : null;
  if (!saved) return false;
  const allPlayers = controlRoomAllPlayers(card);
  const validIds = new Set(allPlayers.map((player) => player.entity_id));
  const selected = saved.playerIds.filter((entityId) => validIds.has(entityId));
  if (!selected.length) {
    card._toastError(card._i18n("ui.scene_players_are_not_available"));
    return false;
  }
  const primaryId = selected.includes(saved.primaryId) ? saved.primaryId : selected[0];
  const ordered = [primaryId, ...selected.filter((entityId) => entityId !== primaryId)];
  const visible = [...new Set([
    ...controlRoomVisiblePlayerIds(card),
    ...ordered,
    ...saved.visibleIds.filter((entityId) => validIds.has(entityId)),
  ])];
  card._state.controlRoomVisiblePlayers = visible;
  card._state.controlRoomSelectedPlayers = ordered;
  syncControlRoomTransferDefaults(card);
  if (sourceEl) card._pressUiButton(sourceEl);
  if (ordered.length > 1 && saved.group) {
    await card._applySpeakerGroupFor(primaryId, ordered.slice(1));
  }
  await Promise.allSettled(ordered.map((entityId) => {
    const volume = saved.volumes?.[entityId];
    return Number.isFinite(volume) ? card._setPlayerVolumeFor(entityId, volume) : Promise.resolve();
  }));
  if (saved.media?.uri) {
    await card._playMediaOnPlayer(primaryId, saved.media.uri, saved.media.media_type || "track", "play", {
      label: saved.media.name || saved.name,
      silent: true,
    });
  }
  syncControlRoomUi(card, { force: true });
  card._toastSuccess(card._m(`Scene "${saved.name}" applied`));
  card._timeout(() => card._updateNowPlayingState(), 350);
  return true;
}

export async function applyControlRoomScene(card, sceneId = "", sourceEl = null) {
  if (sourceEl) card._pressUiButton(sourceEl);
  const scene = String(sceneId || "home");
  if (scene.startsWith("custom:")) {
    const saved = controlRoomCustomScenes(card).find((item) => item.id === scene);
    if (!saved) {
      card._toastError(card._i18n("ui.studio_scene_was_not_found"));
      return false;
    }
    return applySavedControlRoomScene(card, saved, sourceEl);
  }
  const selectedIds = controlRoomSelectedPlayerIds(card);
  const primaryId = selectedIds[0] || controlRoomPrimaryPlayerId(card);
  if (!primaryId) {
    card._toastError(card._i18n("ui.select_at_least_one_studio_player"));
    return false;
  }
  const targets = selectedIds.length ? selectedIds : [primaryId];
  if (targets.length > 1) await card._applySpeakerGroupFor(primaryId, targets.slice(1));
  const volume = scene === "night" ? 0.18 : scene === "party" ? 0.55 : 0.35;
  await Promise.allSettled(targets.map((entityId) => card._setPlayerVolumeFor(entityId, volume)));
  if (scene === "home") {
    card._toastSuccess(card._i18n("ui.home_scene_prepared"));
    return true;
  }
  const mixId = scene === "party" ? "party" : "night";
  return startControlRoomMix(card, mixId, sourceEl);
}

function controlRoomSearchEntries(card, results = {}) {
  const groups = [
    ["playlists", "playlist"],
    ["albums", "album"],
    ["tracks", "track"],
    ["artists", "artist"],
    ["radio", "radio"],
    ["podcasts", "podcast"],
  ];
  const entries = [];
  groups.forEach(([bucket, mediaType]) => {
    (Array.isArray(results?.[bucket]) ? results[bucket] : []).slice(0, 4).forEach((item) => {
      entries.push(controlRoomNormalizeMediaEntry(card, item, mediaType));
    });
  });
  return entries.filter((entry) => entry.uri).slice(0, 14);
}

export async function searchControlRoomLibrary(card, query = "") {
  const rawQuery = String(query || "");
  const normalizedQuery = rawQuery.trim();
  card._state.controlRoomLibraryQuery = rawQuery;
  if (!normalizedQuery) {
    card._state.controlRoomLibraryLoading = false;
    card._state.controlRoomLibraryResults = [];
    syncControlRoomLibraryResultsUi(card);
    return;
  }
  // A counter, not a timestamp: two searches started in the same millisecond
  // must still resolve in favour of the later one.
  const token = (Number(card._state.controlRoomLibraryToken) || 0) + 1;
  card._state.controlRoomLibraryToken = token;
  card._state.controlRoomLibraryLoading = true;
  syncControlRoomLibraryResultsUi(card);
  try {
    const results = await card._search(normalizedQuery);
    if (card._state.controlRoomLibraryToken !== token) return;
    card._state.controlRoomLibraryResults = controlRoomSearchEntries(card, results);
  } catch (_) {
    if (card._state.controlRoomLibraryToken !== token) return;
    card._state.controlRoomLibraryResults = [];
  }
  if (card._state.controlRoomLibraryToken !== token) return;
  card._state.controlRoomLibraryLoading = false;
  syncControlRoomLibraryResultsUi(card);
}

function syncControlRoomLibraryResultsUi(card) {
  const host = card.$("controlRoomLibraryResults");
  if (host && card._state.controlRoomPanel === "library") {
    host.innerHTML = controlRoomLibraryResultsHtml(card);
    return;
  }
  syncControlRoomUi(card);
}

export async function playControlRoomLibraryEntry(card, entry, mode = "play") {
  const action = String(mode || "play");
  if (!entry?.uri) return false;
  if (action === "like") {
    return card._toggleLikeEntry(entry);
  }
  const primaryId = await prepareControlRoomPlaybackTargets(card);
  if (!primaryId) return false;
  const mediaType = entry.media_type || "album";
  if (action === "radio_mode" && !card._supportsMusicAssistantRadioMode(mediaType)) {
    card._toastError(card._i18n("ui.radio_mode_is_not_available_for_this_media_type"));
    return false;
  }
  const enqueue = action === "next" ? "next" : action === "add" ? "add" : action === "shuffle" ? "shuffle" : "play";
  return card._playMediaOnPlayer(primaryId, entry.uri, mediaType, enqueue, {
    label: entry.name || "",
    silent: action !== "play",
    radioMode: action === "radio_mode",
  });
}

function controlRoomPlayerTileHtml(card, player) {
  const selectedIds = controlRoomSelectedPlayerIds(card);
  const primaryId = controlRoomPrimaryPlayerId(card);
  const isSelected = selectedIds.includes(player.entity_id);
  const isPrimary = primaryId === player.entity_id;
  const playing = player.state === "playing";
  const art = card._playerArtworkUrl(player, 320);
  const name = player.attributes?.friendly_name || player.entity_id;
  const track = player.attributes?.media_title || card._i18n("ui.idle_2");
  const volume = Math.round((player.attributes?.volume_level || 0) * 100);
  const groupInfo = controlRoomGroupInfo(card, player);
  const groupCount = groupInfo.count;
  const stateLabel = card._playerStateLabel(player);
  const snapshot = controlRoomQueueCache(card, player.entity_id);
  const queueCount = controlRoomQueueCount(card, player, snapshot);
  const protocolLabel = controlRoomProtocolLabel(card, player);
  const muted = card._isMuted(player);
  const tileStyle = art ? `style="--control-room-tile-art:${card._esc(cssUrl(art))}"` : "";
  return `
    <article class="control-room-tile ${art ? "has-art" : "no-art"} ${isSelected ? "selected" : ""} ${isPrimary ? "primary" : ""} ${playing ? "is-playing" : ""} ${groupCount ? "grouped" : ""}" data-room-tile="${card._esc(player.entity_id)}" ${tileStyle}>
      <div class="control-room-tile-bg"></div>
      <div class="control-room-tile-shade"></div>
      <button class="control-room-select-fab ${isSelected ? "active" : ""} ${isSelected && selectedIds.length > 1 ? "removable" : ""}" data-room-select="${card._esc(player.entity_id)}" title="${card._esc(isSelected && selectedIds.length > 1 ? card._i18n("ui.remove_from_selection") : isSelected ? card._i18n("ui.selected_player_2") : card._i18n("ui.add_to_selection"))}">
        ${card._iconSvg(isSelected && selectedIds.length > 1 ? "close" : isSelected ? "check" : "grid")}
        <span class="control-room-select-label">${card._esc(isSelected && selectedIds.length > 1 ? card._i18n("ui.remove") : isSelected ? card._i18n("ui.selected") : card._i18n("ui.select"))}</span>
      </button>
      <button class="control-room-tile-main" data-room-primary="${card._esc(player.entity_id)}" title="${card._esc(name)}">
        <span class="control-room-tile-copy">
          <span class="control-room-tile-pills">
            ${isPrimary ? `<span class="control-room-primary-pill">${card._esc(card._i18n("ui.primary"))}</span>` : ``}
            ${groupCount ? `<span class="control-room-float-pill grouped" title="${card._esc(groupInfo.label || card._i18n("ui.grouped_players"))}">${card._iconSvg("speaker")}${card._esc(card._m(`${groupCount} grouped`))}</span>` : ``}
            ${queueCount ? `<span class="control-room-float-pill">${card._iconSvg("queue")}${card._esc(`${queueCount}`)}</span>` : ``}
            ${protocolLabel ? `<span class="control-room-float-pill protocol">${card._esc(protocolLabel)}</span>` : ``}
            ${playing ? `<span class="control-room-float-pill live">${card._esc(card._i18n("ui.playing"))}</span>` : ``}
          </span>
          <span class="control-room-tile-track">${card._esc(track)}</span>
          <span class="control-room-tile-name">${card._esc(name)}</span>
          <span class="control-room-tile-state">${card._esc(stateLabel)}</span>
        </span>
      </button>
      <div class="control-room-tile-actions">
        <button type="button" data-room-toggle-play="${card._esc(player.entity_id)}" title="${card._esc(card._i18n("ui.play_pause"))}">${card._iconSvg(playing ? "pause" : "play")}</button>
        <button type="button" data-room-next="${card._esc(player.entity_id)}" title="${card._esc(card._i18n("ui.next"))}">${card._iconSvg("next")}</button>
        <button type="button" class="${muted ? "active" : ""}" data-room-mute="${card._esc(player.entity_id)}" title="${card._esc(card._i18n("ui.mute"))}">${card._iconSvg(muted ? "volume_mute" : card._volumeIconName(player))}</button>
      </div>
      <label class="control-room-volume-row">
        <input class="control-room-volume" data-room-volume="${card._esc(player.entity_id)}" type="range" min="0" max="100" value="${volume}" style="--vol-pct:${volume}%">
        <span class="control-room-volume-value" data-room-volume-value="${card._esc(player.entity_id)}">${card._esc(String(volume))}%</span>
      </label>
    </article>
  `;
}

function controlRoomLibraryResultsHtml(card) {
  const loading = !!card._state.controlRoomLibraryLoading;
  const results = Array.isArray(card._state.controlRoomLibraryResults) ? card._state.controlRoomLibraryResults : [];
  const query = String(card._state.controlRoomLibraryQuery || "").trim();
  if (loading) return `<div class="control-room-empty subtle">${card._esc(card._i18n("ui.searching_library"))}</div>`;
  if (!query) return `<div class="control-room-empty subtle">${card._esc(card._i18n("ui.search_and_choose_play_next_add_radio_or_like"))}</div>`;
  return controlRoomMediaGridHtml(card, results, {
    empty: card._i18n("ui.no_media_found_for_this_search"),
    large: true,
  });
}

function controlRoomPanelHtml(card, players = []) {
  const content = controlRoomPanelContentHtml(card, players);
  if (!content) return content;
  const label = card._esc(card._m("Back to studio"));
  return content.replace(/(<div class="control-room-tray[^"]*">)/, `$1<button type="button" class="control-room-panel-close" data-room-selection-action="close_panel" aria-label="${label}" title="${label}">${card._iconSvg("close")}</button>`);
}

function controlRoomPanelContentHtml(card, players = []) {
  const panel = String(card._state.controlRoomPanel || "");
  if (!panel) return ``;
  const context = controlRoomContextChipHtml(card);
  if (panel === "selection") {
    return `
      <div class="control-room-tray open compact">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.connected_players_2"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.choose_which_players_stay_in_the_current_control_selection"))}</div>
        </div>
        ${controlRoomPlayerChoiceRows(card, "selection")}
      </div>
    `;
  }
  if (panel === "visible") {
    return `
      <div class="control-room-tray open compact">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.visible_tiles_2"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.choose_which_players_appear_as_tiles_in_the_room"))}</div>
        </div>
        ${controlRoomPlayerChoiceRows(card, "visible")}
      </div>
    `;
  }
  if (panel === "music") {
    return `
      <div class="control-room-tray open wide control-room-hub-panel">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.music_hub_2"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.choose_the_source_first_playback_will_use_the_current_target"))}</div>
        </div>
        ${context}
        <div class="control-room-library-shortcuts">
          <button data-room-selection-action="browse_library">${card._iconSvg("playlist")}<span>${card._esc(card._i18n("ui.playlists"))}</span></button>
          <button data-room-selection-action="browse_artists">${card._iconSvg("artist")}<span>${card._esc(card._i18n("ui.artists"))}</span></button>
          <button data-room-selection-action="browse_albums">${card._iconSvg("album")}<span>${card._esc(card._i18n("ui.albums"))}</span></button>
          <button data-room-selection-action="browse_tracks">${card._iconSvg("tracks")}<span>${card._esc(card._i18n("ui.tracks"))}</span></button>
          <button data-room-selection-action="browse_radio">${card._iconSvg("radio")}<span>${card._esc(card._i18n("ui.radio"))}</span></button>
        </div>
        <div class="control-room-hub-grid">
          <button class="control-room-hub-card primary" data-room-selection-action="browse_library">${card._iconSvg("library_music")}<span>${card._esc(card._i18n("ui.library"))}</span><small>${card._esc(card._i18n("ui.browse_playlists_artists_albums_and_radio"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="library">${card._iconSvg("search")}<span>${card._esc(card._i18n("ui.search"))}</span><small>${card._esc(card._i18n("ui.search_tracks_albums_artists_and_playlists"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="mix">${card._iconSvg("wand")}<span>${card._esc(card._i18n("ui.flow_mix"))}</span><small>${card._esc(card._i18n("ui.mood_style_or_free_text"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="recent">${card._iconSvg("history")}<span>${card._esc(card._i18n("ui.recent"))}</span><small>${card._esc(card._i18n("ui.continue_what_was_played_recently"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="favorites">${card._iconSvg("heart_filled")}<span>${card._esc(card._i18n("ui.liked"))}</span><small>${card._esc(card._i18n("ui.favorites_and_liked_music"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="scenes">${card._iconSvg("home")}<span>${card._esc(card._i18n("ui.scenes"))}</span><small>${card._esc(card._i18n("ui.home_party_night_presets"))}</small></button>
        </div>
      </div>
    `;
  }
  if (panel === "actions") {
    const targetIds = controlRoomActionTargetIds(card);
    const targetCount = targetIds.length;
    const actionTarget = controlRoomFocusTarget(card);
    const actionArt = actionTarget.art || "";
    const primary = controlRoomPrimaryPlayer(card);
    const primaryPlaying = primary?.state === "playing";
    const primaryMuted = primary ? card._isMuted(primary) : false;
    return `
      <div class="control-room-tray open wide control-room-hub-panel">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.actions_2"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.only_actions_for_the_current_target_are_shown_here"))}</div>
        </div>
        <div class="control-room-action-console">
          <div class="control-room-action-now">
            <span class="control-room-action-art">${actionArt ? card._imgHtml(actionArt, "", { fallbackIcon: "speaker" }) : card._iconSvg("speaker")}</span>
            <span class="control-room-action-copy">
              <span class="control-room-action-kicker">${card._esc(actionTarget.kicker)}</span>
              <span class="control-room-action-name">${card._esc(actionTarget.name)}</span>
              <span class="control-room-action-track">${card._esc(actionTarget.track)}</span>
            </span>
          </div>
          <div class="control-room-media-controls">
            <button class="control-room-media-control primary" data-room-selection-action="playpause" ${targetCount ? "" : "disabled"}>${card._iconSvg(primaryPlaying ? "pause" : "play")}<span>${card._esc(primaryPlaying ? card._i18n("ui.pause") : card._i18n("ui.play"))}</span></button>
            <button class="control-room-media-control" data-room-selection-action="next" ${targetCount ? "" : "disabled"}>${card._iconSvg("next")}<span>${card._esc(card._i18n("ui.next"))}</span></button>
            <button class="control-room-media-control ${primaryMuted ? "active" : ""}" data-room-selection-action="mute" ${targetCount ? "" : "disabled"}>${card._iconSvg(primaryMuted ? "volume_mute" : (primary ? card._volumeIconName(primary) : "speaker"))}<span>${card._esc(card._i18n("ui.mute"))}</span></button>
            <button class="control-room-media-control danger" data-room-selection-action="clear" ${targetCount ? "" : "disabled"}>${card._iconSvg("trash")}<span>${card._esc(card._i18n("ui.clear_queue"))}</span></button>
          </div>
        </div>
        <div class="control-room-action-grid management">
          <button class="control-room-hub-card" data-room-selection-action="selection">${card._iconSvg("grid")}<span>${card._esc(card._i18n("ui.target_players"))}</span><small>${card._esc(card._i18n("ui.choose_who_is_controlled"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="visible">${card._iconSvg("grid")}<span>${card._esc(card._i18n("ui.visible_tiles_2"))}</span><small>${card._esc(card._i18n("ui.clean_the_studio_wall"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="group" ${targetCount > 1 ? "" : "disabled"}>${card._iconSvg("speaker")}<span>${card._esc(card._i18n("ui.group"))}</span><small>${card._esc(card._i18n("ui.join_selected_players"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="ungroup" ${targetCount ? "" : "disabled"}>${card._iconSvg("close")}<span>${card._esc(card._i18n("ui.ungroup_2"))}</span><small>${card._esc(card._i18n("ui.disconnect_groups"))}</small></button>
          <button class="control-room-hub-card danger" data-room-selection-action="stop_all">${card._iconSvg("stop")}<span>${card._esc(card._i18n("ui.stop_all"))}</span><small>${card._esc(card._i18n("ui.stop_playback_clear_queues_and_disconnect_groups"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="announce">${card._iconSvg("announcement")}<span>${card._esc(card._i18n("ui.announcement"))}</span><small>${card._esc(card._i18n("ui.speak_to_target_players"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="timers">${card._iconSvg("timer")}<span>${card._esc(card._i18n("ui.timers"))}</span><small>${card._esc(card._i18n("ui.sleep_timer_and_scheduled_playback"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="open_ma">${card._iconSvg("library_music")}<span>${card._esc(card._i18n("ui.open_ma"))}</span><small>${card._esc(card._i18n("ui.open_the_full_music_assistant_interface_2"))}</small></button>
          <button class="control-room-hub-card" data-room-selection-action="pro">${card._iconSvg("settings")}<span>${card._esc(card._i18n("ui.pro_tools"))}</span><small>${card._esc(card._i18n("ui.sendspin_and_diagnostics"))}</small></button>
        </div>
      </div>
    `;
  }
  if (panel === "transfer") {
    const source = card._state.controlRoomTransferSource || "";
    const target = card._state.controlRoomTransferTarget || "";
    const sourcePlayer = card._playerByEntityId(source);
    const targetPlayer = card._playerByEntityId(target);
    const sourceName = sourcePlayer?.attributes?.friendly_name || source || card._i18n("ui.choose_source");
    const targetName = targetPlayer?.attributes?.friendly_name || target || card._i18n("ui.choose_target");
    const targetPlayers = players.filter((player) => player.entity_id !== source);
    const transferChoiceRows = (role, options, selectedId) => `
      <div class="control-room-transfer-list" data-control-room-scroll="transfer-${card._esc(role)}">
        ${options.length ? options.map((player) => {
          const art = card._playerArtworkUrl(player, 120);
          const isActive = player.entity_id === selectedId;
          return `
            <button class="control-room-transfer-choice ${isActive ? "active" : ""}" data-room-transfer-${role}="${card._esc(player.entity_id)}">
              <span class="control-room-transfer-art">${art ? card._imgHtml(art, "", { fallbackIcon: "speaker" }) : card._iconSvg("speaker")}</span>
              <span class="control-room-transfer-copy">
                <span class="control-room-transfer-title">${card._esc(player.attributes?.friendly_name || player.entity_id)}</span>
                <span class="control-room-transfer-sub">${card._esc(player.attributes?.media_title || card._playerStateLabel(player))}</span>
              </span>
              <span class="control-room-transfer-check">${isActive ? card._iconSvg("check") : ""}</span>
            </button>
          `;
        }).join("") : `<div class="control-room-empty subtle">${card._esc(card._i18n("ui.no_available_players"))}</div>`}
      </div>
    `;
    return `
      <div class="control-room-tray open transfer-panel">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.queue_cockpit_2"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.transfer_clone_inspect_or_clear_queues_without_hiding_the_studio"))}</div>
        </div>
        <div class="control-room-queue-layout">
          <div class="control-room-queue-lanes">
            <section class="control-room-queue-lane source">
              <div class="control-room-queue-lane-head">
                <span>${card._esc(card._i18n("ui.from"))}</span>
                <strong>${card._esc(sourceName)}</strong>
              </div>
              ${transferChoiceRows("source", players, source)}
              <div class="control-room-transfer-label">${card._esc(card._i18n("ui.source_queue"))}</div>
              ${source ? controlRoomQueuePreviewHtml(card, source) : `<div class="control-room-empty subtle">${card._esc(card._i18n("ui.choose_a_source_player"))}</div>`}
            </section>
            <section class="control-room-queue-lane target">
              <div class="control-room-queue-lane-head">
                <span>${card._esc(card._i18n("ui.to"))}</span>
                <strong>${card._esc(targetName)}</strong>
              </div>
              ${transferChoiceRows("target", targetPlayers, target)}
              <div class="control-room-transfer-label">${card._esc(card._i18n("ui.target_queue"))}</div>
              ${target ? controlRoomQueuePreviewHtml(card, target) : `<div class="control-room-empty subtle">${card._esc(card._i18n("ui.choose_a_target_player"))}</div>`}
            </section>
          </div>
          <div class="control-room-queue-actions">
            <button class="control-room-panel-action primary" data-room-transfer ${source && target ? "" : "disabled"}>${card._iconSvg("queue")}<span>${card._esc(card._i18n("ui.transfer_queue_2"))}</span></button>
            <button class="control-room-panel-action" data-room-clone ${source && target ? "" : "disabled"}>${card._iconSvg("repeat")}<span>${card._esc(card._i18n("ui.clone_queue"))}</span></button>
            <button class="control-room-panel-action" data-room-refresh-queues>${card._iconSvg("sync")}<span>${card._esc(card._i18n("ui.refresh"))}</span></button>
            <button class="control-room-panel-action danger" data-room-clear-queue="${card._esc(target || source || "")}" ${source || target ? "" : "disabled"}>${card._iconSvg("trash")}<span>${card._esc(card._i18n("ui.clear_queue"))}</span></button>
          </div>
        </div>
      </div>
    `;
  }
  if (panel === "library") {
    return `
      <div class="control-room-tray open wide">
        <label class="control-room-search">
          ${card._iconSvg("search")}
          <input id="controlRoomLibraryInput" type="search" placeholder="${card._esc(card._i18n("ui.search_the_library"))}" value="${card._esc(card._state.controlRoomLibraryQuery || "")}" autocomplete="off" spellcheck="false">
          <button type="button" class="control-room-search-mic" data-room-library-mic title="${card._esc(card._i18n("ui.voice_search"))}">
            ${card._iconSvg("mic")}
          </button>
        </label>
        <div class="control-room-library-results" id="controlRoomLibraryResults" data-control-room-scroll="library">${controlRoomLibraryResultsHtml(card)}</div>
      </div>
    `;
  }
  if (panel === "mix") {
    return `
      <div class="control-room-tray open wide">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.smart_mix_builder"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.pick_a_mood_or_type_your_own_style_studio_will_search_music_assistant_an"))}</div>
        </div>
        <div class="control-room-mix-panel">
          <label class="control-room-search">
            ${card._iconSvg("wand")}
            <input id="controlRoomSmartQueryInput" type="search" placeholder="${card._esc(card._i18n("ui.free_style_quiet_jazz_greek_music_workout"))}" value="${card._esc(card._state.controlRoomSmartQuery || "")}" autocomplete="off" spellcheck="false">
            <button type="button" class="control-room-search-mic" data-room-smart-custom title="${card._esc(card._i18n("ui.build_custom_mix"))}">${card._iconSvg("play")}</button>
          </label>
          <div class="control-room-mix-grid">
            ${controlRoomMixPresets(card).map((preset) => `
              <button class="control-room-mix-card" data-room-smart-mix="${card._esc(preset.id)}">
                <span class="control-room-mix-icon">${card._iconSvg(preset.icon || "music_note")}</span>
                <span class="control-room-mix-title">${card._esc(preset.label)}</span>
                <span class="control-room-mix-sub">${card._esc(preset.subtitle || "")}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }
  if (panel === "recent") {
    const loading = !!card._state.controlRoomRecentLoading;
    const items = Array.isArray(card._state.controlRoomRecentItems) ? card._state.controlRoomRecentItems : [];
    return `
      <div class="control-room-tray open wide">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.recent_continue"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.continue_from_recent_music_assistant_activity"))}</div>
        </div>
        <div class="control-room-library-results" data-control-room-scroll="recent">
          ${loading ? `<div class="control-room-empty subtle">${card._esc(card._i18n("ui.loading_recent_items"))}</div>` : controlRoomMediaGridHtml(card, items, { empty: card._i18n("ui.no_recent_listening_yet"), large: true })}
        </div>
      </div>
    `;
  }
  if (panel === "favorites") {
    const loading = !!card._state.controlRoomFavoritesLoading;
    const items = Array.isArray(card._state.controlRoomFavoritesItems) ? card._state.controlRoomFavoritesItems : [];
    return `
      <div class="control-room-tray open wide">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.favorite_center_2"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.play_queue_radio_or_remove_favorites_directly_from_studio"))}</div>
        </div>
        <div class="control-room-library-results" data-control-room-scroll="favorites">
          ${loading ? `<div class="control-room-empty subtle">${card._esc(card._i18n("ui.loading_favorites"))}</div>` : controlRoomMediaGridHtml(card, items, { empty: card._i18n("ui.no_favorites_found"), large: true })}
        </div>
      </div>
    `;
  }
  if (panel === "scenes") {
    const customScenes = controlRoomCustomScenes(card);
    return `
      <div class="control-room-tray open wide">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.scene_presets_2"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.one_tap_prepares_players_grouping_volume_and_content_save_your_own_curre"))}</div>
        </div>
        <div class="control-room-scenes-grid">
          <button class="control-room-scene-card" data-room-scene="home">${card._iconSvg("home")}<span>${card._esc(card._i18n("ui.home"))}</span><small>${card._esc(card._i18n("ui.selected_players_at_comfortable_volume"))}</small></button>
          <button class="control-room-scene-card" data-room-scene="party">${card._iconSvg("radio")}<span>${card._esc(card._i18n("ui.party"))}</span><small>${card._esc(card._i18n("ui.group_volume_up_energetic_mix"))}</small></button>
          <button class="control-room-scene-card" data-room-scene="night">${card._iconSvg("moon")}<span>${card._esc(card._i18n("ui.night"))}</span><small>${card._esc(card._i18n("ui.low_volume_and_quiet_mix"))}</small></button>
        </div>
        <div class="control-room-scene-save">
          <label class="control-room-search">
            ${card._iconSvg("home")}
            <input id="controlRoomSceneNameInput" type="text" placeholder="${card._esc(card._i18n("ui.name_this_studio_scene"))}" value="${card._esc(card._state.controlRoomSceneName || "")}" autocomplete="off" spellcheck="false">
          </label>
          <button class="control-room-panel-action primary" data-room-save-scene>${card._iconSvg("plus")}<span>${card._esc(card._i18n("ui.save_current_target"))}</span></button>
        </div>
        <div class="control-room-saved-scenes" data-control-room-scroll="saved-scenes">
          ${customScenes.length ? customScenes.map((scene) => {
            const count = scene.playerIds.length;
            const mediaName = scene.media?.name || card._i18n("ui.volume_and_player_target");
            return `
              <article class="control-room-saved-scene-card">
                <button class="control-room-saved-scene-main" data-room-scene="${card._esc(scene.id)}">
                  ${card._iconSvg(count > 1 ? "speaker" : "home")}
                  <span>
                    <strong>${card._esc(scene.name)}</strong>
                    <small>${card._esc(`${controlRoomPlayerCountLabel(card, count)} · ${mediaName}`)}</small>
                  </span>
                </button>
                <button class="control-room-saved-scene-delete" data-room-delete-scene="${card._esc(scene.id)}" title="${card._esc(card._i18n("ui.delete_scene"))}">${card._iconSvg("trash")}</button>
              </article>
            `;
          }).join("") : `<div class="control-room-empty subtle">${card._esc(card._i18n("ui.no_saved_studio_scenes_yet"))}</div>`}
        </div>
      </div>
    `;
  }
  if (panel === "announce") return studioAnnouncePanelHtml(card, context);
  if (panel === "pro") {
    const primary = controlRoomPrimaryPlayer(card);
    const protocol = primary ? controlRoomProtocolLabel(card, primary) : "";
    return `
      <div class="control-room-tray open compact">
        <div class="control-room-tray-head">
          <div class="control-room-tray-title">${card._esc(card._i18n("ui.studio_pro_2"))}</div>
          <div class="control-room-tray-sub">${card._esc(card._i18n("ui.feature_detection_player_context_and_this_device_playback_tools"))}</div>
        </div>
        <div class="control-room-diagnostics">
          <div class="control-room-diagnostic-row"><span>Target player</span><strong>${card._esc(primary?.attributes?.friendly_name || card._i18n("ui.none"))}</strong></div>
          <div class="control-room-diagnostic-row"><span>Protocol</span><strong>${card._esc(protocol || card._i18n("ui.unknown"))}</strong></div>
          <div class="control-room-diagnostic-row"><span>Music Assistant</span><strong>Maverick Music Engine</strong></div>
          <div class="control-room-diagnostic-row"><span>Players</span><strong>${card._esc(String(players.length))}</strong></div>
          <div class="control-room-pro-actions">
            <button class="control-room-panel-action" data-room-selection-action="open_ma">${card._iconSvg("library_music")}<span>${card._esc(card._i18n("ui.open_music_assistant"))}</span></button>
          </div>
          <div class="control-room-empty subtle">${card._esc(card._i18n("ui.player_settings_and_dsp_presets_stay_read_only_until_music_assistant_exp"))}</div>
        </div>
      </div>
    `;
  }
  return ``;
}

function controlRoomViewportSize(card) {
  const viewportWidth = typeof window !== "undefined" ? Number(window.innerWidth || 0) : 0;
  const viewportHeight = card._getViewportHeight(card._config?.height || 0);
  return {
    width: Math.max(320, Math.round(card._getCardWidth(card._lastCardWidth || viewportWidth || 1600))),
    height: Math.max(280, Math.round(card._getAllocatedCardHeight(card._lastCardHeight || card._config?.height || viewportHeight || 760))),
  };
}

function controlRoomGridStyle(card, playerCount = 0) {
  const count = Math.max(1, Number(playerCount) || 0);
  const { width, height } = controlRoomViewportSize(card);
  const compactViewport = width <= 1280;
  const narrowViewport = width <= 980;
  const shortViewport = height <= 640;
  const gap = narrowViewport ? 10 : (compactViewport ? 12 : 16);
  const minTileWidth = narrowViewport ? 78 : (compactViewport ? 86 : 96);
  const preferredMaxCols = width >= 1560 ? 6 : width >= 1060 ? 5 : width >= 720 ? 5 : 3;
  const dockReserve = shortViewport ? 82 : (narrowViewport ? 92 : (compactViewport ? 104 : 116));
  const headReserve = shortViewport ? 54 : (narrowViewport ? 64 : 74);
  const verticalReserve = dockReserve + headReserve + (shortViewport ? 10 : 18);
  const availableWidth = Math.max(220, width - (narrowViewport ? 20 : (compactViewport ? 34 : 56)));
  const availableHeight = Math.max(180, height - verticalReserve);
  const maxColsByWidth = Math.max(1, Math.floor((availableWidth + gap) / (minTileWidth + gap)));
  const maxCols = Math.max(1, Math.min(count, Math.max(preferredMaxCols, maxColsByWidth)));
  let best = { cols: 1, tileWidth: Math.min(availableWidth, availableHeight * 16 / 9), rows: count, score: 0 };
  for (let cols = 1; cols <= maxCols; cols += 1) {
    const rows = Math.ceil(count / cols);
    const widthLimited = (availableWidth - gap * (cols - 1)) / cols;
    const heightLimited = ((availableHeight - gap * (rows - 1)) / rows) * 16 / 9;
    const tileWidth = Math.max(minTileWidth, Math.min(widthLimited, heightLimited));
    const score = tileWidth * tileWidth * cols - rows * 22 + cols * 6;
    if (score > best.score) best = { cols, tileWidth, rows, score };
  }
  const gridMaxWidth = Math.max(240, Math.floor((best.tileWidth * best.cols) + gap * (best.cols - 1)));
  const gridMaxHeight = Math.max(160, Math.floor((best.tileWidth * 9 / 16 * best.rows) + gap * (best.rows - 1)));
  const tileScale = Math.max(0.72, Math.min(1, best.tileWidth / 300));
  return [
    `--control-room-cols:${best.cols}`,
    `--control-room-rows:${best.rows}`,
    `--control-room-gap:${gap}px`,
    `--control-room-player-count:${count}`,
    `--control-room-grid-max-width:${gridMaxWidth}px`,
    `--control-room-grid-max-height:${gridMaxHeight}px`,
    `--control-room-grid-available-height:${availableHeight}px`,
    `--control-room-dock-reserve:${dockReserve}px`,
    `--control-room-head-reserve:${headReserve}px`,
    `--control-room-viewport-width:${width}px`,
    `--control-room-viewport-height:${height}px`,
    `--control-room-tile-scale:${tileScale.toFixed(3)}`,
  ].join(";");
}

function controlRoomRenderSignature(card) {
  const players = controlRoomPlayers(card).map((player) => ({
    id: player.entity_id,
    groupCount: controlRoomGroupInfo(card, player).count,
  }));
  const results = Array.isArray(card._state.controlRoomLibraryResults)
    ? card._state.controlRoomLibraryResults.slice(0, 10).map((entry) => ({
        name: entry?.name || "",
        subtitle: entry?.subtitle || "",
        type: entry?.media_type || "",
        image: entry?.image || "",
    }))
    : [];
  const queueCache = card._state.controlRoomQueueSnapshots || {};
  const queues = Object.fromEntries(Object.entries(queueCache).map(([entityId, entry]) => [
    entityId,
    {
      count: Number(entry?.snapshot?.state?.items || 0) || (Array.isArray(entry?.snapshot?.items) ? entry.snapshot.items.length : 0),
      current: entry?.snapshot?.state?.current_index ?? "",
    },
  ]));
  const viewport = controlRoomViewportSize(card);
  return JSON.stringify({
    open: !!card._state.controlRoomOpen,
    panel: card._state.controlRoomPanel || "",
    viewport,
    selected: controlRoomSelectedPlayerIds(card),
    visible: controlRoomVisiblePlayerIds(card),
    query: card._state.controlRoomLibraryQuery || "",
    loading: !!card._state.controlRoomLibraryLoading,
    source: card._state.controlRoomTransferSource || "",
    target: card._state.controlRoomTransferTarget || "",
    results,
    queues,
    queueLoading: !!card._state.controlRoomQueueLoading,
    recentLoading: !!card._state.controlRoomRecentLoading,
    recent: (card._state.controlRoomRecentItems || []).slice(0, 12).map((entry) => entry?.uri || entry?.name || ""),
    favoritesLoading: !!card._state.controlRoomFavoritesLoading,
    favorites: (card._state.controlRoomFavoritesItems || []).slice(0, 12).map((entry) => entry?.uri || entry?.name || ""),
    smartQuery: card._state.controlRoomSmartQuery || "",
    announcementText: card._state.controlRoomAnnouncementText || "",
    announcementVolume: card._state.controlRoomAnnouncementVolume || 20,
    sceneName: card._state.controlRoomSceneName || "",
    customScenes: controlRoomCustomScenes(card).map((scene) => ({
      id: scene.id,
      name: scene.name,
      players: scene.playerIds,
      media: scene.media?.uri || "",
    })),
    players,
  });
}

export function controlRoomHtml(card) {
  if (!controlRoomEnabled(card)) return "";
  const players = controlRoomPlayers(card);
  const primary = controlRoomPrimaryPlayer(card);
  const primaryArt = card._playerArtworkUrl(primary, 320);
  const roomStyleVars = controlRoomGridStyle(card, players.length);
  const sceneStyle = `style="${primaryArt ? `--control-room-scene-art:${card._esc(cssUrl(primaryArt))};` : ""}${roomStyleVars}"`;
  const focusTarget = controlRoomFocusTarget(card);
  const focusArt = focusTarget.art || primaryArt;
  const targetIds = controlRoomActionTargetIds(card);
  const primaryPlaying = primary?.state === "playing";
  const primaryMuted = primary ? card._isMuted(primary) : false;
  const panelOpen = !!card._state.controlRoomPanel;
  const musicPanelActive = ["music", "mix", "library", "recent", "favorites", "scenes"].includes(card._state.controlRoomPanel);
  const actionsPanelActive = ["actions", "selection", "visible", "announce", "pro"].includes(card._state.controlRoomPanel);
  return `
    <div class="control-room-scene ${primaryArt ? "has-art" : ""} ${panelOpen ? "panel-open" : ""}" ${sceneStyle}>
      <div class="control-room-scene-bg"></div>
      <div class="control-room-scene-glow"></div>
      <div class="control-room-layout">
        <div class="control-room-grid-wrap">
          ${controlRoomGroupSummaryHtml(card, players)}
          <div class="control-room-grid">
            ${players.map((player) => controlRoomPlayerTileHtml(card, player)).join("")}
          </div>
        </div>
        ${controlRoomPanelHtml(card, players)}
        <div class="control-room-dock focus-mode">
          <div class="control-room-player-console">
            <div class="control-room-now-pill focus-target">
              <span class="control-room-now-art">${focusArt ? card._imgHtml(focusArt, "", { fallbackIcon: "speaker" }) : card._iconSvg("speaker")}</span>
              <span class="control-room-now-copy">
                <span class="control-room-now-kicker">${card._esc(focusTarget.kicker)}</span>
                <span class="control-room-now-name">${card._esc(focusTarget.name)}</span>
                <span class="control-room-now-track">${card._esc(focusTarget.track)}</span>
              </span>
            </div>
            <div class="control-room-dock-section player primary-actions">
              <button class="control-room-dock-btn" data-room-selection-action="player_playpause" title="${card._esc(card._i18n("ui.play_pause"))}">
                ${card._iconSvg(primaryPlaying ? "pause" : "play")}
                <span class="control-room-dock-label">${card._esc(primaryPlaying ? card._i18n("ui.pause") : card._i18n("ui.play"))}</span>
              </button>
              <button class="control-room-dock-btn" data-room-selection-action="player_next" title="${card._esc(card._i18n("ui.next"))}">
                ${card._iconSvg("next")}
                <span class="control-room-dock-label">${card._esc(card._i18n("ui.next"))}</span>
              </button>
              <button class="control-room-dock-btn ${primaryMuted ? "active" : ""}" data-room-selection-action="player_mute" title="${card._esc(card._i18n("ui.mute"))}">
                ${card._iconSvg(primary ? card._volumeIconName(primary) : "speaker")}
                <span class="control-room-dock-label">${card._esc(card._i18n("ui.mute"))}</span>
              </button>
            </div>
          </div>
          <span class="control-room-dock-divider" aria-hidden="true"></span>
          <div class="control-room-dock-section room focus-nav">
            <button class="control-room-selection-pill ${card._state.controlRoomPanel === "selection" ? "active" : ""}" data-room-selection-action="selection" title="${card._esc(card._i18n("ui.connected_players_2"))}">
              <span class="control-room-selection-count">${card._esc(String(targetIds.length))}</span>
              <span class="control-room-dock-label">${card._esc(card._i18n("ui.players"))}</span>
            </button>
            <button class="control-room-dock-btn ${musicPanelActive ? "active" : ""}" data-room-selection-action="music" title="${card._esc(card._i18n("ui.music_hub_2"))}">
              ${card._iconSvg("wand")}
              <span class="control-room-dock-label">${card._esc(card._i18n("ui.music"))}</span>
            </button>
            <button class="control-room-dock-btn ${card._state.controlRoomPanel === "transfer" ? "active" : ""}" data-room-selection-action="transfer" title="${card._esc(card._i18n("ui.transfer_queue_2"))}">
              ${card._iconSvg("queue")}
              <span class="control-room-dock-label">${card._esc(card._i18n("ui.queue_2"))}</span>
            </button>
            <button class="control-room-dock-btn ${actionsPanelActive ? "active" : ""}" data-room-selection-action="actions" title="${card._esc(card._i18n("ui.actions_2"))}">
              ${card._iconSvg("settings")}
              <span class="control-room-dock-label">${card._esc(card._i18n("ui.actions_2"))}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function syncControlRoomLiveFields(card) {
  if (!card._state.controlRoomOpen || !card.shadowRoot) return;
  const host = card.$("controlRoomBody");
  if (!host) return;
  const players = controlRoomPlayers(card);
  const playerMap = new Map(players.map((player) => [player.entity_id, player]));
  const selectedIds = controlRoomSelectedPlayerIds(card);
  const primaryId = controlRoomPrimaryPlayerId(card);
  const primary = controlRoomPrimaryPlayer(card);
  const setText = (el, text) => {
    if (el && el.textContent !== String(text ?? "")) el.textContent = String(text ?? "");
  };
  const setHtml = (el, html) => {
    if (el && el.dataset.liveHtml !== html) {
      el.innerHTML = html;
      el.dataset.liveHtml = html;
    }
  };
  host.querySelectorAll("[data-room-tile]").forEach((tile) => {
    const entityId = tile.dataset.roomTile || "";
    const player = playerMap.get(entityId);
    if (!player) return;
    const art = card._playerArtworkUrl(player, 320);
    const playing = player.state === "playing";
    const isSelected = selectedIds.includes(entityId);
    const isPrimary = primaryId === entityId;
    const volume = Math.round((player.attributes?.volume_level || 0) * 100);
    const groupInfo = controlRoomGroupInfo(card, player);
    tile.classList.toggle("has-art", !!art);
    tile.classList.toggle("no-art", !art);
    tile.classList.toggle("is-playing", playing);
    tile.classList.toggle("selected", isSelected);
    tile.classList.toggle("primary", isPrimary);
    tile.classList.toggle("grouped", !!groupInfo.count);
    const selectFab = tile.querySelector("[data-room-select]");
    if (selectFab) {
      const removable = isSelected && selectedIds.length > 1;
      selectFab.classList.toggle("active", isSelected);
      selectFab.classList.toggle("removable", removable);
      selectFab.title = removable
        ? card._i18n("ui.remove_from_selection")
        : isSelected ? card._i18n("ui.selected_player_2") : card._i18n("ui.add_to_selection");
      setHtml(selectFab, `${card._iconSvg(removable ? "close" : isSelected ? "check" : "grid")}<span class="control-room-select-label">${card._esc(removable ? card._i18n("ui.remove") : isSelected ? card._i18n("ui.selected") : card._i18n("ui.select"))}</span>`);
    }
    if (art) tile.style.setProperty("--control-room-tile-art", cssUrl(art));
    else tile.style.removeProperty("--control-room-tile-art");
    const pills = tile.querySelector(".control-room-tile-pills");
    const groupCount = groupInfo.count;
    const snapshot = controlRoomQueueCache(card, entityId);
    const queueCount = controlRoomQueueCount(card, player, snapshot);
    const protocolLabel = controlRoomProtocolLabel(card, player);
    const pillsHtml = [
      isPrimary ? `<span class="control-room-primary-pill">${card._esc(card._i18n("ui.primary"))}</span>` : ``,
      groupCount ? `<span class="control-room-float-pill grouped" title="${card._esc(groupInfo.label || card._i18n("ui.grouped_players"))}">${card._iconSvg("speaker")}${card._esc(card._m(`${groupCount} grouped`))}</span>` : ``,
      queueCount ? `<span class="control-room-float-pill">${card._iconSvg("queue")}${card._esc(String(queueCount))}</span>` : ``,
      protocolLabel ? `<span class="control-room-float-pill protocol">${card._esc(protocolLabel)}</span>` : ``,
      playing ? `<span class="control-room-float-pill live">${card._esc(card._i18n("ui.playing"))}</span>` : ``,
    ].filter(Boolean).join("");
    setHtml(pills, pillsHtml);
    setText(tile.querySelector(".control-room-tile-track"), player.attributes?.media_title || card._i18n("ui.idle_2"));
    setText(tile.querySelector(".control-room-tile-name"), player.attributes?.friendly_name || player.entity_id);
    setText(tile.querySelector(".control-room-tile-state"), card._playerStateLabel(player));
    setHtml(tile.querySelector("[data-room-toggle-play]"), card._iconSvg(playing ? "pause" : "play"));
    const tileMute = tile.querySelector("[data-room-mute]");
    if (tileMute) {
      const muted = card._isMuted(player);
      tileMute.classList.toggle("active", muted);
      setHtml(tileMute, card._iconSvg(muted ? "volume_mute" : card._volumeIconName(player)));
    }
    const input = tile.querySelector(".control-room-volume");
    if (input && card.shadowRoot.activeElement !== input && String(input.value) !== String(volume)) {
      input.value = String(volume);
      input.style.setProperty("--vol-pct", `${volume}%`);
    }
    setText(tile.querySelector("[data-room-volume-value]"), `${volume}%`);
  });
  const primaryArt = card._playerArtworkUrl(primary, 320);
  const scene = host.querySelector(".control-room-scene");
  if (scene) {
    scene.classList.toggle("has-art", !!primaryArt);
    if (primaryArt) scene.style.setProperty("--control-room-scene-art", cssUrl(primaryArt));
    else scene.style.removeProperty("--control-room-scene-art");
  }
  const focusTarget = controlRoomFocusTarget(card);
  const focusArt = focusTarget.art || primaryArt;
  setHtml(host.querySelector(".control-room-now-art"), focusArt ? card._imgHtml(focusArt, "", { fallbackIcon: "speaker" }) : card._iconSvg("speaker"));
  setText(host.querySelector(".control-room-now-kicker"), focusTarget.kicker);
  setText(host.querySelector(".control-room-now-name"), focusTarget.name);
  setText(host.querySelector(".control-room-now-track"), focusTarget.track);
  const playPauseBtn = host.querySelector('[data-room-selection-action="player_playpause"]');
  if (playPauseBtn) {
    const primaryPlaying = primary?.state === "playing";
    setHtml(playPauseBtn, `${card._iconSvg(primaryPlaying ? "pause" : "play")}<span class="control-room-dock-label">${card._esc(primaryPlaying ? card._i18n("ui.pause") : card._i18n("ui.play"))}</span>`);
  }
  const actionPlayPauseBtn = host.querySelector('.control-room-action-console [data-room-selection-action="playpause"]');
  if (actionPlayPauseBtn) {
    const primaryPlaying = primary?.state === "playing";
    setHtml(actionPlayPauseBtn, `${card._iconSvg(primaryPlaying ? "pause" : "play")}<span>${card._esc(primaryPlaying ? card._i18n("ui.pause") : card._i18n("ui.play"))}</span>`);
  }
  const muteBtn = host.querySelector('[data-room-selection-action="player_mute"]');
  if (muteBtn) {
    const muted = primary ? card._isMuted(primary) : false;
    muteBtn.classList.toggle("active", muted);
    setHtml(muteBtn, `${card._iconSvg(primary ? card._volumeIconName(primary) : "speaker")}<span class="control-room-dock-label">${card._esc(card._i18n("ui.mute"))}</span>`);
  }
  const actionMuteBtn = host.querySelector('.control-room-action-console [data-room-selection-action="mute"]');
  if (actionMuteBtn) {
    const muted = primary ? card._isMuted(primary) : false;
    actionMuteBtn.classList.toggle("active", muted);
    setHtml(actionMuteBtn, `${card._iconSvg(muted ? "volume_mute" : (primary ? card._volumeIconName(primary) : "speaker"))}<span>${card._esc(card._i18n("ui.mute"))}</span>`);
  }
}

export function syncControlRoomUi(card, options = {}) {
  syncControlRoomChrome(card);
  if (!controlRoomEnabled(card)) return;
  const host = card.$("controlRoomBody");
  if (!host) return;
  const force = !!options.force;
  if (!card._state.controlRoomOpen && !force) return;
  const activeEl = card.shadowRoot?.activeElement;
  const restorableInputIds = new Set(["controlRoomLibraryInput", "controlRoomSmartQueryInput", "controlRoomAnnouncementText", "controlRoomSceneNameInput"]);
  const activeControlRoomInputId = restorableInputIds.has(activeEl?.id) ? activeEl.id : "";
  const selectionStart = activeControlRoomInputId ? activeEl.selectionStart : null;
  const selectionEnd = activeControlRoomInputId ? activeEl.selectionEnd : null;
  const nextSignature = controlRoomRenderSignature(card);
  const needsRender = force
    || card._state.controlRoomRenderSignature !== nextSignature
    || !host.firstElementChild;
  if (needsRender) {
    const nextHtml = controlRoomHtml(card);
    const scrollSnapshot = {};
    host.querySelectorAll?.("[data-control-room-scroll]")?.forEach((el) => {
      const key = el.dataset.controlRoomScroll || "";
      if (key) scrollSnapshot[key] = { top: el.scrollTop || 0, left: el.scrollLeft || 0 };
    });
    const restoreScroll = () => {
      host.querySelectorAll?.("[data-control-room-scroll]")?.forEach((el) => {
        const key = el.dataset.controlRoomScroll || "";
        const pos = scrollSnapshot[key];
        if (!pos) return;
        el.scrollTop = pos.top;
        el.scrollLeft = pos.left;
      });
    };
    if (
      card._state.controlRoomRenderedHtml !== nextHtml
      || !host.firstElementChild
    ) {
      host.innerHTML = nextHtml;
      card._state.controlRoomRenderedHtml = nextHtml;
      restoreScroll();
      requestAnimationFrame(() => restoreScroll());
    }
    card._state.controlRoomRenderSignature = nextSignature;
  }
  syncControlRoomLiveFields(card);
  syncScreenDock(card, host.parentElement, "studio", () => closeControlRoom(card));
  const input = card.$("controlRoomLibraryInput");
  if (input) {
    input.value = card._state.controlRoomLibraryQuery || "";
  }
  const smartInput = card.$("controlRoomSmartQueryInput");
  if (smartInput) smartInput.value = card._state.controlRoomSmartQuery || "";
  const announceInput = card.$("controlRoomAnnouncementText");
  if (announceInput) announceInput.value = card._state.controlRoomAnnouncementText || "";
  const sceneNameInput = card.$("controlRoomSceneNameInput");
  if (sceneNameInput) sceneNameInput.value = card._state.controlRoomSceneName || "";
  if (activeControlRoomInputId) {
    const targetInput = card.$(activeControlRoomInputId);
    targetInput?.focus?.({ preventScroll: true });
    if (targetInput && typeof selectionStart === "number" && typeof selectionEnd === "number") {
      try { targetInput.setSelectionRange(selectionStart, selectionEnd); } catch (_) {}
    }
  }
}

export function controlRoomBackdropHtml(card) {
  if (card._isHotelMode() || !controlRoomEnabled(card)) return ``;
  return `
    <div class="control-room-backdrop" id="controlRoomBackdrop">
      <div class="control-room-shell">
        <div class="control-room-head">
          <div class="control-room-head-brand" aria-hidden="true">${card._tabletBrandSignatureHtml("control-room-head-logo")}</div>
          <button class="control-room-close" id="controlRoomCloseBtn" title="${card._esc(card._i18n("ui.close"))}">${card._iconSvg("close")}</button>
        </div>
        <div class="control-room-body-host" id="controlRoomBody"></div>
      </div>
    </div>
  `;
}

export function bindControlRoom(card) {
  card.$("controlRoomCloseBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation?.();
    e.stopPropagation();
    card._suppressHomeShortcutNavigation();
    if (!card._pressUiButton(e.currentTarget)) return;
    closeControlRoom(card);
  });
  const keepControlRoomScroll = (e) => {
    if (e.target?.closest?.("[data-control-room-scroll]")) e.stopPropagation();
  };
  card.$("controlRoomBackdrop")?.addEventListener("wheel", keepControlRoomScroll, { passive: true });
  card.$("controlRoomBackdrop")?.addEventListener("touchmove", keepControlRoomScroll, { passive: true });
  card.$("controlRoomBackdrop")?.addEventListener("click", async (e) => {
    if (e.target?.id === "controlRoomBackdrop") {
      e.preventDefault();
      e.stopPropagation();
      if (!card._state.controlRoomOpen) {
        syncControlRoomChrome(card);
        return;
      }
      closeControlRoom(card);
      return;
    }
    const selectBtn = e.target.closest("[data-room-select]");
    if (selectBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(selectBtn);
      const entityId = selectBtn.dataset.roomSelect;
      const result = toggleControlRoomPlayerSelection(card, entityId);
      const name = controlRoomPlayerName(card, entityId);
      if (result === "kept") {
        card._toast(card._i18n("ui.at_least_one_player_must_stay_selected"));
      } else {
        card._toastSuccess(result === "removed"
          ? card._m(`${name} removed from studio selection`)
          : card._m(`${name} added to studio selection`));
      }
      return;
    }
    const primaryBtn = e.target.closest("[data-room-primary]");
    if (primaryBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(primaryBtn);
      const entityId = primaryBtn.dataset.roomPrimary;
      setControlRoomPrimary(card, entityId);
      card._toastSuccess(card._m(
        `Studio is now controlling ${controlRoomPlayerName(card, entityId)}`
      ));
      return;
    }
    const playBtn = e.target.closest("[data-room-toggle-play]");
    if (playBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(playBtn);
      const entityId = playBtn.dataset.roomTogglePlay;
      const player = card._playerByEntityId(entityId);
      try {
        await card._togglePlayFor(entityId);
        card._toastSuccess(player?.state === "playing"
          ? card._m(`${controlRoomPlayerName(card, entityId)} paused`)
          : card._m(`${controlRoomPlayerName(card, entityId)} started playing`));
        card._timeout(() => card._updateNowPlayingState(), 250);
      } catch (error) {
        card._toastError(error?.message || card._i18n("ui.playback_command_failed_2"));
      }
      return;
    }
    const nextBtn = e.target.closest("[data-room-next]");
    if (nextBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(nextBtn);
      const entityId = nextBtn.dataset.roomNext;
      try {
        await card._playerCmdFor(entityId, "next");
        card._toastSuccess(card._m(`${controlRoomPlayerName(card, entityId)} skipped to next`));
        card._timeout(() => card._updateNowPlayingState(), 250);
      } catch (error) {
        card._toastError(error?.message || card._i18n("ui.next_track_failed"));
      }
      return;
    }
    const muteBtn = e.target.closest("[data-room-mute]");
    if (muteBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(muteBtn);
      const entityId = muteBtn.dataset.roomMute;
      const wasMuted = card._isMuted(card._playerByEntityId(entityId));
      try {
        if (!await card._toggleMuteFor(entityId)) return;
        card._toastSuccess(wasMuted
          ? card._m(`${controlRoomPlayerName(card, entityId)} unmuted`)
          : card._m(`${controlRoomPlayerName(card, entityId)} muted`));
        card._timeout(() => card._updateNowPlayingState(), 160);
      } catch (error) {
        card._toastError(error?.message || card._i18n("ui.mute_command_failed"));
      }
      return;
    }
    const transferSourceBtn = e.target.closest("[data-room-transfer-source]");
    if (transferSourceBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(transferSourceBtn);
      card._state.controlRoomTransferSource = transferSourceBtn.dataset.roomTransferSource || "";
      syncControlRoomTransferDefaults(card);
      syncControlRoomUi(card);
      card._toast(card._m(
        `Transfer source: ${controlRoomPlayerName(card, card._state.controlRoomTransferSource)}`
      ));
      return;
    }
    const transferTargetBtn = e.target.closest("[data-room-transfer-target]");
    if (transferTargetBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(transferTargetBtn);
      const targetId = transferTargetBtn.dataset.roomTransferTarget || "";
      if (targetId && targetId !== card._state.controlRoomTransferSource) {
        card._state.controlRoomTransferTarget = targetId;
        syncControlRoomUi(card);
        card._toast(card._m(
          `Transfer target: ${controlRoomPlayerName(card, targetId)}`
        ));
      }
      return;
    }
    const transferBtn = e.target.closest("[data-room-transfer]");
    if (transferBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(transferBtn);
      const ok = await card._transferQueueBetween(card._state.controlRoomTransferSource, card._state.controlRoomTransferTarget, { silent: true });
      if (ok) card._state.controlRoomPanel = "";
      if (ok) card._toastSuccess(card._i18n("ui.queue_transferred"));
      else card._toastError(card._i18n("ui.could_not_transfer_the_queue"));
      card._timeout(() => card._updateNowPlayingState(), 300);
      return;
    }
    const cloneBtn = e.target.closest("[data-room-clone]");
    if (cloneBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(cloneBtn);
      const ok = await card._cloneQueueBetween(card._state.controlRoomTransferSource, card._state.controlRoomTransferTarget, { silent: true });
      if (ok) card._toastSuccess(card._i18n("ui.queue_cloned"));
      else card._toastError(card._i18n("ui.could_not_clone_the_queue"));
      card._timeout(() => card._updateNowPlayingState(), 300);
      return;
    }
    const refreshQueuesBtn = e.target.closest("[data-room-refresh-queues]");
    if (refreshQueuesBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(refreshQueuesBtn);
      await loadControlRoomQueues(card, [
        card._state.controlRoomTransferSource,
        card._state.controlRoomTransferTarget,
        ...controlRoomSelectedPlayerIds(card),
      ].filter(Boolean));
      card._toastSuccess(card._i18n("ui.queues_refreshed"));
      return;
    }
    const clearQueueBtn = e.target.closest("[data-room-clear-queue]");
    if (clearQueueBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(clearQueueBtn);
      const entityId = clearQueueBtn.dataset.roomClearQueue || "";
      if (!entityId) return;
      await card._clearQueueForPlayer(entityId);
      await loadControlRoomQueues(card, [entityId]);
      card._toastSuccess(card._i18n("ui.queue_cleared"));
      return;
    }
    const libraryActionBtn = e.target.closest("[data-room-library-action]");
    if (libraryActionBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(libraryActionBtn);
      const action = libraryActionBtn.dataset.roomLibraryAction || "play";
      const entry = {
        uri: libraryActionBtn.dataset.roomLibraryUri || "",
        media_type: libraryActionBtn.dataset.roomLibraryType || "album",
        name: libraryActionBtn.dataset.roomLibraryName || "",
        subtitle: libraryActionBtn.dataset.roomLibrarySubtitle || "",
        image: libraryActionBtn.dataset.roomLibraryImage || "",
        favorite_scope: libraryActionBtn.dataset.roomLibraryFavoriteScope || "library",
      };
      if (!entry?.uri) return;
      const played = await playControlRoomLibraryEntry(card, entry, action);
      if (played) {
        if (action !== "like") card._state.controlRoomPanel = "";
        if (action === "like") {
          if (card._state.controlRoomPanel === "favorites") loadControlRoomFavorites(card).catch(() => {});
          else syncControlRoomUi(card, { force: true });
        }
        const messages = {
          play: card._m(`Started ${entry.name || "media"} in Studio`),
          next: card._i18n("ui.will_play_next_in_studio"),
          add: card._i18n("ui.added_to_studio_queue"),
          radio_mode: card._i18n("ui.radio_mode_started"),
          like: card._i18n("ui.favorite_updated"),
        };
        card._toastSuccess(messages[action] || messages.play);
        card._timeout(() => card._updateNowPlayingState(), 350);
      } else {
        card._toastError(card._i18n("ui.studio_media_action_failed"));
      }
      return;
    }
    const libraryPlayBtn = e.target.closest("[data-room-library-play]");
    if (libraryPlayBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(libraryPlayBtn);
      const entry = {
        uri: libraryPlayBtn.dataset.roomLibraryUri || "",
        media_type: libraryPlayBtn.dataset.roomLibraryType || "album",
        name: libraryPlayBtn.dataset.roomLibraryName || "",
        subtitle: libraryPlayBtn.dataset.roomLibrarySubtitle || "",
        image: libraryPlayBtn.dataset.roomLibraryImage || "",
        favorite_scope: libraryPlayBtn.dataset.roomLibraryFavoriteScope || "library",
      };
      if (!entry?.uri) return;
      const played = await playControlRoomLibraryEntry(card, entry);
      if (played) {
        card._state.controlRoomPanel = "";
        card._toastSuccess(card._m(`Started ${entry.name || "media"} in Studio`));
        card._timeout(() => card._updateNowPlayingState(), 350);
      } else {
        card._toastError(card._i18n("ui.could_not_start_playback_in_studio"));
      }
      return;
    }
    const smartMixBtn = e.target.closest("[data-room-smart-mix]");
    if (smartMixBtn) {
      e.preventDefault();
      e.stopPropagation();
      await startControlRoomMix(card, smartMixBtn.dataset.roomSmartMix || "", smartMixBtn);
      return;
    }
    const smartCustomBtn = e.target.closest("[data-room-smart-custom]");
    if (smartCustomBtn) {
      e.preventDefault();
      e.stopPropagation();
      await startControlRoomMix(card, "custom", smartCustomBtn);
      return;
    }
    const saveSceneBtn = e.target.closest("[data-room-save-scene]");
    if (saveSceneBtn) {
      e.preventDefault();
      e.stopPropagation();
      saveControlRoomSceneFromStudio(card, saveSceneBtn);
      return;
    }
    const deleteSceneBtn = e.target.closest("[data-room-delete-scene]");
    if (deleteSceneBtn) {
      e.preventDefault();
      e.stopPropagation();
      deleteControlRoomScene(card, deleteSceneBtn.dataset.roomDeleteScene || "", deleteSceneBtn);
      return;
    }
    const sceneBtn = e.target.closest("[data-room-scene]");
    if (sceneBtn) {
      e.preventDefault();
      e.stopPropagation();
      await applyControlRoomScene(card, sceneBtn.dataset.roomScene || "home", sceneBtn);
      return;
    }
    const announceBtn = e.target.closest("[data-room-announce-send]");
    if (announceBtn) {
      e.preventDefault();
      e.stopPropagation();
      await sendControlRoomAnnouncement(card, announceBtn);
      return;
    }
    const thisDeviceBtn = e.target.closest("[data-room-this-device]");
    if (thisDeviceBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(thisDeviceBtn);
      const action = thisDeviceBtn.dataset.roomThisDevice;
      if (action === "disconnect") card._disconnectThisDevicePlayer();
      else card._connectThisDevicePlayer();
      syncControlRoomUi(card, { force: true });
      return;
    }
    const libraryMicBtn = e.target.closest("[data-room-library-mic]");
    if (libraryMicBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(libraryMicBtn);
      startControlRoomLibraryVoice(card);
      return;
    }
    const selectionToggleBtn = e.target.closest("[data-room-selection-toggle]");
    if (selectionToggleBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(selectionToggleBtn);
      const entityId = selectionToggleBtn.dataset.roomSelectionToggle;
      const result = toggleControlRoomPlayerSelection(card, entityId);
      if (result === "kept") {
        card._toast(card._i18n("ui.at_least_one_player_must_stay_selected"));
      } else {
        card._toastSuccess(result === "removed"
          ? card._m(`${controlRoomPlayerName(card, entityId)} removed from selection`)
          : card._m(`${controlRoomPlayerName(card, entityId)} selected`));
      }
      return;
    }
    const visibleToggleBtn = e.target.closest("[data-room-visible-toggle]");
    if (visibleToggleBtn) {
      e.preventDefault();
      e.stopPropagation();
      card._pressUiButton(visibleToggleBtn);
      const entityId = visibleToggleBtn.dataset.roomVisibleToggle;
      const wasVisible = controlRoomVisiblePlayerIds(card).includes(entityId);
      toggleControlRoomVisiblePlayer(card, entityId);
      card._toastSuccess(wasVisible
        ? card._m(`${controlRoomPlayerName(card, entityId)} hidden from Studio`)
        : card._m(`${controlRoomPlayerName(card, entityId)} shown in Studio`));
      return;
    }
    const dockBtn = e.target.closest("[data-room-selection-action]");
    if (dockBtn) {
      e.preventDefault();
      e.stopPropagation();
      const action = dockBtn.dataset.roomSelectionAction;
      if (action === "close_panel") {
        toggleControlRoomPanel(card, card._state.controlRoomPanel);
        return;
      }
      const selectedIds = controlRoomActionTargetIds(card);
      if (action === "browse_library") {
        card._pressUiButton(dockBtn);
        card._toast(card._i18n("ui.opening_studio_library"));
        openControlRoomLibrary(card, "library_playlists");
        return;
      }
      if (action === "browse_artists" || action === "browse_albums" || action === "browse_tracks" || action === "browse_radio") {
        card._pressUiButton(dockBtn);
        const pageMap = {
          browse_artists: "library_artists",
          browse_albums: "library_albums",
          browse_tracks: "library_tracks",
          browse_radio: "library_radio",
        };
        card._toast(card._i18n("ui.opening_studio_library"));
        openControlRoomLibrary(card, pageMap[action] || "library_playlists");
        return;
      }
      if (action === "timers") {
        card._pressUiButton(dockBtn);
        card._toast(card._i18n("ui.opening_timers"));
        openControlRoomLibrary(card, "sleep_timer");
        return;
      }
      if (action === "open_ma") {
        card._pressUiButton(dockBtn);
        card._launchMusicAssistant();
        return;
      }
      if (["music", "actions", "library", "transfer", "selection", "visible", "mix", "recent", "favorites", "scenes", "announce", "pro"].includes(action)) {
        card._pressUiButton(dockBtn);
        const wasOpen = card._state.controlRoomPanel === action;
        toggleControlRoomPanel(card, action);
        card._toast(wasOpen
          ? card._m(`${controlRoomPanelLabel(card, action)} closed`)
          : card._m(`${controlRoomPanelLabel(card, action)} opened`));
        return;
      }
      const primaryId = controlRoomPrimaryPlayerId(card);
      if (action === "player_playpause") {
        if (!primaryId) return;
        card._pressUiButton(dockBtn);
        const player = card._playerByEntityId(primaryId);
        try {
          await card._togglePlayFor(primaryId);
          card._toastSuccess(player?.state === "playing"
            ? card._m(`${controlRoomPlayerName(card, primaryId)} paused`)
            : card._m(`${controlRoomPlayerName(card, primaryId)} started playing`));
          card._timeout(() => card._updateNowPlayingState(), 250);
        } catch (error) {
          card._toastError(error?.message || card._i18n("ui.playback_command_failed_2"));
        }
        return;
      }
      if (action === "player_next") {
        if (!primaryId) return;
        card._pressUiButton(dockBtn);
        try {
          await card._playerCmdFor(primaryId, "next");
          card._toastSuccess(card._m(`${controlRoomPlayerName(card, primaryId)} skipped to next`));
          card._timeout(() => card._updateNowPlayingState(), 250);
        } catch (error) {
          card._toastError(error?.message || card._i18n("ui.next_track_failed"));
        }
        return;
      }
      if (action === "player_mute") {
        if (!primaryId) return;
        card._pressUiButton(dockBtn);
        const wasMuted = card._isMuted(card._playerByEntityId(primaryId));
        try {
          if (!await card._toggleMuteFor(primaryId)) return;
          card._toastSuccess(wasMuted
            ? card._m(`${controlRoomPlayerName(card, primaryId)} unmuted`)
            : card._m(`${controlRoomPlayerName(card, primaryId)} muted`));
          card._timeout(() => card._updateNowPlayingState(), 160);
        } catch (error) {
          card._toastError(error?.message || card._i18n("ui.mute_command_failed"));
        }
        return;
      }
      if (action === "player_stop") {
        if (!primaryId) return;
        card._pressUiButton(dockBtn);
        try {
          await card._stopPlayer(primaryId);
          card._toastSuccess(card._m(`${controlRoomPlayerName(card, primaryId)} stopped`));
          card._timeout(() => card._updateNowPlayingState(), 250);
        } catch (error) {
          card._toastError(error?.message || card._i18n("ui.stop_command_failed"));
        }
        return;
      }
      if (!selectedIds.length) {
        card._toastError(card._i18n("ui.select_at_least_one_studio_player"));
        return;
      }
      if (action === "playpause") {
        card._pressUiButton(dockBtn);
        if (!await card._runControlRoomPlayerBatch(selectedIds, (entityId) => card._togglePlayFor(entityId))) return;
        card._toastSuccess(card._m(
          `Play / pause sent to ${controlRoomPlayerCountLabel(card, selectedIds.length)}`
        ));
        card._timeout(() => card._updateNowPlayingState(), 250);
        return;
      }
      if (action === "next") {
        card._pressUiButton(dockBtn);
        if (!await card._runControlRoomPlayerBatch(selectedIds, (entityId) => card._playerCmdFor(entityId, "next"))) return;
        card._toastSuccess(card._m(
          `Next sent to ${controlRoomPlayerCountLabel(card, selectedIds.length)}`
        ));
        card._timeout(() => card._updateNowPlayingState(), 250);
        return;
      }
      if (action === "mute") {
        card._pressUiButton(dockBtn);
        if (!await card._runControlRoomPlayerBatch(selectedIds, (entityId) => card._toggleMuteFor(entityId))) return;
        card._toastSuccess(card._m(
          `Mute sent to ${controlRoomPlayerCountLabel(card, selectedIds.length)}`
        ));
        card._timeout(() => card._updateNowPlayingState(), 250);
        return;
      }
      if (action === "clear") {
        card._pressUiButton(dockBtn);
        if (!await card._runControlRoomPlayerBatch(selectedIds, (entityId) => card._clearQueueForPlayer(entityId))) return;
        card._toastSuccess(card._m(
          `Queues cleared for ${controlRoomPlayerCountLabel(card, selectedIds.length)}`
        ));
        loadControlRoomQueues(card, selectedIds).catch(() => {});
        card._timeout(() => card._updateNowPlayingState(), 250);
        return;
      }
      if (action === "stop_all") {
        card._pressUiButton(dockBtn);
        await card._stopAllPlayers();
        card._timeout(() => card._updateNowPlayingState(), 350);
        return;
      }
      if (action === "group") {
        card._pressUiButton(dockBtn);
        const groupPrimaryId = selectedIds[0];
        const members = selectedIds.slice(1);
        if (members.length < 1) {
          card._toastError(card._i18n("ui.select_at_least_two_players_to_create_a_group"));
          return;
        }
        try {
          const ok = await card._applySpeakerGroupFor(groupPrimaryId, members);
          if (!ok) throw new Error(card._i18n("ui.select_at_least_two_players_to_create_a_group"));
          card._toastSuccess(card._i18n("ui.group_updated"));
        } catch (error) {
          card._toastError(error?.message || card._i18n("ui.player_groups_could_not_be_disconnected"));
        }
        card._timeout(() => card._updateNowPlayingState(), 350);
        return;
      }
      if (action === "ungroup") {
        card._pressUiButton(dockBtn);
        await Promise.allSettled(selectedIds.map((entityId) => card._clearSpeakerGroupFor(entityId)));
        card._toastSuccess(card._i18n("ui.group_cleared_2"));
        card._timeout(() => card._updateNowPlayingState(), 350);
      }
    }
  });
  card.$("controlRoomBackdrop")?.addEventListener("input", (e) => {
    const volumeInput = e.target.closest?.("[data-room-volume]");
    if (volumeInput) {
      const pct = Math.max(0, Math.min(100, Number(volumeInput.value || 0)));
      volumeInput.style.setProperty("--vol-pct", `${pct}%`);
      const label = volumeInput.closest(".control-room-volume-row")?.querySelector("[data-room-volume-value]");
      if (label) label.textContent = `${pct}%`;
      clearTimeout(card._controlRoomVolumeTimer);
      card._controlRoomVolumeTimer = setTimeout(() => card._setPlayerVolumeFor(volumeInput.dataset.roomVolume, pct / 100), 90);
      return;
    }
    const smartInput = e.target.closest?.("#controlRoomSmartQueryInput");
    if (smartInput) {
      card._state.controlRoomSmartQuery = smartInput.value || "";
      return;
    }
    if (handleStudioAnnouncementInput(card, e)) return;
    const sceneNameInput = e.target.closest?.("#controlRoomSceneNameInput");
    if (sceneNameInput) {
      card._state.controlRoomSceneName = sceneNameInput.value || "";
      return;
    }
    const sourceSelect = e.target.closest?.("#controlRoomTransferSource");
    if (sourceSelect) {
      card._state.controlRoomTransferSource = sourceSelect.value || "";
      syncControlRoomTransferDefaults(card);
      syncControlRoomUi(card);
      return;
    }
    const targetSelect = e.target.closest?.("#controlRoomTransferTarget");
    if (targetSelect) {
      card._state.controlRoomTransferTarget = targetSelect.value || "";
    }
  });
  card.$("controlRoomBackdrop")?.addEventListener("input", (e) => {
    const libraryInput = e.target.closest?.("#controlRoomLibraryInput");
    if (!libraryInput) return;
    card._state.controlRoomLibraryQuery = libraryInput.value || "";
    clearTimeout(card._searchTimer);
    card._searchTimer = setTimeout(() => searchControlRoomLibrary(card, libraryInput.value || ""), 180);
  });
  card.$("controlRoomBackdrop")?.addEventListener("keydown", (e) => {
    const libraryInput = e.target.closest?.("#controlRoomLibraryInput");
    if (!libraryInput) return;
    e.stopPropagation();
  });
}
