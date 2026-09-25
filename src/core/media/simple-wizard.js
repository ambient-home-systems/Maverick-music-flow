import { isPlayerAvailable } from "../state/players.js";
import { loadScheduledStartPlaylists } from "./timers.js";

// FLOW wizard: the guided mix on the simple_wizard menu page. Three steps
// (players, music, review) over one state object in card._state.simpleWizard.
// The build token and the popup timer keep their names on the card instance
// so the disconnect cleanup can clear them.

const STEP_ORDER = ["players", "source", "review"];

export function createSimpleWizardState(overrides = {}) {
  return {
    step: "players",
    selectedPlayers: [],
    source: "genre",
    genre: "pop",
    customGenre: "",
    contentType: "playlist",
    query: "",
    candidates: [],
    selectedIndex: 0,
    loading: false,
    error: "",
    ...overrides,
  };
}

export function resetSimpleWizardState(card) {
  card._simpleWizardToken = (card._simpleWizardToken || 0) + 1;
  card._state.simpleWizard = createSimpleWizardState({ selectedPlayers: simpleWizardDefaultPlayerIds(card) });
}

export function simpleWizardPlayerPool(card) {
  card._loadPlayers();
  const players = Array.isArray(card._state.players) ? card._state.players : [];
  const pinnedEntities = new Set(card._resolvedPinnedPlayerEntities(players));
  return players
    .filter((player) => player?.entity_id)
    .filter(isPlayerAvailable)
    .filter((player) => !(typeof card._isLikelyBrowserPlayer === "function" && card._isLikelyBrowserPlayer(player)))
    .filter((player) => !card._pinnedPlayersExclusive() || !pinnedEntities.size || pinnedEntities.has(player.entity_id));
}

export function simpleWizardDefaultPlayerIds(card, players = simpleWizardPlayerPool(card)) {
  const selected = String(card._state.selectedPlayer || "").trim();
  if (selected && players.some((player) => player.entity_id === selected)) return [selected];
  const active = players.find((player) => card._isPlayerActive(player));
  return (active || players[0])?.entity_id ? [(active || players[0]).entity_id] : [];
}

function existingOrFreshState(card) {
  return card._state.simpleWizard && typeof card._state.simpleWizard === "object"
    ? card._state.simpleWizard
    : createSimpleWizardState();
}

export function simpleWizardState(card) {
  const base = existingOrFreshState(card);
  const defaults = createSimpleWizardState();
  Object.keys(defaults).forEach((key) => {
    if (base[key] === undefined) base[key] = defaults[key];
  });
  const players = simpleWizardPlayerPool(card);
  const validIds = new Set(players.map((player) => player.entity_id));
  const selectedPlayers = (Array.isArray(base.selectedPlayers) ? base.selectedPlayers : [])
    .map((entityId) => String(entityId || "").trim())
    .filter((entityId, index, list) => entityId && validIds.has(entityId) && list.indexOf(entityId) === index);
  if (!selectedPlayers.length) selectedPlayers.push(...simpleWizardDefaultPlayerIds(card, players));
  base.selectedPlayers = selectedPlayers;
  base.source = base.source === "content" ? "content" : "genre";
  base.genre = simpleWizardGenres(card).some((genre) => genre.id === base.genre) ? base.genre : "pop";
  base.contentType = simpleWizardContentTypes(card).some((type) => type.id === base.contentType) ? base.contentType : "playlist";
  card._state.simpleWizard = base;
  return base;
}

export function simpleWizardGenres(card) {
  return card._musicStyleCatalog({ includeCustom: true });
}

