# HOMEii Music Flow 5.8.2-beta.3

This beta focuses on the remaining Music Assistant compatibility issue reported in #28.

## Fixed

- Avoids using a Music Assistant config entry when Home Assistant reports it as `not_loaded`.
- Uses the direct Music Assistant API as a library fallback when HA service calls cannot access the MA config entry.
- Allows playlist/library browsing to recover in setups that still expose `media_player` state but fail HA-side MA library calls.
- Falls back to direct Music Assistant queue playback when a selected player exposes an active MA queue and `music_assistant.play_media` fails due to MA availability.
- Keeps the Beta 1 and Beta 2 artwork fixes.

## Testing Notes

After installing, hard refresh the Home Assistant dashboard and make sure the Lovelace resource URL/cache key is updated to:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.8.2-beta.3
```
