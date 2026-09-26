import {
  extractVoiceAssistantMusicQuery,
  normalizeVoiceCommandText,
  voiceAssistantAliasIndex,
  voiceAssistantBestCandidate as bestCandidateOf,
  voiceAssistantCanonicalMediaType,
  voiceAssistantFocusedMusicQuery,
  voiceAssistantRankedCandidates as rankedCandidatesOf,
  voiceAssistantRequestedMediaType,
  voiceAssistantVolumeIntent,
  voiceCommandHasAny,
} from "../voice-assistant-matching.js";
import { normalizeVoiceAssistantMode } from "../state/mobile-settings.js";
import { isPlayerAvailable } from "../state/players.js";
import { resetScreensaverTimer } from "./screensaver.js";

// Voice: the Flow Assistant command with its dialog and intents, the smart
// voice search with its confirm sheet, and the studio library voice input.
// All three share the browser's speech recognition. Recognition handles and
// timers live on the card instance so the disconnect cleanup can clear them.
// The screensaver reaches the enabled flag, the label and the command starter
// through a small facade on the card, which keeps this module the only one of
// the two importing the other.

const MIC_BUTTON_SELECTOR = "#mobileVoiceAssistantBtn, #emptyVoiceAssistantBtn, #screensaverVoiceBtn";
const SMART_VOICE_COUNTDOWN = 5;

// ---------------------------------------------------------------------------
// Shared speech input

export function speechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function flowAssistantLabel(card) {
  return card._i18n("ui.flow_assistant", {}, "FLOW ASSISTANT") || "FLOW ASSISTANT";
}

function flowAssistantResponseTimeoutMs(card) {
  return card._clampedConfigNumber("flow_assistant_response_timeout_ms", 18000, { min: 5000, max: 60000 });
}

function flowAssistantListenTimeoutMs(card) {
  return card._clampedConfigNumber("flow_assistant_listen_timeout_ms", 12000, { min: 5000, max: 30000 });
}

function flowAssistantAutoCloseMs(card, status = "success") {
  const fallback = String(status || "").toLowerCase() === "error" ? 7000 : 4200;
  return card._clampedConfigNumber("flow_assistant_auto_close_ms", fallback, { min: 0, max: 30000 });
}

function voiceAssistantRecognitionLanguage() {
  try {
    const languages = Array.isArray(window.navigator?.languages)
      ? window.navigator.languages
      : [window.navigator?.language || ""];
    if (languages.some((language) => String(language || "").toLowerCase().startsWith("he"))) return "he-IL";
  } catch (_) {}
  return "en-US";
}

function voiceAssistantAssistLanguage() {
  return voiceAssistantRecognitionLanguage().toLowerCase().startsWith("he") ? "he" : "en";
}

// ---------------------------------------------------------------------------
// Settings

export function voiceAssistantEnabled(card) {
  return card._state.voiceAssistantEnabled === true;
}

export function voiceAssistantMode(card) {
  return normalizeVoiceAssistantMode(card._state.voiceAssistantMode);
}

export function voiceAssistantAgentId(card) {
  return String(card._state.voiceAssistantAgentId || "").trim();
}

export function voiceAssistantSpeakFeedbackEnabled(card) {
  return card._state.voiceAssistantSpeakFeedback === true;
}

function voiceAssistantAgentOptions(card) {
  const options = [{
    value: "",
    label: card._i18n("ui.default_assist_agent"),
  }];
  const current = voiceAssistantAgentId(card);
  const states = Object.values(card._hass?.states || {})
    .filter((entity) => entity?.entity_id?.startsWith?.("conversation."))
    .map((entity) => ({
      value: entity.entity_id,
      label: entity.attributes?.friendly_name || entity.entity_id,
    }))
    .sort((left, right) => String(left.label).localeCompare(String(right.label), undefined, { sensitivity: "base" }));
  states.forEach((option) => {
    if (!options.some((item) => item.value === option.value)) options.push(option);
  });
  if (current && !options.some((item) => item.value === current)) {
    options.push({ value: current, label: current });
  }
  return options;
}

export function voiceAssistantSettingsSectionHtml(card) {
  const enabled = voiceAssistantEnabled(card);
  const mode = voiceAssistantMode(card);
  const speakFeedback = voiceAssistantSpeakFeedbackEnabled(card);
  const agentOptions = voiceAssistantAgentOptions(card);
  return `
        <div class="settings-group voice-assistant-settings-card">
          <div class="settings-label">${flowAssistantLabel(card)}</div>
          <div class="settings-pills">
            ${card._settingsPill(card._i18n("ui.enabled"), "on", enabled ? "on" : "off", "data-setting-voice-assistant")}
            ${card._settingsPill(card._i18n("ui.disabled"), "off", enabled ? "on" : "off", "data-setting-voice-assistant")}
          </div>
          <div class="settings-label">${card._i18n("ui.voice_assistant_mode")}</div>
          <div class="settings-pills">
            ${card._settingsPill(card._i18n("ui.hybrid_music_plus_assist"), "hybrid", mode, "data-setting-voice-assistant-mode")}
            ${card._settingsPill(card._i18n("ui.music_only"), "music", mode, "data-setting-voice-assistant-mode")}
            ${card._settingsPill(card._i18n("ui.assist_only"), "assist", mode, "data-setting-voice-assistant-mode")}
          </div>
          <div class="settings-hint">${card._i18n("ui.hybrid_handles_music_locally_and_sends_unknown_commands_to_assist")}</div>
          <div class="settings-label">${card._i18n("ui.assist_agent")}</div>
          <select class="media-sort-select settings-select" id="voiceAssistantAgentSelect" aria-label="${card._esc(card._i18n("ui.assist_agent"))}">
            ${agentOptions.map((option) => `
              <option value="${card._esc(option.value)}" ${option.value === voiceAssistantAgentId(card) ? "selected" : ""}>${card._esc(option.label)}</option>
            `).join("")}
          </select>
          <div class="settings-hint">${card._i18n("ui.optional_assist_agent_leave_empty_for_home_assistant_default")}</div>
          <div class="settings-label">${card._i18n("ui.voice_feedback")}</div>
          <div class="settings-pills">
            ${card._settingsPill(card._i18n("ui.enabled"), "on", speakFeedback ? "on" : "off", "data-setting-voice-feedback")}
            ${card._settingsPill(card._i18n("ui.disabled"), "off", speakFeedback ? "on" : "off", "data-setting-voice-feedback")}
          </div>
          <div class="settings-hint">${card._i18n("ui.speak_voice_assistant_responses_out_loud")}</div>
        </div>`;
}

