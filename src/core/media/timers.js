import {
  createSleepTimerTargetAt,
  extendSleepTimerTargetAt,
  nextSleepTimerStep,
  normalizeSleepTimerOrigin,
  sleepTimerChipVisible as chipVisibleFor,
  sleepTimerFooterLabel as footerLabelFor,
  sleepTimerRemainingLabel as remainingLabelFor,
  sleepTimerRemainingMs as remainingMsFor,
} from "../state/night-mode.js";
import { isMusicAssistantPlayer, isPlayerAvailable } from "../state/players.js";
import { immersivePlayerEnabled } from "./immersive-player.js";

// Sleep timers and wake schedules. Both are confirmed by the Engine before the
// card shows them as active; the card keeps a local copy for offline display.

const SCHEDULE_TABS = ["timers", "wake", "night"];
const SLEEP_TIMER_STEPS = [15, 30, 45, 60, 0];
const MORNING_KEYWORDS = [
  "morning", "sunrise", "coffee", "breakfast", "wake", "wakeup", "wake up",
  "calm", "soft", "easy", "acoustic", "chill", "lofi", "lo-fi", "pleasant",
];
const SCHEDULE_FORM_IDS = [
  "scheduledStartTimeInput",
  "scheduledStartPlayerSelect",
  "scheduledStartPlaylistSelect",
  "scheduledStartAfterRunSelect",
  "scheduledStartVolumeInput",
  "mobileNightStartInput",
  "mobileNightEndInput",
];

// ---------------------------------------------------------------------------
// Sleep timer: derived state

export function sleepTimerRemainingMs(card, now = Date.now()) {
  return remainingMsFor(card._state.mobileSleepTimerEndsAt || 0, now);
}

export function sleepTimerRemainingLabel(card) {
  return remainingLabelFor(sleepTimerRemainingMs(card));
}

function sleepTimerFooterLabel(card) {
  return footerLabelFor(sleepTimerRemainingMs(card));
}

export function sleepTimerChipVisible(card) {
  return chipVisibleFor(sleepTimerRemainingMs(card), card._state.mobileSleepTimerOrigin || "");
}

export function sleepTimerId(playerId = "") {
  const safePlayer = String(playerId || "player").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "player";
  return `sleep_${safePlayer}`;
}

// ---------------------------------------------------------------------------
// Sleep timer: Engine sync

async function syncSleepTimerToEngine(card, minutes = 15, source = "general", options = {}) {
  if (!card._maverickEngineEnabled()) return false;
  const playerId = String(card._state.mobileSleepTimerPlayer || card._state.selectedPlayer || card._getSelectedPlayer()?.entity_id || "").trim();
  const target = Number(card._state.mobileSleepTimerEndsAt || 0);
  if (!playerId || !target) return false;
  const ready = await card._maverickEngineReadyForPersistence();
  if (!ready) {
    if (card._maverickEngineRequired() || options.toast) {
      card._toastError(card._m("The Engine did not confirm the sleep timer."));
    }
    return false;
  }
  try {
    const result = await card._maverickEngineSetTimer({
      timer_id: sleepTimerId(playerId),
      timer_type: "sleep",
      player: playerId,
      action: "pause",
      minutes: Math.max(1, Number(minutes) || Math.ceil(sleepTimerRemainingMs(card) / 60000) || 1),
      ends_at: new Date(target).toISOString(),
      origin: normalizeSleepTimerOrigin(source),
      enabled: true,
    }, { required: true });
    if (!result) {
      card._toastError(card._m("The Engine did not confirm the sleep timer."));
      return false;
    }
    const confirmed = await confirmSleepTimerInEngine(card, sleepTimerId(playerId), playerId, target);
    if (!confirmed && (card._maverickEngineRequired() || options.toast)) {
      card._toastError("Maverick Music Engine accepted the timer write, but it was not found when reading it back.");
    }
    return confirmed;
  } catch (error) {
    if (card._maverickEngineRequired() || options.toast) card._toastError(error?.message || "Maverick Music Engine timer sync failed");
    return false;
  }
}

export async function confirmSleepTimerInEngine(card, timerId = "", playerId = "", expectedTarget = 0) {
  const id = String(timerId || "").trim();
  const player = String(playerId || "").trim();
  if ((!id && !player) || !card._maverickEngineEnabled()) return false;
  try {
    const result = await card._maverickEngineGetTimers({}, { required: true, timeoutMs: card._maverickEngineTimeoutMs() });
    const timers = Array.isArray(result?.timers) ? result.timers : [];
    const now = Date.now();
    return timers.some((timer) => {
      const timerType = String(timer?.type || timer?.timer_type || "sleep");
      const targetMs = Date.parse(timer?.ends_at || timer?.target_at || "");
      const matchesId = id && String(timer?.id || timer?.timer_id || "").trim() === id;
      const matchesPlayer = player && String(timer?.player || timer?.entity_id || "").trim() === player;
      return timerType === "sleep" && timer.enabled !== false && (matchesId || matchesPlayer)
        && Number.isFinite(targetMs) && targetMs > now
        && (!expectedTarget || Math.abs(targetMs - expectedTarget) < 1000);
    });
  } catch (_) {
    return false;
  }
}

async function deleteSleepTimerFromEngine(card, playerId = "", options = {}) {
  if (!card._maverickEngineEnabled()) return false;
  const player = String(playerId || card._state.mobileSleepTimerPlayer || card._state.selectedPlayer || card._getSelectedPlayer()?.entity_id || "").trim();
  if (!player) return false;
  const ready = await card._maverickEngineReadyForPersistence();
  if (!ready) {
    if (options.toast) card._toastError(card._m("The Engine could not confirm timer cancellation."));
    return false;
  }
  try {
    const result = await card._maverickEngineDeleteTimer({
      timer_id: sleepTimerId(player),
      player,
    }, { required: true });
    if (!result) return false;
    const confirmation = await card._maverickEngineGetTimers({}, { required: true, timeoutMs: card._maverickEngineTimeoutMs() });
    if (!Array.isArray(confirmation?.timers)) throw new Error("Unable to confirm timer cancellation");
    const remains = confirmation.timers.some((timer) => String(timer.id || timer.timer_id || "") === sleepTimerId(player));
    if (remains) throw new Error("The timer is still present in the Engine");
    return true;
  } catch (error) {
    if (card._maverickEngineRequired() || options.toast) card._toastError(error?.message || "Maverick Music Engine timer delete failed");
    return false;
  }
}

export async function hydrateSleepTimerFromEngine(card) {
  if (!card._maverickEngineEnabled()) return false;
  const result = await card._maverickEngineGetTimers();
  if (!Array.isArray(result?.timers)) return false;
  const timers = result.timers;
  const now = Date.now();
  const selectedPlayer = String(card._state.selectedPlayer || card._getSelectedPlayer()?.entity_id || "").trim();
  const activeSleepTimers = timers
    .filter((timer) => String(timer?.type || timer?.timer_type || "sleep") === "sleep")
    .map((timer) => ({ ...timer, targetMs: Date.parse(timer?.ends_at || "") }))
    .filter((timer) => timer.enabled !== false && Number.isFinite(timer.targetMs) && timer.targetMs > now)
    .sort((a, b) => a.targetMs - b.targetMs);
  const timer = (selectedPlayer ? activeSleepTimers.find((item) => String(item?.player || "") === selectedPlayer) : activeSleepTimers[0]) || null;
  if (!timer) {
    card._state.mobileSleepTimerEndsAt = 0;
    card._state.mobileSleepTimerPlayer = "";
    card._state.mobileSleepTimerOrigin = "";
    card._persistMobileAppearance();
    syncSleepTimerChip(card);
    return false;
  }
  card._state.mobileSleepTimerEndsAt = timer.targetMs;
  card._state.mobileSleepTimerPlayer = String(timer.player || selectedPlayer || "").trim();
  card._state.mobileSleepTimerOrigin = normalizeSleepTimerOrigin(timer.origin || "general");
  card._persistMobileAppearance();
  syncSleepTimerChip(card);
  return true;
}

