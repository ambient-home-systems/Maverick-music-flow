# HOMEii Flow 5.7.1

Release date: 2026-05-26

HOMEii Flow 5.7.1 is a polish, safety, and hospitality release for the 5.7.x cycle. It keeps the large 5.7.0 foundation and focuses on the real-world dashboard details that came up during local testing: Hotel Mode, safer player priority, HTTPS Music Assistant access, Sendspin / Media Session sync, grouped-player feedback, Discover/library fixes, and phone/tablet visual polish.

## Highlights

- **Hotel Mode:** a clean shared-space interface for guests, family dashboards, hotels, and wall tablets.
- **Safer front player selection:** temporary manual selection, front pinning, currently playing players, and defaults now resolve more predictably.
- **HTTPS Music Assistant support:** `music_assistant_external_url` lets HTTPS Home Assistant dashboards connect to an HTTPS-accessible Music Assistant endpoint for Sendspin/browser player use.
- **Merged community PRs:** PR #34, PR #35, and PR #36 from **jingle-jew** keep Sendspin / Media Session state active and synced while the screensaver is open, and add a macOS native Home Assistant WebView audio fallback.
- **Italian localization:** PR #37 from **Dieghito72** adds Italian to the bundled language package.
- **Grouping feedback:** group join/disconnect actions now show loading feedback and clear stale group-volume state more reliably.
- **Tablet and phone polish:** recommendation drawer behavior, tablet mute sizing, pin placement, Discover layout, and screensaver transitions were refined.

## Full Change Overview

5.7.1 closes the local 5.7.x polish cycle with a long list of practical fixes:

- Adds Hotel Mode for protected shared dashboards.
- Renames the user-facing wording to "Hotel Mode" instead of guest mode.
- Removes all main navigation items in Hotel Mode.
- Keeps the HOMEII FLOW logo visible in Hotel Mode.
- Keeps Hotel Mode focused on player controls, volume, search, artwork browsing, and player selection only.
- Hides queue transfer, grouping tools, advanced actions, long-press actions, theme toggle, media-source badges, and secondary controls in Hotel Mode.
- Restores the original search-button placement and sizing.
- Reduces duplicate artwork/background layers in Hotel Mode.
- Adds front-player priority so an actively playing player can appear first instead of always falling back to the first configured player.
- Adds front-player pinning, with pin priority above playing/default player selection.
- Keeps manual player selection possible even when another player is pinned or playing.
- Keeps manual inactive-player selection temporary, then returns to the pinned/playing/default hierarchy.
- Clears temporary manual selection when leaving and returning to the dashboard page.
- Fixes the phone case where manual player selection could immediately jump back to the pinned player.
- Refines player-card pin sizing, color, and top-corner placement.
- Removes the pin from queue-transfer player selection.
- Adds `music_assistant_external_url` for HTTPS-accessible Music Assistant connections.
- Keeps local `ma_url` for normal LAN/HTTP dashboards.
- Shows clear mixed-content/setup errors instead of trying to bypass browser security rules.
- Routes remote artwork through Music Assistant image-proxy paths where possible.
- Restores RadioBrowser station visibility in the library.
- Improves radio artwork fallback behavior.
- Removes the experimental Crossfade control because service support was not reliable enough.
- Adds group join/disconnect loading feedback.
- Adds separate connect/disconnect animation states for group actions.
- Fixes group disconnect so stale shared group volume clears without leaving and reopening the page.
- Makes group add/remove controls clearer, including selected-state feedback.
- Improves spacing and premium styling of group connect/disconnect buttons.
- Changes FLOW multi-player behavior so selecting more than one player starts a join/group flow instead of trying to play separately on each player.
- Fixes "Clean all" so stopped/cleared players also lose stale local artwork.
- Keeps Discover open when switching players on tablet.
- Moves the Discover style selector into the active-player area on tablet.
- Adds grid/list controls to the tablet Liked screen.
- Restores the mobile recommendation drawer button behavior from 5.7.0.
- Keeps the tablet recommendation drawer as a subtle fixed edge arrow.
- Fixes the mobile recommendation drawer action so it keeps the same glass-button styling as the other quick actions.
- Restores the 5.7.0 magic-wand icon after testing custom variants.
- Refines the music-library icon treatment.
- Shrinks tablet mute controls and trims heavy volume rows.
- Moves tablet quality/library/provider badges closer to the artwork so they feel less detached.
- Adds smooth fade-in and fade-out transitions when entering and leaving the screensaver.
- Keeps Sendspin / Media Session state active and synced while the screensaver is open.
- Adds a macOS native Home Assistant app fallback for Sendspin audio output.
- Adds Italian localization and keeps all language dictionaries aligned.
- Updates release packaging, cache-busting, tests, docs, and publishing notes for 5.7.1.