export function handleVoiceSettingsClick(card, eventTarget) {
  const voiceAssistantBtn = eventTarget.closest("[data-setting-voice-assistant]");
  if (voiceAssistantBtn?.dataset.settingVoiceAssistant) {
    card._flashInteraction(voiceAssistantBtn);
    card._state.voiceAssistantEnabled = voiceAssistantBtn.dataset.settingVoiceAssistant === "on";
    if (!card._state.voiceAssistantEnabled) stopVoiceAssistantRecognition(card);
    card._persistMobileAppearance();
    card._reopenSettingsMenuPreservingScroll({ rebuild: true, init: true });
    return true;
  }
  const voiceAssistantModeBtn = eventTarget.closest("[data-setting-voice-assistant-mode]");
  if (voiceAssistantModeBtn?.dataset.settingVoiceAssistantMode) {
    card._flashInteraction(voiceAssistantModeBtn);
    card._state.voiceAssistantMode = normalizeVoiceAssistantMode(voiceAssistantModeBtn.dataset.settingVoiceAssistantMode);
    card._persistMobileAppearance();
    card._reopenSettingsMenuPreservingScroll();
    return true;
  }
  const voiceFeedbackBtn = eventTarget.closest("[data-setting-voice-feedback]");
  if (voiceFeedbackBtn?.dataset.settingVoiceFeedback) {
    card._flashInteraction(voiceFeedbackBtn);
    card._state.voiceAssistantSpeakFeedback = voiceFeedbackBtn.dataset.settingVoiceFeedback === "on";
    card._persistMobileAppearance();
    card._reopenSettingsMenuPreservingScroll();
    return true;
  }
  return false;
}