export function simpleWizardContentTypes(card) {
  return [
    { id: "playlist", icon: "playlist", label: card._i18n("ui.playlist"), subtitle: card._i18n("ui.play_a_saved_list") },
    { id: "artist", icon: "artist", label: card._i18n("ui.artist"), subtitle: card._i18n("ui.play_an_artist") },
    { id: "artist_radio", icon: "radio", label: card._i18n("ui.artist_radio"), subtitle: card._i18n("ui.songs_around_an_artist") },
    { id: "library_radio", icon: "radio", label: card._i18n("ui.library_radio"), subtitle: card._i18n("ui.a_radio_station") },
  ];
}

// ---------------------------------------------------------------------------
// Rendering

function simpleWizardStepIndex(step = "") {
  const index = STEP_ORDER.indexOf(step);
  return index >= 0 ? index : 0;
}

function simpleWizardProgressHtml(card, step = "players") {
  const current = simpleWizardStepIndex(step);
  const steps = [
    card._i18n("ui.players"),
    card._i18n("ui.music"),
    card._i18n("ui.play_2"),
  ];
  return `
      <div class="simple-wizard-progress" aria-hidden="true">
        ${steps.map((label, index) => `
          <span class="simple-wizard-progress-step ${index === current ? "active" : ""} ${index < current ? "done" : ""}">
            <span>${card._esc(String(index + 1))}</span>
            <strong>${card._esc(label)}</strong>
          </span>
        `).join("")}
      </div>
    `;
}

function simpleWizardSelectedPlayerNames(card, entityIds = []) {
  const ids = Array.isArray(entityIds) ? entityIds : [];
  if (ids.length > 1) return card._m(`${ids.length} players`);
  const player = card._playerByEntityId(ids[0]);
  return player?.attributes?.friendly_name || ids[0] || card._i18n("ui.selected_player_3");
}

function simpleWizardPlayersHtml(card, state) {
  const players = simpleWizardPlayerPool(card);
  const selected = new Set(state.selectedPlayers || []);
  const allSelected = players.length > 0 && players.every((player) => selected.has(player.entity_id));
  if (!players.length) {
    return `
        <div class="simple-wizard-panel">
          <div class="notice open">${card._esc(card._i18n("ui.no_players_found_yet"))}</div>
        </div>
      `;
  }
  return `
      <div class="simple-wizard-panel">
        <div class="simple-wizard-title">${card._esc(card._i18n("ui.choose_where_to_play"))}</div>
        <div class="simple-wizard-player-grid">
          <button class="simple-wizard-player ${allSelected ? "active" : ""}" data-simple-all-players="1">
            <span class="simple-wizard-player-icon">${card._iconSvg("speaker")}</span>
            <span class="simple-wizard-player-copy">
              <span class="simple-wizard-option-title">${card._esc(card._i18n("ui.all_players"))}</span>
              <span class="simple-wizard-option-sub">${card._esc(card._i18n("ui.play_everywhere"))}</span>
            </span>
            <span class="simple-wizard-check">${card._iconSvg(allSelected ? "check" : "plus")}</span>
          </button>
          ${players.map((player) => {
            const entityId = player.entity_id;
            const active = selected.has(entityId);
            const art = card._playerArtworkUrl(player, 120);
            const name = player.attributes?.friendly_name || entityId;
            const subtitle = player.attributes?.media_title || card._playerStateLabel(player);
            return `
              <button class="simple-wizard-player ${active ? "active" : ""} ${card._isPlayerActive(player) ? "is-playing" : ""}" data-simple-player="${card._esc(entityId)}">
                <span class="simple-wizard-player-art">${art ? card._imgHtml(art, "", { fallbackIcon: "speaker" }) : card._iconSvg("speaker")}</span>
                <span class="simple-wizard-player-copy">
                  <span class="simple-wizard-option-title">${card._esc(name)}</span>
                  <span class="simple-wizard-option-sub">${card._esc(subtitle || "")}</span>
                </span>
                <span class="simple-wizard-check">${card._iconSvg(active ? "check" : "plus")}</span>
              </button>
            `;
          }).join("")}
        </div>
        <div class="simple-wizard-footer single">
          <button class="simple-wizard-primary" data-simple-next="source" ${selected.size ? "" : "disabled"}>${card._esc(card._i18n("ui.continue_2"))}</button>
        </div>
      </div>
    `;
}

