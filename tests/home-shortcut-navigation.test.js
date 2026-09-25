// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/maverick-music.js";
const { window } = globalThis;
const prototype = globalThis.customElements.get("maverick-music").prototype;
function context(path) {
  return {
    _state: { controlRoomOpen: false },
    _homeShortcutNavigationSuppressed: () => false,
    _mobileHomeShortcutPath: () => path,
  };
}
afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, "", "/"); });
describe("home shortcut navigation", () => {
  it("routes an off-site target to the dashboard root", () => {
    window.history.replaceState(null, "", "/lovelace/music");
    const pushState = vi.spyOn(window.history, "pushState");
    prototype._goHomeAssistantDashboard.call(context("https://evil.example/x"));
    expect(pushState).toHaveBeenCalledWith(null, "", "/");
    for (const [, , url] of pushState.mock.calls) expect(String(url)).not.toContain("evil.example");
  });
  it("keeps a same-origin target", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    prototype._goHomeAssistantDashboard.call(context("/lovelace/0"));
    expect(pushState).toHaveBeenCalledWith(null, "", "/lovelace/0");
  });
});
