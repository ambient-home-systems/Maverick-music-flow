// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/maverick-music.js";

const { customElements, document, window } = globalThis;

const Card = customElements.get("maverick-music");
const player = { entity_id: "media_player.kitchen", state: "playing", attributes: { friendly_name: "Kitchen" } };

function buildCard(config = {}) {
  const card = document.createElement("maverick-music");
  card.setConfig({ ...Card.getStubConfig(), ...config });
  card._hass = { states: { [player.entity_id]: player } };
  card._build();
  card._state.selectedPlayer = player.entity_id;
  card._state.players = [player];
  return card;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("mobile menu render failures", () => {
  it("shows an escaped notice when an Engine command rejects while the queue menu renders", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      const card = buildCard();
      const body = card.$("mobileMenuBody");
      card._maverickEngineCommand = vi.fn().mockRejectedValue(new Error("Engine <img src=x onerror=alert(1)> offline"));
      // The production snapshot path already swallows Engine errors; route the
      // rejection straight through the queue render so it reaches the menu guard.
      card._ensureQueueSnapshot = () => card._maverickEngineGetQueue({ entity_id: player.entity_id });
      card._debugLog = vi.fn();

      card._openMobileMenu("queue");
      await flush();
      card._renderMobileMenu();
      await flush();
      await flush();

      expect(card._maverickEngineCommand).toHaveBeenCalled();
      const notice = body.querySelector(".notice");
      expect(notice?.textContent).toBe("Engine <img src=x onerror=alert(1)> offline");
      expect(body.querySelector("img")).toBe(null);
      expect(body.querySelector('[data-menu-action="retry_library"]')).not.toBe(null);
      expect(card._state.menuOpen).toBe(true);
      expect(card._debugLog).toHaveBeenCalledWith("warn", "[Maverick Menu] failed to render mobile menu", expect.any(Error));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("resolves instead of rethrowing when the render fails", async () => {
    const card = buildCard();
    card._state.menuOpen = true;
    card._state.menuPage = "queue";
    card._ensureQueueSnapshot = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(card._renderMobileMenu()).resolves.toBeUndefined();
    expect(card.$("mobileMenuBody").querySelector(".notice")?.textContent).toBe("boom");
  });

  it("listens for unhandled rejections only while connected in debug mode", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const quiet = buildCard();
    quiet.connectedCallback();
    expect(add.mock.calls.some(([type]) => type === "unhandledrejection")).toBe(false);
    quiet.disconnectedCallback();

    const card = buildCard({ debug: true });
    card.connectedCallback();
    const registered = add.mock.calls.filter(([type]) => type === "unhandledrejection");
    expect(registered).toHaveLength(1);
    card.disconnectedCallback();
    expect(remove).toHaveBeenCalledWith("unhandledrejection", registered[0][1]);
  });
});
