import { afterEach, describe, expect, it, vi } from "vitest";
import { ProtocolHandler } from "../src/sendspin-js/core/protocol-handler.js";
afterEach(() => vi.restoreAllMocks());
describe("Sendspin protocol handler", () => {
  it("drops malformed JSON frames without throwing and logs once at debug level", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = { handleServerMessage: vi.fn() };
    const handleMessage = ProtocolHandler.prototype.handleMessage;
    expect(() => handleMessage.call(handler, { data: "{not json" })).not.toThrow();
    expect(() => handleMessage.call(handler, { data: "" })).not.toThrow();
    expect(handler.handleServerMessage).not.toHaveBeenCalled();
    expect(debug).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });
  it("still dispatches well-formed frames", () => {
    const handler = { handleServerMessage: vi.fn() };
    ProtocolHandler.prototype.handleMessage.call(handler, { data: '{"type":"server/hello","payload":{}}' });
    expect(handler.handleServerMessage).toHaveBeenCalledWith({ type: "server/hello", payload: {} });
  });
});
