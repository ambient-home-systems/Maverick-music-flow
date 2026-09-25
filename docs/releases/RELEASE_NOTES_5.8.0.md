# HOMEii Flow 5.8.0

Release date: 2026-05-30

HOMEii Flow 5.8.0 is the next public release after 5.7.1. It includes the full set of project changes made since 5.7.1: architecture, mobile layout, artwork, queue, lyrics, library, Flow Assistant, visual editor, release tooling, and regression coverage.

This release is not just a small patch. It keeps the 5.7.1 foundation, then makes the card easier to maintain, more stable on real Home Assistant dashboards, and smoother on phones, wall tablets, and Section dashboards.

## Why This Release Matters

5.8.0 is designed to make HOMEii Flow feel more dependable in the exact places where music dashboards usually feel fragile: narrow phone cards, wall-tablet dashboards, changing tracks from the queue, loading artwork from different Music Assistant payloads, opening lyrics while the screensaver is active, and searching large libraries from touch-first views.

The big user-facing story is simple: **less jumping, less stale artwork, better layout control, richer browsing, and a more capable Flow Assistant**. The big maintainer story is just as important: the runtime is now split into testable foundations so future releases can move faster without turning every change into a risky edit inside one huge file.

## Highlights

- **Major internal architecture refresh:** the large card runtime has been split into focused `core`, `config`, `state`, `media`, `layout`, `palette`, `players`, and voice-matching modules.
- **Better phone layout control:** new phone layout modes let users choose Auto, Full, or Compact behavior instead of relying only on automatic sizing.
- **Smarter compact experience:** compact mode can auto-select a better widget shape, force compact/full layouts, and optionally open edge-to-edge or as a floating window.
- **Artwork and now-playing reliability:** queue artwork, image-proxy handling, artwork prefetching, and pending track transitions are much more stable.
- **Lyrics in screensaver:** lyrics can now move into the screensaver surface, including a configurable screensaver lyrics button.
- **Library upgrades:** library tab search, media detail views, artist/album detail handling, and visible loading feedback make browsing feel more complete.
- **Flow Assistant matching improvements:** Hebrew, Latin/English metadata, natural artist requests, playlist requests, and fallback search paths are handled more reliably.
- **Release tooling and tests:** package/source/dist version alignment, module cache-busting, runtime registration, and many foundation helpers now have regression coverage.
- **Existing premium foundations stay intact:** Hotel Mode, This Device / Sendspin, HTTPS Music Assistant external URL support, Control Room, announcements, ambient light sync, Night mode, timers, quick actions, auxiliary buttons, and multilingual/RTL support remain part of the 5.8.0 package.

## Full Change Overview

5.8.0 includes all changes made after the public 5.7.1 release.

### Architecture And Maintainability

- Splits the card runtime into reusable foundation modules instead of keeping all logic inside one giant file.
- Adds `src/core/base-music-card.js` as the shared base card runtime.
- Adds `src/config/editor-forms.js` for editor form schema generation.
- Adds `src/config/editor-element.js` for the visual editor custom element.
- Adds focused state modules for defaults, derived state, mobile settings, players, queue, favorites, and night mode.
- Adds focused media modules for artwork, now-playing state, media presentation, and media history.
- Adds focused layout and palette modules for responsive behavior and dynamic theme color handling.
- Adds `src/core/voice-assistant-matching.js` for Flow Assistant speech/query matching.
- Adds `src/core/radio-browser-countries.js` for shared RadioBrowser country labels and flags.
- Keeps existing variable names and behavior paths where possible while moving logic into smaller modules.
- Keeps the public custom card names and editor registrations intact.

### Build, Packaging, And Release Flow

- Updates the packaged version to `5.8.0`.
- Updates editor element version tags to the `v580` generation.
- Updates build and release scripts so `vite build` runs before release artifact sync.
- Adds `--preserve-main` release behavior so the built/bundled main file is not accidentally overwritten during artifact sync.
- Copies `src/core` into `dist/core` during release artifact sync.
- Copies `src/config` into `dist/config` during release artifact sync.
- Adds versioned cache-busting imports for `core`, `config`, and localization modules.
- Keeps localization import URLs aligned with `5.8.0`.
- Keeps the bundled `dist/homeii-music-flow.js` registerable as the primary HACS runtime file.
- Keeps Sendspin and vendor assets copied into the release package.

### Runtime Baseline And Test Coverage

