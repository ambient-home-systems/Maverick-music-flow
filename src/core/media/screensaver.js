import { clampNumber, clampSeconds, normalizeScreensaverClockMode, normalizeScreensaverControlButtons } from "../state/mobile-settings.js";
import { cssUrl } from "../theme/css-url.js";

// Screensaver: the inactivity timer, the overlay with clock, artwork, next-up
// and optional controls, and the lyrics mode that mirrors the lyrics modal.
// Timers and visibility flags live on the card instance (card._screensaver*),
// so the card's lifecycle hooks can clear them without importing this module.

const DEFAULT_CONTROL_BUTTONS = ["previous", "next"];
const CONTROL_BUTTON_IDS = {
  previous: "screensaverPrevBtn",
  play_pause: "screensaverPlayPauseBtn",
  next: "screensaverNextBtn",
  mute: "screensaverMuteBtn",
  power: "screensaverPowerBtn",
  lyrics: "screensaverLyricsBtn",
  lyrics_sync: "screensaverLyricsSyncBtn",
  lyrics_font_minus: "screensaverLyricsFontMinusBtn",
  lyrics_font_plus: "screensaverLyricsFontPlusBtn",
  voice: "screensaverVoiceBtn",
};
const LYRICS_CONTROL_IDS = ["screensaverLyricsSyncBtn", "screensaverLyricsFontMinusBtn", "screensaverLyricsFontPlusBtn"];
const PLAYER_CONTROL_IDS = ["screensaverPrevBtn", "screensaverPlayPauseBtn", "screensaverNextBtn", "screensaverMuteBtn", "screensaverPowerBtn", "screensaverLyricsBtn", ...LYRICS_CONTROL_IDS];

// ---------------------------------------------------------------------------
// Settings. Each normaliser writes the clamped value back like the card did.

function screensaverSuppressedByEditor(card) {
  return card._isVisualEditorContext();
}

export function screensaverEnabled(card) {
  if (card._state.screensaverEnabled !== true) return false;
  const rect = card.getBoundingClientRect?.();
  const width = Math.max(
    Number(rect?.width || 0),
    Number(card.offsetWidth || 0),
    typeof window !== "undefined" ? Number(window.innerWidth || 0) : 0,
  );
  const height = Math.max(
    Number(rect?.height || 0),
    typeof window !== "undefined" ? Number(window.innerHeight || 0) : 0,
  );
  return width >= 760 && height >= 620;
}

function screensaverControlsEnabled(card) {
  return card._state.screensaverControlsEnabled === true;
}

export function screensaverAutoLyricsWhenPlaying(card) {
  return card._state.screensaverAutoLyricsWhenPlaying === true;
}

export function maybeOpenScreensaverLyricsForPlayback(card, player = card._getSelectedPlayer()) {
  if (!screensaverAutoLyricsWhenPlaying(card)) return false;
  if (card._state.lyricsOpen || card._state.screensaverLyricsOpen) return false;
  if (player?.state !== "playing") return false;
  card._state.screensaverLyricsOpen = true;
  return true;
}

export function screensaverControlButtons(card, options = {}) {
  const buttons = normalizeScreensaverControlButtons(card._state.screensaverControlButtons, [...DEFAULT_CONTROL_BUTTONS]);
  card._state.screensaverControlButtons = buttons;
  if (options.includeDisabled === true) return buttons;
  return screensaverControlsEnabled(card) ? buttons : [];
}

function controlButtonOptions(card) {
  return [
    { value: "previous", icon: "previous", label: card._i18n("ui.previous") },
    { value: "play_pause", icon: card._playPauseIconName(card._getSelectedPlayer()), label: card._i18n("ui.play_pause") },
    { value: "next", icon: "next", label: card._i18n("ui.next") },
    { value: "mute", icon: card._volumeIconName(card._getSelectedPlayer()), label: card._i18n("ui.mute") },
    { value: "power", icon: card._powerButtonIcon(), label: card._i18n("ui.auxiliary_button") },
    { value: "like", icon: card._currentMediaFavoriteState() ? "heart_filled" : "heart_outline", label: card._i18n("ui.like_2") },
    { value: "lyrics", icon: "lyrics", label: card._i18n("ui.lyrics") },
    { value: "lyrics_sync", icon: "sync", label: card._i18n("ui.sync_lyrics") },
    { value: "lyrics_font_minus", icon: "minus", label: card._i18n("ui.smaller_lyrics") },
    { value: "lyrics_font_plus", icon: "plus", label: card._i18n("ui.larger_lyrics") },
    { value: "voice", icon: "mic", label: card._flowAssistantLabel() },
  ];
}

