import { describe, expect, it } from "vitest";

import {
  isValidCardId,
  normalizeCardId,
  scopeStorageKey,
} from "../src/core/state/card-id.js";

describe("card-id foundation", () => {
  describe("normalizeCardId", () => {
    it("accepts simple alphanumeric ids", () => {
      expect(normalizeCardId("ida")).toBe("ida");
      expect(normalizeCardId("Toke123")).toBe("Toke123");
    });

    it("accepts ids with hyphens and underscores", () => {
      expect(normalizeCardId("ida-music")).toBe("ida-music");
      expect(normalizeCardId("toke_room_2")).toBe("toke_room_2");
      expect(normalizeCardId("a-b_c-d")).toBe("a-b_c-d");
    });

    it("trims surrounding whitespace before validating", () => {
      expect(normalizeCardId("  ida-music  ")).toBe("ida-music");
      expect(normalizeCardId("\tida\n")).toBe("ida");
    });

    it("rejects empty, null, and undefined inputs", () => {
      expect(normalizeCardId("")).toBe("");
      expect(normalizeCardId("   ")).toBe("");
      expect(normalizeCardId(null)).toBe("");
      expect(normalizeCardId(undefined)).toBe("");
    });

    it("rejects ids containing disallowed characters", () => {
      expect(normalizeCardId("ida music")).toBe("");
      expect(normalizeCardId("ida/music")).toBe("");
      expect(normalizeCardId("ida.music")).toBe("");
      expect(normalizeCardId("ida:music")).toBe("");
      expect(normalizeCardId("ida!")).toBe("");
      expect(normalizeCardId("🎵")).toBe("");
    });

    it("rejects ids longer than 64 characters", () => {
      expect(normalizeCardId("a".repeat(64))).toBe("a".repeat(64));
      expect(normalizeCardId("a".repeat(65))).toBe("");
    });

    it("coerces non-string inputs through String() and re-validates", () => {
      // Numbers stringify into slug-valid characters.
      expect(normalizeCardId(42)).toBe("42");
      // Booleans stringify to "true" / "false" — also slug-valid.
      // Note: the YAML config validator should reject non-string types
      // before they reach this helper; this is the defensive fallback.
      expect(normalizeCardId(true)).toBe("true");
      expect(normalizeCardId(false)).toBe("false");
      // Plain objects stringify to "[object Object]" which contains
      // disallowed characters, so they're rejected here.
      expect(normalizeCardId({})).toBe("");
      expect(normalizeCardId([])).toBe("");
    });
  });

  describe("isValidCardId", () => {
    it("is true for ids normalizeCardId accepts", () => {
      expect(isValidCardId("ida-music")).toBe(true);
      expect(isValidCardId("a")).toBe(true);
    });

    it("is false for ids normalizeCardId rejects", () => {
      expect(isValidCardId("")).toBe(false);
      expect(isValidCardId(null)).toBe(false);
      expect(isValidCardId("ida music")).toBe(false);
      expect(isValidCardId("a".repeat(65))).toBe(false);
    });
  });

  describe("scopeStorageKey", () => {
    it("returns the base key unchanged when no card id is given", () => {
      expect(scopeStorageKey("maverick_music_excluded_players")).toBe(
        "maverick_music_excluded_players"
      );
      expect(scopeStorageKey("maverick_music_theme", "")).toBe(
        "maverick_music_theme"
      );
      expect(scopeStorageKey("maverick_music_lang", null)).toBe(
        "maverick_music_lang"
      );
    });

    it("suffixes the base key with the card id when provided", () => {
      expect(scopeStorageKey("maverick_music_theme", "ida-music")).toBe(
        "maverick_music_theme__ida-music"
      );
      expect(
        scopeStorageKey("maverick_music_excluded_players", "toke-music")
      ).toBe("maverick_music_excluded_players__toke-music");
    });

    it("ignores invalid card ids and returns the base key", () => {
      expect(scopeStorageKey("maverick_music_theme", "ida music")).toBe(
        "maverick_music_theme"
      );
      expect(scopeStorageKey("maverick_music_theme", "a".repeat(65))).toBe(
        "maverick_music_theme"
      );
    });

    it("produces disjoint keys for different card ids", () => {
      const base = "maverick_music_front_pinned_player";
      const idaKey = scopeStorageKey(base, "ida-music");
      const tokeKey = scopeStorageKey(base, "toke-music");
      expect(idaKey).not.toBe(tokeKey);
      expect(idaKey).not.toBe(base);
      expect(tokeKey).not.toBe(base);
    });
  });
});