// ---------------------------------------------------------------------------
// Sleep timer: actions

export async function setSleepTimerMinutes(card, minutes = 15, source = "general") {
  const amount = Math.max(1, Number(minutes) || 0);
  const player = card._getSelectedPlayer();
  if (!player?.entity_id) {
    card._toastError(card._i18n("ui.select_a_player_first"));
    return false;
  }
  const saved = await saveSleepTimerState(card, {
    mobileSleepTimerEndsAt: createSleepTimerTargetAt(amount, Date.now()),
    mobileSleepTimerPlayer: player.entity_id,
    mobileSleepTimerOrigin: normalizeSleepTimerOrigin(source),
    mobileSleepTimerMenuOpen: false,
  }, amount, source);
  if (!saved) return false;
  card._toastSuccess(card._i18n("ui.sleep_timer_set_minutes", { minutes: amount }));
  return saved;
}

export async function saveSleepTimerState(card, nextState, minutes, source) {
  if (card._sleepTimerSavePending) {
    card._toastError(card._m("A timer update is still in progress."));
    return false;
  }
  card._sleepTimerSavePending = true;
  const previous = Object.fromEntries(Object.keys(nextState).map((key) => [key, card._state[key]]));
  Object.assign(card._state, nextState);
  try {
    const engineSaved = await syncSleepTimerToEngine(card, minutes, source, { toast: true });
    if (!engineSaved && card._maverickEngineRequired()) {
      Object.assign(card._state, previous);
      return false;
    }
    card._persistMobileAppearance();
    return { ok: true, engineSaved };
  } catch (error) {
    Object.assign(card._state, previous);
    card._toastError(error?.message || card._m("Timer update failed."));
    return false;
  } finally {
    card._sleepTimerSavePending = false;
    card._syncNightModeUi();
    syncSleepTimerChip(card);
  }
}

export async function addSleepTimerMinutes(card, minutes = 15) {
  const amount = Math.max(1, Number(minutes) || 0);
  const player = card._getSelectedPlayer();
  const target = extendSleepTimerTargetAt(card._state.mobileSleepTimerEndsAt || 0, amount, Date.now());
  const saved = await saveSleepTimerState(card, {
    mobileSleepTimerEndsAt: target,
    mobileSleepTimerPlayer: player?.entity_id || card._state.mobileSleepTimerPlayer || card._state.selectedPlayer || "",
  }, Math.ceil((target - Date.now()) / 60000), card._state.mobileSleepTimerOrigin || "general");
  if (!saved) return false;
  card._toastSuccess(card._i18n("ui.sleep_timer_added_minutes", { minutes: amount }));
}

export function toggleSleepTimerMenu(card, force = null) {
  const next = typeof force === "boolean" ? force : !card._state.mobileSleepTimerMenuOpen;
  card._state.mobileSleepTimerMenuOpen = !!next && sleepTimerChipVisible(card);
  syncSleepTimerChip(card);
}

export async function clearSleepTimer(card, showToast = false) {
  if (card._sleepTimerSavePending) {
    if (showToast) card._toastError(card._m("A timer update is still in progress."));
    return false;
  }
  const timerPlayer = String(card._state.mobileSleepTimerPlayer || card._state.selectedPlayer || card._getSelectedPlayer()?.entity_id || "").trim();
  const deleted = await deleteSleepTimerFromEngine(card, timerPlayer, { toast: showToast });
  if (!deleted && card._maverickEngineRequired()) return false;
  card._state.mobileSleepTimerEndsAt = 0;
  card._state.mobileSleepTimerPlayer = "";
  card._state.mobileSleepTimerOrigin = "";
  card._state.mobileSleepTimerMenuOpen = false;
  card._persistMobileAppearance();
  card._syncNightModeUi();
  syncSleepTimerChip(card);
  if (showToast) {
    card._toast(card._i18n("ui.sleep_timer_cleared"));
  }
}

export async function cycleSleepTimer(card, source = "general") {
  const currentRemaining = sleepTimerRemainingMs(card);
  const normalizedSource = normalizeSleepTimerOrigin(source);
  if (!currentRemaining) {
    return setSleepTimerMinutes(card, SLEEP_TIMER_STEPS[0], normalizedSource);
  }
  const nextStep = nextSleepTimerStep(currentRemaining, SLEEP_TIMER_STEPS);
  if (!nextStep) {
    await clearSleepTimer(card, true);
    return;
  }
  return setSleepTimerMinutes(card, nextStep, normalizedSource === "night" ? normalizedSource : card._state.mobileSleepTimerOrigin || normalizedSource);
}

// ---------------------------------------------------------------------------
// Sleep timer: DOM

export function sleepTimerCornerInnerHtml(card) {
  const label = sleepTimerFooterLabel(card);
  const active = !!label && sleepTimerChipVisible(card);
  if (!active) return "";
  const menuOpen = !!card._state.mobileSleepTimerMenuOpen;
  return `
      <div class="sleep-timer-menu" id="sleepTimerMenu"${menuOpen ? `` : ` hidden`}>
        <button class="sleep-timer-menu-btn" data-sleep-timer-add="15">+15</button>
        <button class="sleep-timer-menu-btn" data-sleep-timer-add="30">+30</button>
        <button class="sleep-timer-menu-btn" data-sleep-timer-add="60">+60</button>
        <button class="sleep-timer-menu-btn danger" data-sleep-timer-clear>${card._esc(card._i18n("ui.cancel_2"))}</button>
        <button class="sleep-timer-menu-btn ghost" data-sleep-timer-close>${card._esc(card._i18n("ui.close"))}</button>
      </div>
      <button class="sleep-timer-chip active" id="sleepTimerChip" title="${card._esc(card._i18n("ui.sleep_timer"))}">
        ${card._iconSvg("timer")}
        <span id="sleepTimerChipLabel">${card._esc(label)}</span>
      </button>
    `;
}

export function sleepTimerFabHtml(card) {
  const label = sleepTimerFooterLabel(card);
  const active = !!label && sleepTimerChipVisible(card);
  return `
          <button class="mobile-art-fab mobile-timer-fab ${active ? "active" : ""}" id="mobileTimerBtn" title="${card._esc(card._i18n("ui.schedules"))}">
            ${card._iconSvg("timer")}
            <span class="mobile-timer-label" ${active ? "" : "hidden"}>${card._esc(active ? label : "")}</span>
          </button>
        `;
}

// The corner chip delegates its own buttons; any other click on the card closes the menu.
export function bindSleepTimerCorner(card) {
  card.$("sleepTimerCorner")?.addEventListener("click", async (e) => {
    const chipBtn = e.target.closest("#sleepTimerChip");
    if (chipBtn) {
      if (!card._pressUiButton(chipBtn)) return;
      toggleSleepTimerMenu(card);
      return;
    }
    const addBtn = e.target.closest("[data-sleep-timer-add]");
    if (addBtn) {
      await addSleepTimerMinutes(card, Number(addBtn.dataset.sleepTimerAdd || 15));
      toggleSleepTimerMenu(card, false);
      return;
    }
    const clearBtn = e.target.closest("[data-sleep-timer-clear]");
    if (clearBtn) {
      await clearSleepTimer(card, true);
      return;
    }
    const closeBtn = e.target.closest("[data-sleep-timer-close]");
    if (closeBtn) {
      toggleSleepTimerMenu(card, false);
    }
  });
  card.shadowRoot?.querySelector(".card")?.addEventListener("click", (e) => {
    const chip = e.target.closest?.("#sleepTimerChip");
    const menu = e.target.closest?.("#sleepTimerMenu");
    if (chip || menu) return;
    if (card._state.mobileSleepTimerMenuOpen) toggleSleepTimerMenu(card, false);
  });
}

