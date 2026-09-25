# HOMEii Music Flow 5.9.0

Release date: 2026-06-03

HOMEii Music Flow 5.9.0 is a major mobile, diagnostics, settings, and community release. It promotes the 5.8.2 beta stabilization work into a stable release, adds the new Library Wheel browsing experience, improves phone edge-to-edge behavior, expands Diagnostics v3, and incorporates several community PR ideas into the main card.

## Release Highlights

- **New Library Wheel experience:** the Queue Wheel-style vertical browser is now available across the library: playlists, artists, albums, tracks, liked items, radio stations, and artist albums.
- **Artist album wheel as a full-screen page:** artist albums now open in a clean Queue Flow-style full page with its own close button. The caption shows the album title and release year.
- **Radio wheel polish:** Radio uses one stable wheel stage instead of stacking multiple sections. The caption shows the station name.
- **Diagnostics v3 is now a headline support tool:** diagnostics can be run from the in-card settings and the Home Assistant visual editor, with clearer checks for Music Assistant, queue/library providers, Direct API, Sendspin, browser context, artwork paths, and privacy-safe URLs.
- **Phone edge-to-edge mode:** phones can use a true full-screen card experience while menus open as frontmost full-screen layers instead of overlapping controls.
- **Reusable dashboard support:** `card_id` isolates per-card state, and query-string player overrides such as `?player=kitchen_sonos` make reusable dashboard includes much easier.
- **Settings and performance work:** visual settings are organized into accordion sections, frequent toggles refresh without rebuilding the whole card, and artwork cache behavior adapts better to the selected performance profile.
- **Danish localization:** Danish is now included, with follow-up placeholder fixes so translated runtime variables render correctly.

## New: Library Wheel

The Queue Wheel proved useful for fast queue navigation, so 5.9.0 extends the same interaction model into the music library.

Available wheel pages:

- Playlists
- Artists
- Albums
- Tracks
- Liked items
- Radio stations
- Artist albums

The goal is fast browsing on phones and touchscreens without turning library pages into cramped grids. The normal grid/list views remain available; the wheel is an additional browsing mode.

Artist albums and radio received extra polish after local testing:

- Artist album wheel opens as a dedicated full-screen page, not inside the artist detail section.
- Artist album captions show album title and year.
- Radio wheel renders one scroll stage only, avoiding long stacked pages.
- Radio captions show the station name.

## Diagnostics v3

Diagnostics v3 is designed to reduce support loops and make Music Assistant setup issues easier to understand.

It reports:

- HOMEii runtime version and diagnostics version.
- Browser, platform, viewport, DPR, touch support, and language.
- Home Assistant URL details with privacy-safe redaction.
- Music Assistant service availability.
- Music Assistant config entry state.
- Strict Music Assistant players and fallback media players.
- Selected-player markers such as `app_id`, `mass_player_type`, `active_queue`, and registry platform.
- Direct Music Assistant API and WebSocket state when configured.
- Sendspin browser support and endpoint readiness.
- Queue identity, queue providers, queue snapshot status, and queue artwork sample.
- Library providers, library coverage, and library artwork sample.

External and private hostnames are redacted by default in visible and copied reports.

## Mobile And Layout

5.9.0 includes several phone-focused fixes and improvements:

- Edge-to-edge mode is part of the phone layout mode choice.
- Compact-card expansion opens into a frontmost full-screen experience.
- Full-screen menus no longer layer controls on top of each other.
- The Actions screen behaves like a full-screen mobile page.
- Player-selection controls were moved higher in the phone layout for better spacing.
- The library toolbar keeps the wheel button compact so it does not overlap search, sort, player focus, or quick action buttons.
- The Players screen action hub is clearer, with four icon-and-text actions: This device, Queue, Groups, and Clear all.

## Settings, State, And Reusable Dashboards

This release includes the community-driven `card_id` direction and reusable-dashboard work:

- Optional `card_id` YAML key scopes browser/local storage per card instance.
- Multiple cards in the same browser can keep different selected players, pinned/excluded players, themes, layout choices, screensaver settings, and other in-card customizations.
- Query-string player overrides are supported:

```text
?player=kitchen_sonos
?homeii_player=kitchen_sonos
?homeii_player_<card_id>=kitchen_sonos
```

This makes it easier to reuse the same dashboard/card definition across rooms and tablets.

Migration note:

Adding `card_id` to a card that previously had no `card_id` will appear to reset that card's in-card customizations once. The old global values remain in browser storage; the card simply starts reading from card-scoped keys.

## Music Assistant Compatibility

5.9.0 includes the full 5.8.2 beta stabilization series:

- Integration-first behavior so core card features can run through the Home Assistant Music Assistant integration.
- Clearer handling when Direct API browser access is blocked by CORS or mixed-content rules.
- Better fallback behavior when Music Assistant services exist but strict player markers are missing.
- More useful queue and library diagnostics.
- Correct `config_entry_id` handling for Home Assistant `music_assistant` service calls that require it.
- Cleaner `music_assistant.get_queue` diagnostic calls.
- Reduced retry noise for invalid direct Music Assistant URLs.
- Queue snapshot protection so an initial partial or empty Home Assistant response does not replace a complete queue.

Issue #28 remains a special compatibility case for setups where the selected player is exposed as a generic Home Assistant player without Music Assistant queue identity. Diagnostics v3 now gives enough context to keep investigating without blocking the stable release.

## Fixes

- Fixes the beta 8 regression where starting a playlist could leave only one or two queue items visible.
- Fixes mobile visual-editor diagnostics fallback when clipboard access is blocked by the HA Companion app or browser.
- Fixes visual-editor diagnostic contrast in themes that made text too light.
- Keeps visual-editor player settings focused on strict Music Assistant players instead of every generic `media_player`.
- Fixes Danish interpolation placeholders such as `{player}`, `{title}`, `{count}`, and `{remaining}`.
- Keeps Direct API failures non-fatal when the Home Assistant Music Assistant integration is available.
- Improves radio and artist-album wheel scrolling so they behave like the Queue Wheel.

## Community Credits

Huge thanks to **@tocDK** for taking an active role in this release cycle.

His PRs and proposals helped shape:

- `card_id` / per-card state isolation.
- Settings structure and refresh performance.
- Artwork cache behavior by performance profile.
- Danish localization.
- Danish placeholder fixes.
- Several practical performance and maintainability discussions.

Some PRs were not merged verbatim because this release needed to stabilize the current code path, but the ideas and fixes were incorporated into 5.9.0 with release credit.

Thank you also to everyone who opened issues, posted screenshots, ran beta builds, copied diagnostics reports, and helped find real-world mobile and Music Assistant edge cases. The 5.9.0 release is very much shaped by that feedback.

## Validation

Before release, the following checks passed:

- Full ESLint.
- Full Vitest suite: 192 tests passed.
- Vite production build.
- Release artifact sync into `dist/`.

## Install / Cache Refresh

HACS users can update normally once the GitHub release is available.

Manual installs should replace the contents of:

```text
/config/www/community/homeii-music-flow/
```

Then refresh the Dashboard resource with:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.9.0
```

After updating, hard refresh the Home Assistant dashboard or restart the HA Companion app if the old frontend bundle remains cached.