export function screensaverControlButtonHtml(card, value = "") {
  const option = controlButtonOptions(card).find((item) => item.value === value);
  if (!option) return "";
  if (value === "voice" && !card._voiceAssistantEnabled()) return "";
  const id = CONTROL_BUTTON_IDS[value];
  if (!id) return "";
  const voiceAttrs = value === "voice" ? " data-screensaver-voice" : "";
  const pressedClass = value === "voice" && card._state.voiceAssistantListening ? " listening" : "";
  const activeClass = value === "lyrics_sync" && card._state.mobileLyricsSyncEnabled !== false ? " active" : "";
  const primaryClass = value === "play_pause" ? " primary" : "";
  return `<button class="screensaver-voice-btn screensaver-control-btn${primaryClass}${pressedClass}${activeClass}" id="${id}" data-screensaver-control="${card._esc(value)}"${voiceAttrs} title="${card._esc(option.label)}" aria-label="${card._esc(option.label)}">${card._iconSvg(option.icon)}</button>`;
}

export function screensaverClockMode(card) {
  const mode = normalizeScreensaverClockMode(card._state.screensaverClockMode);
  card._state.screensaverClockMode = mode;
  return mode;
}

export function screensaverClockSize(card) {
  const size = clampNumber(card._state.screensaverClockSize, 1, { min: 0.75, max: 1.45 });
  card._state.screensaverClockSize = size;
  return size;
}

export function screensaverClockX(card) {
  const x = clampNumber(card._state.screensaverClockX, 82, { min: 8, max: 92 });
  card._state.screensaverClockX = x;
  return x;
}

export function screensaverClockY(card) {
  const y = clampNumber(card._state.screensaverClockY, 24, { min: 8, max: 70 });
  card._state.screensaverClockY = y;
  return y;
}

export function syncScreensaverClockVars(card) {
  const host = card.shadowRoot?.querySelector?.(".card");
  if (!host) return;
  host.style.setProperty("--screensaver-clock-scale", screensaverClockSize(card).toFixed(2));
  host.style.setProperty("--screensaver-clock-x", `${screensaverClockX(card).toFixed(1)}%`);
  host.style.setProperty("--screensaver-clock-y", `${screensaverClockY(card).toFixed(1)}%`);
}

export function screensaverTimeoutSeconds(card) {
  const seconds = clampSeconds(card._state.screensaverTimeoutSeconds, 90, { min: 15, max: 3600 });
  card._state.screensaverTimeoutSeconds = seconds;
  return seconds;
}

export function screensaverMessage(card) {
  return String(card._state.screensaverMessage || "").trim();
}

// ---------------------------------------------------------------------------
// Inactivity timer and page visibility

function handleScreensaverActivity(card, event = null) {
  if (event && event.isTrusted === false) return;
  if (event?.target?.closest?.("[data-screensaver-control], [data-screensaver-voice]")) return;
  if (
    card._state.voiceAssistantKeepScreensaver === true
    && event?.target?.closest?.("#voiceAssistantDialog, .voice-assistant-panel")
  ) {
    return;
  }
  if (event?.target?.closest?.("#screensaverBackdrop")) {
    event.preventDefault?.();
    event.stopPropagation?.();
  }
  resetScreensaverTimer(card, { hide: true, activity: true });
}

export function startScreensaverVisibilityTracking(card) {
  if (card._screensaverVisibilityObserver || typeof IntersectionObserver === "undefined") {
    markScreensaverPageEntry(card, "connected");
    return;
  }
  card._screensaverVisibilityObserver = new IntersectionObserver((entries = []) => {
    const visible = entries.some((entry) => entry.isIntersecting && Number(entry.intersectionRatio || 0) > 0);
    const wasVisible = card._screensaverVisible !== false;
    card._screensaverVisibilityKnown = true;
    card._screensaverVisible = visible;
    if (visible && !wasVisible) {
      markScreensaverPageEntry(card, "visible");
    } else if (!visible && wasVisible) {
      pauseScreensaverWhileHidden(card);
    } else if (visible && card._screensaverPageEntryPending) {
      markScreensaverPageEntry(card, "visible");
    }
  }, { threshold: 0.01 });
  card._screensaverVisibilityObserver.observe(card);
}