export function syncSleepTimerState(card) {
  const target = Number(card._state.mobileSleepTimerEndsAt || 0);
  if (!target) return;
  if (target > Date.now()) return;
  const entityId = String(card._state.mobileSleepTimerPlayer || card._state.selectedPlayer || "").trim();
  card._state.mobileSleepTimerEndsAt = 0;
  card._state.mobileSleepTimerPlayer = "";
  card._state.mobileSleepTimerOrigin = "";
  card._state.mobileSleepTimerMenuOpen = false;
  card._persistMobileAppearance();
  syncSleepTimerChip(card);
  card._syncNightModeUi();
  if (entityId) {
    card._callMaverickEnginePlayerCommand(entityId, "pause").catch(() => {});
  }
  card._toastSuccess(card._i18n("ui.sleep_timer_finished"));
}

export function syncMobileTimerAction(card) {
  const btn = card.$("mobileTimerBtn");
  if (!btn) return;
  const remainingLabel = sleepTimerFooterLabel(card);
  const active = !!remainingLabel && sleepTimerChipVisible(card);
  const configured = card._mobileQuickActions().includes("timer");
  if (!active && !configured) {
    btn.hidden = true;
    btn.classList.add("hidden");
    return;
  }
  const label = btn.querySelector(".mobile-timer-label");
  btn.hidden = false;
  btn.classList.remove("hidden");
  btn.classList.toggle("active", active);
  btn.title = active
    ? card._i18n("ui.timer_active_remaining", { remaining: remainingLabel })
    : card._i18n("ui.schedules");
  if (label) {
    label.hidden = !active;
    label.textContent = active ? remainingLabel : "";
  }
}

export function syncSleepTimerChip(card) {
  const host = card.shadowRoot?.querySelector(".card");
  const remainingLabel = sleepTimerFooterLabel(card);
  const active = !!remainingLabel && sleepTimerChipVisible(card);
  const timerConfigured = card._mobileQuickActions().includes("timer");
  const needsTemporaryTimerUi = !immersivePlayerEnabled(card) && active && !timerConfigured && (
    (host?.classList.contains("layout-tablet") && !card.$("sleepTimerCorner"))
    || (!host?.classList.contains("layout-tablet") && !card.$("mobileTimerBtn"))
  );
  if (needsTemporaryTimerUi) {
    const reopenPage = card._state.menuOpen ? (card._state.menuPage || "sleep_timer") : "";
    card._rebuildMobileUi({ reopenPage, reopenStudio: card._state.controlRoomOpen });
    return;
  }
  host?.classList.toggle("has-sleep-timer", active);
  syncMobileTimerAction(card);
  const corner = card.$("sleepTimerCorner");
  if (!corner) return;
  if (!active) {
    card._state.mobileSleepTimerMenuOpen = false;
    if (corner.innerHTML !== "") corner.innerHTML = "";
    corner.hidden = true;
    return;
  }
  const nextHtml = sleepTimerCornerInnerHtml(card);
  if (corner.innerHTML !== nextHtml) corner.innerHTML = nextHtml;
  corner.hidden = false;
}

// ---------------------------------------------------------------------------
// Wake schedules: model

export function scheduledStartDays(card) {
  return card._normalizeNightModeDays(card._state.mobileStartTimerDays);
}