export function handleVoiceSettingsChange(card, e) {
  if (e.target?.id === "voiceAssistantAgentSelect") {
    card._state.voiceAssistantAgentId = String(e.target.value || "").trim();
    card._persistMobileAppearance();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Players, aliases and intents

function voiceAssistantPlayerPool(card) {
  card._loadPlayers();
  return (card._state.players || [])
    .filter(isPlayerAvailable)
    .filter((player) => card._isMusicAssistantPlayer(player))
    .filter((player) => !card._isLikelyBrowserPlayer(player) || card._isLocalSendspinPlayer(player))
    .filter((player) => card._isAvailableThisDevicePlayer(player));
}

function voiceAssistantPlayerAliases(player = null) {
  if (!player) return [];
  const attrs = player.attributes || {};
  const raw = player.__maverickRawPlayer || {};
  const candidates = [
    player.entity_id,
    String(player.entity_id || "").replace(/^media_player\./, "").replace(/_/g, " "),
    attrs.friendly_name,
    attrs.name,
    attrs.display_name,
    attrs.mass_player_id,
    attrs.player_id,
    raw.name,
    raw.display_name,
    raw.friendly_name,
  ];
  const aliases = [];
  candidates.forEach((value) => {
    const alias = normalizeVoiceCommandText(value);
    if (!alias || alias.length < 2) return;
    if (["media player", "music assistant", "homeii direct", "homeii flow"].includes(alias)) return;
    if (!aliases.includes(alias)) aliases.push(alias);
  });
  return aliases.sort((left, right) => right.length - left.length);
}

export function voiceAssistantMentionedPlayers(card, transcript = "") {
  const normalized = normalizeVoiceCommandText(transcript);
  if (!normalized) return [];
  const matches = [];
  voiceAssistantPlayerPool(card).forEach((player) => {
    voiceAssistantPlayerAliases(player).forEach((alias) => {
      const index = voiceAssistantAliasIndex(normalized, alias);
      if (index < 0) return;
      matches.push({ player, alias, index, end: index + alias.length });
    });
  });
  const ranges = [];
  const seen = new Set();
  return matches
    .sort((left, right) => left.index - right.index || right.alias.length - left.alias.length)
    .filter((match) => {
      if (!match.player?.entity_id || seen.has(match.player.entity_id)) return false;
      const overlaps = ranges.some(([start, end]) => match.index < end && match.end > start);
      if (overlaps) return false;
      seen.add(match.player.entity_id);
      ranges.push([match.index, match.end]);
      return true;
    })
    .map((match) => match.player);
}

function voiceAssistantDefaultPlayer(card, excludeEntityIds = [], { allowIdle = false } = {}) {
  const excluded = new Set((Array.isArray(excludeEntityIds) ? excludeEntityIds : []).filter(Boolean));
  const players = voiceAssistantPlayerPool(card);
  const selected = card._getSelectedPlayer();
  if (selected?.entity_id && !excluded.has(selected.entity_id) && players.some((player) => player.entity_id === selected.entity_id)) return selected;
  return players.find((player) => player.state === "playing" && !excluded.has(player.entity_id))
    || (allowIdle ? players.find((player) => !excluded.has(player.entity_id)) : null)
    || null;
}

function resolveVoiceAssistantTarget(card, transcript = "") {
  const normalized = normalizeVoiceCommandText(transcript);
  const players = voiceAssistantPlayerPool(card);
  const explicit = players.find((player) => voiceAssistantPlayerAliases(player)
    .some((alias) => normalized.includes(alias)));
  if (explicit) return { player: explicit, explicit: true };
  const selected = card._getSelectedPlayer();
  if (selected && players.some((player) => player.entity_id === selected.entity_id)) {
    return { player: selected, explicit: false };
  }
  return {
    player: players.find((player) => player.state === "playing") || players[0] || null,
    explicit: false,
  };
}

export function voiceAssistantQueueIntent(card, transcript = "") {
  const normalized = normalizeVoiceCommandText(transcript);
  if (!normalized) return null;
  const hasQueueWord = voiceCommandHasAny(normalized, ["queue", "current queue", "play queue", "music queue"]);
  const hasTransferWord = voiceCommandHasAny(normalized, ["transfer", "move", "send", "move queue", "transfer queue"]);
  const mentioned = voiceAssistantMentionedPlayers(card, transcript);
  if (!hasTransferWord || (!hasQueueWord && mentioned.length < 2)) return null;
  let sourcePlayer = null;
  let targetPlayer = null;
  if (mentioned.length >= 2) {
    sourcePlayer = mentioned[0];
    targetPlayer = mentioned[1];
  } else if (mentioned.length === 1) {
    targetPlayer = mentioned[0];
    sourcePlayer = voiceAssistantDefaultPlayer(card, [targetPlayer.entity_id]);
  }
  return {
    type: "queue_transfer",
    sourcePlayerId: sourcePlayer?.entity_id || "",
    targetPlayerId: targetPlayer?.entity_id || "",
  };
}

export function voiceAssistantSpeakerGroupIntent(card, transcript = "") {
  const normalized = normalizeVoiceCommandText(transcript);
  if (!normalized) return null;
  const mentioned = voiceAssistantMentionedPlayers(card, transcript);
  const hasSpeakerWord = voiceCommandHasAny(normalized, ["speaker", "speakers", "player", "players", "room", "rooms"]);
  const hasGroupWord = voiceCommandHasAny(normalized, ["group", "group speakers", "join", "connect speakers", "link speakers", "ungroup", "disconnect group", "speaker group"]);
  const hasDisconnectWord = voiceCommandHasAny(normalized, ["ungroup", "disconnect group", "disconnect speakers", "unjoin", "clear group"]);
  const hasConnectWord = voiceCommandHasAny(normalized, ["group", "join", "connect", "link", "pair", "activate speakers", "start speakers"]);
  const allGroups = voiceCommandHasAny(normalized, ["all groups", "all speakers", "all players"]);
  const speakerCountHint = voiceCommandHasAny(normalized, ["two speakers", "2 speakers"]);
  if (hasDisconnectWord && (hasGroupWord || hasSpeakerWord || allGroups || mentioned.length)) {
    if (allGroups) return { type: "group_disconnect_all" };
    const player = mentioned[0] || voiceAssistantDefaultPlayer(card);
    return { type: "group_disconnect", playerId: player?.entity_id || "" };
  }
  if (!hasConnectWord || (!hasGroupWord && !hasSpeakerWord && !speakerCountHint && mentioned.length < 2)) return null;
  let primaryPlayer = null;
  let memberPlayers = [];
  if (mentioned.length >= 2) {
    primaryPlayer = mentioned[0];
    memberPlayers = mentioned.slice(1);
  } else if (mentioned.length === 1) {
    primaryPlayer = voiceAssistantDefaultPlayer(card, [mentioned[0].entity_id]);
    memberPlayers = primaryPlayer ? [mentioned[0]] : [];
  }
  return {
    type: "group_connect",
    primaryPlayerId: primaryPlayer?.entity_id || "",
    memberPlayerIds: memberPlayers.map((player) => player?.entity_id).filter(Boolean),
  };
}

export function voiceAssistantCommandIntent(card, transcript = "", player = null, { forceMusic = false } = {}) {
  const normalized = normalizeVoiceCommandText(transcript);
  if (!normalized) return { type: "unknown" };
  const queueIntent = voiceAssistantQueueIntent(card, transcript);
  if (queueIntent) return queueIntent;
  const speakerGroupIntent = voiceAssistantSpeakerGroupIntent(card, transcript);
  if (speakerGroupIntent) return speakerGroupIntent;
  const volumeIntent = voiceAssistantVolumeIntent(normalized);
  if (volumeIntent) return volumeIntent;
  if (voiceCommandHasAny(normalized, ["next", "skip"])) return { type: "next" };
  if (voiceCommandHasAny(normalized, ["previous", "back", "last song"])) return { type: "previous" };
  if (voiceCommandHasAny(normalized, ["pause", "hold"])) return { type: "pause" };
  if (voiceCommandHasAny(normalized, ["stop", "turn off music"])) return { type: "stop" };
  if (voiceCommandHasAny(normalized, ["resume", "continue", "play music"])) return { type: "resume" };
  const hasMusicVerb = voiceCommandHasAny(normalized, [
    "play",
    "put on",
    "listen to",
    "start music",
  ]);
  if (hasMusicVerb || forceMusic) {
    const query = extractVoiceAssistantMusicQuery(transcript, voiceAssistantPlayerAliases(player));
    return query ? { type: "music", query } : { type: "resume" };
  }
  return { type: "unknown" };
}

// ---------------------------------------------------------------------------
// Music matching

function normalizeSmartVoiceCandidates(card, results = {}) {
  const order = [
    ["playlists", "playlist"],
    ["tracks", "track"],
    ["albums", "album"],
    ["artists", "artist"],
    ["radio", "radio"],
    ["podcasts", "podcast"],
  ];
  const items = [];
  order.forEach(([groupKey, mediaType]) => {
    const group = Array.isArray(results?.[groupKey]) ? results[groupKey] : [];
    group.forEach((item) => {
      const uri = String(item?.uri || item?.media_item?.uri || "").trim();
      if (!uri) return;
      const mediaItem = item?.media_item || {};
      const artist = card._artistName(item)
        || card._artistName(mediaItem)
        || item?.artist
        || item?.artist_str
        || item?.media_artist
        || mediaItem?.artist
        || mediaItem?.artist_str
        || mediaItem?.media_artist
        || "";
      items.push({
        uri,
        media_type: voiceAssistantCanonicalMediaType(item?.media_type || item?.type || mediaType, mediaType),
        name: item?.name || item?.title || mediaItem?.name || mediaItem?.title || uri,
        artist,
        album: item?.album?.name || item?.album || mediaItem?.album?.name || mediaItem?.album || "",
        image: card._artUrl(item) || item?.image || item?.image_url || mediaItem?.image || mediaItem?.image_url || "",
        _maverickVoiceFocused: item?._maverickVoiceFocused === true,
      });
    });
  });
  return items;
}

async function voiceAssistantFocusedMusicSearch(card, query = "", mediaType = "track") {
  const safeQuery = String(query || "").trim();
  const type = voiceAssistantCanonicalMediaType(mediaType, "track");
  if (!safeQuery) return card._emptySearchResults();
  try {
    const raw = await card._callService("search", { name: safeQuery, query: safeQuery, limit: 30, media_type: [type] });
    return card._normalizeSearchResponse(raw);
  } catch (_) {
    try {
      const raw2 = await card._callService("search", { name: safeQuery, limit: 30, media_type: type });
      return card._normalizeSearchResponse(raw2);
    } catch (_) {}
  }
  return card._emptySearchResults();
}

function markVoiceAssistantFocusedResults(card, results = {}) {
  const out = card._emptySearchResults();
  Object.keys(out).forEach((group) => {
    out[group] = (Array.isArray(results?.[group]) ? results[group] : [])
      .map((item) => ({ ...item, _maverickVoiceFocused: true }));
  });
  return out;
}

function voiceAssistantRankedCandidates(card, results = {}, query = "") {
  return rankedCandidatesOf(normalizeSmartVoiceCandidates(card, results), query);
}

export function voiceAssistantBestCandidate(card, results = {}, query = "") {
  return bestCandidateOf(normalizeSmartVoiceCandidates(card, results), query);
}

export async function playVoiceAssistantMusic(card, query = "", player = null) {
  const target = player || card._getSelectedPlayer();
  if (!target?.entity_id) {
    const message = card._i18n("ui.voice_command_no_player");
    card._toastError(message);
    return { handled: true, ok: false, message };
  }
  const safeQuery = String(query || "").trim();
  if (!safeQuery) {
    const message = card._i18n("ui.voice_command_not_understood");
    card._toastError(message);
    return { handled: true, ok: false, message };
  }
  card._toast(card._i18n("ui.voice_music_searching", { query: safeQuery }));
  try {
    let results = card._emptySearchResults();
    try {
      results = await card._search(safeQuery);
    } catch (error) {
      card._debugLog?.("warn", "[Maverick Music Voice] Music search failed", { query: safeQuery, error });
    }
    const requested = voiceAssistantRequestedMediaType(safeQuery);
    const focusedQuery = voiceAssistantFocusedMusicQuery(safeQuery);
    const focusedType = voiceAssistantCanonicalMediaType(requested?.type || "track", "track");
    if (!card._hasSearchResults(results) && focusedQuery && focusedType) {
      const focusedResults = await voiceAssistantFocusedMusicSearch(card, focusedQuery, focusedType);
      results = card._mergeSearchResults(markVoiceAssistantFocusedResults(card, focusedResults), results);
    }
    const rankedCandidates = voiceAssistantRankedCandidates(card, results, safeQuery);
    const candidate = rankedCandidates.find((match) => match.accepted && match.candidate?.uri)?.candidate
      || rankedCandidates.find((match) => match.candidate?.uri)?.candidate
      || normalizeSmartVoiceCandidates(card, results).find((item) => item?.uri)
      || null;
    if (!candidate?.uri) {
      const message = card._i18n("ui.no_matching_content_was_found");
      card._toastError(message);
      return { handled: true, ok: false, message };
    }
    if (target.entity_id !== card._state.selectedPlayer) card._selectPlayer(target.entity_id, true);
    const title = candidate.name || safeQuery;
    updateVoiceAssistantDialog(card, { status: "processing", response: card._i18n("ui.voice_starting_playback", { title }) });
    const mediaType = voiceAssistantCanonicalMediaType(candidate.media_type || focusedType, focusedType);
    const played = await card._playMediaOnPlayer(target.entity_id, candidate.uri, mediaType, "play", {
      label: title,
      silent: true,
    });
    if (!played) {
      const message = card._i18n("ui.could_not_play_label", { label: title });
      card._toastError(message);
      return { handled: true, ok: false, message };
    }
    return {
      handled: true,
      ok: true,
      message: card._i18n("ui.voice_playing_result", { title }),
      autoCloseMs: 1400,
    };
  } catch (error) {
    const message = error?.message || card._i18n("ui.voice_command_failed");
    card._toastError(message);
    return { handled: true, ok: false, message };
  }
}

// ---------------------------------------------------------------------------
// Command runners and the Assist bridge

async function runVoiceAssistantPlayerManagementCommand(card, intent = {}) {
  const type = String(intent?.type || "");
  if (!["queue_transfer", "group_connect", "group_disconnect", "group_disconnect_all"].includes(type)) return null;
  try {
    if (type === "queue_transfer") {
      const sourcePlayerId = String(intent.sourcePlayerId || "").trim();
      const targetPlayerId = String(intent.targetPlayerId || "").trim();
      if (!sourcePlayerId || !targetPlayerId || sourcePlayerId === targetPlayerId) {
        const message = card._i18n("ui.voice_queue_transfer_needs_players");
        card._toastError(message);
        return { handled: true, ok: false, message };
      }
      const ok = await card._transferQueueBetween(sourcePlayerId, targetPlayerId, { silent: true });
      const source = card._controlRoomPlayerName(sourcePlayerId);
      const target = card._controlRoomPlayerName(targetPlayerId);
      const message = ok
        ? card._i18n("ui.voice_queue_transferred_between", { source, target })
        : card._i18n("ui.queue_action_failed");
      (ok ? card._toastSuccess : card._toastError).call(card, message);
      return { handled: true, ok, message, autoCloseMs: ok ? 1400 : 0 };
    }
    if (type === "group_connect") {
      const primaryPlayerId = String(intent.primaryPlayerId || "").trim();
      const memberPlayerIds = [...new Set((Array.isArray(intent.memberPlayerIds) ? intent.memberPlayerIds : []).filter((id) => id && id !== primaryPlayerId))];
      if (!primaryPlayerId || !memberPlayerIds.length) {
        const message = card._i18n("ui.voice_group_connect_needs_players");
        card._toastError(message);
        return { handled: true, ok: false, message };
      }
      const grouped = await card._applySpeakerGroupFor(primaryPlayerId, memberPlayerIds);
      if (!grouped) {
        const message = card._i18n("ui.select_at_least_two_players_to_create_a_group");
        card._toastError(message);
        return { handled: true, ok: false, message };
      }
      const primary = card._controlRoomPlayerName(primaryPlayerId);
      const members = memberPlayerIds.map((entityId) => card._controlRoomPlayerName(entityId)).join(", ");
      const message = card._i18n("ui.voice_group_connected_players", { primary, members });
      card._toastSuccess(message);
      card._timeout(() => {
        card._loadPlayers();
        card._refreshGroupingState();
        if (card._state.menuOpen) card._renderMobileMenu();
      }, 550);
      return { handled: true, ok: true, message, autoCloseMs: 1400 };
    }
    if (type === "group_disconnect") {
      const playerId = String(intent.playerId || "").trim();
      if (!playerId) {
        const message = card._i18n("ui.voice_group_disconnect_needs_player");
        card._toastError(message);
        return { handled: true, ok: false, message };
      }
      const ok = await card._clearSpeakerGroupFor(playerId);
      const player = card._controlRoomPlayerName(playerId);
      const message = ok
        ? card._i18n("ui.voice_group_disconnected_player", { player })
        : card._i18n("ui.player_groups_could_not_be_disconnected");
      (ok ? card._toastSuccess : card._toastError).call(card, message);
      return { handled: true, ok, message, autoCloseMs: ok ? 1200 : 0 };
    }
    if (type === "group_disconnect_all") {
      const result = await card._disconnectPlayerGroups({ silent: true });
      const ok = result?.ok !== false;
      const message = ok
        ? (Number(result?.count || 0) > 0 ? card._i18n("ui.all_player_groups_disconnected") : card._i18n("ui.no_player_groups_to_disconnect"))
        : card._i18n("ui.player_groups_could_not_be_disconnected");
      (ok ? card._toastSuccess : card._toastError).call(card, message);
      return { handled: true, ok, message, autoCloseMs: ok ? 1200 : 0 };
    }
  } catch (error) {
    const message = error?.message || card._i18n("ui.voice_command_failed");
    card._toastError(message);
    return { handled: true, ok: false, message };
  }
  return null;
}

async function runVoiceAssistantMediaCommand(card, intent = {}, player = null) {
  const playerManagementResult = await runVoiceAssistantPlayerManagementCommand(card, intent);
  if (playerManagementResult) return playerManagementResult;
  if (!player?.entity_id) {
    const message = card._i18n("ui.voice_command_no_player");
    card._toastError(message);
    return { handled: true, ok: false, message };
  }
  const entityId = player.entity_id;
  try {
    if (entityId !== card._state.selectedPlayer) card._selectPlayer(entityId, true);
    if (intent.type === "next" || intent.type === "previous") {
      await card._playerCmdFor(entityId, intent.type === "previous" ? "previous" : "next");
    } else if (intent.type === "pause") {
      await card._callMaverickEnginePlayerCommand(entityId, "pause");
    } else if (intent.type === "resume") {
      await card._callMaverickEnginePlayerCommand(entityId, "play");
    } else if (intent.type === "stop") {
      await card._callMaverickEnginePlayerCommand(entityId, "stop");
    } else if (intent.type === "mute" || intent.type === "unmute") {
      const shouldMute = intent.type === "mute";
      if (card._isMuted(player) !== shouldMute && !await card._toggleMuteFor(entityId)) throw new Error(card._i18n("ui.mute_command_failed"));
    } else if (intent.type === "volume_set") {
      if (!await card._setPlayerVolumeFor(entityId, intent.level)) throw new Error(card._i18n("ui.playback_command_failed"));
    } else if (intent.type === "volume_delta") {
      const current = Number(player.attributes?.volume_level);
      const base = Number.isFinite(current) ? current : 0.35;
      if (!await card._setPlayerVolumeFor(entityId, Math.max(0, Math.min(1, base + Number(intent.delta || 0))))) throw new Error(card._i18n("ui.playback_command_failed"));
    } else {
      return { handled: false, ok: false, message: "" };
    }
    const actionLabel = ({
      next: card._m("next track"),
      previous: card._m("previous track"),
      pause: card._m("pause"),
      resume: card._m("play"),
      stop: card._m("stop"),
      mute: card._m("mute"),
      unmute: card._m("unmute"),
      volume_set: card._m("volume"),
      volume_delta: card._m("volume"),
    })[intent.type] || card._i18n("ui.voice_command_executed");
    const message = card._i18n("ui.voice_command_completed_action", { action: actionLabel });
    card._toastSuccess(message);
    return { handled: true, ok: true, message, autoCloseMs: 1200 };
  } catch (error) {
    const message = error?.message || card._i18n("ui.voice_command_failed");
    card._toastError(message);
    return { handled: true, ok: false, message };
  }
}

function assistResponseSpeech(response = null) {
  const candidates = [
    response?.response?.speech?.plain?.speech,
    response?.response?.speech?.plain,
    response?.speech?.plain?.speech,
    response?.speech?.plain,
    response?.response?.speech,
    response?.speech,
  ];
  const found = candidates.find((value) => typeof value === "string" && value.trim());
  return String(found || "").trim();
}

async function sendVoiceCommandToAssist(card, transcript = "") {
  const text = String(transcript || "").trim();
  if (!text) return false;
  const payload = {
    type: "conversation/process",
    text,
    language: voiceAssistantAssistLanguage(),
  };
  const agentId = voiceAssistantAgentId(card);
  if (agentId) payload.agent_id = agentId;
  try {
    const response = await card._callHomeAssistantWs(payload);
    const speech = assistResponseSpeech(response);
    if (speech) card._toast(speech, "info", { duration: 6500 });
    else card._toastSuccess(card._i18n("ui.voice_command_sent"));
    return {
      handled: true,
      ok: true,
      message: speech || card._i18n("ui.voice_command_sent"),
    };
  } catch (error) {
    const message = error?.message || card._i18n("ui.voice_command_failed");
    card._toastError(message);
    return { handled: true, ok: false, message };
  }
}

export async function handleVoiceAssistantTranscript(card, transcript = "") {
  const text = String(transcript || "").trim();
  if (!text) {
    const message = card._i18n("ui.no_speech_was_captured");
    card._toastError(message);
    return { handled: true, ok: false, message };
  }
  const mode = voiceAssistantMode(card);
  const target = resolveVoiceAssistantTarget(card, text);
  if (mode !== "assist") {
    const intent = voiceAssistantCommandIntent(card, text, target.player, { forceMusic: mode === "music" });
    if (intent.type === "music") {
      return playVoiceAssistantMusic(card, intent.query, target.player);
    }
    if (intent.type !== "unknown") {
      return runVoiceAssistantMediaCommand(card, intent, target.player);
    }
  }
  if (mode !== "music") {
    return sendVoiceCommandToAssist(card, text);
  }
  const message = card._i18n("ui.voice_command_not_understood");
  card._toastError(message);
  return { handled: true, ok: false, message };
}

// ---------------------------------------------------------------------------
// Dialog

export function stopVoiceAssistantRecognition(card) {
  clearTimeout(card._voiceAssistantRecognitionTimer);
  card._voiceAssistantRecognitionTimer = null;
  const recognition = card._voiceAssistantRecognition;
  card._voiceAssistantRecognition = null;
  card._state.voiceAssistantListening = false;
  card.$("mobileVoiceAssistantBtn")?.classList.remove("listening");
  card.$("emptyVoiceAssistantBtn")?.classList.remove("listening");
  card.$("screensaverVoiceBtn")?.classList.remove("listening");
  try {
    if (recognition) recognition.__maverickCancelled = true;
    recognition?.abort?.();
  } catch {}
}

function voiceAssistantStatusLabel(card, status = "") {
  const safeStatus = String(status || "").toLowerCase();
  if (safeStatus === "listening") return card._i18n("ui.voice_listening_status");
  if (safeStatus === "processing") return card._i18n("ui.voice_processing_status");
  if (safeStatus === "success") return card._i18n("ui.voice_done_status");
  if (safeStatus === "error") return card._i18n("ui.voice_error_status");
  return card._i18n("ui.voice_ready_status");
}

function voiceAssistantDialogIcon(status = "") {
  return String(status || "").toLowerCase() === "error" ? "close" : "mic";
}

function openVoiceAssistantDialog(card, status = "listening", updates = {}) {
  clearTimeout(card._voiceAssistantDialogCloseTimer);
  card._state.voiceAssistantDialogOpen = true;
  card._state.voiceAssistantKeepScreensaver = updates.keepScreensaver === true;
  card._state.voiceAssistantDialogStatus = status;
  card._state.voiceAssistantTranscript = updates.transcript ?? "";
  card._state.voiceAssistantResponse = updates.response ?? "";
  syncVoiceAssistantDialog(card);
}

function updateVoiceAssistantDialog(card, updates = {}) {
  if (updates.status && !["success", "error"].includes(String(updates.status || "").toLowerCase())) {
    clearTimeout(card._voiceAssistantDialogCloseTimer);
  }
  card._state.voiceAssistantDialogOpen = updates.open ?? card._state.voiceAssistantDialogOpen ?? true;
  if (updates.keepScreensaver !== undefined) card._state.voiceAssistantKeepScreensaver = updates.keepScreensaver === true;
  if (updates.status !== undefined) card._state.voiceAssistantDialogStatus = updates.status;
  if (updates.transcript !== undefined) card._state.voiceAssistantTranscript = updates.transcript;
  if (updates.response !== undefined) card._state.voiceAssistantResponse = updates.response;
  syncVoiceAssistantDialog(card);
}

export function closeVoiceAssistantDialog(card, { stopRecognition = true } = {}) {
  clearTimeout(card._voiceAssistantDialogCloseTimer);
  clearTimeout(card._voiceAssistantRecognitionTimer);
  card._voiceAssistantRecognitionTimer = null;
  if (stopRecognition) stopVoiceAssistantRecognition(card);
  card._state.voiceAssistantDialogOpen = false;
  card._state.voiceAssistantKeepScreensaver = false;
  syncVoiceAssistantDialog(card);
}

function scheduleVoiceAssistantDialogClose(card, delayMs = 1500) {
  clearTimeout(card._voiceAssistantDialogCloseTimer);
  card._voiceAssistantDialogCloseTimer = setTimeout(() => {
    card._voiceAssistantDialogCloseTimer = null;
    closeVoiceAssistantDialog(card, { stopRecognition: false });
  }, Math.max(500, Number(delayMs) || 1500));
}

export function syncVoiceAssistantDialog(card) {
  const host = card.$("voiceAssistantDialog");
  if (!host) return;
  const open = !!card._state.voiceAssistantDialogOpen;
  const status = String(card._state.voiceAssistantDialogStatus || "ready").toLowerCase();
  const transcript = String(card._state.voiceAssistantTranscript || "").trim();
  const response = String(card._state.voiceAssistantResponse || "").trim();
  const keepScreensaver = card._state.voiceAssistantKeepScreensaver === true;
  host.className = `voice-assistant-dialog ${open ? "open" : ""} ${keepScreensaver ? "keep-screensaver" : ""} status-${card._esc(status)}`;
  if (!open) {
    host.innerHTML = "";
    return;
  }
  if (!host.querySelector(".voice-assistant-panel")) {
    host.innerHTML = `
      <div class="voice-assistant-panel" data-screensaver-dialog role="dialog" aria-label="FLOW ASSISTANT">
        <div class="voice-assistant-head">
          <div class="voice-assistant-title-row">
            <span class="voice-assistant-icon" id="voiceAssistantDialogIconSlot"></span>
            <span class="voice-assistant-copy">
              <span class="voice-assistant-brand" aria-hidden="true">${card._tabletBrandSignatureHtml("voice-assistant-logo")}</span>
              <span class="voice-assistant-title">FLOW ASSISTANT</span>
              <span class="voice-assistant-status" id="voiceAssistantDialogStatus"></span>
            </span>
          </div>
          <button class="voice-assistant-close" id="voiceAssistantDialogClose" title="${card._esc(card._i18n("ui.close"))}">${card._iconSvg("close")}</button>
        </div>
        <div class="voice-assistant-meter" aria-hidden="true"><span></span></div>
        <div class="voice-assistant-wave" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="voice-assistant-lines">
          <div class="voice-assistant-line">
            <span class="voice-assistant-line-label">${card._esc(card._i18n("ui.voice_transcript"))}</span>
            <span class="voice-assistant-line-text" id="voiceAssistantDialogTranscript"></span>
          </div>
          <div class="voice-assistant-line">
            <span class="voice-assistant-line-label">${card._esc(card._i18n("ui.voice_response"))}</span>
            <span class="voice-assistant-line-text" id="voiceAssistantDialogResponse"></span>
          </div>
        </div>
        <div class="voice-assistant-actions">
          <button type="button" id="voiceAssistantDialogRetry" class="primary">${card._esc(card._i18n("ui.try_again"))}</button>
          <button type="button" id="voiceAssistantDialogCloseSecondary">${card._esc(card._i18n("ui.close"))}</button>
        </div>
      </div>
    `;
    const panel = host.querySelector(".voice-assistant-panel");
    const keepPanelEvent = (event) => {
      if (card._state.screensaverOpen && card._state.voiceAssistantKeepScreensaver === true) {
        event.stopPropagation();
      }
    };
    panel?.addEventListener("pointerdown", keepPanelEvent);
    panel?.addEventListener("click", keepPanelEvent);
    panel?.addEventListener("keydown", keepPanelEvent);
    host.querySelector("#voiceAssistantDialogClose")?.addEventListener("click", () => closeVoiceAssistantDialog(card));
    host.querySelector("#voiceAssistantDialogCloseSecondary")?.addEventListener("click", () => closeVoiceAssistantDialog(card));
    host.querySelector("#voiceAssistantDialogRetry")?.addEventListener("click", () => {
      startVoiceAssistantCommand(card, { keepScreensaver: card._state.voiceAssistantKeepScreensaver === true });
    });
  }
  const retryBtn = host.querySelector("#voiceAssistantDialogRetry");
  if (retryBtn) retryBtn.hidden = status === "listening" || status === "processing";
  const iconSlot = host.querySelector("#voiceAssistantDialogIconSlot");
  const iconName = voiceAssistantDialogIcon(status);
  if (iconSlot && iconSlot.dataset.iconName !== iconName) {
    iconSlot.dataset.iconName = iconName;
    iconSlot.innerHTML = card._iconSvg(iconName);
  }
  const statusEl = host.querySelector("#voiceAssistantDialogStatus");
  if (statusEl) statusEl.textContent = voiceAssistantStatusLabel(card, status);
  const transcriptEl = host.querySelector("#voiceAssistantDialogTranscript");
  if (transcriptEl) {
    transcriptEl.textContent = transcript || card._i18n("ui.waiting_for_speech");
    transcriptEl.classList.toggle("voice-assistant-placeholder", !transcript);
  }
  const responseEl = host.querySelector("#voiceAssistantDialogResponse");
  if (responseEl) {
    responseEl.textContent = response || card._i18n("ui.voice_response_will_appear_here");
    responseEl.classList.toggle("voice-assistant-placeholder", !response);
  }
}

function voiceAssistantRecognitionErrorMessage(card, errorCode = "") {
  const code = String(errorCode || "").trim();
  if (code === "no-speech") return card._i18n("ui.no_speech_was_captured");
  if (code === "not-allowed" || code === "service-not-allowed") return card._i18n("ui.microphone_permission_or_browser_blocked");
  if (code === "language-not-supported") return card._i18n("ui.voice_language_is_not_supported");
  if (code === "network") return card._i18n("ui.voice_recognition_network_failed");
  return card._i18n("ui.voice_input_failed");
}

function speakVoiceAssistantFeedback(card, text = "") {
  const message = String(text || "").trim();
  if (!message || !voiceAssistantSpeakFeedbackEnabled(card)) return;
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance !== "function") return;
  try {
    synth.cancel();
    const utterance = new window.SpeechSynthesisUtterance(message);
    utterance.lang = voiceAssistantRecognitionLanguage();
    utterance.rate = 1;
    utterance.pitch = 1;
    synth.speak(utterance);
  } catch (_) {}
}

export function startVoiceAssistantCommand(card, options = {}) {
  const keepScreensaver = options?.keepScreensaver === true;
  const ignoreWhenListening = options?.ignoreWhenListening === true;
  const scheduleAutoClose = (status = "error", requestedDelay = null) => {
    const requested = Number(requestedDelay);
    const closeMs = Number.isFinite(requested) && requested > 0
      ? requested
      : flowAssistantAutoCloseMs(card, status);
    if (closeMs > 0) scheduleVoiceAssistantDialogClose(card, closeMs);
  };
  if (keepScreensaver) resetScreensaverTimer(card, { hide: false, activity: true });
  if (!voiceAssistantEnabled(card)) {
    const message = card._i18n("ui.voice_assistant_disabled");
    card._toastError(message);
    openVoiceAssistantDialog(card, "error", { response: message, keepScreensaver });
    scheduleAutoClose("error");
    return;
  }
  if (card._mobileMicMode() === "off") {
    const message = card._i18n("ui.microphone_is_disabled");
    card._toastError(message);
    openVoiceAssistantDialog(card, "error", { response: message, keepScreensaver });
    scheduleAutoClose("error");
    return;
  }
  if (card._state.voiceAssistantListening) {
    if (ignoreWhenListening) {
      openVoiceAssistantDialog(card, "listening", {
        transcript: card._state.voiceAssistantTranscript || "",
        response: card._state.voiceAssistantResponse || "",
        keepScreensaver,
      });
      return;
    }
    stopVoiceAssistantRecognition(card);
    closeVoiceAssistantDialog(card);
    return;
  }
  if (!keepScreensaver) resetScreensaverTimer(card, { hide: true, activity: true });
  openVoiceAssistantDialog(card, "listening", { transcript: "", response: "", keepScreensaver });
  const SpeechRecognition = speechRecognitionCtor();
  const micButtons = Array.from(card.shadowRoot?.querySelectorAll(MIC_BUTTON_SELECTOR) || []);
  if (!SpeechRecognition) {
    const message = card._i18n("ui.voice_input_is_not_supported_on_this_device");
    card._toastError(message);
    updateVoiceAssistantDialog(card, { status: "error", response: message, keepScreensaver });
    scheduleAutoClose("error");
    return;
  }
  clearTimeout(card._voiceAssistantRecognitionTimer);
  card._voiceAssistantRecognitionTimer = null;
  try { card._voiceAssistantRecognition?.abort?.(); } catch {}
  const recognition = new SpeechRecognition();
  card._voiceAssistantRecognition = recognition;
  recognition.lang = voiceAssistantRecognitionLanguage();
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  let capturedTranscript = "";
  let handled = false;
  let recognitionFailed = false;
  const stopListeningUi = () => {
    clearTimeout(card._voiceAssistantRecognitionTimer);
    card._voiceAssistantRecognitionTimer = null;
    card._state.voiceAssistantListening = false;
    micButtons.forEach((btn) => btn.classList.remove("listening"));
  };
  const finishTranscript = (transcript) => {
    if (handled) return;
    handled = true;
    stopListeningUi();
    if (card._voiceAssistantRecognition === recognition) card._voiceAssistantRecognition = null;
    try { recognition.abort?.(); } catch {}
    updateVoiceAssistantDialog(card, { status: "processing", transcript, response: card._i18n("ui.voice_processing_status") });
    card._withTimeout(
      handleVoiceAssistantTranscript(card, transcript),
      flowAssistantResponseTimeoutMs(card),
      card._timeoutMessage(flowAssistantLabel(card)),
    ).then((result) => {
      const message = result?.message || (result?.ok === false ? card._i18n("ui.voice_command_failed") : card._i18n("ui.voice_command_executed"));
      const status = result?.ok === false ? "error" : "success";
      updateVoiceAssistantDialog(card, { status, transcript, response: message });
      if (result?.ok !== false) {
        speakVoiceAssistantFeedback(card, message);
      }
      scheduleAutoClose(status, result?.autoCloseMs);
    }).catch((error) => {
      const message = error?.message || card._i18n("ui.voice_command_failed");
      card._toastError(message);
      updateVoiceAssistantDialog(card, { status: "error", transcript, response: message });
      scheduleAutoClose("error");
    });
  };
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results || [])
      .map((result) => result?.[0]?.transcript || "")
      .join(" ")
      .trim();
    if (transcript) capturedTranscript = transcript;
    if (capturedTranscript) updateVoiceAssistantDialog(card, { status: "listening", transcript: capturedTranscript });
    const finalized = Array.from(event.results || []).some((result) => result?.isFinal);
    if (finalized && capturedTranscript) finishTranscript(capturedTranscript);
  };
  recognition.onerror = (event) => {
    if (handled) return;
    if (recognition.__maverickCancelled) return;
    recognitionFailed = true;
    stopListeningUi();
    if (card._voiceAssistantRecognition === recognition) card._voiceAssistantRecognition = null;
    const message = voiceAssistantRecognitionErrorMessage(card, event?.error);
    card._toastError(message);
    updateVoiceAssistantDialog(card, { status: "error", response: message });
    scheduleAutoClose("error");
  };
  recognition.onend = () => {
    stopListeningUi();
    if (card._voiceAssistantRecognition === recognition) card._voiceAssistantRecognition = null;
    if (recognition.__maverickCancelled) return;
    if (!handled && capturedTranscript) {
      finishTranscript(capturedTranscript);
    } else if (!handled && !recognitionFailed) {
      const message = card._i18n("ui.no_speech_was_captured");
      card._toastError(message);
      updateVoiceAssistantDialog(card, { status: "error", response: message });
      scheduleAutoClose("error");
    }
  };
  try {
    card._state.voiceAssistantListening = true;
    micButtons.forEach((btn) => btn.classList.add("listening"));
    card._hapticTap([8, 18, 8]);
    card._toast(card._i18n("ui.voice_assistant_listening"));
    recognition.start();
    card._voiceAssistantRecognitionTimer = setTimeout(() => {
      if (handled) return;
      handled = true;
      recognitionFailed = true;
      stopListeningUi();
      if (card._voiceAssistantRecognition === recognition) card._voiceAssistantRecognition = null;
      try {
        recognition.__maverickCancelled = true;
        recognition.abort?.();
      } catch {}
      const message = card._timeoutMessage(flowAssistantLabel(card));
      card._toastError(message);
      updateVoiceAssistantDialog(card, { status: "error", transcript: capturedTranscript, response: message });
      scheduleAutoClose("error");
    }, flowAssistantListenTimeoutMs(card));
  } catch {
    stopListeningUi();
    if (card._voiceAssistantRecognition === recognition) card._voiceAssistantRecognition = null;
    const message = card._i18n("ui.voice_command_failed");
    card._toastError(message);
    updateVoiceAssistantDialog(card, { status: "error", response: message });
    scheduleAutoClose("error");
  }
}

