// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/maverick-music.js";

const { customElements, document } = globalThis;
const Card = customElements.get("maverick-music");

afterEach(() => vi.useRealTimers());

describe("tracked card timeouts", () => {
  it("runs a tracked timeout once and forgets its handle", () => {
    vi.useFakeTimers();
    const card = document.createElement("maverick-music");
    const fn = vi.fn();
    card._timeout(fn, 100);
    expect(card._pendingTimeouts.size).toBe(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
    expect(card._pendingTimeouts.size).toBe(0);
  });

  it("cancels pending timeouts when the card disconnects", () => {
    vi.useFakeTimers();
    const card = document.createElement("maverick-music");
    card.setConfig(Card.getStubConfig());
    const fn = vi.fn();
    card._timeout(fn, 100);
    card._timeout(fn, 500);
    card.disconnectedCallback();
    expect(card._pendingTimeouts.size).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });

  it("drops a delayed now-playing refresh scheduled before disconnect", async () => {
    vi.useFakeTimers();
    const card = document.createElement("maverick-music");
    card.setConfig(Card.getStubConfig());
    card._updateNowPlayingState = vi.fn(async () => {});
    card._stopAllPlayers = vi.fn(async () => {});
    card._closeCleanAllConfirm = vi.fn();
    card._closeMobileMenu = vi.fn();
    await card._confirmCleanAllPlayers();
    card.disconnectedCallback();
    vi.advanceTimersByTime(1000);
    expect(card._updateNowPlayingState).not.toHaveBeenCalled();
  });
});
