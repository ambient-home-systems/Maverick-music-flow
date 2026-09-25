// One-time browser-storage migration from the HOMEii Music Flow key namespace
// to the Maverick Music namespace. Every localStorage / sessionStorage key the
// card owns is matched by prefix here; card_id scoping appends a "__<id>"
// suffix, so a prefix match covers scoped keys as well.
export const LEGACY_STORAGE_KEY_MIGRATIONS = Object.freeze([
  Object.freeze({ storage: "local", from: "homeii_music_flow_", to: "maverick_music_" }),
  Object.freeze({ storage: "session", from: "homeii_music_flow_", to: "maverick_music_" }),
  Object.freeze({ storage: "local", from: "homeii-this-device-player::", to: "maverick_music_this_device_player::" }),
  Object.freeze({ storage: "local", from: "homeii_sendspin_webplayer_id", to: "maverick_music_sendspin_webplayer_id" }),
  Object.freeze({ storage: "local", from: "homeii_local_sendspin_sync_delay_ms", to: "maverick_music_local_sendspin_sync_delay_ms" }),
  Object.freeze({ storage: "local", from: "homeii_local_sendspin_volume_", to: "maverick_music_local_sendspin_volume_" }),
  Object.freeze({ storage: "session", from: "homeii_local_sendspin_desired", to: "maverick_music_local_sendspin_desired" }),
]);

function listStorageKeys(storage) {
  const keys = [];
  try {
    if (storage && typeof storage.key === "function" && Number.isFinite(storage.length)) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (typeof key === "string") keys.push(key);
      }
      return keys;
    }
  } catch (_) {}
  try {
    return Object.keys(storage || {});
  } catch (_) {
    return [];
  }
}

function isEmptyStoredValue(value) {
  return value === null || value === undefined || value === "";
}

/**
 * Copies every value stored under a legacy HOMEii key to its Maverick Music
 * key when the new key is still empty. Legacy values are left in place so an
 * older card build can keep running side by side during an upgrade.
 * Returns the list of { storage, from, to } copies that were made.
 */
export function migrateLegacyStorageKeys(options = {}) {
  const migrated = [];
  const storages = {
    local: options.localStorage ?? (typeof localStorage !== "undefined" ? localStorage : null),
    session: options.sessionStorage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null),
  };
  for (const storageName of Object.keys(storages)) {
    const storage = storages[storageName];
    if (!storage) continue;
    const rules = LEGACY_STORAGE_KEY_MIGRATIONS.filter((entry) => entry.storage === storageName);
    if (!rules.length) continue;
    for (const key of listStorageKeys(storage)) {
      const rule = rules.find((entry) => key.startsWith(entry.from));
      if (!rule) continue;
      const nextKey = `${rule.to}${key.slice(rule.from.length)}`;
      try {
        if (!isEmptyStoredValue(storage.getItem(nextKey))) continue;
        const value = storage.getItem(key);
        if (isEmptyStoredValue(value)) continue;
        storage.setItem(nextKey, value);
        migrated.push({ storage: storageName, from: key, to: nextKey });
      } catch (_) {}
    }
  }
  return migrated;
}
