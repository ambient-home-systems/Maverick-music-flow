import { announcementEligiblePlayers as eligiblePlayersOf } from "../state/players.js";

// Announcements: the Announce page, its settings section, the studio tray and
// the dispatch through the Engine. The Engine owns playback and volume during
// an announcement; the card only boosts and restores volumes for the studio's
// multi-target send, where each target is dispatched separately.

const DEFAULT_PRESETS = ["Dinner is ready", "Please come to the living room", "Leaving in five minutes"];
const clampVolume = (value) => Math.max(20, Math.min(50, value));

// ---------------------------------------------------------------------------
// Settings and derived values

export function defaultAnnouncementPresets() {
  return [...DEFAULT_PRESETS];
}

export function isDefaultAnnouncementPresetSet(presets = []) {
  if (!Array.isArray(presets) || !presets.length) return false;
  const normalize = (items) => items.slice(0, 3).map((item) => String(item || "").trim()).join("\n");
  return normalize(presets) === normalize(DEFAULT_PRESETS);
}

function announcementLanguageOptions(card) {
  return [
    ["auto", card._i18n("ui.auto_cloud_default")],
    ["en-US", "English (US)"],
    ["en-GB", "English (UK)"],
  ];
}

const LANGUAGE_VALUES = new Set(["auto", "en-US", "en-GB"]);

export function normalizeAnnouncementLanguage(value = "") {
  const normalized = String(value || "auto").trim();
  return LANGUAGE_VALUES.has(normalized) ? normalized : "auto";
}

export function announcementEligiblePlayers(card) {
  return eligiblePlayersOf(card._state.players || []);
}

export function announcementTargetValue(card) {
  const raw = String(card._state.mobileAnnouncementTarget || "").trim();
  if (raw === "all") return "all";
  const eligible = announcementEligiblePlayers(card);
  if (eligible.some((player) => player.entity_id === raw)) return raw;
  return eligible.find((player) => player.entity_id === card._state.selectedPlayer)?.entity_id || eligible[0]?.entity_id || "";
}

export function announcementVolumePct(card) {
  const raw = Number(card._state.mobileAnnouncementVolume ?? card._config?.mobile_announcement_volume ?? 20);
  return Number.isFinite(raw) ? clampVolume(raw) : 20;
}

export function announcementTtsEntity(card) {
  const explicit = String(card._state.mobileAnnouncementTtsEntity || card._config?.announcement_tts_entity || "").trim();
  if (explicit) return explicit;
  const ttsEntity = Object.keys(card._hass?.states || {}).find((entityId) => entityId.startsWith("tts."));
  return String(ttsEntity || "").trim();
}

export function announcementLanguageSetting(card) {
  return normalizeAnnouncementLanguage(card._state.mobileAnnouncementTtsLanguage || card._config?.announcement_tts_language || "auto");
}

function announcementLanguageCode(card) {
  const configured = announcementLanguageSetting(card);
  if (configured !== "auto") return configured;
  return "";
}

function announcementRecognitionLanguageCode(card) {
  const configured = announcementLanguageSetting(card);
  if (configured !== "auto") return configured;
  try {
    const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "";
    const lang = card._hass?.locale?.language || card._hass?.language || browserLanguage || "";
    if (lang) return String(lang);
  } catch (_) {}
  return "en-US";
}

// ---------------------------------------------------------------------------
// Volume boost and restore

export function prepareAnnouncementVolumes(card, targets = []) {
  const boost = announcementVolumePct(card) / 100;
  return (Array.isArray(targets) ? targets : [])
    .map((player) => {
      const entityId = String(player?.entity_id || "").trim();
      const previousVolume = card._playerVolumeLevel(entityId);
      return {
        entityId,
        previousVolume,
        targetVolume: Number.isFinite(previousVolume) ? Math.max(0, Math.min(1, previousVolume + boost)) : boost,
        targetVolumePct: Math.round((Number.isFinite(previousVolume) ? Math.max(0, Math.min(1, previousVolume + boost)) : boost) * 100),
      };
    })
    .filter((snapshot) => snapshot.entityId);
}