function simpleWizardSourceHtml(card, state) {
  const source = state.source === "content" ? "content" : "genre";
  const selectedGenre = state.genre || "pop";
  const contentType = state.contentType || "playlist";
  const customGenre = String(state.customGenre || "").trim();
  const genreOptions = simpleWizardGenres(card);
  const selectedGenreMeta = genreOptions.find((genre) => genre.id === selectedGenre) || genreOptions[0];
  return `
      <div class="simple-wizard-panel">
        <div class="simple-wizard-title">${card._esc(card._i18n("ui.choose_the_music"))}</div>
        <div class="simple-wizard-source-grid">
          <button class="simple-wizard-source ${source === "genre" ? "active" : ""}" data-simple-source="genre">
            <span>${card._iconSvg("wand")}</span>
            <strong>${card._esc(card._m("Style"))}</strong>
          </button>
          <button class="simple-wizard-source ${source === "content" ? "active" : ""}" data-simple-source="content">
            <span>${card._iconSvg("library_music")}</span>
            <strong>${card._esc(card._i18n("ui.existing_content"))}</strong>
          </button>
        </div>
        ${source === "genre" ? `
          <label class="simple-wizard-search simple-wizard-category-picker">
            <span>${card._esc(card._m("Style"))}</span>
            <select id="simpleWizardGenreSelect" class="media-sort-select settings-select simple-wizard-select" aria-label="${card._esc(card._m("Style"))}">
              ${genreOptions.map((genre) => `<option value="${card._esc(genre.id)}" ${selectedGenre === genre.id ? "selected" : ""}>${card._esc(genre.label)}</option>`).join("")}
            </select>
          </label>
          <div class="simple-wizard-option active simple-wizard-selected-option">
            <span class="simple-wizard-option-icon">${card._iconSvg(selectedGenreMeta?.icon || "wand")}</span>
            <span>
              <span class="simple-wizard-option-title">${card._esc(selectedGenreMeta?.label || "")}</span>
              <span class="simple-wizard-option-sub">${card._esc(selectedGenreMeta?.subtitle || "")}</span>
            </span>
          </div>
          ${selectedGenre === "custom" ? `
            <label class="simple-wizard-search simple-wizard-free-style">
              <span>${card._esc(card._i18n("ui.free_style"))}</span>
              <input id="simpleWizardCustomGenreInput" type="text" value="${card._esc(customGenre)}" placeholder="${card._esc(card._i18n("ui.example_quiet_jazz_greek_music_workout"))}">
            </label>
          ` : ""}
        ` : `
          <div class="simple-wizard-option-grid">
            ${simpleWizardContentTypes(card).map((type) => `
              <button class="simple-wizard-option ${contentType === type.id ? "active" : ""}" data-simple-content="${card._esc(type.id)}">
                <span class="simple-wizard-option-icon">${card._iconSvg(type.icon)}</span>
                <span>
                  <span class="simple-wizard-option-title">${card._esc(type.label)}</span>
                  <span class="simple-wizard-option-sub">${card._esc(type.subtitle)}</span>
                </span>
              </button>
            `).join("")}
          </div>
          <label class="simple-wizard-search">
            <span>${card._esc(card._i18n("ui.name_or_keyword"))}</span>
            <input id="simpleWizardQueryInput" type="text" value="${card._esc(state.query || "")}" placeholder="${card._esc(card._i18n("ui.optional_2"))}">
          </label>
        `}
        <div class="simple-wizard-footer">
          <button class="simple-wizard-secondary" data-simple-back="players">${card._esc(card._i18n("ui.back_2"))}</button>
          <button class="simple-wizard-primary" data-simple-build="1">${card._esc(card._i18n("ui.find_music"))}</button>
        </div>
      </div>
    `;
}

