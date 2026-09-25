import { coerceLyricsRawText, extractCurrentLyricsRawText, parseLrcLyrics, stripLyricsTimestamps } from "./presentation.js";
import { actionIconSvg } from "./action-menu.js";
import { syncScreenDock } from "./screen-dock.js";
import { cssUrl } from "../theme/css-url.js";

// Lyrics: the modal, the karaoke highlight and the fetch chain. Embedded
// metadata wins, then Music Assistant, then LRCLIB only when the user opted
// in. The screensaver reuses the same session state for its lyrics mode.
// The lyrics cache and the in-flight bookkeeping live on the card instance.

const OFFSET_LIMIT_MS = 10000;
const FONT_SCALE_MIN = 0.75;
const FONT_SCALE_MAX = 1.4;

// ---------------------------------------------------------------------------
// Session

export function currentLyricsTrackKey(card) {
  const info = card._currentTrackInfo();
  const queueItem = card._state.maQueueState?.current_item || null;
  const player = card._getSelectedPlayer();
  return [
    card._getQueueItemStableId?.(queueItem),
    card._getQueueItemUri?.(queueItem),
    player?.attributes?.media_content_id,
    info.key,
    Math.round(Number(info.duration || 0) || 0),
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean).join("|");
}

export function lyricsSessionActive(card) {
  return !!(card._state.lyricsOpen || card._state.screensaverLyricsOpen);
}

export function clearLyricsState(card) {
  card._state.lyricsTrackKey = "";
  card._state.lyricsText = "";
  card._state.lyricsLoading = false;
  card._state.lyricsLines = [];
  card._state.lyricsActiveIndex = -1;
  card._lyricsRequestToken = "";
  card._lyricsRefreshQueued = false;
}

export async function fetchLyricsForCurrentTrack(card, { singleflight = false } = {}) {
  const info = card._currentTrackInfo();
  if (!info.title) return { text: "", source: "" };
  const cacheKey = info.key || info.title;
  const cached = card._cache.lyrics.get(cacheKey);
  if (cached) return cached;
  if (!singleflight) {
    card._lyricsFetches ||= new Map();
    if (card._lyricsFetches.has(cacheKey)) return card._lyricsFetches.get(cacheKey);
    const task = fetchLyricsForCurrentTrack(card, { singleflight: true });
    card._lyricsFetches.set(cacheKey, task);
    try { return await task; }
    finally { if (card._lyricsFetches.get(cacheKey) === task) card._lyricsFetches.delete(cacheKey); }
  }

  const embeddedRaw = extractCurrentLyricsRawText(card._state.maQueueState?.current_item || {});
  if (embeddedRaw) {
    const payload = {
      text: stripLyricsTimestamps(embeddedRaw),
      rawText: embeddedRaw,
      lrc: parseLrcLyrics(embeddedRaw),
      source: "metadata",
    };
    card._cache.lyrics.set(cacheKey, payload);
    return payload;
  }

  const queueItem = card._state.maQueueState?.current_item;
  const media = queueItem?.media_item || queueItem || {};
  const uri = String(media.uri || card._getSelectedPlayer?.()?.attributes?.media_content_id || "").trim();
  let maLyricsError = null;
  if (uri && (media.media_type || "track") === "track") {
    try {
      const track = await card._callEngineMaCommand("music/item_by_uri", { uri, allow_update_metadata: false });
      const embedded = extractCurrentLyricsRawText({ media_item: track });
      const result = embedded ? null : await card._callEngineMaCommand("metadata/get_track_lyrics", { track });
      const rawText = embedded || (Array.isArray(result) ? result[1] || result[0] : coerceLyricsRawText(result)) || "";
      if (rawText) {
        const payload = { text: stripLyricsTimestamps(rawText), rawText, lrc: parseLrcLyrics(rawText), source: "music_assistant" };
        card._cache.lyrics.set(cacheKey, payload);
        return payload;
      }
    } catch (error) { maLyricsError = error; }
  }

  if (card._config?.lrclib_lyrics_enabled !== true) {
    if (maLyricsError) throw maLyricsError;
    const payload = { text: "", rawText: "", lrc: [], source: "disabled" };
    return payload;
  }

  const params = new URLSearchParams();
  params.set("track_name", info.title);
  if (info.artist) params.set("artist_name", info.artist);
  if (info.album) params.set("album_name", info.album);
  if (info.duration) params.set("duration", String(Math.round(info.duration)));

  const parseLyrics = async (url) => {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return "";
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map((item) => coerceLyricsRawText(item)).find(Boolean) || "";
    }
    return coerceLyricsRawText(data);
  };

  const rawText = await parseLyrics(`https://lrclib.net/api/get?${params.toString()}`)
    || await parseLyrics(`https://lrclib.net/api/search?${params.toString()}`);
  const payload = {
    text: rawText ? stripLyricsTimestamps(rawText) : "",
    rawText: rawText || "",
    lrc: parseLrcLyrics(rawText),
    source: rawText ? "lrclib" : "",
  };
  if (rawText) card._cache.lyrics.set(cacheKey, payload);
  return payload;
}

