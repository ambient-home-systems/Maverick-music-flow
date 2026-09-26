import { mobileDynamicThemeMode as derivedDynamicThemeMode } from "../state/derived.js";
import {
  buildDynamicThemePalette,
  clampRgbByte,
  dynamicThemeStrengthValue,
  normalizeMaPalette,
  resolveActiveAccentColor,
  resolveActiveAccentRgb,
  rgbToHsl,
  tunePaletteColor,
} from "../theme/palette.js";
import { cssUrl } from "../theme/css-url.js";

// Dynamic theme: the accent and surface palette taken from the current
// artwork (or supplied by the server), applied as custom properties on the
// host and the card, plus the same treatment for the library detail menu.
// The palette cache, the artwork token, the applied signature and the menu
// detail token keep their names on the card instance.

const DEFAULT_ACCENT = "#f5a623";

// ---------------------------------------------------------------------------
// Readers

export function mobileDynamicThemeMode(card) {
  if (card._performanceModeEnabled()) return "off";
  return derivedDynamicThemeMode(card._state);
}

export function dynamicThemePalette(card) {
  return mobileDynamicThemeMode(card) === "off" ? null : (card._state.mobileDynamicThemePalette || null);
}

export function activeAccentColor(card) {
  return resolveActiveAccentColor(dynamicThemePalette(card), card._state.mobileCustomColor || DEFAULT_ACCENT);
}

export function activeAccentRgb(card) {
  return resolveActiveAccentRgb(dynamicThemePalette(card), card._state.mobileCustomColor || DEFAULT_ACCENT);
}

function strengthValue(card) {
  return dynamicThemeStrengthValue(mobileDynamicThemeMode(card));
}

function styleSignature(card, artworkKey = "", artUrl = "") {
  const palette = dynamicThemePalette(card);
  const paletteKey = palette
    ? [
        palette.accent || "",
        palette.accent_rgb || "",
        palette.surface || "",
        palette.surface_rgb || "",
        palette.glow || "",
        palette.glow_rgb || "",
        palette.text || "",
      ].join(",")
    : "";
  return [
    artworkKey,
    artUrl,
    mobileDynamicThemeMode(card),
    card._effectiveTheme(),
    activeAccentColor(card),
    strengthValue(card),
    card._isHotelMode() ? "hotel" : "normal",
    paletteKey,
  ].join("||");
}

// ---------------------------------------------------------------------------
// Applying the palette

export function applyDynamicThemeStyles(card) {
  const host = card;
  const surface = card.shadowRoot?.querySelector(".card");
  const accent = activeAccentColor(card);
  const palette = dynamicThemePalette(card);
  const artworkUrl = String(card._state.mobileDynamicThemeArtworkUrl || "").trim();
  const artworkCssUrl = artworkUrl ? cssUrl(artworkUrl) : "";
  host.style?.setProperty("--accent-color", accent);
  host.style?.setProperty("--ma-accent", accent);
  if (artworkCssUrl) {
    host.style?.setProperty("--dynamic-art-url", artworkCssUrl);
    surface?.style?.setProperty("--dynamic-art-url", artworkCssUrl);
  } else {
    host.style?.removeProperty("--dynamic-art-url");
    surface?.style?.removeProperty("--dynamic-art-url");
  }
  if (surface) {
    surface.style?.setProperty("--accent-color", accent);
    surface.style?.setProperty("--ma-accent", accent);
    surface.classList.toggle("dynamic-theme", !!palette);
  }
  if (!palette) {
    host.style?.removeProperty("--dynamic-accent-rgb");
    host.style?.removeProperty("--dynamic-surface-rgb");
    host.style?.removeProperty("--dynamic-glow-rgb");
    host.style?.removeProperty("--dynamic-theme-strength");
    surface?.style?.removeProperty("--dynamic-accent-rgb");
    surface?.style?.removeProperty("--dynamic-surface-rgb");
    surface?.style?.removeProperty("--dynamic-glow-rgb");
    surface?.style?.removeProperty("--dynamic-theme-strength");
    return;
  }
  const pairs = {
    "--dynamic-accent-rgb": palette.accent_rgb || activeAccentRgb(card),
    "--dynamic-surface-rgb": palette.surface_rgb || activeAccentRgb(card),
    "--dynamic-glow-rgb": palette.glow_rgb || activeAccentRgb(card),
    "--dynamic-theme-strength": strengthValue(card),
  };
  Object.entries(pairs).forEach(([key, value]) => {
    host.style?.setProperty(key, value);
    surface?.style?.setProperty(key, value);
  });
}