export function stopScreensaverVisibilityTracking(card) {
  if (card._screensaverVisibilityObserver) {
    card._screensaverVisibilityObserver.disconnect();
    card._screensaverVisibilityObserver = null;
  }
  card._screensaverVisibilityKnown = false;
  card._screensaverVisible = true;
}

function pauseScreensaverWhileHidden(card) {
  clearTimeout(card._screensaverTimer);
  card._screensaverTimer = null;
  hideScreensaver(card);
}

export function markScreensaverPageEntry(card, reason = "entry") {
  card._screensaverPageEntryPending = true;
  card._screensaverPageEntryReason = reason;
  card._screensaverSuppressUntil = Date.now() + (screensaverTimeoutSeconds(card) * 1000);
  resetScreensaverTimer(card, { hide: true, activity: true });
}

export function resetScreensaverTimer(card, { hide = false, delayMs = null, activity = false } = {}) {
  clearTimeout(card._screensaverTimer);
  card._screensaverTimer = null;
  if (hide) hideScreensaver(card);
  if (screensaverSuppressedByEditor(card)) {
    hideScreensaver(card);
    return;
  }
  if (!screensaverEnabled(card) || !card.isConnected) return;
  if (card._screensaverVisibilityKnown && card._screensaverVisible === false) return;
  const defaultDelayMs = screensaverTimeoutSeconds(card) * 1000;
  if (activity || hide) {
    card._screensaverSuppressUntil = Date.now() + defaultDelayMs;
  }
  const timeoutMs = delayMs !== null && Number.isFinite(Number(delayMs))
    ? Math.max(500, Number(delayMs))
    : defaultDelayMs;
  card._screensaverTimer = setTimeout(() => {
    showScreensaver(card);
  }, timeoutMs);
}

// ---------------------------------------------------------------------------
// Open and close

export function screensaverBlocked(card) {
  return !!(
    screensaverSuppressedByEditor(card)
    || card._state.menuOpen
    || card._state.lyricsOpen
    || card.shadowRoot?.querySelector(".fan-catalogue,.volume-wheel-popover,.player-picker-fan:not([hidden])")
    || card.$("immersiveActionsToggle")?.getAttribute("aria-expanded") === "true"
    || card._state.controlRoomOpen
    || card._state.mobileHistoryDrawerOpen
    || (card._state.voiceAssistantDialogOpen && card._state.voiceAssistantKeepScreensaver !== true)
    || card.$("mobileQueueActionModal")?.classList?.contains("open")
    || card.$("mobileVolumePresetModal")?.classList?.contains("open")
    || card.$("mobileSmartVoiceModal")?.classList?.contains("open")
  );
}

export function showScreensaver(card, options = {}) {
  const force = options?.force === true;
  if (screensaverSuppressedByEditor(card)) {
    hideScreensaver(card);
    return;
  }
  if (!force && !screensaverEnabled(card)) return;
  const now = Date.now();
  const suppressUntil = Number(card._screensaverSuppressUntil || 0);
  if (!force && suppressUntil > now) {
    resetScreensaverTimer(card, { delayMs: suppressUntil - now });
    return;
  }
  if (!force && screensaverBlocked(card)) {
    resetScreensaverTimer(card, { delayMs: 2000 });
    return;
  }
  card._state.screensaverOpen = true;
  const overlay = card.$("screensaverBackdrop");
  if (!overlay) return;
  clearTimeout(card._screensaverExitTimer);
  card._screensaverExitTimer = null;
  card.classList.add("screensaver-page-open");
  card.shadowRoot?.querySelector?.(".card")?.classList?.add("screensaver-active");
  overlay.classList.remove("closing");
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  if (card._state.lyricsOpen) {
    card._state.screensaverLyricsOpen = true;
    card._closeLyricsModal?.({ preserveLyrics: true, sync: false });
  } else {
    maybeOpenScreensaverLyricsForPlayback(card, card._getSelectedPlayer());
  }
  if (card._lyricsSessionActive?.()) card._syncLyricsForCurrentTrack();
  card._ensureQueueSnapshot(true)
    .then(() => { if (card._state.screensaverOpen) syncScreensaverUi(card); })
    .catch(() => {});
  syncScreensaverUi(card);
  clearInterval(card._screensaverClockTimer);
  card._screensaverClockTimer = setInterval(() => syncScreensaverUi(card), 1000);
}

