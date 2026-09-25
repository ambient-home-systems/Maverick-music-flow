// Runtime contract shared with the Engine integration. Changing ENGINE_DOMAIN
// requires releasing the card and the Engine together.
export const ENGINE_DOMAIN = "maverick_music_flow";
export const ENGINE_COMMAND_PREFIX = ENGINE_DOMAIN;
export const ENGINE_REST_COMMAND_PATH = `${ENGINE_DOMAIN}/command/`;
export const ENGINE_EVENT_TYPE = `${ENGINE_DOMAIN}_music_assistant_event`;
export const ENGINE_ARTWORK_PATH = `/api/${ENGINE_DOMAIN}/artwork/`;
export const ENGINE_SENDSPIN_PATH = `/api/${ENGINE_DOMAIN}/sendspin/`;
export const ENGINE_SCREENSAVER_PATH = `/${ENGINE_DOMAIN}/maverick-music-flow-system-screensaver.js`;
export const MAVERICK_ENGINE_MODES = Object.freeze(["required"]);

// Documented config key -> legacy HOMEii config key. Both are accepted; the
// documented name wins when a config carries both.
export const ENGINE_CONFIG_KEY_ALIASES = Object.freeze([
  Object.freeze({ key: "engine_mode", legacy: "homeii_engine_mode" }),
  Object.freeze({ key: "engine_instance_id", legacy: "homeii_engine_instance_id" }),
  Object.freeze({ key: "engine_profile_id", legacy: "homeii_engine_profile_id" }),
  Object.freeze({ key: "engine_timeout_ms", legacy: "homeii_engine_timeout_ms" }),
]);

export function readEngineConfigValue(config, key) {
  const alias = ENGINE_CONFIG_KEY_ALIASES.find((entry) => entry.key === key);
  if (!config || typeof config !== "object") return undefined;
  if (config[key] !== undefined) return config[key];
  return alias ? config[alias.legacy] : undefined;
}

/**
 * Returns a shallow copy of `config` where every engine setting is available
 * under its documented key. When only the legacy homeii_engine_* key is set,
 * its value is copied to the new key. With `dropLegacy`, the legacy keys are
 * removed from the result (used by the editor so saved YAML is migrated).
 */
export function normalizeEngineConfigKeys(config, { dropLegacy = false } = {}) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return config;
  const next = { ...config };
  for (const { key, legacy } of ENGINE_CONFIG_KEY_ALIASES) {
    const hasCurrent = next[key] !== undefined;
    const hasLegacy = next[legacy] !== undefined;
    if (!hasCurrent && hasLegacy) next[key] = next[legacy];
    if (hasLegacy) {
      if (dropLegacy) delete next[legacy];
      else next[legacy] = next[key];
    }
  }
  return next;
}

export function normalizeMaverickEngineMode(value = "required") {
  const mode = String(value || "").trim().toLowerCase();
  return MAVERICK_ENGINE_MODES.includes(mode) ? mode : "required";
}

export function maverickEngineModeAllowsCalls(value = "required") {
  return normalizeMaverickEngineMode(value) !== "off";
}

export function maverickEngineModeRequiresEngine(value = "required") {
  return normalizeMaverickEngineMode(value) === "required";
}

export function clampMaverickEngineTimeoutMs(value, fallback = 3500) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(1000, Math.min(30000, safe));
}

export function normalizeMaverickEngineId(value = "") {
  return String(value || "").trim().slice(0, 128);
}

export function maverickEngineCommandType(command = "get_context") {
  const clean = String(command || "get_context")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9_/-]+/g, "_")
    || "get_context";
  return `${ENGINE_COMMAND_PREFIX}/${clean}`;
}

export function normalizeMaverickEngineCapabilities(payload = null) {
  const source = payload?.capabilities || payload?.data?.capabilities || payload;
  if (Array.isArray(source)) {
    return source.reduce((acc, capability) => {
      const key = String(capability || "").trim();
      if (key) acc[key] = true;
      return acc;
    }, {});
  }
  if (source && typeof source === "object") return { ...source };
  return {};
}

export function normalizeMaverickEngineContext(payload = null) {
  const context = payload?.context && typeof payload.context === "object" ? payload.context : payload;
  const data = context && typeof context === "object" ? context : {};
  return {
    available: !!payload,
    version: String(data.version || data.engine_version || payload?.version || "").trim(),
    instanceId: normalizeMaverickEngineId(data.instance_id || data.instanceId || payload?.instance_id || ""),
    profileId: normalizeMaverickEngineId(data.profile_id || data.profileId || payload?.profile_id || ""),
    capabilities: normalizeMaverickEngineCapabilities(data.capabilities || payload?.capabilities),
    raw: payload || null,
  };
}

export function summarizeMaverickEngineCapabilities(capabilities = {}) {
  const keys = Object.entries(capabilities || {})
    .filter(([, enabled]) => enabled !== false && enabled != null)
    .map(([key]) => key)
    .filter(Boolean)
    .slice(0, 8);
  return keys.length ? keys.join(", ") : "none reported";
}