export function announcementRestoreDelayMs(message = "") {
  const textLength = String(message || "").trim().length;
  return Math.max(5000, Math.min(22000, 3200 + textLength * 90));
}

async function setPlayerVolumeForAnnouncement(card, entityId, level) {
  const normalized = Math.max(0, Math.min(1, Number(level) || 0));
  if (!entityId) return false;
  await card._callMaverickEnginePlayerCommand(entityId, "volume", { volume_level: normalized });
  return true;
}

export function scheduleAnnouncementVolumeRestore(card, snapshots = [], delayMs = 0) {
  card._announcementVolumeRestoreTimers = card._announcementVolumeRestoreTimers || new Map();
  snapshots.forEach((snapshot) => {
    if (!snapshot?.entityId || !Number.isFinite(snapshot.previousVolume)) return;
    const existing = card._announcementVolumeRestoreTimers.get(snapshot.entityId);
    if (Array.isArray(existing)) existing.forEach((timer) => clearTimeout(timer));
    else if (existing) clearTimeout(existing);
    const baseDelay = Math.max(0, Number(delayMs) || 0);
    const delays = [baseDelay, baseDelay + 4500, baseDelay + 9000];
    const timers = delays.map((delay, index) => setTimeout(() => {
      setPlayerVolumeForAnnouncement(card, snapshot.entityId, snapshot.previousVolume).catch(() => {});
      if (index === delays.length - 1) card._announcementVolumeRestoreTimers.delete(snapshot.entityId);
    }, delay));
    card._announcementVolumeRestoreTimers.set(snapshot.entityId, timers);
  });
}

// ---------------------------------------------------------------------------
// Dispatch

export async function recordAnnouncementInEngine(card, message = "", targets = [], options = {}) {
  if (!card._maverickEngineEnabled()) return false;
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) return false;
  const players = (Array.isArray(targets) ? targets : [])
    .map((player) => String(player?.entity_id || player || "").trim())
    .filter(Boolean);
  try {
    const ready = await card._maverickEngineReadyForPersistence();
    if (!ready) return false;
    await card._maverickEngineAnnounce({
      message: cleanMessage,
      player: players.length === 1 ? players[0] : "",
      players,
      volume: announcementVolumePct(card),
      language: String(options.language || "").trim(),
      target: String(options.target || announcementTargetValue(card) || "").trim(),
      sent: options.sent !== false,
    });
    return true;
  } catch (error) {
    card._debugLog("Engine announcement record skipped", error?.message || error);
    return false;
  }
}

export async function sendMobileAnnouncement(card) {
  if (card._announcementSendPending) return;
  const message = String(card._state.mobileAnnouncementText || "").trim();
  const targetValue = announcementTargetValue(card);
  const eligiblePlayers = announcementEligiblePlayers(card);
  const targets = targetValue === "all"
    ? eligiblePlayers
    : eligiblePlayers.filter((player) => player.entity_id === targetValue);
  if (!message) {
    card._toastError(card._i18n("ui.enter_an_announcement_first"));
    return;
  }
  if (!targets.length) {
    card._toastError(card._i18n("ui.select_a_player_first"));
    return;
  }
  card._hapticTap([12, 24, 12]);
  const playerName = targetValue === "all"
    ? card._i18n("ui.all_players_2")
    : (targets[0]?.attributes?.friendly_name || targets[0]?.entity_id || card._selectedPlayerName());
  const preview = message.length > 72 ? `${message.slice(0, 69)}...` : message;
  const language = announcementLanguageCode(card);
  card._toast(card._i18n("ui.announcement_to_player_preview", {
    player: playerName,
    preview,
  }));
  card._announcementSendPending = true;
  try {
    const ttsEntity = announcementTtsEntity(card);
    const targetEntityIds = targets
      .map((player) => String(player?.entity_id || "").trim())
      .filter(Boolean);
    const volumeGroups = new Map();
    for (const snapshot of prepareAnnouncementVolumes(card, targets)) {
      const group = volumeGroups.get(snapshot.targetVolumePct) || [];
      group.push(snapshot.entityId);
      volumeGroups.set(snapshot.targetVolumePct, group);
    }
    const responses = await Promise.all([...volumeGroups].map(async ([volume, players]) => {
      try {
        const result = await card._maverickEngineAnnounce({
          message, player: players.length === 1 ? players[0] : "", players,
          volume, language, tts_entity: ttsEntity, target: targetValue,
        });
        return Array.isArray(result?.results) && result.results.length ? result.results
          : players.map((player) => ({ player, ok: result?.ok === true || result?.sent === true }));
      } catch (error) {
        return players.map((player) => ({ player, ok: false, error: error?.message }));
      }
    }));
    const results = responses.flat();
    const failures = results.filter((item) => item?.ok !== true);
    const acknowledged = targetEntityIds.every((id) => results.some((item) => item?.player === id && item?.ok === true));
    if (!acknowledged || failures.length) {
      const names = targetEntityIds.filter((id) => !results.some((item) => item?.player === id && item?.ok === true))
        .map((id) => targets.find((player) => player.entity_id === id)?.attributes?.friendly_name || id);
      throw new Error(`${card._m("Announcement not confirmed")}: ${names.join(", ") || playerName}`);
    }
    card._toastSuccess(card._i18n("ui.announcement_sent_to_player", { player: playerName }));
  } catch (error) {
    card._toastError(card._i18n("ui.announcement_failed_with_error", {
      error: error?.message ? `: ${error.message}` : "",
    }));
  } finally {
    // MA owns announcement completion and restores playback/volume. A browser
    // timer cannot infer audio duration and would overwrite later user changes.
    card._announcementSendPending = false;
  }
}