export function hideScreensaver(card) {
  const overlay = card.$("screensaverBackdrop");
  const wasVisible = !!(card._state.screensaverOpen || overlay?.classList?.contains("open") || overlay?.classList?.contains("closing"));
  if (!wasVisible) {
    card.classList.remove("screensaver-page-open");
    card.shadowRoot?.querySelector?.(".card")?.classList?.remove("screensaver-active");
    return;
  }
  card._state.screensaverOpen = false;
  card._screensaverLyricsInactiveSince = 0;
  card._state.screensaverLyricsOpen = false;
  if (!card._state.lyricsOpen) card._clearLyricsState?.();
  overlay?.classList.remove("open");
  overlay?.classList.add("closing");
  overlay?.setAttribute("aria-hidden", "true");
  if (card._state.voiceAssistantKeepScreensaver) {
    card._state.voiceAssistantKeepScreensaver = false;
    card._syncVoiceAssistantDialog();
  }
  clearInterval(card._screensaverClockTimer);
  card._screensaverClockTimer = null;
  clearTimeout(card._screensaverExitTimer);
  const finishHide = () => {
    if (card._state.screensaverOpen) return;
    overlay?.classList.remove("closing");
    card.classList.remove("screensaver-page-open");
    card.shadowRoot?.querySelector?.(".card")?.classList?.remove("screensaver-active");
    card._screensaverExitTimer = null;
    card._syncNowPlayingUI();
  };
  const reduceMotion = (() => {
    try { return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true; } catch { return false; }
  })();
  card._screensaverExitTimer = setTimeout(finishHide, reduceMotion ? 0 : 520);
}

export function restoreScreensaverIfOpen(card) {
  if (!card._state.screensaverOpen) return;
  const overlay = card.$("screensaverBackdrop");
  if (!overlay) return;
  clearTimeout(card._screensaverExitTimer);
  card._screensaverExitTimer = null;
  card.classList.add("screensaver-page-open");
  card.shadowRoot?.querySelector?.(".card")?.classList?.add("screensaver-active");
  overlay.classList.remove("closing");
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  syncScreensaverUi(card);
  if (!card._screensaverClockTimer) {
    card._screensaverClockTimer = setInterval(() => syncScreensaverUi(card), 1000);
  }
}

export function openTabletLyricsScreensaver(card) {
  if (card._layoutModeConfig() !== "tablet") return false;
  if (!card._getSelectedPlayer()) return false;
  if (screensaverSuppressedByEditor(card)) return false;
  card._screensaverSuppressUntil = 0;
  card._state.lyricsOpen = false;
  card._state.screensaverLyricsOpen = true;
  card._closeLyricsModal?.({ preserveLyrics: true, sync: false });
  showScreensaver(card, { force: true });
  syncScreensaverUi(card);
  return true;
}

// ---------------------------------------------------------------------------
// Artwork loaders

function setScreensaverImageHost(host, url = "", fallbackHtml = "") {
  if (!host) return;
  const nextUrl = String(url || "").trim();
  if (host.dataset.artUrl === nextUrl) return;
  host.dataset.artUrl = nextUrl;
  host.dataset.artReady = nextUrl ? "0" : "1";
  if (!nextUrl) {
    host.innerHTML = fallbackHtml;
    return;
  }
  const img = document.createElement("img");
  img.alt = "";
  img.decoding = "async";
  img.loading = "eager";
  const applyImage = () => {
    if (!host.isConnected || host.dataset.artUrl !== nextUrl) return;
    host.dataset.artReady = "1";
    host.replaceChildren(img);
  };
  img.addEventListener("load", applyImage, { once: true });
  img.addEventListener("error", () => {
    if (!host.isConnected || host.dataset.artUrl !== nextUrl) return;
    host.dataset.artReady = "1";
    host.innerHTML = fallbackHtml;
  }, { once: true });
  img.src = nextUrl;
  if (img.complete) applyImage();
}