// ---------------------------------------------------------------------------
// Voice buttons on the player

export function voiceAssistantFabHtml(card) {
  return `<button class="mobile-art-fab voice-assistant-fab ${card._state.voiceAssistantListening ? "listening" : ""}" id="mobileVoiceAssistantBtn" title="${card._esc(flowAssistantLabel(card))}" aria-label="${card._esc(flowAssistantLabel(card))}">${card._iconSvg("mic")}</button>`;
}

export function emptyVoiceButtonHtml(card) {
  if (!voiceAssistantEnabled(card)) return "";
  return `<button class="empty-voice-btn ${card._state.voiceAssistantListening ? "listening" : ""}" id="emptyVoiceAssistantBtn" title="${card._esc(flowAssistantLabel(card))}" aria-label="${card._esc(flowAssistantLabel(card))}">${card._iconSvg("mic")}</button>`;
}

export function bindEmptyVoiceButton(card) {
  card.$("emptyVoiceAssistantBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!card._lockUiButton(e.currentTarget, [8, 18, 8], { lockMs: 1200, disabled: false })) return;
    startVoiceAssistantCommand(card, { ignoreWhenListening: true });
  });
}

// ---------------------------------------------------------------------------
// Smart voice search and its confirm sheet

function currentSmartVoiceCandidate(card) {
  const state = card._state.mobileSmartVoice || null;
  if (!state?.candidates?.length) return null;
  const index = Math.max(0, Math.min(state.candidates.length - 1, Number(state.index || 0)));
  return state.candidates[index] || null;
}

