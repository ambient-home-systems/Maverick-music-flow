# HOMEii Music Flow 5.8.2-beta.2

This beta focuses on a targeted artwork regression found with Music Assistant 2.8.x browser players.

## Fixed

- Restores main-screen artwork fallback for browser players that expose artwork through Home Assistant `entity_picture`.
- Prevents the mobile artwork stack from rendering the fallback placeholder when queue artwork is missing but the active player has valid artwork.
- Keeps the 5.8.2 beta artwork resolver changes while covering the Music Assistant 2.8.x browser-player payload shape.

## Testing Notes

After installing, hard refresh the Home Assistant dashboard and make sure the Lovelace resource URL/cache key is updated to:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.8.2-beta.2
```