function setScreensaverBackgroundArt(overlay, url = "") {
  if (!overlay) return;
  const nextUrl = String(url || "").trim();
  if (overlay.dataset.bgArtUrl === nextUrl) return;
  overlay.dataset.bgArtUrl = nextUrl;
  if (!nextUrl) {
    overlay.style.setProperty("--screensaver-art-url", "none");
    return;
  }
  const img = new Image();
  img.decoding = "async";
  const applyImage = () => {
    if (!overlay.isConnected || overlay.dataset.bgArtUrl !== nextUrl) return;
    overlay.style.setProperty("--screensaver-art-url", cssUrl(nextUrl));
  };
  img.addEventListener("load", applyImage, { once: true });
  img.addEventListener("error", () => {
    if (!overlay.isConnected || overlay.dataset.bgArtUrl !== nextUrl) return;
    if (!overlay.style.getPropertyValue("--screensaver-art-url")) {
      overlay.style.setProperty("--screensaver-art-url", "none");
    }
  }, { once: true });
  img.src = nextUrl;
  if (img.complete) applyImage();
}

// ---------------------------------------------------------------------------
// Lyrics mode

function screensaverLyricsModeActive(card, player = null) {
  if (!(card._state.lyricsOpen || card._state.screensaverLyricsOpen) || !card._state.screensaverOpen) {
    card._screensaverLyricsInactiveSince = 0;
    return false;
  }
  if (player?.state === "playing") {
    card._screensaverLyricsInactiveSince = 0;
    return true;
  }
  const now = Date.now();
  if (!card._screensaverLyricsInactiveSince) card._screensaverLyricsInactiveSince = now;
  const active = now - card._screensaverLyricsInactiveSince < 30000;
  if (!active) {
    card._state.screensaverLyricsOpen = false;
    if (!card._state.lyricsOpen) card._clearLyricsState?.();
  }
  return active;
}

