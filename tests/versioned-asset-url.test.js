// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createMaverickBaseMusicCard } from "../src/core/base-music-card.js";
import "../src/maverick-music.js";
import packageJson from "../package.json";

const { customElements, document } = globalThis;
const packageVersion = packageJson.version;

describe("versioned asset URLs", () => {
  it("uses the injected card version", () => {
    const card = document.createElement("maverick-music");
    expect(card._versionedAssetUrl("/local/art.png")).toBe(`/local/art.png?v=${packageVersion}`);
    expect(card._versionedAssetUrl("/local/art.png?size=2")).toBe(`/local/art.png?size=2&v=${packageVersion}`);
  });

  it("falls back to 0.0.0 when no version is injected", () => {
    const Card = createMaverickBaseMusicCard({});
    expect(Card.prototype._versionedAssetUrl("/local/art.png")).toBe("/local/art.png?v=0.0.0");
    expect(customElements.get("maverick-music").prototype._versionedAssetUrl("data:image/png;base64,AA")).toBe("data:image/png;base64,AA");
  });
});