- Adds a runtime baseline test that verifies package, source, and dist versions stay aligned.
- Adds runtime registration coverage for the main card, mobile card, browser editor, and mobile editor.
- Adds visual editor shell coverage to confirm config updates are accepted.
- Adds dist runtime coverage to verify the bundled artifact can still be imported and registered.
- Adds foundation tests for editor forms, media artwork, now-playing state, RadioBrowser countries, responsive layout, palette handling, player logic, mobile settings, queue logic, favorites, and voice matching.
- Expands existing config validation tests for the new layout, compact, announcement, and screensaver options.

### Phone Layout, Compact Mode, And Section Dashboards

- Adds `mobile_layout_mode` with Auto, Full, and Compact options.
- Adds in-card settings controls for Phone layout mode.
- Adds visual editor support for Phone layout mode.
- Adds Full phone mode for users who want the phone player to stay inline and request a taller dashboard slot.
- Adds forced Compact mode for users who want the card to stay as a compact tile.
- Keeps Auto mode as the adaptive default.
- Adds better automatic compact recommendations for narrow or short dashboard slots.
- Adds `mobile_compact_edge_to_edge` so compact expand can be edge-to-edge or a floating window.
- Adds in-card and visual-editor controls for compact edge-to-edge behavior.
- Improves compact popup class handling for edge-to-edge, floating-window, and tile states.
- Keeps Home Assistant navigation visible when compact edge-to-edge is disabled.
- Adds a smarter compact mini-widget recommendation for very narrow cards and short compact slots.
- Improves reserved Section dashboard height for compact tile and mini-widget layouts.
- Improves full-inline phone height handling for Section dashboards.
- Adds layout handling for short and tight phone heights so forced full layout can scroll instead of cutting controls.
- Improves tablet auto-fit and dense UI flags when night mode or up-next rows are active.
- Adds panel viewport fill detection for dashboard panels that are intended to use the full viewport height.
- Adds resize strategy helpers to avoid unnecessary heavy rebuilds during keyboard-like resizes and tablet stability mode.

### Artwork, Images, And Dynamic Backgrounds

- Adds decoded artwork caching so images can render immediately after they have already been decoded.
- Adds immediate image `src` output for current artwork while decode is still pending.
- Adds high-priority artwork loading for current artwork.
- Adds artwork prefetch queue management with active request limiting.
- Prefetches current, next, previous, nearby, and visible queue artwork.
- Adds scroll-aware queue artwork prefetching for visible rows.
- Adds cache keys based on stable queue item identity and artwork identity.
- Improves Music Assistant image-proxy handling for `/imageproxy`, `imageproxy?`, and `imageproxy/<id>` paths.
- Adds normalized image-proxy size handling.
- Adds support for Music Assistant image proxy IDs.
- Adds support for base64 encoded local image payloads.
- Adds support for more artwork fields, including thumbnails, covers, media images, local images, preview images, external images, media item images, album images, and nested metadata images.
- Improves fallback artwork selection across player artwork, queue artwork, album artwork, media metadata, and provider metadata.
- Keeps queue artwork and player artwork from mixing when the queue item no longer matches the player-reported track.
- Changes important artwork surfaces to `object-fit: contain` where cropping caused user-visible problems.
- Adds background crossfade helpers for current artwork backgrounds.
- Keeps artwork backgrounds synchronized with dynamic theme updates.

### Now Playing And Queue Reliability

- Adds pending queue play state that records the selected item key, URI, queue index, and target player.
- Keeps title, artist, album, URI, and artwork atomic during pending queue transitions.
- Prevents the phone now-playing surface from showing the new title with the old artwork during track changes.
- Locks the selected player while a queue play transition is pending, so another active player does not steal focus.
- Clears pending queue play state once the player and queue catch up.
- Adds stronger queue item identity helpers for stable IDs, playback IDs, URIs, and sortable indexes.
- Exports queue comparison helpers for test coverage and shared runtime use.
- Improves queue item matching by title, artist, URI, sort index, and stable item IDs.
- Adds queue mutation pending state so optimistic reorder/mutation flows do not fight immediate server refreshes.
- Improves playback duration handling, including string durations, ISO durations, and millisecond durations.
- Improves playback timestamp parsing across browser/server formats.
- Keeps mobile up-next and now-playing display sources more consistent with the Music Assistant queue snapshot.

### Lyrics And Screensaver

