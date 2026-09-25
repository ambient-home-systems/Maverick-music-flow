# HOMEii Music Flow 5.8.2-beta.7

This beta focuses on issue #28, Diagnostic v3, and a cleaner phone Queue Flow entry point.

## Fixed

- Keeps the card usable through the Home Assistant Music Assistant integration when `music_assistant` services are available even if the config entry lookup reports `not_loaded`.
- Uses generic HA `media_player` entities as compatibility fallback targets only when Music Assistant services are exposed by Home Assistant.
- Treats browser-blocked Direct API failures such as CORS/preflight or `Failed to fetch` as optional Direct/Sendspin access-path warnings when the HA integration can still run core card features.
- Removes the invalid `limit` payload from the HA `music_assistant.get_queue` queue snapshot path.
- Removes the phone Queue Flow button above the artwork. Queue Flow remains available from Quick Actions.

## Added

- Upgrades in-card and visual-editor diagnostics to Diagnostic v3.
- Adds integration signal reporting, strict/fallback player counts, selected-player marker details, queue provider checks, and library provider checks.
- Keeps privacy redaction for Home Assistant, Music Assistant, Sendspin, and artwork hostnames.

## Testing Notes

After installing, hard refresh the Home Assistant dashboard and make sure the Lovelace resource URL/cache key is updated to:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.8.2-beta.7
```

For artwork/queue/library issues, open the card, go to Settings > General, set Settings Source to In-card Settings, then run Settings > Music Assistant > Diagnostics and paste the copied Diagnostic v3 report into the GitHub issue.
