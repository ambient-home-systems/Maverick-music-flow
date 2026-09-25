import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// These tests exercise the real `_refreshAfterSettingsChange` method on a real
// `maverick-music` card instance — they do NOT mirror the method body. The
// minimal browser stubs follow the pattern in tests/runtime-baseline.test.js.

const originalGlobals = {
  CustomEvent: globalThis.CustomEvent,
  customElements: globalThis.customElements,
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  window: globalThis.window,
  localStorage: globalThis.localStorage,
};

function installBrowserStubs() {
  globalThis.window = { customCards: [] };
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail;
    }
  };
  globalThis.document = {
    createElement(tagName) {
      return { tagName: String(tagName || "").toUpperCase() };
    },
    querySelector() {
      return null;
    },
  };
  globalThis.HTMLElement = class {
    constructor() {
      this.style = {};
      this.offsetWidth = 0;
    }

    attachShadow() {
      const root = {
        innerHTML: "",
        addEventListener() {},
        getElementById() { return null; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
      };
      this.shadowRoot = root;
      return root;
    }

    dispatchEvent() { return true; }
    getBoundingClientRect() { return { width: 0, height: 0 }; }
  };
  globalThis.customElements = {
    registry: new Map(),
    define(name, ctor) { this.registry.set(name, ctor); },
    get(name) { return this.registry.get(name); },
  };
  // The production code reads/writes localStorage at module load and during
  // construction; install a tiny in-memory shim so those calls don't throw.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

async function settleModule() {
  await Promise.resolve();
  await vi.runAllTimersAsync();
}

function instrumentCard() {
  const CardCtor = globalThis.customElements.get("maverick-music");
  const card = new CardCtor();
  // Stub only the surrounding dependencies — the body of
  // `_refreshAfterSettingsChange` itself still runs from the real source.
  card.$ = vi.fn(() => ({ scrollTop: 0 }));
  card._build = vi.fn();
  card._init = vi.fn();
  card._loadPlayers = vi.fn();
  card._refreshFrontPinnedPlayer = vi.fn();
  card._openMobileMenu = vi.fn();
  card._restoreMobileMenuScroll = vi.fn();
  card._reopenSettingsMenuPreservingScroll = vi.fn();
  card._renderPlayerSummary = vi.fn();
  card._syncActiveQuickActionRow = vi.fn();
  return card;
}

describe("_refreshAfterSettingsChange (real method on real card)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    installBrowserStubs();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.customElements = originalGlobals.customElements;
    globalThis.CustomEvent = originalGlobals.CustomEvent;
    globalThis.document = originalGlobals.document;
    globalThis.HTMLElement = originalGlobals.HTMLElement;
    globalThis.window = originalGlobals.window;
    if (originalGlobals.localStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = originalGlobals.localStorage;
    }
  });

  it("does NOT call _build() when quickActionsChanged is true", async () => {
    await import("../src/maverick-music.js?settings-refresh-quickactions-nobuild");
    await settleModule();
    const card = instrumentCard();
    card._refreshAfterSettingsChange({ quickActionsChanged: true });
    expect(card._build).not.toHaveBeenCalled();
  });

  it("does NOT call _init() when playerListChanged is true", async () => {
    await import("../src/maverick-music.js?settings-refresh-playerlist-noinit");
    await settleModule();
    const card = instrumentCard();
    card._refreshAfterSettingsChange({ playerListChanged: true });
    expect(card._init).not.toHaveBeenCalled();
  });

  it("calls _loadPlayers() once when playerListChanged is true", async () => {
    await import("../src/maverick-music.js?settings-refresh-playerlist-loadplayers");
    await settleModule();
    const card = instrumentCard();
    card._refreshAfterSettingsChange({ playerListChanged: true });
    expect(card._loadPlayers).toHaveBeenCalledTimes(1);
  });

  it("does NOT call _loadPlayers() when only quickActionsChanged is true", async () => {
    await import("../src/maverick-music.js?settings-refresh-quickactions-noloadplayers");
    await settleModule();
    const card = instrumentCard();
    card._refreshAfterSettingsChange({ quickActionsChanged: true });
    expect(card._loadPlayers).not.toHaveBeenCalled();
  });

  it("falls back to _reopenSettingsMenuPreservingScroll when unknown is true", async () => {
    await import("../src/maverick-music.js?settings-refresh-unknown-fallback");
    await settleModule();
    const card = instrumentCard();
    card._refreshAfterSettingsChange({ unknown: true });
    expect(card._reopenSettingsMenuPreservingScroll).toHaveBeenCalledTimes(1);
    expect(card._reopenSettingsMenuPreservingScroll).toHaveBeenCalledWith({ rebuild: true, init: true });
    expect(card._openMobileMenu).not.toHaveBeenCalled();
  });

  it("calls _openMobileMenu('settings', expect.any(Object)) for any surgical-path category", async () => {
    // NOTE: `mainBarChanged` is intentionally excluded — the real source has
    // grouped it with `unknown` as a heavy-path fallback (no surgical render
    // method for the inline main-bar footer). This is the drift the maintainer
    // flagged: the old stub-mirror test treated mainBarChanged as a surgical
    // category, but the production method routes it through
    // _reopenSettingsMenuPreservingScroll instead. Source unchanged here —
    // we just align the assertion with the real method.
    await import("../src/maverick-music.js?settings-refresh-openmenu");
    await settleModule();
    const categories = [
      "playerListChanged",
      "pinnedChanged",
      "quickActionsChanged",
      "libraryTabsChanged",
    ];
    for (const category of categories) {
      const card = instrumentCard();
      card._refreshAfterSettingsChange({ [category]: true });
      expect(card._openMobileMenu).toHaveBeenCalledWith("settings", expect.any(Object));
    }
  });

  // New tests for the surgical refresh integrations introduced after the old
  // stub-mirror test was written.

  it("calls _syncActiveQuickActionRow({ force: true }) when quickActionsChanged is true", async () => {
    await import("../src/maverick-music.js?settings-refresh-quickactions-sync");
    await settleModule();
    const card = instrumentCard();
    card._refreshAfterSettingsChange({ quickActionsChanged: true });
    expect(card._syncActiveQuickActionRow).toHaveBeenCalledTimes(1);
    expect(card._syncActiveQuickActionRow).toHaveBeenCalledWith({ force: true });
  });

  it("calls _renderPlayerSummary() when playerListChanged is true", async () => {
    await import("../src/maverick-music.js?settings-refresh-playerlist-summary");
    await settleModule();
    const card = instrumentCard();
    card._refreshAfterSettingsChange({ playerListChanged: true });
    expect(card._renderPlayerSummary).toHaveBeenCalledTimes(1);
  });
});