## Hotel Mode

Enable with:

```yaml
type: custom:homeii-music-flow
hotel_mode: true
```

Hotel Mode is designed for dashboards where the user should be able to play music, change volume, search, and switch players without touching advanced controls.

Included behavior:

- Main navigation items are removed.
- Queue management, advanced settings, group join/disconnect, queue transfer, long-press actions, theme toggle, source badges, and secondary actions are hidden.
- Core controls stay available: play/pause, previous/next, shuffle, repeat, volume slider, volume +/- buttons, search, player selection, and artwork browsing.
- Player selection remains simple and does not expose group/transfer actions.
- HOMEII FLOW branding is restored.
- Glassmorphism and aura lighting remain, but duplicate artwork layers are reduced for a cleaner premium look.

## Player Priority And Pinning

5.7.1 improves how HOMEii Flow decides which player should be shown in front:

- Temporary manual player selection works even if another player is pinned or playing.
- A pinned front player remains respected once the short manual selection window ends.
- A currently playing player is preferred over inactive/default players when no temporary selection or pin is active.
- Temporary manual selection is cleared when leaving and returning to the dashboard page.
- The player-card front pin is smaller, better positioned, and uses a quiet grey inactive state with cover-accent active color.

## Music Assistant, HTTPS, And Sendspin

New optional config:

```yaml
type: custom:homeii-music-flow
ma_url: "http://LOCAL_MUSIC_ASSISTANT:8095"
music_assistant_external_url: "https://YOUR_HTTPS_MA_URL"
```

Behavior:

- HTTP/LAN dashboards keep using `ma_url`.
- HTTPS Home Assistant dashboards can use `music_assistant_external_url` for Sendspin websocket/browser-player connections.
- Browser mixed-content rules are respected. If Home Assistant is served over HTTPS and only insecure Music Assistant access is configured, HOMEii Flow shows an explicit error instead of trying to bypass the browser.
- Remote artwork is routed through Music Assistant image proxy paths when possible, reducing CORS failures in search, library, and radio views.
- Sendspin falls back to direct AudioContext output in macOS native Home Assistant WebView when MediaStreamDestination is unavailable.

## Grouping, FLOW, Discover, And Library

- Group join and disconnect actions now show loading/working feedback.
- Disconnecting a group clears stale shared group volume state without needing to leave and re-open the page.
- The group player picker is visually cleaner and aligns controls better with the player card corners.
- Queue-transfer player selection no longer shows the front-pin control.
- FLOW now treats selecting more than one player as a join/group scenario rather than attempting separate playback on each selected player.
- "Clean all" clears stale local artwork after stopping/disconnecting players.
- Discover stays open when switching players on tablet.
- Discover style selection sits with the active-player area on tablet.
- RadioBrowser stations are visible again in the library flow.
- The tablet Liked screen has grid/list controls.

## UI Polish

- Restores the 5.7.0 magic-wand icon.
- Restores the 5.7.0 mobile recommendation drawer button behavior in the quick-action row.
- Keeps the tablet recommendation drawer as a subtle edge arrow.
- Shrinks tablet mute controls and their internal icon.
- Refines player-card pin placement, group add/remove controls, group action buttons, and volume rows.
- Adds smooth fade-in and fade-out transitions for the screensaver.
- Removes the experimental Crossfade control for now because service support was not reliable enough for release.

## Contributors

Special thanks to **jingle-jew / Julien Moreau B.** for the excellent work, careful testing, and repeated PRs that made this release better:

- PR #34
- PR #35
- PR #36
- Sendspin / Media Session improvements
- macOS native Home Assistant WebView audio fallback
- French wording work
- Testing and feedback during the 5.7.x polish cycle
- The kind of practical, real-device fixes that make HOMEii Flow more reliable for everyone

Thanks also to the localization contributors whose work remains part of the release:

- Daniel Eduardo Gonzalez ([@danielxb-ar](https://github.com/danielxb-ar)) for Spanish.
- Donatas / donatassmarterhome for Lithuanian.
- Julien Moreau B. / jingle-jew for French.
- [@Dieghito72](https://github.com/Dieghito72) for Italian.
- [@gao19970120](https://github.com/gao19970120) for Simplified Chinese.

## Validation

Release validation performed locally:

- Build and release artifact sync.
- Vitest regression suite.
- ESLint check, with existing warnings only.
- Git diff whitespace check, with Windows CRLF notices only.
