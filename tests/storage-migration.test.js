import { describe, expect, it } from "vitest";

import {
  LEGACY_STORAGE_KEY_MIGRATIONS,
  migrateLegacyStorageKeys,
} from "../src/core/state/storage-migration.js";

function createStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key(index) { return Array.from(map.keys())[index] ?? null; },
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(String(key), String(value)); },
    removeItem(key) { map.delete(key); },
    dump() { return Object.fromEntries(map); },
  };
}

describe("legacy storage key migration", () => {
  it("declares every HOMEii storage namespace the card used", () => {
    const pairs = LEGACY_STORAGE_KEY_MIGRATIONS.map(({ storage, from, to }) => `${storage}:${from}->${to}`);
    expect(pairs).toEqual([
      "local:homeii_music_flow_->maverick_music_",
      "session:homeii_music_flow_->maverick_music_",
      "local:homeii-this-device-player::->maverick_music_this_device_player::",
      "local:homeii_sendspin_webplayer_id->maverick_music_sendspin_webplayer_id",
      "local:homeii_local_sendspin_sync_delay_ms->maverick_music_local_sendspin_sync_delay_ms",
      "local:homeii_local_sendspin_volume_->maverick_music_local_sendspin_volume_",
      "session:homeii_local_sendspin_desired->maverick_music_local_sendspin_desired",
    ]);
    expect(Object.isFrozen(LEGACY_STORAGE_KEY_MIGRATIONS)).toBe(true);
    for (const entry of LEGACY_STORAGE_KEY_MIGRATIONS) {
      expect(entry.to.startsWith("maverick_music_")).toBe(true);
      expect(entry.from.startsWith("homeii")).toBe(true);
    }
  });

  it("copies legacy values to the new keys, including card_id scoped keys, without deleting the originals", () => {
    const localStorage = createStorage({
      homeii_music_flow_theme: "dark",
      "homeii_music_flow_theme__kitchen": "light",
      homeii_music_flow_mobile_font_scale: "1.2",
      "homeii-this-device-player::default:default": "media_player.browser",
      homeii_sendspin_webplayer_id: "web-1",
      homeii_local_sendspin_sync_delay_ms: "120",
      homeii_local_sendspin_volume_ma_homeii_abc: "40",
      unrelated_key: "keep",
    });
    const sessionStorage = createStorage({
      "homeii_music_flow_queue_snapshot_v1::media_player.a::q": "{\"items\":[]}",
      homeii_local_sendspin_desired: "1",
    });

    const migrated = migrateLegacyStorageKeys({ localStorage, sessionStorage });

    expect(migrated).toHaveLength(9);
    expect(localStorage.dump()).toEqual({
      homeii_music_flow_theme: "dark",
      maverick_music_theme: "dark",
      "homeii_music_flow_theme__kitchen": "light",
      "maverick_music_theme__kitchen": "light",
      homeii_music_flow_mobile_font_scale: "1.2",
      maverick_music_mobile_font_scale: "1.2",
      "homeii-this-device-player::default:default": "media_player.browser",
      "maverick_music_this_device_player::default:default": "media_player.browser",
      homeii_sendspin_webplayer_id: "web-1",
      maverick_music_sendspin_webplayer_id: "web-1",
      homeii_local_sendspin_sync_delay_ms: "120",
      maverick_music_local_sendspin_sync_delay_ms: "120",
      homeii_local_sendspin_volume_ma_homeii_abc: "40",
      maverick_music_local_sendspin_volume_ma_homeii_abc: "40",
      unrelated_key: "keep",
    });
    expect(sessionStorage.dump()).toEqual({
      "homeii_music_flow_queue_snapshot_v1::media_player.a::q": "{\"items\":[]}",
      "maverick_music_queue_snapshot_v1::media_player.a::q": "{\"items\":[]}",
      homeii_local_sendspin_desired: "1",
      maverick_music_local_sendspin_desired: "1",
    });
  });

  it("never overwrites a value already stored under the new key and is idempotent", () => {
    const localStorage = createStorage({
      homeii_music_flow_theme: "dark",
      maverick_music_theme: "light",
      homeii_music_flow_lang: "he",
      maverick_music_lang: "",
    });
    const sessionStorage = createStorage();

    const first = migrateLegacyStorageKeys({ localStorage, sessionStorage });
    expect(first).toEqual([{ storage: "local", from: "homeii_music_flow_lang", to: "maverick_music_lang" }]);
    expect(localStorage.getItem("maverick_music_theme")).toBe("light");
    expect(localStorage.getItem("maverick_music_lang")).toBe("he");

    const second = migrateLegacyStorageKeys({ localStorage, sessionStorage });
    expect(second).toEqual([]);
  });

  it("tolerates unavailable or throwing storage", () => {
    expect(migrateLegacyStorageKeys({ localStorage: null, sessionStorage: null })).toEqual([]);
    const throwing = {
      get length() { return 1; },
      key() { return "homeii_music_flow_theme"; },
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
    };
    expect(migrateLegacyStorageKeys({ localStorage: throwing, sessionStorage: throwing })).toEqual([]);
  });
});