// The studio sends to its selected players by temporarily aiming the compose
// state at each one, then restores the fields the Announce page owns.
export async function sendControlRoomAnnouncement(card, sourceEl = null) {
  const input = card.$("controlRoomAnnouncementText");
  const volumeInput = card.$("controlRoomAnnouncementVolumeInput");
  const message = String(input?.value || card._state.controlRoomAnnouncementText || "").trim();
  if (!message) {
    card._toastError(card._i18n("ui.enter_an_announcement_first"));
    return false;
  }
  const selectedIds = card._controlRoomSelectedPlayerIds();
  const targets = selectedIds.length ? selectedIds : [card._controlRoomPrimaryPlayerId()].filter(Boolean);
  if (!targets.length) {
    card._toastError(card._i18n("ui.select_at_least_one_studio_player"));
    return false;
  }
  if (sourceEl) card._pressUiButton(sourceEl);
  const previousText = card._state.mobileAnnouncementText;
  const previousTarget = card._state.mobileAnnouncementTarget;
  const previousVolume = card._state.mobileAnnouncementVolume;
  card._state.mobileAnnouncementText = message;
  card._state.mobileAnnouncementTarget = targets.length === announcementEligiblePlayers(card).length ? "all" : targets[0];
  card._state.mobileAnnouncementVolume = clampVolume(Number(volumeInput?.value || card._state.controlRoomAnnouncementVolume || 20) || 20);
  try {
    if (targets.length === 1) {
      await sendMobileAnnouncement(card);
    } else {
      const eligibleMap = new Map(announcementEligiblePlayers(card).map((player) => [player.entity_id, player]));
      const volumeSnapshots = prepareAnnouncementVolumes(card, targets.map((entityId) => eligibleMap.get(entityId)).filter(Boolean));
      for (const entityId of targets) {
        card._state.mobileAnnouncementTarget = entityId;
        await sendMobileAnnouncement(card);
      }
      scheduleAnnouncementVolumeRestore(card, volumeSnapshots, announcementRestoreDelayMs(message));
    }
    return true;
  } finally {
    card._state.mobileAnnouncementText = previousText;
    card._state.mobileAnnouncementTarget = previousTarget;
    card._state.mobileAnnouncementVolume = previousVolume;
  }
}