export function applyDynamicThemeRenderState(card, artworkKey = "", artUrl = "") {
  const signature = styleSignature(card, artworkKey, artUrl);
  if (signature === card._mobileDynamicThemeAppliedSignature) return false;
  card._mobileDynamicThemeAppliedSignature = signature;
  applyDynamicThemeStyles(card);
  card._applyBackgroundMotionStyles();
  card._syncCurrentArtworkBackgrounds(artUrl);
  return true;
}

// ---------------------------------------------------------------------------
// Palette sources

export function currentServerDynamicThemePalette(card) {
  const player = card._getSelectedPlayer?.() || null;
  const attrs = player?.attributes || {};
  const currentQueueItem = card._state.maQueueState?.current_item || null;
  const currentMedia = currentQueueItem?.media_item || {};
  const rawCurrentMedia = player?.__maverickRawPlayer?.current_media || attrs.current_media || attrs.currentMedia || {};
  const candidates = [
    attrs.media_palette,
    attrs.current_media_palette,
    rawCurrentMedia?.palette,
    currentQueueItem?.palette,
    currentQueueItem?.media_palette,
    currentQueueItem?.streamdetails?.stream_metadata?.palette,
    currentMedia?.palette,
    currentMedia?.metadata?.palette,
  ];
  for (const candidate of candidates) {
    const palette = normalizeMaPalette(candidate, { mode: mobileDynamicThemeMode(card) });
    if (palette) return palette;
  }
  return null;
}

function libraryDetailServerPalette(card, detail = {}) {
  if (mobileDynamicThemeMode(card) === "off") return null;
  const mediaType = String(detail?.media_type || detail?.type || "").toLowerCase();
  const browse = mediaType === "album" ? card._albumBrowseState(detail) : null;
  const selectedAlbum = browse?.albums?.[browse.index] || null;
  const artistInfo = detail?.artistInfo || null;
  const candidates = [
    detail?.palette,
    detail?.media_palette,
    detail?.image_palette,
    detail?.color_palette,
    detail?.metadata?.palette,
    detail?.metadata?.media_palette,
    detail?.metadata?.image_palette,
    detail?.media_item?.palette,
    detail?.media_item?.media_palette,
    detail?.media_item?.metadata?.palette,
    detail?.album?.palette,
    detail?.album?.metadata?.palette,
    selectedAlbum?.palette,
    selectedAlbum?.media_palette,
    selectedAlbum?.metadata?.palette,
    artistInfo?.palette,
    artistInfo?.media_palette,
    artistInfo?.metadata?.palette,
  ];
  for (const candidate of candidates) {
    const palette = normalizeMaPalette(candidate, { mode: mobileDynamicThemeMode(card) });
    if (palette) return palette;
  }
  return null;
}