function simpleWizardReviewHtml(card, state) {
  if (state.loading) {
    return `
        <div class="simple-wizard-panel simple-wizard-loading">
          <div class="simple-wizard-loader">${card._iconSvg("wand")}</div>
          <div class="simple-wizard-title">${card._esc(card._i18n("ui.finding_music"))}</div>
        </div>
      `;
  }
  const candidates = Array.isArray(state.candidates) ? state.candidates : [];
  if (!candidates.length) {
    return `
        <div class="simple-wizard-panel">
          <div class="notice open">${card._esc(state.error || card._i18n("ui.no_matching_content_was_found"))}</div>
          <div class="simple-wizard-footer">
            <button class="simple-wizard-secondary" data-simple-back="source">${card._esc(card._i18n("ui.back_2"))}</button>
            <button class="simple-wizard-primary" data-simple-build="1">${card._esc(card._i18n("ui.try_again"))}</button>
          </div>
        </div>
      `;
  }
  const index = Math.max(0, Math.min(candidates.length - 1, Number(state.selectedIndex || 0)));
  const candidate = candidates[index] || candidates[0];
  const art = candidate.image || "";
  return `
      <div class="simple-wizard-panel">
        <div class="simple-wizard-title">${card._esc(card._i18n("ui.ready_to_play"))}</div>
        <div class="simple-wizard-review-card">
          <span class="simple-wizard-review-art">${art ? card._imgHtml(art, "", { fallbackIcon: candidate.media_type === "radio" ? "radio" : "playlist" }) : card._iconSvg(candidate.media_type === "radio" ? "radio" : "playlist")}</span>
          <span class="simple-wizard-review-copy">
            <span class="simple-wizard-review-kicker">${card._esc(simpleWizardSelectedPlayerNames(card, state.selectedPlayers))}</span>
            <span class="simple-wizard-review-title">${card._esc(candidate.name || card._i18n("ui.selected_music"))}</span>
            <span class="simple-wizard-review-sub">${card._esc(candidate.subtitle || simpleWizardMediaTypeLabel(card, candidate.media_type))}</span>
          </span>
        </div>
        <div class="simple-wizard-section-head">
          <span>${card._esc(card._i18n("ui.results"))}</span>
          <small>${card._esc(card._i18n("ui.choose_one_clear_option"))}</small>
        </div>
        <div class="simple-wizard-result-grid">
          ${candidates.slice(0, 8).map((item, itemIndex) => {
            const itemArt = item.image || "";
            const itemType = simpleWizardMediaTypeLabel(card, item.media_type);
            return `
            <button class="simple-wizard-result ${itemIndex === index ? "active" : ""}" data-simple-candidate="${card._esc(String(itemIndex))}">
              <span class="simple-wizard-result-art">${itemArt ? card._imgHtml(itemArt, "", { fallbackIcon: item.media_type === "radio" ? "radio" : item.media_type === "artist" ? "artist" : "playlist" }) : card._iconSvg(item.media_type === "radio" ? "radio" : item.media_type === "artist" ? "artist" : "playlist")}</span>
              <span class="simple-wizard-result-copy">
                <span class="simple-wizard-result-kicker">${card._esc(itemType)}</span>
                <span class="simple-wizard-result-title">${card._esc(item.name || card._i18n("ui.option"))}</span>
                <span class="simple-wizard-result-sub">${card._esc(item.subtitle || itemType)}</span>
              </span>
              <span class="simple-wizard-result-check">${card._iconSvg(itemIndex === index ? "check" : "plus")}</span>
            </button>
          `; }).join("")}
        </div>
        <div class="simple-wizard-footer triple">
          <button class="simple-wizard-secondary" data-simple-back="source">${card._esc(card._i18n("ui.back_2"))}</button>
          <button class="simple-wizard-secondary" data-simple-build="1">${card._esc(card._i18n("ui.refresh"))}</button>
          <button class="simple-wizard-primary" data-simple-play="1">${card._esc(card._i18n("ui.play_now"))}</button>
        </div>
      </div>
    `;
}

