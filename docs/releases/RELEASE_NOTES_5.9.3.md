# HOMEii Music Flow 5.9.3

Release date: 2026-06-20

HOMEii Music Flow 5.9.3 is a focused stability release for the open 5.9.x support reports. It improves queue handling, player selection clarity, search behavior, Radio favorites, progress timing, and Diagnostics without adding new experimental features.

## Why This Release Exists

The 5.9.2 hotfix restored Settings and Diagnostics access. After users could share better reports, the remaining issues were clearer:

- some queues were shown as empty or partial even when Music Assistant had a larger queue
- `entity:` did not always behave like the expected default player
- provider search could stop after library results or feel like it never searched Spotify/Music Assistant providers
- Radio favorite actions could still target the current item instead of the selected station
- users with duplicate player names needed to see the real entity id while pinning/selecting players
- progress could drift from Music Assistant timing in some setups

## Fixed And Improved

- Improved queue snapshot handling so partial Music Assistant queue windows are detected instead of being treated as a clean success.
- Keeps fuller rendered queue data when a new queue API response is only a partial window.
- Improves Diagnostics wording for partial Queue snapshots so reports now show when Home Assistant/Music Assistant only returned part of the queue.
- Makes the configured `entity` act as a stable default player while still allowing query-string player overrides and currently playing players to take priority.
- Adds clearer player labels with entity ids in player-selection surfaces, helping users distinguish duplicate friendly names.
- Fixes provider search flow so HOMEii can show fast library results first and still continue provider/direct Music Assistant search in the background.
- Adds Direct Music Assistant `music/search` provider search support using the current Music Assistant search command shape.
- Fixes search result replacement so provider results can merge in after library results instead of being discarded.
- Fixes RadioBrowser/external radio favorites so they use local item favorites instead of the Music Assistant current-media favorite path.
- Keeps English/LTR search input alignment from leaking into RTL layouts and vice versa.
- Improves progress calculation so the player position remains closer to Music Assistant by preferring trusted player timing when queue timing drifts.

## Diagnostics v7

Diagnostics now adds two focused checks:

- **Configured entity:** reports whether the configured card `entity` exists, whether it looks like a Music Assistant player, whether it is hidden by pinned/excluded filters, and why HOMEii selected another player if it did.
- **Search providers:** when run after a search, reports HA search availability, Direct `music/search` availability, result counts, and timing for fast/library search versus provider search.

Queue Diagnostics also reports partial queue windows more clearly, including cases where the rendered queue count is lower than the queue state count.

## Important Notes

This release improves queue handling and diagnostics, but it does not claim that every empty Queue report is caused by HOMEii.

If Home Assistant or Music Assistant only returns a partial queue and no fuller Mass/Direct queue path is available, HOMEii cannot invent missing queue items. In that case, 5.9.3 should at least report the exact limitation clearly instead of showing a misleading OK state.

Spotify/provider search can still be slow when Music Assistant itself is waiting on a cold provider search. HOMEii now avoids stopping early after library results, but provider latency is still controlled by Music Assistant and the provider.

## Validation

- `node --check src/homeii-music-flow.js`
- `node --check src/core/base-music-card.js`
- `npm.cmd run build`
- `npm.cmd test`
- Full Vitest suite passed locally: 231 tests.
- Production build and release artifact sync passed locally for `5.9.3`.

## Manual Resource Refresh

After updating, use a hard refresh or update the resource cache-buster:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.9.3
```
