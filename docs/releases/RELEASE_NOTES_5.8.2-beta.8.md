# HOMEii Music Flow 5.8.2-beta.8

This beta is a focused follow-up for issue #28 after beta 7 exposed the next Home Assistant service-call layer.

## Fixed

- Keeps the beta 7 Music Assistant integration fallback, but still passes the discovered `config_entry_id` to Home Assistant `music_assistant` service calls when those services require it.
- Fixes library/service calls that failed with `required key not provided @ data['config_entry_id']` in some Home Assistant / Music Assistant setups.
- Removes `queue_id` from the Home Assistant `music_assistant.get_queue` diagnostic path so HA receives only the selected `entity_id`.
- Improves Diagnostic v3 wording for generic HA fallback players, so Alexa/other `media_player` entities are not described as strict Music Assistant-marked players.
- Makes queue diagnostics less fatal when the selected fallback player has no `active_queue` / `queue_id`.

## Testing Notes

After installing, hard refresh the Home Assistant dashboard and make sure the Lovelace resource URL/cache key is updated to:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.8.2-beta.8
```

For issue #28, please test with `ma_url` empty first, then run the in-card diagnostics:

```text
Settings > General > Settings Source: In-card Settings
Settings > Music Assistant > Diagnostics > Run diagnostics > Copy report
```

The copied report should show:

```text
Diagnostics: v3
Version: 5.8.2-beta.8
```

Please check whether Library pages now return items instead of `required key not provided @ data['config_entry_id']`.
