# HOMEii Music Flow 5.8.2-beta.5

This beta focuses on Diagnostic v2, visual-editor diagnostics, Sendspin/browser checks, and making the Home Assistant Music Assistant integration the clean primary path when direct Music Assistant access is not configured.

## Fixed

- Keeps the normal card experience usable when only the Home Assistant Music Assistant integration is available and healthy.
- Prevents relative Music Assistant `/imageproxy` artwork paths from being treated as Home Assistant artwork URLs when no direct Music Assistant base URL is configured.
- Keeps Home Assistant `media_player_proxy` artwork working for player/current-track artwork in integration-only setups.
- Reports direct Music Assistant and Sendspin browser access as optional diagnostics when the Home Assistant integration is loaded, instead of making those warnings look like a total setup failure.
- Redacts Home Assistant, Music Assistant, Sendspin, and artwork hostnames from diagnostics output by default.
- Adds a close button to the visual-editor diagnostics panel.

## Added

- Upgrades the in-card Diagnostics screen to Diagnostic v2.
- Adds browser, viewport, Home Assistant URL, access path, mixed-content, Direct MA, Sendspin, queue, library, and artwork checks.
- Adds a Diagnostics button to the Home Assistant visual editor near the version label.
- Keeps diagnostics visible with green OK, red FAIL, yellow WARN, and blue INFO status rows.
- Adds a copyable Diagnostic v2 report that includes browser and viewport details for GitHub issues.
- Adds a Queue artwork sample check and keeps the existing Library coverage / Library artwork sample checks.

## Testing Notes

After installing, hard refresh the Home Assistant dashboard and make sure the Lovelace resource URL/cache key is updated to:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.8.2-beta.5
```

Recommended checks:

- Open the visual editor and click Diagnostics near the version label.
- Open the card settings and run Settings > Music Assistant > Diagnostics.
- Test with `ma_url` empty to confirm the Home Assistant integration path still works.
- Test with a valid direct Music Assistant URL if you use Sendspin or direct library access.
- On mobile/tablet, copy the report from the same browser/device where the issue appears.
