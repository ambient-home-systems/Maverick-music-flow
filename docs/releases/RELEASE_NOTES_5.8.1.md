# HOMEii Flow 5.8.1

Release date: 2026-05-31

HOMEii Flow 5.8.1 is a focused hotfix on top of 5.8.0. It keeps the full 5.8.0 feature set and addresses the Music Assistant compatibility and artwork regressions reported after the upgrade.

## Hotfix Highlights

- Restores Music Assistant 2.8.x player compatibility for setups where Home Assistant exposes MA players as normal `media_player` entities without the newer MA markers.
- Keeps HOMEii Flow strict when Music Assistant is actually missing, so unrelated Home Assistant media players are still not treated as a valid setup.
- Stops clearing the selected player queue manually before `music_assistant.play_media`, letting Music Assistant handle replace playback and reducing wrapper/artwork timing races.
- Falls back from invalid image-proxy IDs to legacy path/provider artwork URLs, which helps older Music Assistant payloads continue to show cover art.
- Keeps visual-editor player selectors usable in older MA/Home Assistant combinations.
- Prevents the card screensaver from opening while the card is being edited in the Home Assistant visual editor.

## Why This Matters

5.8.0 tightened Music Assistant player detection and expanded artwork handling. That was correct for newer MA payloads, but too strict for some Music Assistant 2.8.x installations and too optimistic for some image-proxy payloads. 5.8.1 keeps the newer safeguards while adding compatibility paths for those real-world setups.

The playback change also removes an unnecessary queue-clear step before `music_assistant.play_media`. For replace playback, Music Assistant can handle the replacement itself, and avoiding the extra clear reduces the chance of player wrapper metadata being lost during fast browser-player transitions.

## Validation

- Full Vitest suite passed.
- Vite production build passed.
- Full ESLint passed.
- Release artifacts were regenerated and synced into `dist/`.

## Install / Cache Refresh

HACS users can update normally after the GitHub release is available.

Manual installs should replace the contents of:

```text
/config/www/community/homeii-music-flow/
```

Then refresh the Dashboard resource with:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.8.1
```

5.8.1 includes all 5.8.0 features and fixes; the full 5.8.0 release overview remains in `RELEASE_NOTES_5.8.0.md`.
