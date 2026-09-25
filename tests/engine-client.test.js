import { describe, expect, it } from "vitest";

import {
  ENGINE_CONFIG_KEY_ALIASES,
  clampMaverickEngineTimeoutMs,
  maverickEngineCommandType,
  maverickEngineModeAllowsCalls,
  maverickEngineModeRequiresEngine,
  normalizeMaverickEngineCapabilities,
  normalizeMaverickEngineContext,
  normalizeMaverickEngineId,
  normalizeEngineConfigKeys,
  normalizeMaverickEngineMode,
  readEngineConfigValue,
  summarizeMaverickEngineCapabilities,
} from "../src/core/engine-client.js";

describe("Maverick Music Engine client foundation", () => {
  it("normalizes Engine modes with required defaults for Maverick Music 6", () => {
    expect(normalizeMaverickEngineMode()).toBe("required");
    expect(normalizeMaverickEngineMode("required")).toBe("required");
    expect(normalizeMaverickEngineMode("OFF")).toBe("required");
    expect(normalizeMaverickEngineMode("unknown")).toBe("required");
    expect(maverickEngineModeAllowsCalls("off")).toBe(true);
    expect(maverickEngineModeAllowsCalls("auto")).toBe(true);
    expect(maverickEngineModeRequiresEngine("required")).toBe(true);
    expect(maverickEngineModeRequiresEngine("auto")).toBe(true);
    expect(maverickEngineModeRequiresEngine()).toBe(true);
  });

  it("maps legacy homeii_engine_* config keys onto the documented engine_* keys", () => {
    expect(ENGINE_CONFIG_KEY_ALIASES.map((entry) => entry.key)).toEqual([
      "engine_mode", "engine_instance_id", "engine_profile_id", "engine_timeout_ms",
    ]);
    expect(ENGINE_CONFIG_KEY_ALIASES.map((entry) => entry.legacy)).toEqual([
      "homeii_engine_mode", "homeii_engine_instance_id", "homeii_engine_profile_id", "homeii_engine_timeout_ms",
    ]);

    const legacyOnly = normalizeEngineConfigKeys({ homeii_engine_timeout_ms: 5000, homeii_engine_profile_id: "den", other: 1 });
    expect(legacyOnly).toEqual({
      homeii_engine_timeout_ms: 5000,
      engine_timeout_ms: 5000,
      homeii_engine_profile_id: "den",
      engine_profile_id: "den",
      other: 1,
    });

    const both = normalizeEngineConfigKeys({ engine_timeout_ms: 4000, homeii_engine_timeout_ms: 5000 });
    expect(both).toEqual({ engine_timeout_ms: 4000, homeii_engine_timeout_ms: 4000 });

    const dropped = normalizeEngineConfigKeys({ engine_mode: "required", homeii_engine_mode: "required", homeii_engine_instance_id: "main" }, { dropLegacy: true });
    expect(dropped).toEqual({ engine_mode: "required", engine_instance_id: "main" });

    expect(normalizeEngineConfigKeys(null)).toBe(null);
    expect(normalizeEngineConfigKeys({ engine_mode: "required" })).toEqual({ engine_mode: "required" });

    expect(readEngineConfigValue({ homeii_engine_timeout_ms: 5000 }, "engine_timeout_ms")).toBe(5000);
    expect(readEngineConfigValue({ engine_timeout_ms: 4000, homeii_engine_timeout_ms: 5000 }, "engine_timeout_ms")).toBe(4000);
    expect(readEngineConfigValue({}, "engine_mode")).toBeUndefined();
    expect(readEngineConfigValue(null, "engine_mode")).toBeUndefined();
  });

  it("builds stable Home Assistant WebSocket command types", () => {
    expect(maverickEngineCommandType("get_context")).toBe("homeii_flow/get_context");
    expect(maverickEngineCommandType("/queue/get/")).toBe("homeii_flow/queue/get");
    expect(maverickEngineCommandType("stats get")).toBe("homeii_flow/stats_get");
  });

  it("normalizes Engine ids, timeouts, capabilities, and context", () => {
    expect(normalizeMaverickEngineId("  kitchen-profile  ")).toBe("kitchen-profile");
    expect(clampMaverickEngineTimeoutMs("slow", 3500)).toBe(3500);
    expect(clampMaverickEngineTimeoutMs(50)).toBe(1000);
    expect(clampMaverickEngineTimeoutMs(90000)).toBe(30000);
    expect(normalizeMaverickEngineCapabilities(["queue", "stats"])).toEqual({ queue: true, stats: true });
    expect(summarizeMaverickEngineCapabilities({ queue: true, stats: false, schedules: true })).toBe("queue, schedules");

    const context = normalizeMaverickEngineContext({
      version: "6.0.0",
      instance_id: "main",
      profile_id: "living",
      capabilities: { queue: true },
    });

    expect(context.available).toBe(true);
    expect(context.version).toBe("6.0.0");
    expect(context.instanceId).toBe("main");
    expect(context.profileId).toBe("living");
    expect(context.capabilities).toEqual({ queue: true });
  });
});