export function startAnnouncementDictation(card) {
  const SpeechRecognition = card._speechRecognitionCtor();
  const input = card.$("mobileAnnouncementText");
  if (!SpeechRecognition) {
    card._toastError(card._i18n("ui.voice_input_is_not_supported_on_this_device"));
    return;
  }
  try { card._voiceRecognition?.abort?.(); } catch (_) {}
  const recognition = new SpeechRecognition();
  card._voiceRecognition = recognition;
  recognition.lang = announcementRecognitionLanguageCode(card);
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  let capturedTranscript = false;
  let recognitionFailed = false;
  card._toast(card._i18n("ui.listening"));
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results || [])
      .map((result) => result?.[0]?.transcript || "")
      .join(" ")
      .trim();
    if (!transcript) return;
    capturedTranscript = true;
    card._state.mobileAnnouncementText = transcript;
    if (input) {
      input.value = transcript;
      input.focus({ preventScroll: true });
    }
  };
  recognition.onnomatch = () => {
    recognitionFailed = true;
    card._toastError(card._i18n("ui.no_speech_was_captured"));
  };
  recognition.onerror = () => {
    recognitionFailed = true;
    card._toastError(card._i18n("ui.voice_input_failed"));
  };
  recognition.onend = () => {
    if (!capturedTranscript && !recognitionFailed) card._toastError(card._i18n("ui.no_speech_was_captured"));
    if (card._voiceRecognition === recognition) card._voiceRecognition = null;
  };
  try { recognition.start(); } catch (_) { card._toastError(card._i18n("ui.voice_input_failed")); }
}

// ---------------------------------------------------------------------------
// Markup

function languageOptionsHtml(card, selected) {
  return announcementLanguageOptions(card)
    .map(([value, label]) => `<option value="${card._esc(value)}" ${value === selected ? "selected" : ""}>${card._esc(label)}</option>`)
    .join("");
}

export function announcementsPageHtml(card) {
  const text = card._state.mobileAnnouncementText || "";
  const presets = (card._state.mobileAnnouncementPresets || []).slice(0, 3);
  const targetValue = announcementTargetValue(card);
  const announcementVolume = announcementVolumePct(card);
  const announcementLanguage = announcementLanguageSetting(card);
  const targetOptions = [
    ["all", card._i18n("ui.announce_to_all_players")],
    ...announcementEligiblePlayers(card).map((player) => [player.entity_id, player.attributes?.friendly_name || player.entity_id]),
  ];
  return `
      <div class="announcements-shell">
        <div class="announcement-target">
          <span class="announcement-target-icon">${card._iconSvg("speaker")}</span>
          <select class="media-sort-select announcement-target-select" id="mobileAnnouncementTargetSelect" aria-label="${card._esc(card._i18n("ui.announcement_target"))}">
            ${targetOptions.map(([value, label]) => `<option value="${card._esc(value)}" ${value === targetValue ? "selected" : ""}>${card._esc(label)}</option>`).join("")}
          </select>
        </div>
        <div class="announcement-target announcement-language-target">
          <span class="announcement-target-icon">${card._iconSvg("announcement")}</span>
          <select class="media-sort-select announcement-target-select" id="mobileAnnouncementTtsLanguageSelect" aria-label="${card._esc(card._i18n("ui.announcement_language"))}">
            ${languageOptionsHtml(card, announcementLanguage)}
          </select>
        </div>
        <div class="announcement-input-wrap">
          <textarea id="mobileAnnouncementText" class="announcement-textarea" rows="4" placeholder="${card._esc(card._i18n("ui.type_an_announcement"))}">${card._esc(text)}</textarea>
          <button class="announcement-voice-btn" data-announcement-voice title="${card._esc(card._i18n("ui.dictate"))}">${card._iconSvg("mic")}</button>
        </div>
        <div class="announcement-presets">
          ${presets.map((preset, index) => preset ? `
            <button class="settings-pill" data-announcement-preset-fill="${card._esc(index)}">${card._esc(preset)}</button>
          ` : ``).join("")}
        </div>
        <div class="settings-range announcement-volume-field">
          <div class="settings-label">${card._esc(card._i18n("ui.announcement_volume_boost"))}</div>
          <input id="mobileAnnouncementVolumeInput" type="range" min="20" max="50" step="1" value="${card._esc(String(announcementVolume))}">
          <div class="settings-value">+${card._esc(String(announcementVolume))}%</div>
        </div>
        <button class="action-btn announcement-send-btn" data-announcement-send>
          ${card._iconSvg("announcement")}
          <span>${card._esc(card._i18n("ui.announce"))}</span>
        </button>
      </div>
    `;
}