// ---------------------------------------------------------------------------
// Preferences

export function lyricsSyncOffsetMs(card) {
  return Math.max(-OFFSET_LIMIT_MS, Math.min(OFFSET_LIMIT_MS, Number(card._state.mobileLyricsSyncOffsetMs || 0) || 0));
}

function lyricsSyncOffsetLabel(card) {
  const seconds = lyricsSyncOffsetMs(card) / 1000;
  return `${seconds > 0 ? "+" : ""}${seconds.toFixed(1)}s`;
}

export function setLyricsSyncOffset(card, offsetMs = 0) {
  card._state.mobileLyricsSyncOffsetMs = Math.max(-OFFSET_LIMIT_MS, Math.min(OFFSET_LIMIT_MS, Number(offsetMs || 0) || 0));
  card._persistMobileAppearance();
  const label = card.shadowRoot?.querySelector("#lyricsOffsetResetBtn");
  if (label) label.textContent = lyricsSyncOffsetLabel(card);
  syncLyricsHighlight(card, true);
}

export function nudgeLyricsSyncOffset(card, deltaMs = 0) {
  setLyricsSyncOffset(card, lyricsSyncOffsetMs(card) + (Number(deltaMs || 0) || 0));
}

export function lyricsFontScale(card) {
  return Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, Number(card._state.mobileLyricsFontScale || FONT_SCALE_MAX) || FONT_SCALE_MAX));
}

function lyricsFontScaleLabel(card) {
  return `${Math.round(lyricsFontScale(card) * 100)}%`;
}

export function setLyricsFontScale(card, value = 1) {
  card._state.mobileLyricsFontScale = Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, Number(value || 1) || 1));
  card._persistMobileAppearance();
  const sheet = card.shadowRoot?.querySelector(".lyrics-sheet");
  if (sheet) sheet.style.setProperty("--lyrics-font-scale", lyricsFontScale(card).toFixed(2));
  const label = card.shadowRoot?.querySelector("#lyricsFontResetBtn");
  if (label) label.textContent = lyricsFontScaleLabel(card);
  syncLyricsHighlight(card, true);
}

export function nudgeLyricsFontScale(card, delta = 0) {
  setLyricsFontScale(card, lyricsFontScale(card) + (Number(delta || 0) || 0));
}

export function toggleLyricsSyncEnabled(card) {
  card._state.mobileLyricsSyncEnabled = card._state.mobileLyricsSyncEnabled === false;
  card._persistMobileAppearance();
  const syncBtn = card.shadowRoot?.querySelector("#lyricsSyncBtn");
  if (syncBtn) {
    syncBtn.classList.toggle("active", card._state.mobileLyricsSyncEnabled !== false);
    syncBtn.setAttribute("aria-pressed", String(card._state.mobileLyricsSyncEnabled !== false));
  }
  syncScreenDock(card, card.$("lyricsBackdrop")?.querySelector(".lyrics-sheet"), "lyrics", () => closeLyricsModal(card));
  syncLyricsHighlight(card, true);
}

// ---------------------------------------------------------------------------
// Karaoke highlight

export function currentLyricsActiveIndex(card, lines = []) {
  const list = Array.isArray(lines) ? lines : [];
  if (!list.length) return -1;
  if (card._state.mobileLyricsSyncEnabled === false) return -1;
  const position = card._getCurrentPosition() + (lyricsSyncOffsetMs(card) / 1000);
  let activeIndex = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (Number(list[i]?.time || 0) <= position + 0.15) activeIndex = i;
    else break;
  }
  return activeIndex;
}