function stopSmartVoiceCountdown(card) {
  clearInterval(card._mobileSmartVoiceTimer);
  card._mobileSmartVoiceTimer = null;
}

export function closeSmartVoiceConfirm(card) {
  stopSmartVoiceCountdown(card);
  card._state.mobileSmartVoice = null;
  card.$("mobileSmartVoiceModal")?.classList.remove("open");
  const host = card.$("mobileSmartVoiceSheet");
  if (host) host.innerHTML = "";
}

function renderSmartVoiceConfirm(card) {
  const host = card.$("mobileSmartVoiceSheet");
  const state = card._state.mobileSmartVoice || null;
  const candidate = currentSmartVoiceCandidate(card);
  if (!host || !state || !candidate) return;
  const targetName = card._selectedPlayerName();
  const subtitle = [candidate.artist, candidate.album].filter(Boolean).join(" · ");
  host.innerHTML = `
      <div class="smart-voice-head">
        <div class="smart-voice-brand" aria-hidden="true">${card._tabletBrandSignatureHtml("smart-voice-logo")}</div>
        <div class="smart-voice-title">${card._esc(card._i18n("ui.smart_voice_selection"))}</div>
        <div class="smart-voice-target">${card._esc(card._i18n("ui.player_2"))}: ${card._esc(targetName)}</div>
      </div>
      <div class="smart-voice-card">
        <div class="smart-voice-chip">${card._iconSvg("mic")}<span>${card._esc(state.query || "")}</span></div>
        <div class="smart-voice-name">${card._esc(candidate.name || "")}</div>
        <div class="smart-voice-sub">${card._esc(subtitle || card._i18n("ui.ready_to_play"))}</div>
        <div class="smart-voice-countdown"><span>${card._esc(String(state.countdown || 0))}</span></div>
      </div>
      <div class="confirm-actions smart-voice-actions">
        <button class="menu-item" id="smartVoicePlayNowBtn">${card._esc(card._i18n("ui.play"))}</button>
        <button class="menu-item" id="smartVoiceOtherBtn">${card._esc(card._i18n("ui.other"))}</button>
        <button class="menu-item" id="smartVoiceCancelBtn">${card._esc(card._i18n("ui.cancel_2"))}</button>
      </div>
    `;
  host.querySelector("#smartVoiceCancelBtn")?.addEventListener("click", () => closeSmartVoiceConfirm(card));
  host.querySelector("#smartVoiceOtherBtn")?.addEventListener("click", () => chooseAnotherSmartVoiceCandidate(card));
  host.querySelector("#smartVoicePlayNowBtn")?.addEventListener("click", () => playSmartVoiceCandidateNow(card));
}

