// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/maverick-music.js";
const { window } = globalThis;
const prototype = globalThis.customElements.get("maverick-music").prototype;
afterEach(() => vi.restoreAllMocks());
function launch(config) {
  vi.restoreAllMocks();
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  const card = { _config: config };
  card._normalizedMusicAssistantInterfaceUrl = prototype._normalizedMusicAssistantInterfaceUrl.bind(card);
  prototype._launchMusicAssistant.call(card);
  return open.mock.calls;
}
describe("Music Assistant interface launch", () => {
  it("falls back to the default path for unsafe URLs", () => {
    expect(launch({ ma_interface_url: "javascript:alert(1)" })).toEqual([["/music-assistant", "_self"]]);
    expect(launch({ ma_interface_url: "//evil.example" })).toEqual([["/music-assistant", "_self"]]);
  });
  it("opens new tabs with noopener", () => {
    expect(launch({ ma_interface_url: "https://ma.example.com", ma_interface_target: "_blank" })).toEqual([["https://ma.example.com", "_blank", "noopener"]]);
  });
});
