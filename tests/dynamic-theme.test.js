// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeAccentColor,
  activeAccentRgb,
  applyDynamicThemeRenderState,
  applyDynamicThemeStyles,
  applyMenuDetailTheme,
  applyMenuLibraryThemeFromItems,
  clearMenuDetailTheme,
  currentServerDynamicThemePalette,
  dynamicThemePalette,
  dynamicThemeSettingsPillsHtml,
  extractDynamicThemePalette,
  handleDynamicThemeSettingsClick,
  mobileDynamicThemeMode,
  resetDynamicThemeArtwork,
  setMenuDetailPalette,
  syncDynamicThemeArtwork,
} from "../src/core/media/dynamic-theme.js";

const { document, HTMLCanvasElement } = globalThis;
const READY = { accent: "#112233", accent_rgb: "17 34 51", surface_rgb: "1 2 3", glow_rgb: "4 5 6" };

function stubCard(state = {}) {
  const root = document.createElement("div");
  root.innerHTML = '<div class="card"></div><div id="mobileMenu"></div><span id="other"></span>';
  document.body.append(root);
  const card = {
    shadowRoot: root,
    style: document.createElement("div").style,
    $: (id) => root.querySelector(`#${id}`),
    _state: { mobileDynamicThemeMode: "auto", mobileDynamicThemePalette: null, mobileDynamicThemeArtwork: "", mobileDynamicThemeArtworkUrl: "", mobileCustomColor: "#f5a623", menuPage: "media_detail", controlRoomOpen: false, ...state },
    _mobileDynamicThemePaletteCache: new Map(),
    _mobileDynamicThemeToken: 0,
    _mobileDynamicThemeAppliedSignature: "",
    _menuDetailThemeToken: 0,
    _performanceModeEnabled: () => false,
    _effectiveTheme: () => "dark",
    _isHotelMode: () => false,
    _getSelectedPlayer: () => null,
    _albumBrowseState: () => null,
    _currentArtworkUrl: () => "",
    _artUrl: (item) => item?.image || "",
    _i18n: (key) => key,
    _settingsPill: (label, value, current, attr) => `<button class="settings-pill ${value === current ? "active" : ""}" ${attr}="${value}">${label}</button>`,
    _applyBackgroundMotionStyles: vi.fn(),
    _syncCurrentArtworkBackgrounds: vi.fn(),
    _syncAmbientLightForCurrentMedia: vi.fn(),
    _syncControlRoomUi: vi.fn(),
    _flashInteraction: vi.fn(),
    _persistMobileAppearance: vi.fn(),
    _syncNowPlayingUI: vi.fn(),
    _reopenSettingsMenuPreservingScroll: vi.fn(),
  };
  return { card, root, surface: root.querySelector(".card"), menu: root.querySelector("#mobileMenu") };
}

// A fake image pipeline: every image decodes to a 40x40 canvas of one colour.
function fakeImages(rgb = [200, 40, 40], { fail = false } = {}) {
  const loads = [];
  class FakeImage {
    set src(value) { this._src = value; loads.push(this); queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.())); }
  }
  vi.stubGlobal("Image", FakeImage);
  const data = new Uint8ClampedArray(40 * 40 * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255; }
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn(), getImageData: () => ({ data }) });
  return loads;
}

afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("readers", () => {
  it("derives the mode from state and performance, and the accent from the palette", () => {
    const { card } = stubCard({ mobileDynamicThemeMode: "STRONG" });
    expect(mobileDynamicThemeMode(card)).toBe("strong");
    card._performanceModeEnabled = () => true;
    expect(mobileDynamicThemeMode(card)).toBe("off");
    card._performanceModeEnabled = () => false;
    expect(dynamicThemePalette(card)).toBe(null);
    expect(activeAccentColor(card)).toBe("#f5a623");
    expect(activeAccentRgb(card)).toBe("245 166 35");
    card._state.mobileDynamicThemePalette = READY;
    expect(dynamicThemePalette(card)).toBe(READY);
    expect(activeAccentColor(card)).toBe("#112233");
    expect(activeAccentRgb(card)).toBe("17 34 51");
    card._state.mobileDynamicThemeMode = "off";
    expect(dynamicThemePalette(card)).toBe(null);
    expect(activeAccentColor(card)).toBe("#f5a623");
  });
  it("reads the server palette from the player and queue in priority order", () => {
    const { card } = stubCard();
    expect(currentServerDynamicThemePalette(card)).toBe(null);
    card._state.maQueueState = { current_item: { media_item: { metadata: { palette: { primary: "#336699" } } } } };
    const fromMedia = currentServerDynamicThemePalette(card);
    expect(fromMedia).toMatchObject({ accent: expect.stringMatching(/^#/), accent_rgb: expect.any(String), surface_rgb: expect.any(String), glow_rgb: expect.any(String) });
    card._getSelectedPlayer = () => ({ attributes: { media_palette: READY } });
    expect(currentServerDynamicThemePalette(card)).toBe(READY);
    card._state.mobileDynamicThemeMode = "off";
    expect(currentServerDynamicThemePalette(card)).toBe(READY);
  });
});

describe("applying styles", () => {
  it("sets and clears the custom properties on the host and the card", () => {
    const { card, surface } = stubCard({ mobileDynamicThemePalette: READY, mobileDynamicThemeArtworkUrl: "https://art/a.jpg" });
    applyDynamicThemeStyles(card);
    expect(card.style.getPropertyValue("--ma-accent")).toBe("#112233");
    expect(surface.style.getPropertyValue("--accent-color")).toBe("#112233");
    expect(surface.style.getPropertyValue("--dynamic-art-url")).toContain("https://art/a.jpg");
    expect(surface.style.getPropertyValue("--dynamic-accent-rgb")).toBe("17 34 51");
    expect(surface.style.getPropertyValue("--dynamic-surface-rgb")).toBe("1 2 3");
    expect(card.style.getPropertyValue("--dynamic-glow-rgb")).toBe("4 5 6");
    expect(card.style.getPropertyValue("--dynamic-theme-strength")).toBe("1");
    expect(surface.classList.contains("dynamic-theme")).toBe(true);
    card._state.mobileDynamicThemeMode = "strong";
    card._state.mobileDynamicThemePalette = { accent: "#445566" };
    applyDynamicThemeStyles(card);
    expect(surface.style.getPropertyValue("--dynamic-accent-rgb")).toBe("245 166 35");
    expect(surface.style.getPropertyValue("--ma-accent")).toBe("#445566");
    expect(surface.style.getPropertyValue("--dynamic-theme-strength")).toBe("1.35");
    card._state.mobileDynamicThemePalette = null;
    card._state.mobileDynamicThemeArtworkUrl = "";
    applyDynamicThemeStyles(card);
    expect(surface.classList.contains("dynamic-theme")).toBe(false);
    expect(surface.style.getPropertyValue("--dynamic-accent-rgb")).toBe("");
    expect(card.style.getPropertyValue("--dynamic-art-url")).toBe("");
    expect(surface.style.getPropertyValue("--ma-accent")).toBe("#f5a623");
  });
  it("re-applies only when the render signature changes", () => {
    const { card } = stubCard();
    expect(applyDynamicThemeRenderState(card, "auto:a", "a")).toBe(true);
    expect(card._applyBackgroundMotionStyles).toHaveBeenCalledTimes(1);
    expect(card._syncCurrentArtworkBackgrounds).toHaveBeenCalledWith("a");
    expect(applyDynamicThemeRenderState(card, "auto:a", "a")).toBe(false);
    card._state.mobileDynamicThemePalette = READY;
    expect(applyDynamicThemeRenderState(card, "auto:a", "a")).toBe(true);
    card._isHotelMode = () => true;
    expect(applyDynamicThemeRenderState(card, "auto:a", "a")).toBe(true);
    expect(card._syncCurrentArtworkBackgrounds).toHaveBeenCalledTimes(3);
  });
});

describe("extraction and artwork sync", () => {
  it("samples the artwork once per mode and url, sharing the in-flight promise", async () => {
    const loads = fakeImages([200, 40, 40]);
    const { card } = stubCard();
    expect(await extractDynamicThemePalette(card, "")).toBe(null);
    const [first, second] = await Promise.all([extractDynamicThemePalette(card, "https://art/a.jpg"), extractDynamicThemePalette(card, "https://art/a.jpg")]);
    expect(first).toBe(second);
    expect(first).toMatchObject({ accent: expect.stringMatching(/^#/), accent_rgb: expect.any(String) });
    expect(loads).toHaveLength(1);
    expect(loads[0].crossOrigin).toBe("anonymous");
    expect(await extractDynamicThemePalette(card, "https://art/a.jpg")).toBe(first);
    card._state.mobileDynamicThemeMode = "strong";
    const strong = await extractDynamicThemePalette(card, "https://art/a.jpg");
    expect(loads).toHaveLength(2);
    expect(strong).not.toBe(first);
    expect(card._mobileDynamicThemePaletteCache.size).toBe(2);
  });
  it("resolves null on decode failure or a missing canvas context", async () => {
    fakeImages([1, 2, 3], { fail: true });
    const { card } = stubCard();
    expect(await extractDynamicThemePalette(card, "https://art/bad.jpg")).toBe(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fakeImages([1, 2, 3]);
    HTMLCanvasElement.prototype.getContext.mockReturnValue(null);
    expect(await extractDynamicThemePalette(card, "https://art/none.jpg")).toBe(null);
  });
  it("syncs the artwork palette with the off, cached and fresh paths and a stale-token guard", async () => {
    fakeImages([30, 120, 200]);
    const { card, surface } = stubCard();
    await syncDynamicThemeArtwork(card, "https://art/a.jpg");
    expect(card._state.mobileDynamicThemeArtwork).toBe("auto:https://art/a.jpg");
    expect(card._state.mobileDynamicThemePalette).toMatchObject({ accent: expect.any(String) });
    expect(surface.classList.contains("dynamic-theme")).toBe(true);
    expect(card._syncAmbientLightForCurrentMedia).toHaveBeenLastCalledWith("theme-palette");
    expect(card._syncControlRoomUi).not.toHaveBeenCalled();
    card._state.controlRoomRenderedHtml = "stale";
    card._getSelectedPlayer = () => ({ attributes: { media_palette: READY } });
    await syncDynamicThemeArtwork(card, "https://art/a.jpg");
    expect(card._state.mobileDynamicThemePalette).toBe(READY);
    expect(card._state.controlRoomRenderedHtml).toBe("");
    expect(card._syncAmbientLightForCurrentMedia).toHaveBeenLastCalledWith("theme-cache");
    card._getSelectedPlayer = () => null;
    card._state.controlRoomOpen = true;
    const pending = syncDynamicThemeArtwork(card, "https://art/b.jpg");
    resetDynamicThemeArtwork(card);
    await pending;
    expect(card._state.mobileDynamicThemePalette).toBe(null);
    expect(card._state.mobileDynamicThemeArtwork).toBe("");
    expect(surface.classList.contains("dynamic-theme")).toBe(false);
    await syncDynamicThemeArtwork(card, "https://art/c.jpg");
    expect(card._syncControlRoomUi).toHaveBeenCalledTimes(1);
    await syncDynamicThemeArtwork(card, "");
    expect(card._state.mobileDynamicThemeArtworkUrl).toBe("");
    expect(card._syncAmbientLightForCurrentMedia).toHaveBeenLastCalledWith("theme-off");
    card._state.mobileDynamicThemeMode = "off";
    await syncDynamicThemeArtwork(card, "https://art/d.jpg");
    expect(card._state.mobileDynamicThemePalette).toBe(null);
    expect(card._mobileDynamicThemeToken).toBe(6);
  });
});

describe("library detail menu", () => {
  it("sets and clears the detail palette and theme class", () => {
    const { card, menu } = stubCard();
    setMenuDetailPalette(card, menu, { accent: "#123456" });
    expect(menu.style.getPropertyValue("--menu-detail-accent-rgb")).toBe("245 166 35");
    expect(menu.style.getPropertyValue("--ma-accent")).toBe("#123456");
    expect(menu.classList.contains("has-menu-detail-palette")).toBe(true);
    setMenuDetailPalette(card, menu, READY);
    expect(menu.style.getPropertyValue("--menu-detail-surface-rgb")).toBe("1 2 3");
    menu.classList.add("has-menu-detail-theme");
    clearMenuDetailTheme(card, menu);
    expect(menu.className).toBe("");
    expect(menu.style.getPropertyValue("--ma-accent")).toBe("");
    expect(card._menuDetailThemeToken).toBe(1);
    expect(() => clearMenuDetailTheme(card, null)).not.toThrow();
  });
  it("applies a server palette immediately and an extracted one only while the page stays open", async () => {
    fakeImages([90, 200, 60]);
    const { card, menu } = stubCard();
    applyMenuDetailTheme(card, menu, "https://art/detail.jpg", { palette: READY });
    expect(menu.classList.contains("has-menu-detail-theme")).toBe(true);
    expect(menu.style.getPropertyValue("--ma-accent")).toBe("#112233");
    applyMenuDetailTheme(card, menu, "https://art/detail.jpg", {});
    expect(menu.style.getPropertyValue("--ma-accent")).toBe("");
    await vi.waitFor(() => expect(menu.classList.contains("has-menu-detail-palette")).toBe(true));
    const token = card._menuDetailThemeToken;
    applyMenuDetailTheme(card, menu, "https://art/other.jpg", {});
    card._state.menuPage = "main";
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(menu.classList.contains("has-menu-detail-palette")).toBe(false);
    expect(card._menuDetailThemeToken).toBe(token + 1);
    card._state.mobileDynamicThemeMode = "off";
    applyMenuDetailTheme(card, menu, "https://art/off.jpg", { palette: READY });
    expect(menu.classList.contains("has-menu-detail-theme")).toBe(true);
    expect(menu.classList.contains("has-menu-detail-palette")).toBe(false);
    applyMenuDetailTheme(card, menu, "", {});
    expect(menu.classList.contains("has-menu-detail-theme")).toBe(false);
  });
  it("themes library pages from the playing artwork or the first item with art", () => {
    const { card, menu } = stubCard();
    applyMenuLibraryThemeFromItems(card, menu, [{ name: "no art" }], "playlist");
    expect(menu.classList.contains("has-menu-art")).toBe(false);
    applyMenuLibraryThemeFromItems(card, menu, [{ name: "no art" }, { name: "cover", image: "https://art/p.jpg", palette: READY }], "playlist");
    expect(menu.style.getPropertyValue("--menu-dynamic-art")).toContain("https://art/p.jpg");
    expect(menu.classList.contains("has-menu-detail-theme")).toBe(true);
    expect(menu.style.getPropertyValue("--ma-accent")).toBe("#112233");
    card._currentArtworkUrl = () => "https://art/playing.jpg";
    applyMenuLibraryThemeFromItems(card, menu, [], "album");
    expect(menu.style.getPropertyValue("--menu-dynamic-art")).toContain("https://art/playing.jpg");
    expect(menu.classList.contains("has-menu-detail-theme")).toBe(false);
    expect(menu.style.getPropertyValue("--ma-accent")).toBe("");
  });
});

describe("settings", () => {
  it("renders the pills and handles the click", () => {
    const { card, root } = stubCard({ mobileDynamicThemeMode: "strong", mobileDynamicThemePalette: READY });
    const html = dynamicThemeSettingsPillsHtml(card);
    expect(html).toContain("ui.dynamic_theme");
    expect(html).toContain('class="settings-pill active" data-setting-dynamic-theme="strong"');
    root.querySelector("#mobileMenu").innerHTML = html;
    expect(handleDynamicThemeSettingsClick(card, root.querySelector("#other"))).toBe(false);
    expect(handleDynamicThemeSettingsClick(card, root.querySelector('[data-setting-dynamic-theme="off"]'))).toBe(true);
    expect(card._state.mobileDynamicThemeMode).toBe("off");
    expect(card._state.mobileDynamicThemePalette).toBe(null);
    expect(card._persistMobileAppearance).toHaveBeenCalledTimes(1);
    expect(card._syncNowPlayingUI).toHaveBeenCalledTimes(1);
    expect(card._reopenSettingsMenuPreservingScroll).toHaveBeenCalledTimes(1);
    expect(root.querySelector(".card").classList.contains("dynamic-theme")).toBe(false);
    root.querySelector('[data-setting-dynamic-theme="auto"]').dataset.settingDynamicTheme = "weird";
    handleDynamicThemeSettingsClick(card, root.querySelector('[data-setting-dynamic-theme="weird"]'));
    expect(card._state.mobileDynamicThemeMode).toBe("auto");
  });
});
