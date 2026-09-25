import { describe, expect, it } from "vitest";

import { scopeStorageKey } from "../src/core/state/card-id.js";

/**
 * Integration-style test for the per-card-instance state isolation fix.
 *
 * The bug: every Maverick Music card stores user settings (theme, layout,
 * excluded players, pinned players, etc.) under globally scoped
 * localStorage keys like `homeii_music_flow_excluded_players`. Two cards
 * on different dashboards in the same browser therefore overwrite each
 * other's settings.
 *
 * The fix: when a card config sets `card_id: "ida-music"`, every
 * `localStorage.getItem(...)` / `setItem(...)` in that card's instance
 * goes through `scopeStorageKey(baseKey, this._config.card_id)` and the
 * resulting key gets suffixed with `__ida-music`.
 *
 * This test simulates two cards persisting state simultaneously and
 * asserts that nothing collides.
 */

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    snapshot: () => Object.fromEntries(store),
    get size() {
      return store.size;
    },
  };
}

function simulateCardWrite(storage, cardId, baseKey, value) {
  storage.setItem(scopeStorageKey(baseKey, cardId), value);
}

function simulateCardRead(storage, cardId, baseKey) {
  return storage.getItem(scopeStorageKey(baseKey, cardId));
}

describe("per-card state isolation", () => {
  const KEYS_TO_ISOLATE = [
    "homeii_music_flow_excluded_players",
    "homeii_music_flow_front_pinned_player",
    "homeii_music_flow_theme",
    "homeii_music_flow_lang",
    "homeii_music_flow_tracks_layout",
    "homeii_music_flow_mobile_volume_mode",
    "homeii_music_flow_player_sort_mode",
    "homeii_music_flow_likes_v2",
  ];

  it("keeps two scoped card instances fully disjoint", () => {
    const storage = createFakeStorage();

    for (const key of KEYS_TO_ISOLATE) {
      simulateCardWrite(storage, "ida-music", key, `ida:${key}`);
      simulateCardWrite(storage, "toke-music", key, `toke:${key}`);
    }

    for (const key of KEYS_TO_ISOLATE) {
      expect(simulateCardRead(storage, "ida-music", key)).toBe(`ida:${key}`);
      expect(simulateCardRead(storage, "toke-music", key)).toBe(`toke:${key}`);
    }

    // No two stored keys ever collide.
    const storedKeys = Object.keys(storage.snapshot());
    expect(new Set(storedKeys).size).toBe(storedKeys.length);
    expect(storedKeys.length).toBe(KEYS_TO_ISOLATE.length * 2);
  });

  it("keeps an unscoped card disjoint from scoped cards (backward compat)", () => {
    const storage = createFakeStorage();
    const baseKey = "homeii_music_flow_excluded_players";

    // Existing user: no card_id → keys stay unsuffixed.
    simulateCardWrite(storage, "", baseKey, "legacy-global");
    // New user adds a second card with card_id.
    simulateCardWrite(storage, "ida-music", baseKey, "ida-only");

    // Legacy card still reads the original key.
    expect(simulateCardRead(storage, "", baseKey)).toBe("legacy-global");
    expect(simulateCardRead(storage, undefined, baseKey)).toBe("legacy-global");
    expect(simulateCardRead(storage, null, baseKey)).toBe("legacy-global");

    // Scoped card has its own value, not the legacy one.
    expect(simulateCardRead(storage, "ida-music", baseKey)).toBe("ida-only");

    // Both keys coexist in storage.
    const snapshot = storage.snapshot();
    expect(snapshot[baseKey]).toBe("legacy-global");
    expect(snapshot[`${baseKey}__ida-music`]).toBe("ida-only");
  });

  it("treats invalid card ids as unscoped (defensive)", () => {
    const storage = createFakeStorage();
    const baseKey = "homeii_music_flow_excluded_players";

    // Spaces and slashes are invalid → fall back to unsuffixed key.
    simulateCardWrite(storage, "with space", baseKey, "fallback-1");
    simulateCardWrite(storage, "with/slash", baseKey, "fallback-2");

    // Both writes hit the same unsuffixed key — second write wins.
    expect(storage.snapshot()).toEqual({ [baseKey]: "fallback-2" });
  });

  it("cleanly removes a scoped key without touching other scopes", () => {
    const storage = createFakeStorage();
    const baseKey = "homeii_music_flow_front_pinned_player";

    simulateCardWrite(storage, "ida-music", baseKey, "ida_speaker");
    simulateCardWrite(storage, "toke-music", baseKey, "toke_speaker");
    simulateCardWrite(storage, "", baseKey, "global_speaker");

    storage.removeItem(scopeStorageKey(baseKey, "ida-music"));

    expect(simulateCardRead(storage, "ida-music", baseKey)).toBeNull();
    expect(simulateCardRead(storage, "toke-music", baseKey)).toBe("toke_speaker");
    expect(simulateCardRead(storage, "", baseKey)).toBe("global_speaker");
  });
});