export function simpleWizardHtml(card) {
  const state = simpleWizardState(card);
  const step = STEP_ORDER.includes(state.step) ? state.step : "players";
  const body = step === "source"
    ? simpleWizardSourceHtml(card, state)
    : step === "review"
      ? simpleWizardReviewHtml(card, state)
      : simpleWizardPlayersHtml(card, state);
  return `
      <div class="simple-wizard-shell" data-simple-step="${card._esc(step)}">
        ${simpleWizardProgressHtml(card, step)}
        <div class="simple-wizard-toolbar">
          <button class="simple-wizard-reset-btn" data-simple-reset="1">${card._esc(card._i18n("ui.reset"))}</button>
        </div>
        ${body}
      </div>
    `;
}

// ---------------------------------------------------------------------------
// Candidates

function simpleWizardMediaTypeLabel(card, mediaType = "") {
  const type = String(mediaType || "").toLowerCase();
  if (type === "artist") return card._i18n("ui.artist");
  if (type === "radio") return card._i18n("ui.radio");
  if (type === "track") return card._i18n("ui.track");
  if (type === "album") return card._i18n("ui.album");
  return card._i18n("ui.playlist");
}

export function simpleWizardCandidateFromItem(card, item = {}, fallbackType = "playlist", options = {}) {
  let normalized = {};
  try { normalized = card._normalizeMediaItem(item) || {}; } catch (_) {}
  const uri = String(options.uri || normalized.uri || item?.uri || item?.media_item?.uri || "").trim();
  if (!uri) return null;
  const mediaType = String(options.mediaType || normalized.media_type || item?.media_type || item?.type || fallbackType || "playlist").toLowerCase();
  const name = normalized.name || item?.name || item?.title || item?.media_item?.name || uri;
  const subtitle = options.subtitle
    || card._artistName(item)
    || normalized.artist
    || item?.artist
    || item?.artist_str
    || item?.album?.name
    || item?.metadata?.description
    || simpleWizardMediaTypeLabel(card, mediaType);
  const image = card._artUrl(item)
    || normalized.image
    || item?.image
    || item?.image_url
    || item?.media_item?.image
    || item?.media_item?.album?.image
    || "";
  return {
    uri,
    media_type: mediaType,
    name,
    subtitle,
    image,
    radioMode: !!options.radioMode,
  };
}

function simpleWizardUniqueCandidates(candidates = []) {
  const seen = new Set();
  return (Array.isArray(candidates) ? candidates : []).filter((candidate) => {
    const uri = String(candidate?.uri || "").trim();
    if (!uri || seen.has(uri)) return false;
    seen.add(uri);
    return true;
  });
}