export async function extractDynamicThemePalette(card, artUrl = "") {
  const normalizedArt = String(artUrl || "").trim();
  const cacheKey = `${mobileDynamicThemeMode(card)}:${normalizedArt}`;
  if (!normalizedArt) return null;
  if (card._mobileDynamicThemePaletteCache.has(cacheKey)) {
    return card._mobileDynamicThemePaletteCache.get(cacheKey);
  }
  const promise = new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 40;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);
          let sum = [0, 0, 0];
          let sumWeight = 0;
          let vivid = [0, 0, 0];
          let vividWeight = 0;
          for (let index = 0; index < data.length; index += 16) {
            const alpha = (data[index + 3] || 0) / 255;
            if (alpha < 0.08) continue;
            const rgb = [data[index], data[index + 1], data[index + 2]];
            const [hue, saturation, lightness] = rgbToHsl(rgb);
            const balancedLight = 1 - Math.abs(lightness - 0.52);
            const weight = alpha * (0.35 + (saturation * 0.9) + (balancedLight * 0.55));
            sum = sum.map((entry, rgbIndex) => entry + (rgb[rgbIndex] * weight));
            sumWeight += weight;
            const vividSample = tunePaletteColor(rgb, { minSaturation: 0.48, minLightness: 0.4, maxLightness: 0.58 });
            const vividSampleWeight = alpha * (0.2 + (saturation * 1.9) + (balancedLight * 0.85) + (hue * 0.05));
            vivid = vivid.map((entry, rgbIndex) => entry + (vividSample[rgbIndex] * vividSampleWeight));
            vividWeight += vividSampleWeight;
          }
          if (!sumWeight || !vividWeight) {
            resolve(null);
            return;
          }
          const base = sum.map((entry) => clampRgbByte(entry / sumWeight));
          const vividTuple = vivid.map((entry) => clampRgbByte(entry / vividWeight));
          resolve(buildDynamicThemePalette({
            baseTuple: base,
            vividTuple,
            mode: mobileDynamicThemeMode(card),
          }));
        } catch (_) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = normalizedArt;
    } catch (_) {
      resolve(null);
    }
  });
  card._mobileDynamicThemePaletteCache.set(cacheKey, promise);
  const resolved = await promise;
  card._mobileDynamicThemePaletteCache.set(cacheKey, resolved);
  return resolved;
}

// ---------------------------------------------------------------------------
// Artwork sync

export async function syncDynamicThemeArtwork(card, artUrl = "") {
  const normalizedArt = String(artUrl || "").trim();
  const mode = mobileDynamicThemeMode(card);
  const artworkKey = normalizedArt ? `${mode}:${normalizedArt}` : "";
  if (mode === "off" || !normalizedArt) {
    card._mobileDynamicThemeToken += 1;
    card._state.mobileDynamicThemeArtwork = "";
    card._state.mobileDynamicThemeArtworkUrl = "";
    card._state.mobileDynamicThemePalette = null;
    applyDynamicThemeRenderState(card, `off:${normalizedArt}`, normalizedArt);
    card._syncAmbientLightForCurrentMedia("theme-off");
    return;
  }
  if (card._state.mobileDynamicThemeArtwork === artworkKey) {
    card._state.mobileDynamicThemeArtworkUrl = normalizedArt;
    const serverPalette = currentServerDynamicThemePalette(card);
    if (serverPalette) {
      card._state.mobileDynamicThemePalette = serverPalette;
      card._state.controlRoomRenderedHtml = "";
      card._state.controlRoomRenderSignature = "";
    }
    applyDynamicThemeRenderState(card, artworkKey, normalizedArt);
    card._syncAmbientLightForCurrentMedia("theme-cache");
    return;
  }
  card._state.mobileDynamicThemeArtwork = artworkKey;
  card._state.mobileDynamicThemeArtworkUrl = normalizedArt;
  const token = ++card._mobileDynamicThemeToken;
  const serverPalette = currentServerDynamicThemePalette(card);
  const palette = serverPalette || await extractDynamicThemePalette(card, normalizedArt);
  if (token !== card._mobileDynamicThemeToken) return;
  card._state.mobileDynamicThemePalette = palette;
  card._state.controlRoomRenderedHtml = "";
  card._state.controlRoomRenderSignature = "";
  applyDynamicThemeRenderState(card, artworkKey, normalizedArt);
  card._syncAmbientLightForCurrentMedia("theme-palette");
  if (card._state.controlRoomOpen) card._syncControlRoomUi();
}

// Drops the artwork palette without going through the render-state signature:
// the empty player has no artwork to derive from.
export function resetDynamicThemeArtwork(card) {
  card._mobileDynamicThemeToken += 1;
  card._state.mobileDynamicThemeArtwork = "";
  card._state.mobileDynamicThemeArtworkUrl = "";
  card._state.mobileDynamicThemePalette = null;
  applyDynamicThemeStyles(card);
}

// ---------------------------------------------------------------------------
// Library detail menu