export function syncLyricsHighlight(card, force = false) {
  if (!card._state.lyricsOpen) return;
  const lines = Array.isArray(card._state.lyricsLines) ? card._state.lyricsLines : [];
  if (!lines.length) return;
  const timeline = card.shadowRoot?.querySelector("#lyricsTimeline");
  if (!timeline) return;
  timeline.classList.toggle("karaoke-active", card._state.mobileLyricsSyncEnabled !== false);
  if (card._state.mobileLyricsSyncEnabled === false) {
    card._state.lyricsActiveIndex = -1;
    timeline.querySelectorAll(".lyrics-line").forEach((row) => row.classList.remove("active"));
    timeline.querySelectorAll("[data-lyrics-word-time]").forEach((word) => word.classList.remove("sung"));
    return;
  }
  const activeIndex = currentLyricsActiveIndex(card, lines);
  if (activeIndex < 0) return;
  const wordPosition = card._getCurrentPosition() + lyricsSyncOffsetMs(card) / 1000;
  timeline.querySelectorAll("[data-lyrics-word-time]").forEach((word) => word.classList.toggle("sung", Number(word.dataset.lyricsWordTime) <= wordPosition));
  if (!force && activeIndex === card._state.lyricsActiveIndex) return;
  card._state.lyricsActiveIndex = activeIndex;
  syncScreensaverLyricsUi(card);
  timeline.querySelectorAll(".lyrics-line").forEach((row, index) => {
    row.classList.toggle("active", index === activeIndex);
  });
  const activeRow = timeline.querySelector(`.lyrics-line[data-lyrics-index="${activeIndex}"]`);
  const body = timeline.closest(".lyrics-body");
  if (activeRow && body) {
    const bodyRect = body.getBoundingClientRect();
    const rowRect = activeRow.getBoundingClientRect();
    const targetTop = body.scrollTop + rowRect.top - bodyRect.top - (body.clientHeight / 2) + (rowRect.height / 2);
    const maxTop = Math.max(0, body.scrollHeight - body.clientHeight);
    const nextTop = Math.max(0, Math.min(maxTop, targetTop));
    try {
      body.scrollTo({ top: nextTop, behavior: force ? "auto" : "smooth" });
    } catch (_) {
      body.scrollTop = nextTop;
    }
  }
}

// ---------------------------------------------------------------------------
// Screensaver lyrics mode: three rows around the active line while playing,
// dropped thirty seconds after playback stops.

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
    if (!card._state.lyricsOpen) clearLyricsState(card);
  }
  return active;
}

