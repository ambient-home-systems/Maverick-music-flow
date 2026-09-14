# HOMEii Music Flow 6.0.0

> [!CAUTION]
> **BREAKING CHANGE FOR EVERY 5.9.3 USER — DO NOT UPDATE THE CARD FIRST.**
>
> Version 6 requires **HOMEii Flow Engine 1.0.0**, a separate Home Assistant custom integration. Back up Home Assistant and the dashboard, install and configure the Engine, restart Home Assistant, and verify the Engine connection before replacing the 5.9.3 card. Updating only the card can leave music controls unavailable.

## Required upgrade order

1. Create a Home Assistant backup and save the current card YAML/resource URL.
2. Install **HOMEii Flow Engine 1.0.0** from its custom HACS repository or manual package.
3. Restart Home Assistant.
4. Add the Engine integration and connect it to the direct Music Assistant server URL, normally port 8095, using a Music Assistant long-lived token. Do not enter an HA ingress URL, HA token, or Spotify key.
5. Confirm the Engine reports a connected Music Assistant instance and players.
6. Update **HOMEii Music Flow to 6.0.0** and keep exactly one registered card resource.
7. Fully reload every browser and Companion App, then confirm Card 6.0.0 and Engine 1.0.0 in Diagnostics.

[Beginner installation, upgrade and rollback guide](https://github.com/r11a/homeii-music-flow/blob/v6.0.0/docs/INSTALL_STEP_BY_STEP.md) · [Required Engine](https://github.com/r11a/homeii-flow-engine)

## A completely new HOMEii Flow

- Immersive, artwork-led player with dynamic color, refined glass surfaces, Edge-to-Edge presentation and responsive phone, tablet, desktop and compact layouts.
- Contextual action wheels that expose relevant controls for playback, players, library, queue, discovery, lyrics, timers and system tools.
- Full Music Assistant library, provider search, recommendations, albums, artists, playlists, podcasts, radio and genre discovery.
- Queue management with seeking, waveform progress, reordering, item actions and player transfer.
- Multi-room player selection, grouping and per-player/group volume controls.
- Synchronized lyrics when available, karaoke presentation, screensaver, announcements, schedules, wake-up flows, listening statistics and artwork lighting.
- Dark, light and adaptive themes, RTL support, visual editor, performance profiles and built-in diagnostics.
- Optional source and quality badges, configurable action wheels, player visibility and per-device preferences.

## Final fixes since Beta 2

- Added a low-frequency Engine player-state fallback for tablets and embedded WebViews that miss a realtime event. Track title, artwork and playback state recover without leaving and reopening the dashboard page.
- Disabled expensive moving background layers on coarse-pointer tablet layouts while retaining the artwork-driven static color atmosphere, preventing the reported WebView flicker.
- The main heart now opens the current-track action sheet, providing both Favorite/Remove Favorite and Add to playlist when Music Assistant exposes editable playlists.
- Retains the Beta 2 fixes for immediate library loading, compact layout balance, waveform/progress behavior, artwork recovery, wheel touch isolation, badge visibility and visual-editor version synchronization.

## Rollback to 5.9.3

Reinstall card 5.9.3, restore its saved card configuration and keep exactly one 5.9.3 JavaScript resource. Clear browser/Companion caches. The Engine may remain installed, but disable Engine schedules, lighting assignments or other persistent backend rules you no longer want. Restore the Home Assistant backup if you need the complete pre-upgrade state. Never edit `.storage` manually.

## Compatibility and support

Requires a current Home Assistant installation, Music Assistant API schema 63 or newer, Engine 1.0.0, a valid Music Assistant token and at least one available Music Assistant player. Provider-specific actions appear only when supported.

Please report reproducible problems through [GitHub Issues](https://github.com/r11a/homeii-music-flow/issues) with card, Engine, HA and MA versions, device/browser, exact steps and redacted Diagnostics. Never include tokens or backups.

German translation contribution: **rtreichl**. Thank you to every beta tester whose reports shaped this release.