export function setMenuDetailPalette(card, menu = null, palette = null) {
  if (!menu) return;
  const keys = [
    "--menu-detail-accent-rgb",
    "--menu-detail-surface-rgb",
    "--menu-detail-glow-rgb",
    "--ma-accent",
    "--accent-color",
  ];
  if (!palette) {
    keys.forEach((key) => menu.style.removeProperty(key));
    menu.classList.remove("has-menu-detail-palette");
    return;
  }
  const accentRgb = palette.accent_rgb || activeAccentRgb(card);
  const pairs = {
    "--menu-detail-accent-rgb": accentRgb,
    "--menu-detail-surface-rgb": palette.surface_rgb || accentRgb,
    "--menu-detail-glow-rgb": palette.glow_rgb || accentRgb,
    "--ma-accent": palette.accent || activeAccentColor(card),
    "--accent-color": palette.accent || activeAccentColor(card),
  };
  Object.entries(pairs).forEach(([key, value]) => menu.style.setProperty(key, value));
  menu.classList.add("has-menu-detail-palette");
}

export function clearMenuDetailTheme(card, menu = null) {
  if (!menu) return;
  card._menuDetailThemeToken += 1;
  menu.classList.remove("has-menu-detail-theme");
  setMenuDetailPalette(card, menu, null);
}

export function applyMenuDetailTheme(card, menu = null, detailArt = "", detail = {}) {
  if (!menu) return;
  const serverPalette = libraryDetailServerPalette(card, detail);
  menu.classList.toggle("has-menu-detail-theme", !!(detailArt || serverPalette));
  setMenuDetailPalette(card, menu, serverPalette);
  const token = ++card._menuDetailThemeToken;
  if (serverPalette || mobileDynamicThemeMode(card) === "off" || !detailArt) return;
  extractDynamicThemePalette(card, detailArt).then((palette) => {
    if (!palette || token !== card._menuDetailThemeToken) return;
    const currentMenu = card.$("mobileMenu");
    if (currentMenu !== menu || card._state.menuPage !== "media_detail") return;
    setMenuDetailPalette(card, menu, palette);
  }).catch(() => {});
}

export function applyMenuLibraryThemeFromItems(card, menu = null, items = [], mediaType = "") {
  if (!menu) return;
  const playingArt = card._currentArtworkUrl(card._getSelectedPlayer(), card._state.maQueueState?.current_item || null, 960);
  if (playingArt) {
    menu.style.setProperty("--menu-dynamic-art", cssUrl(playingArt));
    menu.classList.add("has-menu-art");
    clearMenuDetailTheme(card, menu);
    return;
  }
  const item = (Array.isArray(items) ? items : []).find((entry) => card._artUrl(entry, { size: 960 }));
  const art = item ? card._artUrl(item, { size: 960 }) : "";
  if (!item || !art) return;
  menu.style.setProperty("--menu-dynamic-art", cssUrl(art));
  menu.classList.add("has-menu-art");
  applyMenuDetailTheme(card, menu, art, { ...item, media_type: item.media_type || item.type || mediaType });
}

// ---------------------------------------------------------------------------
// Settings

export function dynamicThemeSettingsPillsHtml(card) {
  const dynamicThemeMode = mobileDynamicThemeMode(card);
  return `
          <div class="settings-label">${card._i18n("ui.dynamic_theme")}</div>
          <div class="settings-pills">
            ${card._settingsPill(card._i18n("ui.off"), "off", dynamicThemeMode, "data-setting-dynamic-theme")}
            ${card._settingsPill("Auto", "auto", dynamicThemeMode, "data-setting-dynamic-theme")}
            ${card._settingsPill(card._i18n("ui.strong"), "strong", dynamicThemeMode, "data-setting-dynamic-theme")}
          </div>`;
}

export function handleDynamicThemeSettingsClick(card, eventTarget) {
  const dynamicThemeBtn = eventTarget.closest("[data-setting-dynamic-theme]");
  if (!dynamicThemeBtn?.dataset.settingDynamicTheme) return false;
  card._flashInteraction(dynamicThemeBtn);
  card._state.mobileDynamicThemeMode = ["off", "auto", "strong"].includes(dynamicThemeBtn.dataset.settingDynamicTheme)
    ? dynamicThemeBtn.dataset.settingDynamicTheme
    : "auto";
  if (card._state.mobileDynamicThemeMode === "off") {
    card._state.mobileDynamicThemePalette = null;
  }
  card._persistMobileAppearance();
  applyDynamicThemeStyles(card);
  card._syncNowPlayingUI();
  card._reopenSettingsMenuPreservingScroll();
  return true;
}