export function announcementsSettingsSectionHtml(card) {
  const presets = Array.isArray(card._state.mobileAnnouncementPresets)
    ? card._state.mobileAnnouncementPresets.slice(0, 3)
    : defaultAnnouncementPresets().slice(0, 3);
  while (presets.length < 3) presets.push("");
  const announcementVolume = announcementVolumePct(card);
  const ttsEntity = announcementTtsEntity(card);
  const announcementLanguage = announcementLanguageSetting(card);
  return `
        <div class="settings-group announcement-settings-card">
          <div class="settings-label">${card._esc(card._i18n("ui.announcement_presets"))}</div>
          <div class="scheduled-start-grid two-col">
            ${presets.map((preset, index) => `
              <label class="scheduled-start-field">
                <span class="settings-label">${card._esc(`${card._i18n("ui.announcement")} ${index + 1}`)}</span>
                <input class="settings-text-input" data-announcement-preset-index="${card._esc(String(index))}" type="text" value="${card._esc(preset)}" placeholder="${card._esc(card._i18n("ui.type_an_announcement"))}">
              </label>
            `).join("")}
          </div>
          <div class="settings-hint">${card._esc(card._i18n("ui.configure_ready_made_announcement_phrases"))}</div>
          <div class="settings-range announcement-volume-field">
            <div class="settings-label">${card._esc(card._i18n("ui.announcement_volume_boost"))}</div>
            <input id="mobileAnnouncementVolumeInput" type="range" min="20" max="50" step="1" value="${card._esc(String(announcementVolume))}">
            <div class="settings-value">+${card._esc(String(announcementVolume))}%</div>
          </div>
          <div class="settings-label">${card._esc(card._i18n("ui.tts_entity"))}</div>
          <input class="settings-text-input" id="mobileAnnouncementTtsEntity" type="text" value="${card._esc(ttsEntity)}" placeholder="tts.home_assistant_cloud">
          <div class="settings-hint">${card._esc(card._i18n("ui.tts_entity_used_by_the_announcement_screen"))}</div>
          <div class="settings-label">${card._esc(card._i18n("ui.announcement_language"))}</div>
          <select class="media-sort-select settings-select" id="mobileAnnouncementTtsLanguageSelect" aria-label="${card._esc(card._i18n("ui.announcement_language"))}">
            ${languageOptionsHtml(card, announcementLanguage)}
          </select>
          <div class="settings-hint">${card._esc(card._i18n("ui.auto_leaves_home_assistant_cloud_voice_defaults_untouched_manual_choices"))}</div>
        </div>`;
}

export function studioAnnouncePanelHtml(card, contextHtml = "") {
  const volume = clampVolume(Number(card._state.controlRoomAnnouncementVolume || 20) || 20);
  return `
          <div class="control-room-tray open compact control-room-announcement-tray">
            <div class="control-room-announce-hero">
              <span class="control-room-announce-icon">${card._iconSvg("announcement")}</span>
              <span class="control-room-announce-copy">
                <span class="control-room-tray-title">${card._esc(card._i18n("ui.announcement_studio_2"))}</span>
                <span class="control-room-tray-sub">${card._esc(card._i18n("ui.send_a_short_voice_message_or_announcement_url"))}</span>
              </span>
            </div>
            ${contextHtml}
            <div class="control-room-announce-panel">
              <label class="control-room-announce-compose">
                <span>${card._esc(card._i18n("ui.message"))}</span>
                <textarea id="controlRoomAnnouncementText" class="announcement-textarea" rows="3" placeholder="${card._esc(card._i18n("ui.type_what_should_be_announced"))}">${card._esc(card._state.controlRoomAnnouncementText || "")}</textarea>
              </label>
              <div class="control-room-announce-controls">
                <div class="control-room-announce-volume-card announcement-volume-field">
                  <div class="control-room-announce-volume-head">
                    <span>${card._esc(card._i18n("ui.volume_boost"))}</span>
                    <strong class="settings-value">+${card._esc(String(volume))}%</strong>
                  </div>
                  <input id="controlRoomAnnouncementVolumeInput" type="range" min="20" max="50" step="1" value="${card._esc(String(volume))}">
                </div>
                <button class="control-room-panel-action primary wide control-room-announce-send" data-room-announce-send>
                  ${card._iconSvg("announcement")}
                  <span>${card._esc(card._i18n("ui.send_announcement"))}</span>
                </button>
              </div>
            </div>
          </div>
        `;
}