function screensaverLyricsRows(card) {
  const lines = Array.isArray(card._state.lyricsLines) ? card._state.lyricsLines : [];
  if (lines.length) {
    const activeIndex = Math.max(0, card._currentLyricsActiveIndex(lines));
    return [
      { kind: "muted", text: lines[activeIndex - 1]?.text || "" },
      { kind: "current", text: lines[activeIndex]?.text || "" },
      { kind: "muted", text: lines[activeIndex + 1]?.text || "" },
    ].filter((row) => String(row.text || "").trim());
  }
  if (card._state.lyricsLoading) {
    return [{ kind: "current", text: card._i18n("ui.loading_lyrics") }];
  }
  const textRows = String(card._state.lyricsText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (textRows.length) {
    return textRows.map((text, index) => ({ kind: index === 0 ? "current" : "muted", text }));
  }
  return [{ kind: "current", text: card._i18n("ui.no_lyrics_found") }];
}

export function syncScreensaverLyricsUi(card, player = null) {
  const overlay = card.$("screensaverBackdrop");
  const host = card.$("screensaverLyrics");
  if (!overlay || !host) return;
  host.style?.setProperty("--lyrics-font-scale", card._lyricsFontScale().toFixed(2));
  const active = screensaverLyricsModeActive(card, player);
  overlay.classList.toggle("lyrics-mode", active);
  if (!active) {
    host.dataset.lyricsSignature = "";
    host.innerHTML = "";
    return;
  }
  const rows = screensaverLyricsRows(card);
  const signature = rows.map((row) => `${row.kind}:${row.text}`).join("\n");
  if (host.dataset.lyricsSignature === signature) return;
  host.dataset.lyricsSignature = signature;
  host.innerHTML = rows.map((row) => `
      <div class="screensaver-lyric-line ${card._esc(row.kind)}">${card._esc(row.text)}</div>
    `).join("");
}

// ---------------------------------------------------------------------------
// Per-second sync

export function syncScreensaverUi(card) {
  const overlay = card.$("screensaverBackdrop");
  if (!overlay) return;
  const mode = screensaverClockMode(card);
  const now = new Date();
  const player = card._getSelectedPlayer();
  const queueItem = card._state.maQueueState?.current_item || null;
  card._syncLocalSendspinMediaSession(player, queueItem);
  const art = card._currentArtworkUrl(player, queueItem, 720, { preferPlayerArtwork: true });
  const mediaTitle = player?.attributes?.media_title || queueItem?.media_item?.name || "";
  const mediaArtist = player?.attributes?.media_artist || (queueItem?.media_item?.artists || []).map((artistEntry) => artistEntry?.name).filter(Boolean).join(", ") || "";
  const hasMedia = !!(mediaTitle || mediaArtist || art);
  PLAYER_CONTROL_IDS.forEach((id) => {
    const btn = card.$(id);
    if (!btn) return;
    const available = id === "screensaverPowerBtn" ? !!card._hass : !!player;
    btn.disabled = !available;
    btn.setAttribute("aria-disabled", available ? "false" : "true");
  });
  card._setButtonIcon(card.$("screensaverPlayPauseBtn"), card._playPauseIconName(player));
  card._setButtonIcon(card.$("screensaverMuteBtn"), card._volumeIconName(player));
  const muteBtn = card.$("screensaverMuteBtn");
  if (muteBtn) muteBtn.classList.toggle("active", card._isMuted(player));
  const likeBtn = card.$("screensaverLikeBtn");
  if (likeBtn) {
    likeBtn.hidden = !hasMedia;
    likeBtn.disabled = !hasMedia;
    likeBtn.setAttribute("aria-disabled", hasMedia ? "false" : "true");
    const liked = card._currentMediaFavoriteState();
    likeBtn.classList.toggle("active", liked);
    card._setButtonIcon(likeBtn, liked ? "heart_filled" : "heart_outline");
  }
  const title = mediaTitle || card._i18n("ui.nothing_playing");
  const nextItem = card._mobileUpNextItem();
  const nextTitle = nextItem ? card._queueItemPrimaryTitle(nextItem) : "";
  const nextArtist = nextItem ? card._queueItemPrimaryArtist(nextItem) : "";
  const nextArt = nextItem ? card._queueItemImageUrl(nextItem, 96) : "";
  const message = screensaverMessage(card);
  overlay.classList.toggle("analog-mode", mode === "analog");
  overlay.classList.toggle("digital-mode", mode !== "analog");
  overlay.classList.toggle("empty-mode", !hasMedia);
  setScreensaverBackgroundArt(overlay, art);
  syncScreensaverLyricsUi(card, player);
  const lyricsBtn = card.$("screensaverLyricsBtn");
  const lyricsActive = overlay.classList.contains("lyrics-mode");
  if (lyricsBtn) {
    lyricsBtn.classList.toggle("active", lyricsActive);
    lyricsBtn.setAttribute("aria-pressed", lyricsActive ? "true" : "false");
  }
  LYRICS_CONTROL_IDS.forEach((id) => {
    const btn = card.$(id);
    if (!btn) return;
    btn.disabled = !lyricsActive;
    btn.setAttribute("aria-disabled", lyricsActive ? "false" : "true");
  });
  const lyricsSyncBtn = card.$("screensaverLyricsSyncBtn");
  if (lyricsSyncBtn) {
    const syncActive = lyricsActive && card._state.mobileLyricsSyncEnabled !== false;
    lyricsSyncBtn.classList.toggle("active", syncActive);
    lyricsSyncBtn.setAttribute("aria-pressed", syncActive ? "true" : "false");
  }
  const clock = card.$("screensaverClock");
  if (clock) {
    clock.textContent = new Intl.DateTimeFormat(card._language(), {
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);
  }
  setScreensaverImageHost(card.$("screensaverArt"), art, card._tabletBrandSignatureHtml("screensaver-empty-logo"));
  if (card.$("screensaverTitle")) card.$("screensaverTitle").textContent = title;
  if (card.$("screensaverArtist")) card.$("screensaverArtist").textContent = hasMedia ? (mediaArtist || card._selectedPlayerName()) : "";
  const messageEl = card.$("screensaverMessage");
  if (messageEl) {
    messageEl.hidden = !message;
    messageEl.textContent = message;
  }
  const nextEl = card.$("screensaverNext");
  if (nextEl) {
    nextEl.hidden = !nextTitle;
    if (nextTitle) {
      setScreensaverImageHost(card.$("screensaverNextArt"), nextArt, card._iconSvg("tracks"));
      if (card.$("screensaverNextLabel")) card.$("screensaverNextLabel").textContent = card._i18n("ui.up_next_2");
      if (card.$("screensaverNextTitle")) card.$("screensaverNextTitle").textContent = nextTitle;
      if (card.$("screensaverNextArtist")) card.$("screensaverNextArtist").textContent = nextArtist;
    }
  }
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + (seconds / 60);
  const hours = (now.getHours() % 12) + (minutes / 60);
  card.$("screensaverHour")?.style?.setProperty("--hand-rotation", `${hours * 30}deg`);
  card.$("screensaverMinute")?.style?.setProperty("--hand-rotation", `${minutes * 6}deg`);
  card.$("screensaverSecond")?.style?.setProperty("--hand-rotation", `${seconds * 6}deg`);
}

export function syncScreensaverDynamicArtwork(card) {
  const player = card._getSelectedPlayer();
  const art = card._currentArtworkUrl(player, card._state.maQueueState?.current_item || null, 720, { preferPlayerArtwork: true });
  card._syncDynamicThemeArtwork(art || "").catch(() => {});
}

// ---------------------------------------------------------------------------
// Overlay markup and bindings

export function screensaverOverlayHtml(card) {
  const buttons = screensaverControlButtons(card);
  const actionButtonsHtml = buttons
    .filter((value) => value !== "like")
    .map((value) => screensaverControlButtonHtml(card, value))
    .filter(Boolean)
    .join("");
  const likeButtonHtml = buttons.includes("like")
    ? `<button class="screensaver-voice-btn screensaver-control-btn screensaver-like-btn ${card._currentMediaFavoriteState() ? "active" : ""}" id="screensaverLikeBtn" data-screensaver-control="like" title="${card._esc(card._i18n("ui.like_2"))}" aria-label="${card._esc(card._i18n("ui.like_2"))}">${card._iconSvg(card._currentMediaFavoriteState() ? "heart_filled" : "heart_outline")}</button>`
    : "";
  return `<div class="screensaver-backdrop digital-mode" id="screensaverBackdrop" aria-hidden="true">
          <div class="screensaver-bg"></div>
          <div class="screensaver-brand" aria-hidden="true">${card._tabletBrandSignatureHtml("screensaver-brand-logo")}</div>
          ${actionButtonsHtml ? `<div class="screensaver-action-cluster" aria-hidden="false">${actionButtonsHtml}</div>` : ""}
          <div class="screensaver-shell">
            <div class="screensaver-art-wrap">
              <div class="screensaver-art" id="screensaverArt"></div>
              ${likeButtonHtml}
            </div>
            <div class="screensaver-info">
              <div class="screensaver-clock" id="screensaverClock">00:00</div>
              <div class="screensaver-analog-clock" aria-hidden="true">
                <span class="screensaver-hand hour" id="screensaverHour"></span>
                <span class="screensaver-hand minute" id="screensaverMinute"></span>
                <span class="screensaver-hand second" id="screensaverSecond"></span>
                <span class="screensaver-pin"></span>
              </div>
              <div class="screensaver-track">
                <div class="screensaver-title" id="screensaverTitle">${card._esc(card._i18n("ui.nothing_playing"))}</div>
                <div class="screensaver-artist" id="screensaverArtist"></div>
              </div>
              <div class="screensaver-lyrics" id="screensaverLyrics" aria-live="polite"></div>
              <div class="screensaver-next" id="screensaverNext" hidden>
                <span class="screensaver-next-label" id="screensaverNextLabel">${card._esc(card._i18n("ui.up_next_2"))}</span>
                <span class="screensaver-next-main">
                  <span class="screensaver-next-art" id="screensaverNextArt"></span>
                  <span class="screensaver-next-copy">
                    <span class="screensaver-next-title" id="screensaverNextTitle"></span>
                    <span class="screensaver-next-artist" id="screensaverNextArtist"></span>
                  </span>
                </span>
              </div>
              <div class="screensaver-message" id="screensaverMessage" hidden></div>
            </div>
          </div>
        </div>`;
}

// Any trusted tap or key on the card counts as activity, except on the
// screensaver's own controls. A tap on the overlay itself closes it.
export function bindScreensaver(card) {
  const activity = (event) => handleScreensaverActivity(card, event);
  const cardEl = card.shadowRoot.querySelector(".card");
  cardEl?.addEventListener("pointerdown", activity, { passive: false });
  cardEl?.addEventListener("keydown", activity);
  card.$("screensaverBackdrop")?.addEventListener("click", activity);
  card.$("screensaverVoiceBtn")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });
  card.$("screensaverVoiceBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!card._pressUiButton(e.currentTarget, [8, 18, 8])) return;
    card._startVoiceAssistantCommand({ keepScreensaver: true, ignoreWhenListening: true });
  });
  [...PLAYER_CONTROL_IDS, "screensaverLikeBtn"].forEach((id) => {
    card.$(id)?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
  });
  const onControl = (id, handler, haptic) => {
    card.$(id)?.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!card._pressUiButton(e.currentTarget, haptic)) return;
      await handler(e);
    });
  };
  onControl("screensaverPrevBtn", () => card._playerCmd("previous"));
  onControl("screensaverPlayPauseBtn", () => card._togglePlay());
  onControl("screensaverNextBtn", () => card._playerCmd("next"));
  onControl("screensaverMuteBtn", () => card._toggleMute());
  onControl("screensaverPowerBtn", () => card._runAuxiliaryButtonAction(0, { force: true }), [12, 18]);
  onControl("screensaverLyricsBtn", () => {
    const overlay = card.$("screensaverBackdrop");
    if (overlay?.classList?.contains("lyrics-mode")) {
      card._state.screensaverLyricsOpen = false;
      if (!card._state.lyricsOpen) card._clearLyricsState?.();
      syncScreensaverUi(card);
      return;
    }
    if (!card._getSelectedPlayer()) return;
    card._state.screensaverLyricsOpen = true;
    card._syncLyricsForCurrentTrack?.();
    syncScreensaverUi(card);
  });
  onControl("screensaverLyricsSyncBtn", () => { card._toggleLyricsSyncEnabled(); syncScreensaverUi(card); });
  onControl("screensaverLyricsFontMinusBtn", () => { card._nudgeLyricsFontScale(-0.08); syncScreensaverUi(card); });
  onControl("screensaverLyricsFontPlusBtn", () => { card._nudgeLyricsFontScale(0.08); syncScreensaverUi(card); });
  onControl("screensaverLikeBtn", (e) => card._toggleLikeCurrentMedia(e.currentTarget));
  if (card._screensaverPageEntryPending) {
    card._screensaverPageEntryPending = false;
    resetScreensaverTimer(card, { hide: true, activity: true });
  } else {
    resetScreensaverTimer(card);
    restoreScreensaverIfOpen(card);
  }
}