function openSmartVoiceConfirm(card, query = "", candidates = []) {
  if (!Array.isArray(candidates) || !candidates.length) {
    card._toastError(card._i18n("ui.no_matching_content_was_found"));
    return;
  }
  card._state.mobileSmartVoice = {
    query,
    candidates,
    index: 0,
    countdown: SMART_VOICE_COUNTDOWN,
  };
  card.$("mobileSmartVoiceModal")?.classList.add("open");
  renderSmartVoiceConfirm(card);
  stopSmartVoiceCountdown(card);
  card._mobileSmartVoiceTimer = window.setInterval(() => {
    const state = card._state.mobileSmartVoice;
    if (!state) return closeSmartVoiceConfirm(card);
    state.countdown = Number(state.countdown || 0) - 1;
    if (state.countdown <= 0) {
      playSmartVoiceCandidateNow(card);
      return;
    }
    renderSmartVoiceConfirm(card);
  }, 1000);
}

function chooseAnotherSmartVoiceCandidate(card) {
  const state = card._state.mobileSmartVoice;
  if (!state?.candidates?.length) return;
  if (state.candidates.length === 1) {
    state.countdown = SMART_VOICE_COUNTDOWN;
    renderSmartVoiceConfirm(card);
    return;
  }
  const currentUri = currentSmartVoiceCandidate(card)?.uri || "";
  const pool = state.candidates.filter((item) => item?.uri && item.uri !== currentUri);
  const next = pool[Math.floor(Math.random() * pool.length)] || state.candidates[(Number(state.index || 0) + 1) % state.candidates.length];
  const nextIndex = Math.max(0, state.candidates.findIndex((item) => item?.uri === next?.uri));
  state.index = nextIndex;
  state.countdown = SMART_VOICE_COUNTDOWN;
  card._hapticTap([8]);
  renderSmartVoiceConfirm(card);
}