- Adds a `lyrics` option to configurable screensaver control buttons.
- Adds a screensaver lyrics button with active state.
- Allows the screensaver to open while lyrics are active.
- Moves an open lyrics modal into screensaver lyrics mode instead of leaving a modal behind.
- Adds tablet behavior for opening lyrics directly in screensaver mode.
- Adds screensaver lyrics rendering beside the artwork.
- Shows synchronized lyric rows in screensaver when timed lyrics are available.
- Falls back to readable lyric text when synchronized rows are unavailable.
- Keeps lyrics mode active while playback is active or freshly paused.
- Automatically leaves screensaver lyrics mode after an inactive pause window.
- Refreshes lyrics automatically when the current track changes.
- Adds shared state for the current lyrics track key, raw lyrics text, loading state, and screensaver lyrics state.
- Keeps modal lyrics and screensaver lyrics from conflicting with each other.

### Library, Search, And Media Detail Views

- Adds per-library-tab search state with separate drafts and committed queries.
- Adds inline and row-style library tab search boxes.
- Restores search focus after tab search rerenders.
- Adds search placeholders that match the active library tab.
- Adds tab-specific filtering for playlists, artists, albums, tracks, radio, podcasts, liked items, and search views.
- Adds library search result grouping for mixed provider and local results.
- Adds better duplicate filtering for library items.
- Adds stable library item keys for dedupe and action handling.
- Adds visible tap feedback and loading feedback for library actions.
- Adds loading indicators for media entries, category rows, radio country entries, media detail heroes, nav buttons, layout buttons, play buttons, search buttons, discovery items, and player focus controls.
- Adds media detail shell layouts for albums, playlists, and artists.
- Adds artist detail rendering.
- Adds album browse selection support.
- Adds track-row rendering inside media detail views.
- Adds media detail data attributes so play, add, next, like, radio mode, and context actions can reuse the same normalized entry data.
- Adds detail artwork selection that can use artist images, album images, media images, and metadata images.
- Adds dynamic theme support for detail pages using server-provided palettes where available.
- Adds fallback track loading for album detail pages when direct Music Assistant detail commands do not return tracks.
- Improves RadioBrowser country selector behavior with shared country labels, translated common countries, and flag emoji helpers.
- Improves radio playback detection so normal tracks with "radio" in the title are not misclassified as radio streams.
- Improves RadioBrowser stream detection through provider and metadata hints.

### Dynamic Theme, Palette, And Visual Polish

- Adds palette normalization for Music Assistant palette payloads.
- Adds dynamic theme style signatures to avoid unnecessary restyling.
- Adds dynamic theme render-state synchronization.
- Adds stronger active accent color and active accent RGB resolution.
- Adds background motion style synchronization.
- Automatically disables dynamic theme and background motion in performance modes where heavy visuals should stay off.
- Adds palette helpers for RGB normalization, RGB/HSL conversion, color mixing, and tuned palette colors.
- Improves light/dark text decisions for custom accent colors.
- Improves menu detail theming from item artwork and server palettes.
- Clears detail themes when leaving detail contexts.
- Keeps ambient light synchronization connected to dynamic theme palette changes.

### Flow Assistant And Voice Matching

- Moves voice matching into a dedicated foundation module.
- Improves command normalization for Hebrew and English requests.
- Adds Hebrew-to-Latin phonetic matching so Hebrew speech can match Latin Music Assistant metadata.
- Improves matching for Hebrew song and artist requests.
- Improves natural artist-only requests such as "songs by artist".
- Improves natural playlist-by-artist requests.
- Adds focused search for requested media types when broad search is unavailable or too noisy.
- Keeps playback working when the broad Music Assistant search path fails but focused search succeeds.
- Rejects unrelated results instead of auto-playing a result only because its media type matches.
- Accepts clear title matches even when artist metadata is missing.
- Keeps one-word title matches working for direct requests.
- Adds configurable Flow Assistant response, listen, and auto-close timing through the editor schema.

### Players, Priority, Helpers, And Announcements

- Improves preferred front-player resolution with configured custom player order.
- Lets ordered player lists influence which playing or active player is chosen first.
- Keeps manual front-player selection when it becomes the playing player.
- Keeps browser players out of normal front-player fallback unless explicitly appropriate.
- Improves Music Assistant player detection from state attributes and entity registry metadata.
- Exports player helper functions for stable tests and shared runtime logic.
- Adds active-player helper de-duplication so the helper entity is not written repeatedly with the same value.
- Keeps `active_player_helper_entity` synchronized when the selected player changes, clears, or reloads.
- Adds `mobile_announcement_volume` normalization and validation.
- Adds an announcement volume boost setting with a 20 to 50 percent range.
- Restores the previous announcement volume after temporary announcement volume changes.
- Keeps TTS entity and TTS language normalization intact.

