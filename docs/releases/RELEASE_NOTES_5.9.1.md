# HOMEii Music Flow 5.9.1

Release date: 2026-06-15

HOMEii Music Flow 5.9.1 is a focused stability and support release after 5.9.0. The main goal is simple: keep the proven Music Assistant playback path working, reduce confusing support loops, make group/player behavior clearer, and prepare the card for the upcoming HOMEii Flow Engine integration without forcing any new backend dependency yet.

## Overview

5.9.1 is the release for real-world cleanup after the 5.9.0 rollout. It restores the 5.9.0 playback service path, improves queue and artwork diagnostics, makes group changes safer, adds Radio and favorites controls, clarifies pinned-player selection, lets users acknowledge repeated card warnings, and adds configurable screensaver Lyrics controls.

The release also includes optional HOMEii Flow Engine bridge infrastructure. That bridge is intentionally safe by default: existing dashboards continue to use the current Home Assistant and Music Assistant paths unless the future Engine integration is installed and enabled.

## Highlights

- **Playback stability:** `music_assistant.play_media` remains the primary playback path, matching the behavior users already trusted in 5.9.0.
- **Diagnostics v6:** diagnostics now reports selected-player source, group state, queue UI/API mismatch, rendered artwork DOM health, authenticated artwork fallback, browser artwork loading, Direct Music Assistant, Sendspin readiness, and optional Engine bridge status.
- **Safer group management:** group screens show the master/owner clearly, keep all players visible, show pending add/remove changes, and separate Update Group from Disconnect All.
- **Cleaner pinned-player setup:** visual-editor pinned and excluded player selectors now show friendly names together with entity ids, reducing confusion when several players share a similar name.
- **Repeated warning acknowledgement:** repeated card issue messages can now be confirmed so the same warning does not keep looping, while new or changed issue text can still appear.
- **Library and Radio control:** favorites-only filtering, Radio source mode, and consistent List/Grid preference handling are included in the stable package.
- **Screensaver Lyrics controls:** when Screensaver controls are enabled, the visual editor can expose Lyrics, Sync lyrics, Smaller lyrics, and Larger lyrics buttons. The buttons stay in the same action row and use temporary pressed highlighting.
- **Artwork resilience:** cross-origin artwork handling now has direct browser loading and authenticated fallback paths for cases such as HTTPS, external URLs, and Nabu Casa access.
- **Music Assistant 2.9 readiness:** native recommendation hooks are available for HOMEii recommendations and Studio Mix flows when the direct MA API supports them.

## Fixes And Improvements

### Playback And Queue

- Restores the stable 5.9.0 `music_assistant.play_media` playback path.
- Keeps query-string player overrides without letting configured-player selection interfere with playback.
- Refreshes the selected queue before opening Queue Flow.
- Applies a valid queue snapshot back into the UI when queue APIs return data but the rendered queue is empty.
- Adds diagnostics for queue provider availability, queue UI state, and queue/render mismatches.

### Groups

- Keeps the current master/owner visible in the group screen.
- Adds per-player group labels: Connected, Master, Tap to join, Will join, Will remove, and Disconnects all.
- Uses a diff-based group apply flow so removing one speaker does not clear the whole group.
- Avoids calling `join` again for removal-only changes.
- Waits for Home Assistant to confirm expected group state before showing success.
- Rebases member-selected group edits onto the actual group owner.
- Treats master removal as an intentional full-group disconnect, matching Home Assistant and Music Assistant behavior.
- Adds a main-player group volume shortcut when the selected player is part of a group.

### Library, Favorites, And Radio

- Adds favorites-only filtering for mobile library pages.
- Keeps Radio favorites on a Music Assistant-only path so external RadioBrowser results do not mix with saved MA favorites.
- Adds Radio source mode: Combined, Music Assistant first, Music Assistant only, or RadioBrowser only.
- Honors Library List/Grid preference across library pages, search results, liked entries, and artist album sections.
- Fixes item-scoped favorite actions from search and menus so favorites are created for the selected item instead of depending on the currently playing media.

### Screensaver And Lyrics

- Screensaver can automatically open Lyrics mode while music is playing and keep clock mode while idle.
- Closing Lyrics manually is respected per track so it does not immediately reopen for the same song.
- Optional visual-editor Screensaver buttons now include Lyrics, Sync lyrics, Smaller lyrics, and Larger lyrics.
- Lyrics sync and font-size buttons stay on the same row as the rest of the screensaver controls.
- Screensaver control buttons use temporary touch/click highlighting and return to transparent afterward.
- Wide and desktop Lyrics controls remain visible and scrollable when space is tight.

### Diagnostics And Artwork

- Diagnostics v6 adds selected-player source, group service path, group owner, group members, queue UI state, artwork browser loading, authenticated artwork fetch fallback, and rendered artwork DOM checks.
- Cross-origin hydrated artwork uses direct browser image loading instead of a CORS-sensitive fetch blob path.
- Music Assistant `imageproxy` artwork can use authenticated fetch-to-blob loading when `ma_token` is configured.
- Diagnostics can now better distinguish missing artwork from browser access-path failures.

### Configuration And Editor

- Adds a dedicated Screensaver section in the visual editor.
- Pinned and excluded player selectors show entity ids next to friendly names.
- Repeated card issue warnings can be acknowledged to prevent identical notification loops.
- Adds optional HOMEii Flow Engine bridge options:

```yaml
homeii_engine_mode: auto
homeii_engine_timeout_ms: 3500
homeii_engine_instance_id: ""
homeii_engine_profile_id: ""
```

The Engine bridge is optional. `auto` keeps the card compatible with normal frontend-only operation.

## What Is Not In 5.9.1

Some larger items are intentionally held for later releases:

- Full HOMEii Flow Engine integration release.
- Full alias-management UI.
- Crossfade controls.
- Lazy locale loading.

Those were kept out of 5.9.1 so this release can stay focused on stability and support fixes.

## 6.0.0 Teaser

5.9.1 quietly lays the track for HOMEii Music Flow 6.0.0.

The next major release is planned around the HOMEii Flow Engine integration: deeper backend awareness, richer diagnostics, smarter player state, queue/library proxying, grouping orchestration, scheduling, timers, statistics, volume rules, Sendspin status, and stronger recommendation flows. The goal for 6.0.0 is not just "more buttons"; it is a more intelligent music surface that understands the home behind the dashboard.

5.9.1 is the stable stepping stone. 6.0.0 is where the integration story starts to open up.

## Validation

Before release, the following checks passed locally:

- Production build and release artifact sync for `5.9.1`.
- Full ESLint.
- Full Vitest suite: 229 tests passed.
- `node --check dist/homeii-music-flow.js`.

## Install / Cache Refresh

HACS users can update normally once the GitHub release is available.

Manual installs should replace the contents of:

```text
/config/www/community/homeii-music-flow/
```

Then refresh the Dashboard resource with:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.9.1
```

After updating, hard refresh the Home Assistant dashboard or restart the HA Companion app if the old frontend bundle remains cached.
