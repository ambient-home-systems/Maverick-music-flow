# HOMEii Music Flow 5.8.2-beta.6

This beta is a cache-busting rebuild of the beta 5 diagnostics work. It exists because Home Assistant, HACS, and browser resource caching can continue serving an older frontend bundle when the same beta tag/version is reused.

## Fixed

- Redacts Home Assistant, Music Assistant, Sendspin, and artwork hostnames from diagnostics output by default.
- Keeps useful diagnostic details without exposing full private URLs: protocol, host type, port, and path category.
- Adds a close button to the visual-editor diagnostics panel.
- Keeps the normal card experience usable when only the Home Assistant Music Assistant integration is available and healthy.
- Prevents relative Music Assistant `/imageproxy` artwork paths from being treated as Home Assistant artwork URLs when no direct Music Assistant base URL is configured.

## Added

- Adds a Queue artwork sample check.
- Keeps the existing Library coverage and Library artwork sample checks.
- Keeps Diagnostic v2 browser, viewport, Home Assistant URL, access path, mixed-content, Direct MA, Sendspin, queue, library, and artwork checks.

## Testing Notes

After installing, hard refresh the Home Assistant dashboard and make sure the Lovelace resource URL/cache key is updated to:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.8.2-beta.6
```

In the copied diagnostics report, full external/private hostnames should no longer appear. You should see values such as:

```text
HA URL: https://<redacted-nabu-casa>
ma_url: https://<external-host>
```