### Favorites And Liked State

- Improves favorite matching with exported comparable-text helpers.
- Improves current media like metadata by considering queue item images and album metadata.
- Keeps optimistic favorite cache behavior covered by tests.
- Improves favorite removal argument resolution from queue and media references.
- Keeps local-like and Music Assistant-like paths separated.

### Editor And Configuration

- Moves editor forms into reusable schema builders.
- Adds visual editor fields for phone layout mode.
- Adds visual editor fields for compact widget style and compact edge-to-edge expand behavior.
- Adds visual editor fields for announcement volume boost.
- Adds `lyrics` to screensaver button validation and editor options.
- Keeps settings-source, layout, language, theme, performance, night mode, compact, player, library, quick action, announcement, ambient light, screensaver, power, auxiliary, and Music Assistant editor sections available.
- Adds editor form tests for language options, mobile layout options, screensaver lyrics button options, and helper text.

### Validation Added For 5.8.0

- Package/source/dist version alignment.
- Runtime registration for card and editors.
- Dist bundle import and registration.
- Editor shell creation and config updates.
- Music Assistant 2.9 queue artwork payloads.
- Pending queue title/artwork consistency.
- Pending target-player locking.
- Immediate artwork rendering before decode completes.
- Visible queue artwork prefetch windows.
- Screensaver lyrics entry, exit, and track refresh behavior.
- Screensaver lyrics control rendering.
- Responsive layout mode, auto compact, panel fill, tablet stability, and resize strategy helpers.
- Mobile settings normalization for new layout, compact, announcement, quick action, player, and screensaver settings.
- Voice matching for Hebrew, Latin metadata, playlist requests, artist requests, title-only matches, and fallback search.
- Radio playback detection and RadioBrowser country helpers.

## Existing Premium Foundations Still Included

5.8.0 is built on the public 5.7.1 release, so the major HOMEii Flow foundations remain part of the package:

- Hotel Mode for guest-safe and family-safe dashboards.
- HTTPS Music Assistant external URL support for Nabu Casa and Companion App users.
- This Device / Sendspin browser-player support, including Media Session and screensaver behavior from the 5.7.1 cycle.
- Control Room / Studio multi-room controls, queue transfer, grouping, player volume management, Music Hub browsing, recent items, favorites, announcements, timers, schedules, and diagnostics.
- Quick Actions, configurable main bar items, Home shortcut support, POWER actions, and multiple auxiliary buttons with Home Assistant icon/action mapping.
- Night mode, sleep timer, start schedules, Up Next, Discovery mode, Quick Mix, recent playback history, local/Music Assistant liked modes, and artwork swipe browsing.
- Ambient light sync, per-player light mappings, brightness/transition/cooldown controls, and dynamic artwork color behavior.
- English, Hebrew/RTL, Spanish, French, Italian, Lithuanian, and Simplified Chinese dictionaries.
- Grouping feedback, front-player pinning, player priority, RadioBrowser visibility, and the 5.7.1 tablet/mobile polish.

## Upgrade Notes

- 5.8.0 is the next public version after 5.7.1.
- If you use a manual Lovelace resource URL, update the cache-busting query to:

```yaml
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.8.0
```

- If the card does not refresh immediately after installing, clear the Home Assistant frontend cache or reload the dashboard resource.
- Users with compact dashboards should review the new Phone layout mode and Compact edge-to-edge settings.
- Users with screensaver controls can now add `lyrics` to `screensaver_control_buttons`.
- Users who rely on announcements can tune the new announcement volume boost setting.

## Pre-Release Review Checklist

- Run the full local check suite before publishing.
- Verify the bundled `dist/homeii-music-flow.js` loads as the HACS resource.
- Verify the visual editor opens for both `homeii-music-flow` and `homeii-music-mobile`.
- Verify phone Auto, Full, and Compact layout modes on a narrow dashboard.
- Verify compact edge-to-edge enabled and disabled behavior in Home Assistant.
- Verify queue item playback from the mobile queue does not show mismatched title/artwork during transition.
- Verify screensaver lyrics with timed lyrics, plain lyrics, playing state, and paused state.
- Verify library tab search, album detail, artist detail, RadioBrowser country browsing, and liked/library pages.
- Verify Flow Assistant Hebrew and English music requests against the target Music Assistant library.
