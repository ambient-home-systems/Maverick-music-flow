import { describe, expect, it } from "vitest";

import {
  DICTIONARIES,
  LANGUAGE_OPTIONS,
  detectLanguage,
  isRtlLanguage,
  keyForEnglishText,
  translate,
  translateText,
} from "../src/localization/index.js";

describe("localization", () => {
  it("translates by key with English fallback", () => {
    expect(translate("en", "ui.home")).toBe("Home");
    expect(translate("en", "ui.now_playing")).toBe("Now Playing");
    expect(translate("en", "missing.key", {}, "Fallback")).toBe("Fallback");
  });

  it("interpolates params into translated templates", () => {
    expect(translate("en", "missing.key", { name: "Kitchen" }, "Playing on {name}")).toBe("Playing on Kitchen");
  });

  it("translates legacy English text through the catalog", () => {
    expect(translateText("en", "Now Playing")).toBe("Now Playing");
    expect(translateText("en", "Not in catalog", {}, "Not in catalog")).toBe("Not in catalog");
  });

  it("maps English text back to its dictionary key", () => {
    expect(keyForEnglishText("Now Playing")).toBe("ui.now_playing");
    expect(keyForEnglishText("Not in catalog")).toBe("");
  });

  it("detects configured languages and falls back to English", () => {
    expect(detectLanguage({ configLanguage: "en" })).toBe("en");
    expect(detectLanguage({ configLanguage: "es" })).toBe("en");
    expect(detectLanguage({ configLanguage: "fr" })).toBe("en");
    expect(detectLanguage({ configLanguage: "he" })).toBe("en");
    expect(detectLanguage({ configLanguage: "de-AT" })).toBe("en");
    expect(detectLanguage({ configLanguage: "nl" })).toBe("en");
    expect(detectLanguage({ configLanguage: "auto", hass: { locale: { language: "de-DE" } } })).toBe("en");
    expect(detectLanguage({ configLanguage: "auto", hass: { locale: { language: "he-IL" } } })).toBe("en");
    expect(detectLanguage({})).toBe("en");
  });

  it("offers only English in the language picker options", () => {
    expect(LANGUAGE_OPTIONS).toEqual([
      { value: "auto", label: "Auto" },
      { value: "en", label: "English" },
    ]);
  });

  it("has no RTL languages", () => {
    expect(isRtlLanguage("he")).toBe(false);
    expect(isRtlLanguage("en")).toBe(false);
    expect(isRtlLanguage("fr")).toBe(false);
  });

  it("only bundles the English dictionary", () => {
    expect(Object.keys(DICTIONARIES)).toEqual(["en"]);
  });
});