async function playSmartVoiceCandidateNow(card) {
  const candidate = currentSmartVoiceCandidate(card);
  if (!candidate?.uri) {
    closeSmartVoiceConfirm(card);
    return;
  }
  stopSmartVoiceCountdown(card);
  await card._playMedia(candidate.uri, candidate.media_type || "playlist", "play", { label: candidate.name || "" });
  closeSmartVoiceConfirm(card);
  card._closeMobileMenu();
}

async function handleSmartVoiceTranscript(card, transcript = "") {
  const query = String(transcript || "").trim();
  if (!query) return;
  card._state.mediaQuery = query;
  const input = card.$("mobileMediaSearchInput");
  if (input) input.value = query;
  card._toast(card._i18n("ui.searching_smart_selection"));
  const results = await card._search(query);
  const candidates = normalizeSmartVoiceCandidates(card, results);
  openSmartVoiceConfirm(card, query, candidates);
}

export function bindSmartVoiceBackdrop(card) {
  card.$("mobileSmartVoiceModal")?.addEventListener("click", (e) => {
    if (e.target === card.$("mobileSmartVoiceModal")) closeSmartVoiceConfirm(card);
  });
}

export function startMobileVoiceSearch(card) {
  const SpeechRecognition = speechRecognitionCtor();
  const input = card.$("mobileMediaSearchInput");
  const micBtn = card.$("mobileVoiceSearchBtn");
  const micMode = card._mobileMicMode();
  if (!SpeechRecognition) {
    card._toastError(card._i18n("ui.voice_search_is_not_supported_on_this_device"));
    return;
  }
  if (micMode === "off") {
    card._toastError(card._i18n("ui.microphone_is_disabled"));
    return;
  }
  try {
    card._voiceRecognition?.abort?.();
  } catch (_) {}
  const recognition = new SpeechRecognition();
  card._voiceRecognition = recognition;
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  micBtn?.classList.add("listening");
  card._hapticTap([8, 18, 8]);
  card._toast(card._i18n("ui.listening"));
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results || [])
      .map((result) => result?.[0]?.transcript || "")
      .join(" ")
      .trim();
    if (!transcript) return;
    const finalized = Array.from(event.results || []).some((result) => result?.isFinal);
    card._state.mediaQuery = transcript;
    if (input) {
      input.value = transcript;
      input.focus({ preventScroll: true });
    }
    if (micMode === "smart" && finalized) {
      handleSmartVoiceTranscript(card, transcript).catch((error) => {
        card._toastError(error?.message || card._i18n("ui.voice_search_failed"));
      });
      return;
    }
    clearTimeout(card._searchTimer);
    card._searchTimer = setTimeout(() => card._renderMobileMediaResults(), 120);
  };
  recognition.onerror = () => {
    card._toastError(card._i18n("ui.voice_search_failed"));
  };
  recognition.onend = () => {
    micBtn?.classList.remove("listening");
    if (card._voiceRecognition === recognition) card._voiceRecognition = null;
  };
  try {
    recognition.start();
  } catch (_) {
    micBtn?.classList.remove("listening");
    card._toastError(card._i18n("ui.voice_search_failed"));
  }
}

