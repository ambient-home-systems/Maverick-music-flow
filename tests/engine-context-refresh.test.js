// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import "../src/maverick-music.js";

const { customElements, document } = globalThis;
const Card = customElements.get("maverick-music");

describe("Engine context refresh", () => {
  it("shares one in-flight refresh between concurrent callers, even when forced", async () => {
    const card = document.createElement("maverick-music");
    card.setConfig(Card.getStubConfig());
    const pending = [];
    card._maverickEngineCommand = vi.fn(() => new Promise((resolve) => pending.push(resolve)));
    const settle = async () => {
      while (pending.length) {
        pending.shift()(null);
        await Promise.resolve();
        await Promise.resolve();
      }
    };

    const first = card._refreshMaverickEngineContext();
    const second = card._refreshMaverickEngineContext({ force: true });
    expect(second).toBe(first);
    expect(card._maverickEngineCommand).toHaveBeenCalledOnce();

    await settle();
    await Promise.all([first, second]);
    const callsPerRefresh = card._maverickEngineCommand.mock.calls.length;
    expect(callsPerRefresh).toBe(2);
    expect(card._maverickEngineCommand.mock.calls.map(([command]) => command)).toEqual(["bootstrap/get", "get_context"]);
    expect(card._engineContextInflight).toBe(null);

    const third = card._refreshMaverickEngineContext({ force: true });
    expect(third).not.toBe(first);
    await settle();
    await third;
    expect(card._maverickEngineCommand).toHaveBeenCalledTimes(callsPerRefresh * 2);
  });

  it("clears the in-flight refresh when it rejects", async () => {
    const card = document.createElement("maverick-music");
    card.setConfig(Card.getStubConfig());
    card._maverickEngineCommand = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(card._refreshMaverickEngineContext({ force: true })).rejects.toThrow("offline");
    expect(card._engineContextInflight).toBe(null);
  });
});
