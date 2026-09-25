# HOMEii Flow 5.8.2 Beta 1

HOMEii Flow 5.8.2 Beta 1 is a pre-release validation build for the now-playing artwork regression reported after the 5.8.0/5.8.1 upgrade.

This beta is intended for users who want to test the player artwork fix before it becomes a stable release.

## What Changed

- Restores the 5.7.x behavior for the currently playing item: the player now prefers Home Assistant artwork (`entity_picture` / media player proxy) before falling back to Music Assistant queue artwork.
- Loads selected-player and control-room queue snapshots through the Home Assistant Music Assistant service first, with Direct MA kept only as a fallback when HA does not return usable queue items.
- Keeps Music Assistant queue artwork for pending queue transitions, so tapping a queue item still updates title and artwork together while the player catches up.
- Adds regression tests that verify HA-first queue snapshots and current now-playing artwork through the HA media-player proxy path, while pending queue playback still uses the queue image-proxy path.
- Updates the release workflow so beta tags are published as GitHub pre-releases and are not marked as Latest.

## Why This Beta Exists

In 5.8.x the mobile now-playing pipeline became more queue-aware. That improved pending queue transitions, but it also made the current player artwork more likely to use a Music Assistant image-proxy URL instead of the Home Assistant player artwork that worked reliably in 5.7.x.

This beta restores the safer current-playback priority without undoing the queue-transition work.

It also makes queue loading integration-first again: MA web-server URLs remain useful for fallback and advanced direct features, but they are no longer the preferred path for the normal player queue snapshot.

## Validation

- Runtime baseline tests passed.
- Media now-playing foundation tests passed.
- Media presentation foundation tests passed.
- ESLint passed.
- Vite production build passed.
- Release artifacts were regenerated into `dist/`.

## Cache Refresh

After installing the beta, hard refresh the Home Assistant dashboard or update the resource URL cache key:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.8.2-beta.1
```

5.8.2 Beta 1 includes all fixes from 5.8.1 and the full 5.8.0 feature set.