function newScheduledStartId() {
  return `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeScheduledStartSchedule(card, schedule = {}, index = 0) {
  const id = String(schedule?.id || "").trim() || `schedule_${index + 1}`;
  const volume = Math.max(0, Math.min(100, Number(schedule?.volume ?? schedule?.mobileStartTimerVolume ?? 35) || 35));
  const afterRun = ["disable", "off"].includes(String(schedule?.afterRun || schedule?.after_run || "").trim())
    ? "disable"
    : "keep";
  return {
    id,
    enabled: schedule?.enabled !== false,
    time: card._normalizeClockTime(schedule?.time || "07:00", "07:00"),
    player: String(schedule?.player || "").trim(),
    playlist: String(schedule?.playlist || "").trim(),
    playlistName: String(schedule?.playlistName || "").trim(),
    volume,
    days: card._normalizeNightModeDays(schedule?.days),
    lastRunKey: String(schedule?.lastRunKey || "").trim(),
    afterRun,
  };
}

export function scheduledStartSchedules(card) {
  const raw = Array.isArray(card._state.mobileStartSchedules) ? card._state.mobileStartSchedules : [];
  const schedules = raw
    .map((schedule, index) => normalizeScheduledStartSchedule(card, schedule, index))
    .filter((schedule, index, list) => schedule.id && list.findIndex((candidate) => candidate.id === schedule.id) === index);
  card._state.mobileStartSchedules = schedules;
  return schedules;
}

function activeScheduledStartSchedules(card) {
  return scheduledStartSchedules(card).filter((schedule) => schedule.enabled !== false);
}

function engineScheduleToScheduledStartSchedule(card, schedule = {}, index = 0) {
  const mediaId = String(schedule?.media_id || schedule?.media_content_id || schedule?.playlist || "").trim();
  return normalizeScheduledStartSchedule(card, {
    id: schedule?.id || schedule?.schedule_id || `engine_schedule_${index + 1}`,
    enabled: schedule?.enabled !== false,
    time: schedule?.time || "07:00",
    player: schedule?.player || schedule?.entity_id || "",
    playlist: mediaId,
    playlistName: schedule?.playlistName || schedule?.playlist_name || schedule?.media_name || schedule?.name || "",
    volume: schedule?.volume ?? 35,
    days: schedule?.days,
    lastRunKey: schedule?.lastRunKey || schedule?.last_run_key || "",
    afterRun: schedule?.afterRun || schedule?.after_run || "keep",
  }, index);
}

export function scheduledStartEnginePayload(card, schedule = {}) {
  const normalized = normalizeScheduledStartSchedule(card, schedule);
  const playlistLabel = normalized.playlistName || scheduledStartPlaylistLabel(card, normalized) || "";
  const mediaMode = normalized.playlist ? "selected" : "random_playlist";
  return {
    kind: "wake_playback",
    action: "wake_playback",
    schedule_id: String(normalized.id || "").trim(),
    name: playlistLabel || card._i18n("ui.scheduled_start"),
    player: scheduledStartPlayerId(card, normalized),
    media_id: normalized.playlist,
    playlist: normalized.playlist,
    media_type: "playlist",
    media_name: playlistLabel,
    playlist_name: playlistLabel,
    media_mode: mediaMode,
    selection_mode: mediaMode,
    enqueue: "play",
    time: normalized.time,
    days: card._normalizeNightModeDays(normalized.days),
    volume: Math.max(0, Math.min(100, Number(normalized.volume || 35) || 35)),
    enabled: normalized.enabled !== false,
    after_run: normalized.afterRun || "keep",
  };
}

function strictSchedulePlayers(card) {
  const seen = new Set();
  const players = [
    ...(Array.isArray(card._state.configurableMusicAssistantPlayers) ? card._state.configurableMusicAssistantPlayers : []),
    ...(Array.isArray(card._state.players) ? card._state.players : []),
  ];
  return players.filter((player) => {
    const entityId = String(player?.entity_id || "").trim();
    if (!entityId || seen.has(entityId) || !isPlayerAvailable(player)) return false;
    const strict = card._isDirectMaPlayer?.(player)
      || isMusicAssistantPlayer(player, card._hass?.entities?.[entityId]);
    if (!strict) return false;
    seen.add(entityId);
    return true;
  });
}

function scheduledStartPlayerId(card, schedule = null) {
  const configured = String(schedule?.player || card._state.mobileStartTimerPlayer || "").trim();
  if (configured && card._playerByEntityId(configured)) return configured;
  return String(card._state.selectedPlayer || card._getSelectedPlayer()?.entity_id || "").trim();
}

// ---------------------------------------------------------------------------
// Wake schedules: Engine sync

async function syncScheduleToEngine(card, schedule = {}, options = {}) {
  if (!card._maverickEngineEnabled()) return false;
  const payload = scheduledStartEnginePayload(card, schedule);
  if (!payload.player) return false;
  const ready = await card._maverickEngineReadyForPersistence();
  if (!ready) {
    if (card._maverickEngineRequired() || options.toast) {
      card._toastError(card._m("Saved locally, but Maverick Music Engine did not confirm the schedule."));
    }
    return false;
  }
  try {
    const result = await card._maverickEngineSetSchedule(payload, { required: true });
    if (!result) return false;
    const confirmed = await confirmScheduleInEngine(card, payload.schedule_id);
    if (!confirmed && (card._maverickEngineRequired() || options.toast)) {
      card._toastError("Maverick Music Engine accepted the schedule write, but it was not found when reading it back.");
    }
    return confirmed;
  } catch (error) {
    if (card._maverickEngineRequired() || options.toast) card._toastError(error?.message || "Maverick Music Engine schedule sync failed");
    return false;
  }
}

async function confirmScheduleInEngine(card, scheduleId = "") {
  const id = String(scheduleId || "").trim();
  if (!id || !card._maverickEngineEnabled()) return false;
  try {
    const result = await card._maverickEngineGetSchedules({}, { required: true, timeoutMs: card._maverickEngineTimeoutMs() });
    const schedules = Array.isArray(result?.schedules) ? result.schedules : [];
    return schedules.some((schedule) => String(schedule?.id || schedule?.schedule_id || "").trim() === id);
  } catch (_) {
    return false;
  }
}

async function deleteScheduleFromEngine(card, id = "", options = {}) {
  const scheduleId = String(id || "").trim();
  if (!scheduleId || !card._maverickEngineEnabled()) return false;
  const ready = await card._maverickEngineReadyForPersistence();
  if (!ready) return false;
  try {
    const result = await card._maverickEngineDeleteSchedule({ schedule_id: scheduleId }, { required: true });
    return !!result;
  } catch (error) {
    if (card._maverickEngineRequired() || options.toast) card._toastError(error?.message || "Maverick Music Engine schedule delete failed");
    return false;
  }
}

export async function hydrateSchedulesFromEngine(card) {
  if (!card._maverickEngineEnabled()) return false;
  const result = await card._maverickEngineGetSchedules();
  const engineSchedules = Array.isArray(result?.schedules) ? result.schedules : [];
  if (!engineSchedules.length) {
    scheduledStartSchedules(card).forEach((schedule) => syncScheduleToEngine(card, schedule).catch(() => {}));
    return false;
  }
  const schedules = engineSchedules.map((schedule, index) => engineScheduleToScheduledStartSchedule(card, schedule, index));
  card._state.mobileStartSchedules = schedules;
  card._state.mobileStartTimerEnabled = schedules.some((schedule) => schedule.enabled !== false);
  const editId = String(card._state.mobileStartScheduleEditId || "").trim();
  if (editId && !schedules.some((schedule) => schedule.id === editId)) card._state.mobileStartScheduleEditId = "";
  card._writeSchedulesToLocalStorage();
  return true;
}

// ---------------------------------------------------------------------------
// Wake schedules: playlists

export async function loadScheduledStartPlaylists(card, force = false) {
  const now = Date.now();
  const cached = Array.isArray(card._state.mobileStartTimerPlaylists)
    ? card._state.mobileStartTimerPlaylists
    : [];
  const fresh = cached.length && !force && (now - Number(card._state.mobileStartTimerPlaylistsFetchedAt || 0) < 10 * 60 * 1000);
  if (fresh || card._state.mobileStartTimerPlaylistsLoading) return cached;
  card._state.mobileStartTimerPlaylistsLoading = true;
  try {
    const [allPlaylists, likedPlaylists, randomPlaylists] = await Promise.allSettled([
      card._fetchLibrary("playlist", "sort_name", 500, false),
      card._fetchLibrary("playlist", "sort_name", 220, true),
      card._fetchLibrary("playlist", "random", 80, false),
    ]);
    const playlists = [
      ...(Array.isArray(allPlaylists.value) ? allPlaylists.value : []),
      ...(Array.isArray(likedPlaylists.value) ? likedPlaylists.value : []),
      ...(Array.isArray(randomPlaylists.value) ? randomPlaylists.value : []),
    ]
      .map((item) => card._normalizeMediaItem(item))
      .filter((item) => String(item?.uri || "").trim())
      .filter((item) => String(item?.media_type || "playlist").toLowerCase() === "playlist")
      .filter((item, index, list) => list.findIndex((candidate) => String(candidate?.uri || "").trim() === String(item?.uri || "").trim()) === index);
    card._state.mobileStartTimerPlaylists = playlists;
    card._state.mobileStartTimerPlaylistsFetchedAt = Date.now();
    if (!Array.isArray(card._state.mobileRecommendationPlaylists) || !card._state.mobileRecommendationPlaylists.length) {
      card._state.mobileRecommendationPlaylists = playlists.slice(0, 24);
      card._state.mobileRecommendationPlaylistsFetchedAt = Date.now();
    }
    return playlists;
  } catch (_) {
    return cached;
  } finally {
    card._state.mobileStartTimerPlaylistsLoading = false;
  }
}

function scheduledStartPlaylistLabel(card, schedule = null) {
  const selected = String(schedule?.playlist || card._state.mobileStartTimerPlaylist || "").trim();
  if (!selected) return card._i18n("ui.random_gentle_morning_mix");
  const playlists = Array.isArray(card._state.mobileStartTimerPlaylists) ? card._state.mobileStartTimerPlaylists : [];
  const match = playlists.find((item) => String(item?.uri || "").trim() === selected);
  return match?.name || match?.title || schedule?.playlistName || card._state.mobileStartTimerPlaylistName || card._i18n("ui.selected_playlist");
}

function scheduledStartPlaylistOptionsHtml(card, schedule = null) {
  const selected = String(schedule?.playlist || card._state.mobileStartTimerPlaylist || "").trim();
  const playlists = Array.isArray(card._state.mobileStartTimerPlaylists) ? card._state.mobileStartTimerPlaylists : [];
  const selectedKnown = selected && playlists.some((item) => String(item?.uri || "").trim() === selected);
  const options = [
    `<option value="" ${selected ? "" : "selected"}>${card._esc(card._i18n("ui.random_gentle_morning_mix"))}</option>`,
  ];
  if (selected && !selectedKnown) {
    options.push(`<option value="${card._esc(selected)}" selected>${card._esc(schedule?.playlistName || card._state.mobileStartTimerPlaylistName || card._i18n("ui.selected_playlist"))}</option>`);
  }
  playlists.forEach((item) => {
    const uri = String(item?.uri || "").trim();
    if (!uri) return;
    const name = item.name || item.title || uri;
    options.push(`<option value="${card._esc(uri)}" ${uri === selected ? "selected" : ""}>${card._esc(name)}</option>`);
  });
  return options.join("");
}

function pickScheduledStartPlaylist(card, playlists = [], schedule = null) {
  const selected = String(schedule?.playlist || card._state.mobileStartTimerPlaylist || "").trim();
  const candidates = (Array.isArray(playlists) ? playlists : [])
    .map((item) => card._normalizeMediaItem(item))
    .filter((item) => String(item?.uri || "").trim())
    .filter((item) => String(item?.media_type || "playlist").toLowerCase() === "playlist");
  if (!candidates.length) return null;
  if (selected) {
    const match = candidates.find((item) => String(item?.uri || "").trim() === selected);
    if (match) return match;
  }
  const morningMatches = candidates.filter((item) => {
    const haystack = [
      item?.name,
      item?.title,
      item?.metadata?.description,
      item?.description,
      item?.provider_label,
    ].filter(Boolean).join(" ").toLowerCase();
    return MORNING_KEYWORDS.some((keyword) => haystack.includes(keyword));
  });
  const pool = morningMatches.length ? morningMatches : candidates;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

function scheduledStartStatusLabel(card) {
  const schedules = scheduledStartSchedules(card);
  const activeSchedules = schedules.filter((schedule) => schedule.enabled !== false);
  if (!activeSchedules.length) {
    return card._i18n("ui.no_scheduled_start_is_active");
  }
  if (activeSchedules.length > 1) {
    return card._i18n("ui.scheduled_starts_active_count", { count: activeSchedules.length });
  }
  const schedule = activeSchedules[0];
  const player = card._playerByEntityId(scheduledStartPlayerId(card, schedule));
  const playerName = player?.attributes?.friendly_name || card._i18n("ui.selected_player_3");
  const dayLabels = card._nightModeDayOptions()
    .filter(([value]) => card._normalizeNightModeDays(schedule.days).includes(value))
    .map(([, label]) => label)
    .join(" ");
  const time = card._normalizeClockTime(schedule.time || "07:00", "07:00");
  const volume = Math.max(0, Math.min(100, Number(schedule.volume || 35) || 35));
  const playlist = scheduledStartPlaylistLabel(card, schedule);
  return `${time} · ${playerName} · ${playlist} · ${volume}% · ${dayLabels}`;
}

// ---------------------------------------------------------------------------
// Wake schedules: actions

export async function setScheduledStartFromMenu(card) {
  const timeInput = card.$("scheduledStartTimeInput");
  const playerSelect = card.$("scheduledStartPlayerSelect");
  const playlistSelect = card.$("scheduledStartPlaylistSelect");
  const volumeInput = card.$("scheduledStartVolumeInput");
  const afterRunSelect = card.$("scheduledStartAfterRunSelect");
  const checkedDays = Array.from(card.shadowRoot?.querySelectorAll("input[data-start-timer-day]:checked") || [])
    .map((input) => Number(input.dataset.startTimerDay))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  const playerId = String(playerSelect?.value || card._state.selectedPlayer || "").trim();
  if (!playerId) {
    card._toastError(card._i18n("ui.select_a_player_first"));
    return false;
  }
  const editId = String(card._state.mobileStartScheduleEditId || "").trim();
  const schedule = normalizeScheduledStartSchedule(card, {
    id: editId && editId !== "__new__" ? editId : newScheduledStartId(),
    enabled: true,
    time: card._normalizeClockTime(timeInput?.value || "07:00", "07:00"),
    player: playerId,
    playlist: String(playlistSelect?.value || "").trim(),
    playlistName: String(playlistSelect?.value || "").trim()
      ? String(playlistSelect?.selectedOptions?.[0]?.textContent || "").trim()
      : "",
    volume: Math.max(0, Math.min(100, Number(volumeInput?.value || 35) || 35)),
    days: card._normalizeNightModeDays(checkedDays),
    lastRunKey: "",
    afterRun: String(afterRunSelect?.value || "keep") === "disable" ? "disable" : "keep",
  });
  const schedules = scheduledStartSchedules(card);
  const existingIndex = schedules.findIndex((item) => item.id === schedule.id);
  if (existingIndex >= 0) schedules[existingIndex] = schedule;
  else schedules.push(schedule);
  card._state.mobileStartSchedules = schedules;
  card._state.mobileStartScheduleEditId = "";
  card._state.mobileStartTimerEnabled = schedules.some((item) => item.enabled !== false);
  card._state.mobileStartTimerTime = schedule.time;
  card._state.mobileStartTimerPlayer = schedule.player;
  card._state.mobileStartTimerPlaylist = schedule.playlist;
  card._state.mobileStartTimerPlaylistName = schedule.playlistName;
  card._state.mobileStartTimerVolume = schedule.volume;
  card._state.mobileStartTimerDays = schedule.days;
  card._state.mobileStartTimerLastRunKey = schedule.lastRunKey;
  card._state.mobileStartTimerAfterRun = schedule.afterRun || "keep";
  card._persistMobileAppearance();
  const engineSaved = await syncScheduleToEngine(card, schedule, { toast: true });
  card._toastSuccess(engineSaved
    ? card._m("Schedule saved to Maverick Music Engine")
    : card._i18n("ui.scheduled_start_saved"));
  return true;
}

export async function clearScheduledStart(card, showToast = false) {
  const editId = String(card._state.mobileStartScheduleEditId || "").trim();
  if (editId && editId !== "__new__") {
    card._state.mobileStartSchedules = scheduledStartSchedules(card).filter((schedule) => schedule.id !== editId);
    await deleteScheduleFromEngine(card, editId, { toast: showToast });
  } else if (!editId) {
    await Promise.allSettled(scheduledStartSchedules(card).map((schedule) => deleteScheduleFromEngine(card, schedule.id, { toast: false })));
    card._state.mobileStartSchedules = [];
  }
  card._state.mobileStartScheduleEditId = "";
  card._state.mobileStartTimerEnabled = activeScheduledStartSchedules(card).length > 0;
  card._state.mobileStartTimerLastRunKey = "";
  card._persistMobileAppearance();
  if (showToast) card._toast(card._i18n("ui.scheduled_start_cleared"));
}

export function editScheduledStart(card, id = "") {
  const schedule = scheduledStartSchedules(card).find((item) => item.id === id);
  if (!schedule) return false;
  card._state.mobileStartScheduleEditId = schedule.id;
  card._state.mobileStartTimerEnabled = schedule.enabled !== false;
  card._state.mobileStartTimerTime = schedule.time;
  card._state.mobileStartTimerPlayer = schedule.player;
  card._state.mobileStartTimerPlaylist = schedule.playlist;
  card._state.mobileStartTimerPlaylistName = schedule.playlistName;
  card._state.mobileStartTimerVolume = schedule.volume;
  card._state.mobileStartTimerDays = schedule.days;
  card._state.mobileStartTimerLastRunKey = schedule.lastRunKey || "";
  card._state.mobileStartTimerAfterRun = schedule.afterRun || "keep";
  return true;
}

export function newScheduledStartDraft(card) {
  card._state.mobileStartScheduleEditId = "__new__";
  card._state.mobileStartTimerEnabled = false;
  card._state.mobileStartTimerTime = "07:00";
  card._state.mobileStartTimerPlayer = card._state.selectedPlayer || "";
  card._state.mobileStartTimerPlaylist = "";
  card._state.mobileStartTimerPlaylistName = "";
  card._state.mobileStartTimerVolume = 35;
  card._state.mobileStartTimerDays = [0, 1, 2, 3, 4, 5, 6];
  card._state.mobileStartTimerLastRunKey = "";
  card._state.mobileStartTimerAfterRun = "keep";
}

export async function toggleScheduledStart(card, id = "") {
  const schedules = scheduledStartSchedules(card);
  const index = schedules.findIndex((schedule) => schedule.id === id);
  if (index < 0) return false;
  schedules[index] = { ...schedules[index], enabled: schedules[index].enabled === false };
  card._state.mobileStartSchedules = schedules;
  card._state.mobileStartTimerEnabled = schedules.some((item) => item.enabled !== false);
  card._persistMobileAppearance();
  await syncScheduleToEngine(card, schedules[index], { toast: true });
  return true;
}

export async function deleteScheduledStart(card, id = "") {
  const schedules = scheduledStartSchedules(card).filter((schedule) => schedule.id !== id);
  card._state.mobileStartSchedules = schedules;
  if (card._state.mobileStartScheduleEditId === id) card._state.mobileStartScheduleEditId = "";
  card._state.mobileStartTimerEnabled = schedules.some((item) => item.enabled !== false);
  card._persistMobileAppearance();
  await deleteScheduleFromEngine(card, id, { toast: true });
  return true;
}

async function runScheduledStart(card, entityId, schedule = null) {
  if (!entityId || card._state.mobileStartTimerRunPending) return;
  card._state.mobileStartTimerRunPending = true;
  try {
    const activeSchedule = schedule ? normalizeScheduledStartSchedule(card, schedule) : null;
    const volume = Math.max(0, Math.min(100, Number(activeSchedule?.volume ?? card._state.mobileStartTimerVolume ?? 35) || 35));
    await card._setPlayerVolumeFor(entityId, volume / 100);
    const playlists = await loadScheduledStartPlaylists(card);
    const pick = pickScheduledStartPlaylist(card, playlists, activeSchedule);
    let ok = false;
    if (pick?.uri) {
      ok = await card._playMediaOnPlayer(entityId, pick.uri, pick.media_type || "playlist", "play", {
        label: pick.name || pick.title || card._i18n("ui.morning_mix"),
        silent: true,
      });
    }
    if (!ok) {
      await card._callMaverickEnginePlayerCommand(entityId, "play");
    }
    const label = pick?.name || pick?.title || card._i18n("ui.scheduled_start");
    card._toastSuccess(card._i18n("ui.scheduled_start_activated_label", { label }));
  } catch (error) {
    card._toastError(error?.message || card._i18n("ui.scheduled_start_failed"));
  } finally {
    card._state.mobileStartTimerRunPending = false;
  }
}

// Local fallback tick. When the Engine is available it fires schedules itself.
export function syncScheduledStartState(card, date = new Date()) {
  const schedules = activeScheduledStartSchedules(card);
  if (!schedules.length) return;
  if (card._maverickEngineEnabled() && card._state.engineAvailable) return;
  let changed = false;
  schedules.forEach((schedule) => {
    const time = card._normalizeClockTime(schedule.time || "07:00", "07:00");
    const [hours, minutes] = time.split(":").map((part) => Number(part) || 0);
    if (date.getHours() !== hours || date.getMinutes() !== minutes) return;
    const enabledDays = new Set(card._normalizeNightModeDays(schedule.days));
    if (!enabledDays.has(Number(date.getDay()))) return;
    const runKey = `${schedule.id}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${time}`;
    if (schedule.lastRunKey === runKey) return;
    const entityId = scheduledStartPlayerId(card, schedule);
    if (!entityId) return;
    schedule.lastRunKey = runKey;
    if (schedule.afterRun === "disable") schedule.enabled = false;
    changed = true;
    runScheduledStart(card, entityId, schedule).catch((error) => {
      card._toastError(error?.message || card._i18n("ui.scheduled_start_failed"));
    });
  });
  if (changed) {
    const byId = new Map(card._state.mobileStartSchedules.map((schedule) => [schedule.id, schedule]));
    schedules.forEach((schedule) => byId.set(schedule.id, schedule));
    card._state.mobileStartSchedules = Array.from(byId.values());
    card._state.mobileStartTimerEnabled = card._state.mobileStartSchedules.some((schedule) => schedule.enabled !== false);
    card._persistMobileAppearance();
  }
}

// ---------------------------------------------------------------------------
// Form-editing guard: keeps periodic rebuilds from wiping a half-edited schedule.

export function isScheduleFormControl(target) {
  const el = target?.closest?.("input, select, textarea");
  if (!el) return false;
  const id = el.id || "";
  if (SCHEDULE_FORM_IDS.includes(id)) return true;
  return el.dataset?.startTimerDay !== undefined || el.dataset?.settingNightDay !== undefined;
}

export function markScheduleFormControlActive(card, target = null) {
  if (!isScheduleFormControl(target)) return false;
  card._state.mobileScheduleControlActiveUntil = Date.now() + 2500;
  return true;
}

export function isScheduleFormEditing(card) {
  if (!card._state.menuOpen || card._state.menuPage !== "sleep_timer") return false;
  const active = card.shadowRoot?.activeElement;
  return isScheduleFormControl(active)
    || Date.now() < Number(card._state.mobileScheduleControlActiveUntil || 0);
}

// ---------------------------------------------------------------------------
// Page: Timers / Wake / Night tabs

export function timersPageHtml(card) {
  card._loadPlayers();
  const remaining = sleepTimerRemainingLabel(card);
  const active = sleepTimerRemainingMs(card) > 0;
  const status = active
    ? card._m(`Active for ${remaining}`)
    : card._i18n("ui.no_sleep_timer_is_active");
  const schedules = scheduledStartSchedules(card);
  const editSchedule = schedules.find((schedule) => schedule.id === card._state.mobileStartScheduleEditId) || null;
  const showWakeEditor = !!editSchedule || card._state.mobileStartScheduleEditId === "__new__";
  const wakeDraftSchedule = showWakeEditor ? {
    id: editSchedule?.id || "__new__",
    time: card._state.mobileStartTimerTime || editSchedule?.time || "07:00",
    player: card._state.mobileStartTimerPlayer || editSchedule?.player || "",
    playlist: card._state.mobileStartTimerPlaylist ?? editSchedule?.playlist ?? "",
    playlistName: card._state.mobileStartTimerPlaylistName ?? editSchedule?.playlistName ?? "",
    volume: card._state.mobileStartTimerVolume ?? editSchedule?.volume ?? 35,
    days: card._state.mobileStartTimerDays || editSchedule?.days,
    afterRun: card._state.mobileStartTimerAfterRun || editSchedule?.afterRun || "keep",
  } : editSchedule;
  const scheduledTime = card._normalizeClockTime(wakeDraftSchedule?.time || "07:00", "07:00");
  const scheduledPlayer = scheduledStartPlayerId(card, wakeDraftSchedule);
  const scheduledVolume = Math.max(0, Math.min(100, Number(wakeDraftSchedule?.volume ?? 35) || 35));
  const scheduledDays = new Set(card._normalizeNightModeDays(wakeDraftSchedule?.days || card._state.mobileStartTimerDays));
  const scheduledAfterRun = String(wakeDraftSchedule?.afterRun || "keep") === "disable" ? "disable" : "keep";
  const nightMode = card._mobileNightMode();
  const nightWindow = card._nightModeWindow();
  const nightDays = new Set(card._nightModeDays());
  const activeTab = SCHEDULE_TABS.includes(card._state.mobileSchedulesTab) ? card._state.mobileSchedulesTab : "timers";
  const schedulePlayers = strictSchedulePlayers(card);
  const playerOptions = schedulePlayers.map((player) => {
    const name = player.attributes?.friendly_name || player.entity_id;
    return `<option value="${card._esc(player.entity_id)}" ${player.entity_id === scheduledPlayer ? "selected" : ""}>${card._esc(name)}</option>`;
  }).join("");
  const scheduleRows = schedules.length ? `
      <div class="schedule-list">
        ${schedules.map((schedule) => {
          const player = card._playerByEntityId(scheduledStartPlayerId(card, schedule));
          const playerName = player?.attributes?.friendly_name || card._i18n("ui.selected_player_3");
          const afterRunLabel = schedule.afterRun === "disable"
            ? card._i18n("ui.turns_off_after_run")
            : card._i18n("ui.stays_active");
          const days = card._nightModeDayOptions()
            .filter(([value]) => card._normalizeNightModeDays(schedule.days).includes(value))
            .map(([, label]) => label)
            .join(" ");
          return `
            <div class="schedule-row ${schedule.enabled === false ? "disabled" : ""} ${schedule.id === card._state.mobileStartScheduleEditId ? "editing" : ""}">
              <button class="schedule-row-main" data-start-schedule-edit="${card._esc(schedule.id)}">
                <span class="schedule-row-time">${card._esc(schedule.time)}</span>
                <span class="schedule-row-copy">
                  <span class="schedule-row-title">${card._esc(playerName)}</span>
                  <span class="schedule-row-sub">${card._esc(`${scheduledStartPlaylistLabel(card, schedule)} · ${schedule.volume}% · ${afterRunLabel} · ${days}`)}</span>
                </span>
              </button>
              <div class="schedule-row-actions">
                <button class="settings-pill ${schedule.enabled !== false ? "active" : ""}" data-start-schedule-toggle="${card._esc(schedule.id)}">${card._esc(schedule.enabled !== false ? card._i18n("ui.on") : card._i18n("ui.off"))}</button>
                <button class="settings-pill" data-start-schedule-delete="${card._esc(schedule.id)}">${card._iconSvg("trash")}</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    ` : `<div class="notice open">${card._i18n("ui.no_wake_schedules_yet")}</div>`;
  const timersHtml = `
      <div class="settings-group scheduled-start-card schedule-panel-card schedule-timers-card">
        <div class="settings-label">${card._esc(card._i18n("ui.sleep_timer_2"))}</div>
        <div class="settings-hint">${card._esc(status)}</div>
        <div class="sleep-timer-action-row ${active ? "with-cancel" : ""}" aria-label="${card._esc(card._i18n("ui.sleep_timer_presets"))}">
          <button class="sleep-timer-action-btn" data-sleep-timer-start="15">${card._esc(card._m("15 min"))}</button>
          <button class="sleep-timer-action-btn" data-sleep-timer-start="30">${card._esc(card._m("30 min"))}</button>
          <button class="sleep-timer-action-btn" data-sleep-timer-start="60">${card._esc(card._m("60 min"))}</button>
          ${active ? `<button class="sleep-timer-action-btn danger" data-sleep-timer-cancel>${card._esc(card._i18n("ui.cancel_2"))}</button>` : ``}
        </div>
      </div>
    `;
  const wakeHtml = `
      <div class="wake-schedule-layout">
        <div class="settings-group scheduled-start-card wake-schedule-list-card">
          <div class="settings-label">${card._esc(card._i18n("ui.wake_schedules"))}</div>
          <div class="settings-hint">${card._esc(scheduledStartStatusLabel(card))}</div>
          ${scheduleRows}
          <div class="settings-actions">
            <button class="settings-pill" data-start-schedule-new>${card._esc(card._i18n("ui.new_schedule"))}</button>
          </div>
        </div>
        ${showWakeEditor ? `<div class="settings-group scheduled-start-card wake-schedule-editor-card">
          <div class="settings-label">${card._esc(editSchedule ? card._i18n("ui.edit_schedule") : card._i18n("ui.new_wake_schedule"))}</div>
          <div class="scheduled-start-grid">
            <label class="night-time-card" for="scheduledStartTimeInput">
              <span class="night-time-label">${card._esc(card._i18n("ui.start_time"))}</span>
              <input class="night-time-input" id="scheduledStartTimeInput" data-schedule-form-control type="time" value="${card._esc(scheduledTime)}" step="60" aria-label="${card._esc(card._i18n("ui.start_time"))}">
            </label>
            <label class="scheduled-start-field" for="scheduledStartPlayerSelect">
              <span class="settings-label">${card._esc(card._i18n("ui.player_2"))}</span>
              <select class="media-sort-select settings-select" id="scheduledStartPlayerSelect" data-schedule-form-control aria-label="${card._esc(card._i18n("ui.player_2"))}">
                ${playerOptions || `<option value="">${card._esc(card._i18n("ui.no_players_found"))}</option>`}
              </select>
            </label>
            <label class="scheduled-start-field" for="scheduledStartPlaylistSelect">
              <span class="settings-label">${card._esc(card._i18n("ui.playlist"))}</span>
              <select class="media-sort-select settings-select" id="scheduledStartPlaylistSelect" data-schedule-form-control aria-label="${card._esc(card._i18n("ui.playlist"))}">
                ${scheduledStartPlaylistOptionsHtml(card, wakeDraftSchedule)}
              </select>
            </label>
            <label class="scheduled-start-field" for="scheduledStartAfterRunSelect">
              <span class="settings-label">${card._esc(card._i18n("ui.after_run"))}</span>
              <select class="media-sort-select settings-select" id="scheduledStartAfterRunSelect" data-schedule-form-control aria-label="${card._esc(card._i18n("ui.after_run"))}">
                <option value="keep" ${scheduledAfterRun === "keep" ? "selected" : ""}>${card._esc(card._i18n("ui.stay_active"))}</option>
                <option value="disable" ${scheduledAfterRun === "disable" ? "selected" : ""}>${card._esc(card._i18n("ui.turn_off"))}</option>
              </select>
            </label>
          </div>
          <div class="settings-range scheduled-volume-field">
            <div class="settings-label">${card._esc(card._i18n("ui.volume"))}</div>
            <input id="scheduledStartVolumeInput" data-schedule-form-control type="range" min="0" max="100" step="1" value="${card._esc(String(scheduledVolume))}">
            <div class="settings-value">${card._esc(String(scheduledVolume))}%</div>
          </div>
          <div class="settings-label">${card._esc(card._i18n("ui.active_days"))}</div>
          <div class="settings-check-grid">
            ${card._nightModeDayOptions().map(([value, label]) => `
              <label class="settings-check-pill">
                <input type="checkbox" data-schedule-form-control data-start-timer-day="${card._esc(String(value))}" ${scheduledDays.has(value) ? "checked" : ""}>
                <span>${card._esc(label)}</span>
              </label>`).join("")}
          </div>
          <div class="settings-actions">
            <button class="settings-pill active" data-start-timer-save>${card._esc(editSchedule ? card._i18n("ui.save_schedule") : card._i18n("ui.create_schedule"))}</button>
            ${editSchedule ? `<button class="settings-pill" data-start-timer-clear>${card._esc(card._i18n("ui.delete_schedule"))}</button>` : ``}
          </div>
        </div>` : ``}
      </div>
    `;
  const nightScheduleControlsHtml = nightMode === "auto"
    ? `
        <div class="scheduled-start-grid two-col">
          <label class="night-time-card" for="mobileNightStartInput">
            <span class="night-time-label">${card._esc(card._i18n("ui.start_time_2"))}</span>
            <input class="night-time-input" id="mobileNightStartInput" data-schedule-form-control type="time" value="${card._esc(nightWindow.start)}" step="60" aria-label="${card._esc(card._i18n("ui.start_time_2"))}">
          </label>
          <label class="night-time-card" for="mobileNightEndInput">
            <span class="night-time-label">${card._esc(card._i18n("ui.end_time"))}</span>
            <input class="night-time-input" id="mobileNightEndInput" data-schedule-form-control type="time" value="${card._esc(nightWindow.end)}" step="60" aria-label="${card._esc(card._i18n("ui.end_time"))}">
          </label>
        </div>
        <div class="settings-label">${card._esc(card._i18n("ui.active_days"))}</div>
        <div class="settings-check-grid">
          ${card._nightModeDayOptions().map(([value, label]) => `
            <label class="settings-check-pill">
              <input type="checkbox" data-schedule-form-control data-setting-night-day="${card._esc(String(value))}" ${nightDays.has(value) ? "checked" : ""}>
              <span>${card._esc(label)}</span>
            </label>`).join("")}
        </div>
        <div class="settings-actions">
          <button class="settings-pill active" data-setting-night-window-save>${card._esc(card._i18n("ui.apply_schedule"))}</button>
        </div>
      `
    : `<div class="notice open">${card._esc(nightMode === "on"
        ? card._i18n("ui.night_mode_stays_on_until_you_choose_another_mode")
        : card._i18n("ui.night_mode_is_off_until_you_choose_another_mode"))}</div>`;
  const nightHtml = `
      <div class="settings-group scheduled-start-card schedule-panel-card schedule-night-card">
        <div class="settings-label">${card._esc(card._i18n("ui.night_mode"))}</div>
        <div class="settings-pills">
          ${card._settingsPill(card._i18n("ui.off"), "off", nightMode, "data-setting-night-mode")}
          ${card._settingsPill("Auto", "auto", nightMode, "data-setting-night-mode")}
          ${card._settingsPill(card._i18n("ui.on"), "on", nightMode, "data-setting-night-mode")}
        </div>
        ${nightScheduleControlsHtml}
      </div>
    `;
  return `
      <div class="settings-shell">
        <div class="schedule-tabs" role="tablist" aria-label="${card._esc(card._i18n("ui.schedules"))}">
          <button class="settings-pill ${activeTab === "timers" ? "active" : ""}" data-schedule-tab="timers">${card._esc(card._i18n("ui.timers"))}</button>
          <button class="settings-pill ${activeTab === "wake" ? "active" : ""}" data-schedule-tab="wake">${card._esc(card._i18n("ui.wake"))}</button>
          <button class="settings-pill ${activeTab === "night" ? "active" : ""}" data-schedule-tab="night">${card._esc(card._i18n("ui.night"))}</button>
        </div>
        <div class="schedule-content">
          ${activeTab === "wake" ? wakeHtml : activeTab === "night" ? nightHtml : timersHtml}
        </div>
      </div>
    `;
}

export async function renderTimersPage(card, body, isCurrent) {
  body.innerHTML = card._loadingStateHtml(card._i18n("ui.loading_schedules"), { notice: true });
  await Promise.allSettled([
    hydrateSchedulesFromEngine(card),
    hydrateSleepTimerFromEngine(card),
  ]);
  await loadScheduledStartPlaylists(card);
  if (!isCurrent()) return;
  body.innerHTML = timersPageHtml(card);
}

// Returns true when the click belonged to this page and was handled.
export async function handleTimersMenuClick(card, e, eventTarget) {
  const scheduleTabBtn = eventTarget.closest("[data-schedule-tab]");
  if (scheduleTabBtn?.dataset.scheduleTab) {
    e.preventDefault();
    e.stopPropagation();
    card._state.mobileScheduleControlActiveUntil = 0;
    const tab = String(scheduleTabBtn.dataset.scheduleTab || "");
    card._state.mobileSchedulesTab = SCHEDULE_TABS.includes(tab) ? tab : "timers";
    card._persistMobileAppearance();
    await card._renderMobileMenu();
    return true;
  }
  const startScheduleNewBtn = eventTarget.closest("[data-start-schedule-new]");
  if (startScheduleNewBtn) {
    e.preventDefault();
    e.stopPropagation();
    card._state.mobileScheduleControlActiveUntil = 0;
    card._flashInteraction(startScheduleNewBtn);
    card._state.mobileSchedulesTab = "wake";
    newScheduledStartDraft(card);
    card._persistMobileAppearance();
    await card._renderMobileMenu();
    return true;
  }
  const startScheduleEditBtn = eventTarget.closest("[data-start-schedule-edit]");
  if (startScheduleEditBtn?.dataset.startScheduleEdit) {
    e.preventDefault();
    e.stopPropagation();
    card._state.mobileScheduleControlActiveUntil = 0;
    card._flashInteraction(startScheduleEditBtn);
    card._state.mobileSchedulesTab = "wake";
    editScheduledStart(card, startScheduleEditBtn.dataset.startScheduleEdit);
    card._persistMobileAppearance();
    await card._renderMobileMenu();
    return true;
  }
  const startScheduleToggleBtn = eventTarget.closest("[data-start-schedule-toggle]");
  if (startScheduleToggleBtn?.dataset.startScheduleToggle) {
    e.preventDefault();
    e.stopPropagation();
    card._state.mobileScheduleControlActiveUntil = 0;
    card._flashInteraction(startScheduleToggleBtn);
    await toggleScheduledStart(card, startScheduleToggleBtn.dataset.startScheduleToggle);
    await card._renderMobileMenu();
    return true;
  }
  const startScheduleDeleteBtn = eventTarget.closest("[data-start-schedule-delete]");
  if (startScheduleDeleteBtn?.dataset.startScheduleDelete) {
    e.preventDefault();
    e.stopPropagation();
    card._state.mobileScheduleControlActiveUntil = 0;
    card._flashInteraction(startScheduleDeleteBtn);
    await deleteScheduledStart(card, startScheduleDeleteBtn.dataset.startScheduleDelete);
    await card._renderMobileMenu();
    return true;
  }
  const sleepTimerStartBtn = eventTarget.closest("[data-sleep-timer-start]");
  if (sleepTimerStartBtn?.dataset.sleepTimerStart) {
    e.preventDefault();
    e.stopPropagation();
    card._flashInteraction(sleepTimerStartBtn);
    await setSleepTimerMinutes(card, Number(sleepTimerStartBtn.dataset.sleepTimerStart || 15), "general");
    await card._renderMobileMenu();
    return true;
  }
  const sleepTimerCancelBtn = eventTarget.closest("[data-sleep-timer-cancel]");
  if (sleepTimerCancelBtn) {
    e.preventDefault();
    e.stopPropagation();
    card._flashInteraction(sleepTimerCancelBtn);
    await clearSleepTimer(card, true);
    await card._renderMobileMenu();
    return true;
  }
  const startTimerSaveBtn = eventTarget.closest("[data-start-timer-save]");
  if (startTimerSaveBtn) {
    e.preventDefault();
    e.stopPropagation();
    card._state.mobileScheduleControlActiveUntil = 0;
    card._flashInteraction(startTimerSaveBtn);
    await setScheduledStartFromMenu(card);
    await card._renderMobileMenu();
    return true;
  }
  const startTimerClearBtn = eventTarget.closest("[data-start-timer-clear]");
  if (startTimerClearBtn) {
    e.preventDefault();
    e.stopPropagation();
    card._state.mobileScheduleControlActiveUntil = 0;
    card._flashInteraction(startTimerClearBtn);
    await clearScheduledStart(card, true);
    await card._renderMobileMenu();
    return true;
  }
  return false;
}

// Returns true when the change or input event belonged to the wake editor.
export function handleTimersFormChange(card, e) {
  const target = e.target;
  if (target?.id === "scheduledStartTimeInput") {
    if (target.value) card._state.mobileStartTimerTime = card._normalizeClockTime(target.value, card._state.mobileStartTimerTime || "07:00");
    return true;
  }
  if (target?.id === "scheduledStartPlayerSelect") {
    card._state.mobileStartTimerPlayer = String(target.value || "").trim();
    return true;
  }
  if (target?.id === "scheduledStartPlaylistSelect") {
    const playlist = String(target.value || "").trim();
    card._state.mobileStartTimerPlaylist = playlist;
    card._state.mobileStartTimerPlaylistName = playlist
      ? String(target.selectedOptions?.[0]?.textContent || "").trim()
      : "";
    return true;
  }
  if (target?.id === "scheduledStartAfterRunSelect") {
    card._state.mobileStartTimerAfterRun = String(target.value || "keep") === "disable" ? "disable" : "keep";
    return true;
  }
  if (target?.id === "scheduledStartVolumeInput") {
    const pct = Math.max(0, Math.min(100, Number(target.value || 0)));
    card._state.mobileStartTimerVolume = pct;
    const valueEl = target.closest(".scheduled-volume-field")?.querySelector(".settings-value");
    if (valueEl) valueEl.textContent = `${pct}%`;
    return true;
  }
  const startDayCheckbox = target?.closest?.("input[data-start-timer-day]");
  if (startDayCheckbox) {
    card._state.mobileStartTimerDays = card._normalizeNightModeDays(
      Array.from(card.shadowRoot?.querySelectorAll("input[data-start-timer-day]:checked") || [])
        .map((input) => Number(input.dataset.startTimerDay))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    );
    return true;
  }
  return false;
}