// ---------------------------------------------------------------------------
// Events. Each returns true when it handled the event.

export async function handleAnnouncementMenuClick(card, e, eventTarget) {
  const announcementPresetBtn = eventTarget.closest("[data-announcement-preset-fill]");
  if (announcementPresetBtn) {
    e.preventDefault();
    e.stopPropagation();
    const index = Number(announcementPresetBtn.dataset.announcementPresetFill);
    const preset = (card._state.mobileAnnouncementPresets || [])[index] || "";
    card._state.mobileAnnouncementText = preset;
    const input = card.$("mobileAnnouncementText");
    if (input) input.value = preset;
    card._flashInteraction(announcementPresetBtn);
    card._hapticTap([8]);
    return true;
  }
  const announcementVoiceBtn = eventTarget.closest("[data-announcement-voice]");
  if (announcementVoiceBtn) {
    e.preventDefault();
    e.stopPropagation();
    card._flashInteraction(announcementVoiceBtn);
    startAnnouncementDictation(card);
    return true;
  }
  const announcementSendBtn = eventTarget.closest("[data-announcement-send]");
  if (announcementSendBtn) {
    e.preventDefault();
    e.stopPropagation();
    card._flashInteraction(announcementSendBtn);
    await sendMobileAnnouncement(card);
    return true;
  }
  return false;
}

export function handleAnnouncementFormChange(card, e) {
  const target = e.target;
  if (target?.id === "mobileAnnouncementText") {
    card._state.mobileAnnouncementText = target.value || "";
    return true;
  }
  if (target?.id === "mobileAnnouncementTargetSelect") {
    card._state.mobileAnnouncementTarget = target.value || "";
    return true;
  }
  if (target?.id === "mobileAnnouncementVolumeInput") {
    const pct = clampVolume(Number(target.value || 20));
    card._state.mobileAnnouncementVolume = pct;
    const valueEl = target.closest(".announcement-volume-field")?.querySelector(".settings-value");
    if (valueEl) valueEl.textContent = `+${pct}%`;
    card._persistMobileAppearance();
    return true;
  }
  if (target?.dataset?.announcementPresetIndex !== undefined) {
    const index = Number(target.dataset.announcementPresetIndex);
    if (Number.isFinite(index)) {
      const presets = Array.isArray(card._state.mobileAnnouncementPresets) ? [...card._state.mobileAnnouncementPresets] : ["", "", ""];
      presets[index] = target.value || "";
      card._state.mobileAnnouncementPresets = presets.slice(0, 3);
      card._persistMobileAppearance();
    }
    return true;
  }
  if (target?.id === "mobileAnnouncementTtsEntity") {
    card._state.mobileAnnouncementTtsEntity = target.value || "";
    card._persistMobileAppearance();
    return true;
  }
  if (target?.id === "mobileAnnouncementTtsLanguageSelect") {
    card._state.mobileAnnouncementTtsLanguage = normalizeAnnouncementLanguage(target.value || "auto");
    card._persistMobileAppearance();
    return true;
  }
  return false;
}

export function handleStudioAnnouncementInput(card, e) {
  const announceText = e.target.closest?.("#controlRoomAnnouncementText");
  if (announceText) {
    card._state.controlRoomAnnouncementText = announceText.value || "";
    return true;
  }
  const announceVolume = e.target.closest?.("#controlRoomAnnouncementVolumeInput");
  if (announceVolume) {
    const pct = clampVolume(Number(announceVolume.value || 20));
    card._state.controlRoomAnnouncementVolume = pct;
    const label = announceVolume.closest(".announcement-volume-field")?.querySelector(".settings-value");
    if (label) label.textContent = `+${pct}%`;
    return true;
  }
  return false;
}