export async function simpleWizardFindCandidates(card, state = simpleWizardState(card)) {
  const out = [];
  const addGroup = (items = [], mediaType = "playlist", options = {}) => {
    (Array.isArray(items) ? items : []).forEach((item) => {
      const candidate = simpleWizardCandidateFromItem(card, item, mediaType, options);
      if (candidate) out.push(candidate);
    });
  };
  const finish = () => card._shuffleDiscoveryItems(simpleWizardUniqueCandidates(out), Date.now() + (card._simpleWizardToken || 0)).slice(0, 8);
  if (state.source !== "content") {
    const genre = simpleWizardGenres(card).find((item) => item.id === state.genre) || simpleWizardGenres(card)[0];
    const customQuery = String(state.customGenre || "").trim();
    const searchLabel = genre.id === "custom" && customQuery ? customQuery : genre.label;
    const queries = genre.id === "custom" && customQuery ? [customQuery] : (genre.queries || [genre.label]);
    for (const query of queries.slice(0, 3)) {
      try {
        const results = await card._search(query);
        addGroup(results.playlists, "playlist", { subtitle: searchLabel });
        addGroup(results.tracks, "track", { subtitle: searchLabel });
        addGroup(results.albums, "album", { subtitle: searchLabel });
        addGroup(results.radio, "radio", { subtitle: searchLabel });
      } catch (_) {}
      if (simpleWizardUniqueCandidates(out).length >= 8) break;
    }
    if (!out.length) {
      const fallbacks = await Promise.allSettled([
        card._fetchLibrary("playlist", "random", 18, false),
        card._fetchLibrary("album", "random", 12, false),
        card._fetchLibrary("radio", "random", 12, false),
      ]);
      fallbacks.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        addGroup(result.value, index === 1 ? "album" : index === 2 ? "radio" : "playlist", { subtitle: searchLabel });
      });
    }
    return finish();
  }

  const query = String(state.query || "").trim();
  const type = state.contentType || "playlist";
  if (type === "library_radio") {
    if (query) {
      try {
        const results = await card._search(query);
        addGroup(results.radio, "radio");
      } catch (_) {}
      try {
        const stations = await card._fetchRadioBrowserStations(query, 18, { countryCode: card._mobileRadioBrowserCountry() || "all" });
        addGroup(stations, "radio");
      } catch (_) {}
    } else {
      const radios = await Promise.allSettled([
        card._fetchLibrary("radio", "sort_name", 80, true),
        card._fetchLibrary("radio", "random", 80, false),
        card._fetchRadioBrowserStations("", 30, { countryCode: card._mobileRadioBrowserCountry() || "all" }),
      ]);
      radios.forEach((result) => {
        if (result.status === "fulfilled") addGroup(result.value, "radio");
      });
    }
    return finish();
  }

  if (type === "artist" || type === "artist_radio") {
    const artistOptions = {
      subtitle: type === "artist_radio" ? card._i18n("ui.artist_radio") : card._i18n("ui.artist"),
      radioMode: type === "artist_radio",
      mediaType: "artist",
    };
    if (query) {
      try {
        const results = await card._search(query);
        addGroup(results.artists, "artist", artistOptions);
      } catch (_) {}
    } else {
      try {
        const artists = await card._fetchLibrary("artist", "sort_name", 80, false);
        addGroup(artists, "artist", artistOptions);
      } catch (_) {}
    }
    return finish();
  }

  if (query) {
    try {
      const results = await card._search(query);
      addGroup(results.playlists, "playlist");
    } catch (_) {}
  } else {
    const playlists = await Promise.allSettled([
      loadScheduledStartPlaylists(card),
      card._fetchLibrary("playlist", "sort_name", 120, true),
      card._fetchLibrary("playlist", "random", 80, false),
    ]);
    playlists.forEach((result) => {
      if (result.status === "fulfilled") addGroup(result.value, "playlist");
    });
  }
  return finish();
}

export async function simpleWizardBuildCandidates(card, sourceEl = null) {
  const state = simpleWizardState(card);
  const queryInput = card.$("simpleWizardQueryInput");
  const genreSelect = card.$("simpleWizardGenreSelect");
  const customGenreInput = card.$("simpleWizardCustomGenreInput");
  if (queryInput) state.query = queryInput.value || "";
  if (genreSelect) state.genre = simpleWizardGenres(card).some((genre) => genre.id === genreSelect.value) ? genreSelect.value : state.genre;
  if (customGenreInput) state.customGenre = customGenreInput.value || "";
  if (!state.selectedPlayers?.length) {
    state.step = "players";
    card._toastError(card._i18n("ui.choose_at_least_one_player"));
    await card._renderMobileMenu();
    return;
  }
  if (state.source !== "content" && state.genre === "custom" && !String(state.customGenre || "").trim()) {
    state.step = "source";
    card._toastError(card._i18n("ui.type_a_free_style_first"));
    await card._renderMobileMenu();
    return;
  }
  if (sourceEl) card._flashInteraction(sourceEl);
  const token = ++card._simpleWizardToken;
  state.step = "review";
  state.loading = true;
  state.error = "";
  state.candidates = [];
  state.selectedIndex = 0;
  await card._renderMobileMenu();
  try {
    const candidates = await simpleWizardFindCandidates(card, state);
    if (token !== card._simpleWizardToken) return;
    state.candidates = candidates;
    state.error = candidates.length ? "" : card._i18n("ui.no_matching_content_was_found");
  } catch (error) {
    if (token !== card._simpleWizardToken) return;
    state.candidates = [];
    state.error = error?.message || card._i18n("ui.could_not_find_music");
  } finally {
    if (token === card._simpleWizardToken) {
      state.loading = false;
      await card._renderMobileMenu();
    }
  }
}