// ---------------------------------------------------------------------------
// Settings pills inside the Smart home section

export function screensaverSettingsPillsHtml(card) {
  const autoLyrics = screensaverAutoLyricsWhenPlaying(card);
  const enabled = card._state.screensaverEnabled ? "on" : "off";
  return `
          <div class="settings-label">${card._i18n("ui.screensaver", {}, "Screensaver")}</div>
          <div class="settings-pills">
            ${card._settingsPill(card._i18n("ui.enabled"), "on", enabled, "data-setting-screensaver")}
            ${card._settingsPill(card._i18n("ui.disabled"), "off", enabled, "data-setting-screensaver")}
          </div>
          <div class="settings-label">${card._esc(card._i18n("ui.lyrics_while_playing", {}, "Lyrics while playing"))}</div>
          <div class="settings-pills">
            ${card._settingsPill(card._i18n("ui.enabled"), "on", autoLyrics ? "on" : "off", "data-setting-screensaver-auto-lyrics")}
            ${card._settingsPill(card._i18n("ui.disabled"), "off", autoLyrics ? "on" : "off", "data-setting-screensaver-auto-lyrics")}
          </div>
          <div class="settings-hint">${card._esc(card._i18n("ui.screensaver_lyrics_while_playing_helper", {}, "When enabled, the screensaver opens directly in lyrics mode while music is playing, and stays in clock mode when idle."))}</div>`;
}