// ---------------------------------------------------------------------------
// Studio library voice input

export async function startControlRoomLibraryVoice(card) {
  const SpeechRecognition = speechRecognitionCtor();
  if (!SpeechRecognition) {
    card._toastError(card._i18n("ui.voice_input_is_not_supported_on_this_device"));
    return;
  }
  try { card._voiceRecognition?.abort?.(); } catch {}
  const recognition = new SpeechRecognition();
  card._voiceRecognition = recognition;
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  card._toast(card._i18n("ui.listening"));
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results || [])
      .map((result) => result?.[0]?.transcript || "")
      .join(" ")
      .trim();
    if (!transcript) return;
    card._state.controlRoomLibraryQuery = transcript;
    card._state.controlRoomPanel = "library";
    card._syncControlRoomUi();
    const input = card.$("controlRoomLibraryInput");
    if (input) {
      input.value = transcript;
      input.focus({ preventScroll: true });
      input.setSelectionRange(transcript.length, transcript.length);
    }
    clearTimeout(card._searchTimer);
    card._searchTimer = setTimeout(() => card._searchControlRoomLibrary(transcript), 120);
  };
  recognition.onerror = () => card._toastError(card._i18n("ui.voice_input_failed"));
  recognition.onend = () => {
    if (card._voiceRecognition === recognition) card._voiceRecognition = null;
  };
  try { recognition.start(); } catch (_) { card._toastError(card._i18n("ui.voice_input_failed")); }
}