// ---------------------------------------------------------------------------
// Playback

export function showSimpleWizardPopup(card, candidate = {}, entityIds = []) {
  const host = card.$("surprisePopup");
  if (!host) return;
  const targetName = simpleWizardSelectedPlayerNames(card, entityIds);
  const art = candidate.image || "";
  host.innerHTML = `
      <div class="surprise-popup-card simple-wizard-popup-card">
        <div class="surprise-popup-player">${card._esc(card._i18n("ui.playing_on_2"))}: ${card._esc(targetName)}</div>
        <div class="surprise-popup-art">${art ? card._imgHtml(art, "", { loading: "eager", fetchpriority: "high", fallbackIcon: "album" }) : card._iconSvg("wand")}</div>
        <div class="surprise-popup-title">${card._esc(candidate.name || card._i18n("ui.selected_music"))}</div>
      </div>
    `;
  host.classList.add("open", "simple-wizard-popup");
  clearTimeout(card._simpleWizardPopupTimer);
  card._simpleWizardPopupTimer = setTimeout(() => {
    host.classList.remove("open", "simple-wizard-popup");
  }, 1700);
}

export async function simpleWizardPlay(card, sourceEl = null) {
  const state = simpleWizardState(card);
  const candidates = Array.isArray(state.candidates) ? state.candidates : [];
  const index = Math.max(0, Math.min(candidates.length - 1, Number(state.selectedIndex || 0)));
  const candidate = candidates[index];
  if (!candidate?.uri) {
    await simpleWizardBuildCandidates(card, sourceEl);
    return;
  }
  const targets = [...new Set((state.selectedPlayers || []).filter((entityId) => card._playerByEntityId(entityId)))];
  if (!targets.length) {
    state.step = "players";
    await card._renderMobileMenu();
    card._toastError(card._i18n("ui.choose_at_least_one_player"));
    return;
  }
  if (sourceEl) card._flashInteraction(sourceEl);
  const primaryId = targets[0];
  if (targets.length > 1) {
    try {
      const joined = await card._applySpeakerGroupFor(primaryId, targets.slice(1));
      if (!joined) {
        card._toastError(card._i18n("ui.select_at_least_two_players_to_create_a_group"));
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    } catch (error) {
      card._toastError(error?.message || card._i18n("ui.queue_action_failed"));
      return;
    }
  }
  const ok = await card._playMediaOnPlayers([primaryId], candidate.uri, candidate.media_type || "playlist", "play", {
    label: candidate.name || "",
    silent: true,
    radioMode: !!candidate.radioMode,
  });
  if (!ok) {
    card._toastError(card._i18n("ui.could_not_start_playback"));
    return;
  }
  card._selectPlayer(primaryId, true);
  showSimpleWizardPopup(card, candidate, targets);
  card._timeout(() => {
    card._closeMobileMenu();
    card._syncNowPlayingUI();
  }, 1750);
}

// ---------------------------------------------------------------------------
// Events

const BUTTON_SELECTOR = "[data-simple-reset], [data-simple-player], [data-simple-all-players], [data-simple-next], [data-simple-back], [data-simple-source], [data-simple-content], [data-simple-build], [data-simple-candidate], [data-simple-play]";

export async function handleSimpleWizardClick(card, e) {
  const root = e.target.closest?.(".simple-wizard-shell");
  if (!root) return false;
  const button = e.target.closest?.(BUTTON_SELECTOR);
  if (!button) return false;
  e.preventDefault();
  e.stopPropagation();
  const state = simpleWizardState(card);
  if (button.dataset.simpleReset !== undefined) {
    resetSimpleWizardState(card);
    await card._renderMobileMenu();
    return true;
  }
  if (button.dataset.simpleAllPlayers !== undefined) {
    const players = simpleWizardPlayerPool(card);
    const ids = players.map((player) => player.entity_id);
    const selected = new Set(state.selectedPlayers || []);
    state.selectedPlayers = ids.length && ids.every((id) => selected.has(id)) ? simpleWizardDefaultPlayerIds(card, players) : ids;
    state.candidates = [];
    await card._renderMobileMenu();
    return true;
  }
  if (button.dataset.simplePlayer) {
    const entityId = button.dataset.simplePlayer;
    const selected = new Set(state.selectedPlayers || []);
    if (selected.has(entityId)) {
      if (selected.size <= 1) {
        card._toastError(card._i18n("ui.choose_at_least_one_player"));
        return true;
      }
      selected.delete(entityId);
    } else selected.add(entityId);
    state.selectedPlayers = Array.from(selected);
    state.candidates = [];
    await card._renderMobileMenu();
    return true;
  }
  if (button.dataset.simpleNext) {
    if (button.dataset.simpleNext === "source" && !state.selectedPlayers?.length) {
      card._toastError(card._i18n("ui.choose_at_least_one_player"));
      return true;
    }
    state.step = button.dataset.simpleNext;
    await card._renderMobileMenu();
    return true;
  }
  if (button.dataset.simpleBack) {
    state.step = button.dataset.simpleBack;
    await card._renderMobileMenu();
    return true;
  }
  if (button.dataset.simpleSource) {
    state.source = button.dataset.simpleSource === "content" ? "content" : "genre";
    state.candidates = [];
    state.selectedIndex = 0;
    await card._renderMobileMenu();
    return true;
  }
  if (button.dataset.simpleContent) {
    state.contentType = button.dataset.simpleContent;
    state.candidates = [];
    state.selectedIndex = 0;
    await card._renderMobileMenu();
    return true;
  }
  if (button.dataset.simpleBuild !== undefined) {
    await simpleWizardBuildCandidates(card, button);
    return true;
  }
  if (button.dataset.simpleCandidate !== undefined) {
    state.selectedIndex = Math.max(0, Number(button.dataset.simpleCandidate) || 0);
    await card._renderMobileMenu();
    return true;
  }
  if (button.dataset.simplePlay !== undefined) {
    await simpleWizardPlay(card, button);
    return true;
  }
  return false;
}

export async function handleSimpleWizardChange(card, e) {
  const id = e.target?.id;
  if (id === "simpleWizardQueryInput") {
    const state = existingOrFreshState(card);
    state.query = e.target.value || "";
    card._state.simpleWizard = state;
    return true;
  }
  if (id === "simpleWizardGenreSelect") {
    const state = existingOrFreshState(card);
    state.genre = simpleWizardGenres(card).some((genre) => genre.id === e.target.value) ? e.target.value : "pop";
    state.candidates = [];
    state.selectedIndex = 0;
    card._state.simpleWizard = state;
    await card._renderMobileMenu();
    return true;
  }
  if (id === "simpleWizardCustomGenreInput") {
    const state = existingOrFreshState(card);
    state.customGenre = e.target.value || "";
    card._state.simpleWizard = state;
    return true;
  }
  return false;
}