function screensaverLyricsRows(card) {
  const lines = Array.isArray(card._state.lyricsLines) ? card._state.lyricsLines : [];
  if (lines.length) {
    const activeIndex = Math.max(0, currentLyricsActiveIndex(card, lines));
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
  host.style?.setProperty("--lyrics-font-scale", lyricsFontScale(card).toFixed(2));
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
// Modal

export function closeLyricsModal(card, options = {}) {
  const backdrop = card.$("lyricsBackdrop");
  const host = card.shadowRoot?.querySelector(".card");
  const preserveLyrics = options.preserveLyrics === true || card._state.screensaverLyricsOpen === true;
  if (backdrop) {
    backdrop.classList.remove("open");
    backdrop.onclick = null;
    backdrop.innerHTML = "";
  }
  host?.classList.remove("lyrics-modal-open");
  card._state.lyricsOpen = false;
  if (!preserveLyrics) clearLyricsState(card);
  if (options.sync === false) return;
  const restoreFrame = () => {
    const currentCard = card.shadowRoot?.querySelector(".card");
    [currentCard, card.shadowRoot?.querySelector(".stage"), card.shadowRoot?.querySelector(".tablet-shell"), card.shadowRoot?.querySelector(".tablet-main")]
      .filter(Boolean)
      .forEach((el) => { try { el.scrollTop = 0; } catch (_) {} });
    void currentCard?.offsetHeight;
  };
  requestAnimationFrame(() => {
    card._syncNowPlayingUI();
    card._syncTabletAutoFitUi();
    if (typeof card._refreshMobileArtStack === "function") card._refreshMobileArtStack(true);
    restoreFrame();
    requestAnimationFrame(restoreFrame);
  });
}

function renderLyricsModalShell(card, title, subtitle, bodyHtml) {
  const backdrop = card.$("lyricsBackdrop");
  if (!backdrop) return;
  const offsetLabel = lyricsSyncOffsetLabel(card);
  const lyricsArt = card._currentArtworkUrl(card._getSelectedPlayer(), card._state.maQueueState?.current_item || null, 920, { preferPlayerArtwork: true });
  if (lyricsArt) {
    backdrop.style.setProperty("--lyrics-dynamic-art", cssUrl(lyricsArt));
    backdrop.classList.add("has-lyrics-art");
  } else {
    backdrop.style.removeProperty("--lyrics-dynamic-art");
    backdrop.classList.remove("has-lyrics-art");
  }
  backdrop.innerHTML = `
        <div class="lyrics-sheet" style="--lyrics-font-scale:${card._esc(lyricsFontScale(card).toFixed(2))}">
          <div class="lyrics-head">
            <div class="lyrics-title-wrap">
              <div class="lyrics-title-brand" aria-hidden="true">${card._tabletBrandSignatureHtml("lyrics-title-logo")}</div>
              <div class="lyrics-title">${card._esc(title || card._i18n("ui.track_lyrics"))}</div>
              <div class="lyrics-sub">${card._esc(subtitle || "")}</div>
            </div>
            <div class="lyrics-head-actions">
              <button class="lyrics-sync-btn" id="lyricsRetryBtn" title="${card._esc(card._i18n("ui.refresh"))}" aria-label="${card._esc(card._i18n("ui.refresh"))}" ${card._state.lyricsLoading ? "disabled" : ""}>${actionIconSvg(card, "history")}</button>
              <div class="lyrics-font-controls" title="${card._esc(card._i18n("ui.lyrics_font_size"))}">
                <button class="lyrics-offset-btn" id="lyricsFontMinusBtn" title="${card._esc(card._i18n("ui.smaller_lyrics"))}">−</button>
                <button class="lyrics-offset-label" id="lyricsFontResetBtn" title="${card._esc(card._i18n("ui.reset_lyrics_font_size"))}">${card._esc(lyricsFontScaleLabel(card))}</button>
                <button class="lyrics-offset-btn" id="lyricsFontPlusBtn" title="${card._esc(card._i18n("ui.larger_lyrics"))}">+</button>
              </div>
              <div class="lyrics-offset-controls" title="${card._esc(card._i18n("ui.lyrics_timing"))}">
                <button class="lyrics-offset-btn" id="lyricsOffsetMinusBtn" title="${card._esc(card._i18n("ui.lyrics_earlier"))}">−</button>
                <button class="lyrics-offset-label" id="lyricsOffsetResetBtn" title="${card._esc(card._i18n("ui.reset_lyrics_timing"))}">${card._esc(offsetLabel)}</button>
                <button class="lyrics-offset-btn" id="lyricsOffsetPlusBtn" title="${card._esc(card._i18n("ui.lyrics_later"))}">+</button>
              </div>
              <button class="lyrics-sync-btn ${card._state.mobileLyricsSyncEnabled !== false ? "active" : ""}" id="lyricsSyncBtn" ${card._state.lyricsLines?.length ? "" : "hidden"} aria-pressed="${card._state.mobileLyricsSyncEnabled !== false}" title="${card._esc(card._m("Karaoke · synced lines"))}">
                ${actionIconSvg(card, "karaoke")}
                <span>${card._esc(card._m("Karaoke"))}</span>
              </button>
              <button class="close-btn" id="lyricsCloseBtn" aria-label="${card._esc(card._i18n("ui.close"))}">${actionIconSvg(card, "close")}</button>
            </div>
          </div>
          <div class="lyrics-body">${bodyHtml}</div>
        </div>`;
  syncScreenDock(card, backdrop.querySelector(".lyrics-sheet"), "lyrics", () => closeLyricsModal(card));
  backdrop.classList.add("open");
  card.shadowRoot?.querySelector(".card")?.classList.add("lyrics-modal-open");
  backdrop.onclick = (e) => { if (e.target === backdrop) closeLyricsModal(card); };
  backdrop.querySelector("#lyricsCloseBtn")?.addEventListener("click", () => closeLyricsModal(card));
  backdrop.querySelector("#lyricsRetryBtn")?.addEventListener("click", () => {
    const info = card._currentTrackInfo();
    card._cache.lyrics.delete(info.key || info.title);
    openLyricsModal(card);
  });
  backdrop.querySelector("#lyricsSyncBtn")?.addEventListener("click", () => toggleLyricsSyncEnabled(card));
  backdrop.querySelector("#lyricsOffsetMinusBtn")?.addEventListener("click", () => nudgeLyricsSyncOffset(card, -500));
  backdrop.querySelector("#lyricsOffsetPlusBtn")?.addEventListener("click", () => nudgeLyricsSyncOffset(card, 500));
  backdrop.querySelector("#lyricsOffsetResetBtn")?.addEventListener("click", () => setLyricsSyncOffset(card, 0));
  backdrop.querySelector("#lyricsFontMinusBtn")?.addEventListener("click", () => nudgeLyricsFontScale(card, -0.08));
  backdrop.querySelector("#lyricsFontPlusBtn")?.addEventListener("click", () => nudgeLyricsFontScale(card, 0.08));
  backdrop.querySelector("#lyricsFontResetBtn")?.addEventListener("click", () => setLyricsFontScale(card, 1));
}

function lyricsTimelineHtml(card, lines = []) {
  return `
        <div class="lyrics-timeline" id="lyricsTimeline">
          ${lines.map((line, index) => `
            <div class="lyrics-line" data-lyrics-index="${index}" data-lyrics-time="${Number(line.time) || 0}">
              ${line.words?.length ? line.words.map((word) => `<span data-lyrics-word-time="${Number(word.time)}">${card._esc(word.text)}</span>`).join("") : card._esc(line.text || "")}
            </div>
          `).join("")}
        </div>`;
}

export async function renderLyricsModalForCurrentTrack(card, { force = false } = {}) {
  if (!lyricsSessionActive(card)) return;
  const info = card._currentTrackInfo();
  const trackKey = currentLyricsTrackKey(card) || info.key || info.title || "";
  if (!force && trackKey && card._state.lyricsTrackKey === trackKey) {
    syncLyricsHighlight(card);
    syncScreensaverLyricsUi(card);
    return;
  }
  const subtitle = [info.artist, info.album].filter(Boolean).join(" · ");
  card._state.lyricsTrackKey = trackKey;
  const lyricsSubtitle = subtitle.replace(/Ã‚Â·|Â·/g, "·");
  card._state.lyricsText = "";
  card._state.lyricsLines = [];
  card._state.lyricsActiveIndex = -1;
  card._state.lyricsLoading = true;
  const token = `${trackKey || Date.now()}-${Math.random()}`;
  card._lyricsRequestToken = token;
  if (card._state.lyricsOpen) {
    renderLyricsModalShell(
      card,
      info.title || card._i18n("ui.track_lyrics"),
      lyricsSubtitle,
      `<div class="lyrics-state">${card._esc(card._i18n("ui.loading_lyrics"))}</div>`,
    );
  }
  syncScreensaverLyricsUi(card);
  try {
    const payload = await fetchLyricsForCurrentTrack(card);
    if (!lyricsSessionActive(card) || card._lyricsRequestToken !== token) return;
    const text = payload?.text || "";
    const lines = Array.isArray(payload?.lrc) ? payload.lrc : [];
    card._state.lyricsText = text;
    card._state.lyricsLoading = false;
    card._state.lyricsLines = lines;
    card._state.lyricsActiveIndex = -1;
    if (card._state.lyricsOpen) {
      renderLyricsModalShell(
        card,
        info.title || card._i18n("ui.track_lyrics"),
        lyricsSubtitle,
        lines.length
          ? lyricsTimelineHtml(card, lines)
          : text
          ? `<pre class="lyrics-pre">${card._esc(text)}</pre>`
          : `<div class="lyrics-state">${card._esc(card._i18n("ui.no_lyrics_found"))}</div>`,
      );
    }
    syncScreensaverLyricsUi(card);
    if (lines.length) requestAnimationFrame(() => syncLyricsHighlight(card, true));
  } catch (_) {
    if (!lyricsSessionActive(card) || card._lyricsRequestToken !== token) return;
    card._state.lyricsText = "";
    card._state.lyricsLoading = false;
    card._state.lyricsLines = [];
    card._state.lyricsActiveIndex = -1;
    if (card._state.lyricsOpen) {
      renderLyricsModalShell(
        card,
        info.title || card._i18n("ui.track_lyrics"),
        lyricsSubtitle,
        `<div class="lyrics-state">${card._esc(card._i18n("ui.lyrics_unavailable_right_now"))}</div>`,
      );
    }
    syncScreensaverLyricsUi(card);
  }
}

export async function openLyricsModal(card) {
  const backdrop = card.$("lyricsBackdrop");
  if (!backdrop) return;
  card.shadowRoot.querySelector(".card")?.appendChild(backdrop);
  const info = card._currentTrackInfo();
  const trackKey = currentLyricsTrackKey(card) || info.key || info.title || "";
  const subtitle = [info.artist, info.album].filter(Boolean).join(" · ");
  card._state.lyricsOpen = true;
  card._state.lyricsTrackKey = trackKey;
  const lyricsSubtitle = subtitle.replace(/Ã‚Â·|Â·/g, "·");
  card._state.lyricsText = "";
  card._state.lyricsLines = [];
  card._state.lyricsActiveIndex = -1;
  card._state.lyricsLoading = true;
  const token = `${trackKey || Date.now()}-${Math.random()}`;
  card._lyricsRequestToken = token;
  renderLyricsModalShell(
    card,
    info.title || card._i18n("ui.track_lyrics"),
    lyricsSubtitle,
    `<div class="lyrics-state">${card._esc(card._i18n("ui.loading_lyrics"))}</div>`,
  );
  syncScreensaverLyricsUi(card);
  try {
    const payload = await fetchLyricsForCurrentTrack(card);
    if (!lyricsSessionActive(card) || card._lyricsRequestToken !== token) return;
    const text = payload?.text || "";
    const lines = Array.isArray(payload?.lrc) ? payload.lrc : [];
    card._state.lyricsText = text;
    card._state.lyricsLoading = false;
    card._state.lyricsLines = lines;
    card._state.lyricsActiveIndex = -1;
    if (card._state.lyricsOpen) {
      renderLyricsModalShell(
        card,
        info.title || card._i18n("ui.track_lyrics"),
        lyricsSubtitle,
        lines.length
          ? lyricsTimelineHtml(card, lines)
          : text
          ? `<pre class="lyrics-pre">${card._esc(text)}</pre>`
          : `<div class="lyrics-state">${card._esc(card._i18n("ui.no_lyrics_found"))}</div>`,
      );
    }
    syncScreensaverLyricsUi(card);
    if (lines.length) requestAnimationFrame(() => syncLyricsHighlight(card, true));
  } catch (_) {
    if (!lyricsSessionActive(card) || card._lyricsRequestToken !== token) return;
    card._state.lyricsText = "";
    card._state.lyricsLoading = false;
    card._state.lyricsLines = [];
    card._state.lyricsActiveIndex = -1;
    if (card._state.lyricsOpen) {
      renderLyricsModalShell(
        card,
        info.title || card._i18n("ui.track_lyrics"),
        lyricsSubtitle,
        `<div class="lyrics-state">${card._esc(card._i18n("ui.lyrics_unavailable_right_now"))}</div>`,
      );
    }
    syncScreensaverLyricsUi(card);
  }
}

export function syncLyricsForCurrentTrack(card, { force = false } = {}) {
  if (!lyricsSessionActive(card)) return;
  const trackKey = currentLyricsTrackKey(card);
  if (!force && trackKey && card._state.lyricsTrackKey === trackKey) {
    syncLyricsHighlight(card);
    syncScreensaverLyricsUi(card);
    return;
  }
  if (card._lyricsRefreshPromise) {
    card._lyricsRefreshQueued = true;
    return;
  }
  card._lyricsRefreshPromise = renderLyricsModalForCurrentTrack(card, { force: true })
    .catch(() => {})
    .finally(() => {
      card._lyricsRefreshPromise = null;
      if (card._lyricsRefreshQueued && lyricsSessionActive(card)) {
        card._lyricsRefreshQueued = false;
        syncLyricsForCurrentTrack(card, { force: true });
      }
    });
}
