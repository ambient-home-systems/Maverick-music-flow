// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import "../src/maverick-music.js";
import { buildCardStyles } from "../src/core/theme/card-styles.js";

const { document } = globalThis;

function logoImages(card) {
  const host = document.createElement("div");
  host.innerHTML = card._tabletBrandSignatureHtml("menu-title-logo");
  return [...host.querySelectorAll("img")];
}

describe("brand logo", () => {
  it("renders a dark-text logo for light themes and a light-text logo for dark themes", () => {
    const card = document.createElement("maverick-music");
    const [darkText, lightText] = logoImages(card);
    expect(darkText.dataset.maverickLogoTone).toBe("dark-text");
    expect(darkText.getAttribute("src")).toMatch(/maverick-music-flow-logo\.png\?v=/);
    expect(lightText.dataset.maverickLogoTone).toBe("light-text");
    expect(lightText.getAttribute("src")).toMatch(/maverick-music-flow-logo-dark\.png\?v=/);
    // A missing light-text file still falls back to the regular logo.
    expect(lightText.dataset.maverickLogoFallbacks).toContain("/maverick_music_flow/maverick-music-flow-logo.png");
  });

  it("uses a configured logo for both themes", () => {
    const card = document.createElement("maverick-music");
    card._config = { brand_logo_url: "/local/my-logo.png" };
    card._maverickBrandLogoCandidates = null;
    for (const img of logoImages(card)) expect(img.getAttribute("src")).toBe("/local/my-logo.png");
  });

  it("shows only the logo that matches the card theme", () => {
    const styles = buildCardStyles({
      hostMinWidth: "0px", height: 700, minCardHeight: 400, fontScale: 1, iconScale: "1.00",
      customRgb: "224 161 27", customText: "#fff", customColor: "#e0a11b", fullInlineTargetHeight: 700,
    }).replace(/\s+/g, " ");
    expect(styles).toContain('.brand-signature-logo[data-maverick-logo-tone="dark-text"], .theme-light .brand-signature-logo[data-maverick-logo-tone="light-text"] { display:none !important; }');
    expect(styles).toContain('.theme-light .brand-signature-logo[data-maverick-logo-tone="dark-text"] { display:block !important; }');
  });
});