export function handleScreensaverSettingsClick(card, eventTarget) {
  const screensaverBtn = eventTarget.closest("[data-setting-screensaver]");
  if (screensaverBtn?.dataset.settingScreensaver) {
    card._flashInteraction(screensaverBtn);
    card._state.screensaverEnabled = screensaverBtn.dataset.settingScreensaver === "on";
    card._persistMobileAppearance();
    resetScreensaverTimer(card, { hide: true });
    card._reopenSettingsMenuPreservingScroll();
    return true;
  }
  const autoLyricsBtn = eventTarget.closest("[data-setting-screensaver-auto-lyrics]");
  if (autoLyricsBtn?.dataset.settingScreensaverAutoLyrics) {
    card._flashInteraction(autoLyricsBtn);
    card._state.screensaverAutoLyricsWhenPlaying = autoLyricsBtn.dataset.settingScreensaverAutoLyrics === "on";
    if (!card._state.screensaverAutoLyricsWhenPlaying && !card._state.lyricsOpen) {
      card._state.screensaverLyricsOpen = false;
      card._clearLyricsState?.();
    } else if (card._state.screensaverOpen) {
      maybeOpenScreensaverLyricsForPlayback(card);
    }
    card._persistMobileAppearance();
    syncScreensaverUi(card);
    card._reopenSettingsMenuPreservingScroll();
    return true;
  }
  return false;
}
