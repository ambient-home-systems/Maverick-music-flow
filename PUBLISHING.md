# Publishing Checklist

## 1. Prepare the GitHub repository

- Create or use a public GitHub repository named `homeii-music-flow`.
- Confirm the GitHub repository has a short description and relevant topics such as `home-assistant`, `hacs`, `lovelace`, `music-assistant`, `sendspin`, and `dashboard-card`.
- Push the full repository contents, including:
  - `README.md`
  - `LICENSE`
  - `hacs.json`
  - `dist/homeii-music-flow.js`
  - `dist/localization/`
  - `dist/sendspin-js/`
  - `dist/vendor/embla-carousel.umd.js`
  - `dist/homeii-flow-logo.svg`
  - `docs/brand/homeii-flow-logo.svg`
  - `src/sendspin-js/`
  - `vendor/embla-carousel.umd.js`
  - `.github/workflows/validate.yml`
- Confirm the README renders:
  - the Maverick Music logo
  - the preview GIF
  - the screenshot tables
  - the HACS My Home Assistant button
  - the HACS download/install button

## 2. Create the current release

- Create a Git tag named `v5.9.2` for the current stable release or `vX.Y.Z` for a later stable release.
- Create a GitHub release from that tag.
- Title the release `Maverick Music 5.9.2` for the current stable release.
- Use the matching section from `CHANGELOG.md` or the matching `RELEASE_NOTES_*.md` file as the release notes.
- Tags with a prerelease suffix, such as `v5.8.2-beta.1`, should publish as GitHub pre-releases and must not be marked as Latest.
- Do not attach a custom release zip asset for HACS. Keep the complete installable runtime in `dist/` and let HACS use the normal repository release/tag contents.

## 3. Verify repository files after publishing

- Confirm `hacs.json` still points to `homeii-music-flow.js`.
- Confirm `dist/homeii-music-flow.js` matches the released runtime.
- Confirm `dist/localization/` includes English, Hebrew, Spanish, French, Italian, Lithuanian, and Simplified Chinese dictionaries.
- Confirm `dist/sendspin-js/` exists for the local Sendspin browser player.
- Confirm `dist/vendor/embla-carousel.umd.js` exists for mobile swipe support.
- Confirm `dist/homeii-flow-logo.svg` and `docs/brand/homeii-flow-logo.svg` exist.
- Confirm the HACS validation workflow is enabled on GitHub.
- Confirm the README requirements section still matches the current release.
- Confirm the README Sendspin section explains `ma_url`, `ma_token`, local network preference, and the `This device` flow.

## 4. Add the repository to HACS as a custom repository

- Quick link:

`https://my.home-assistant.io/redirect/hacs_repository/?owner=ambient-home-systems&repository=maverick-music-flow&category=plugin`

- Open Home Assistant.
- Open HACS.
- Open the menu and choose `Custom repositories`.
- Add the GitHub repository URL.
- Choose repository type `Dashboard`.
- Download the repository through HACS.

## 5. Verify the installed resource

If HACS does not add the resource automatically, add:

`/hacsfiles/homeii-music-flow/homeii-music-flow.js`

Then use the card with:

```yaml
type: custom:homeii-music-flow
```

## 6. Manual fallback

If you need a manual fallback release path, copy the full contents of:

`dist/`

to:

`/config/www/community/homeii-music-flow/`

Then load:

`/local/community/homeii-music-flow/homeii-music-flow.js?v=5.9.2`

## 7. Final pre-release smoke test

- Load the card after a hard browser refresh.
- Verify main player, compact player, FLOW, Studio, queue, library, actions, settings, lyrics, announcements, history, recommendations, and night mode screens.
- Verify `This device` creates a Maverick Music Sendspin browser player and does not select an unrelated browser player.
- Verify phone, tablet, and desktop layouts.
- Verify mobile portrait, mobile landscape, tablet, desktop, kiosk, and visual-editor open/close layout recovery.
- Verify ambient light sync, screensaver idle timing, POWER button behavior, Discovery mode, Up Next, and Night mode controls when enabled.
- Verify light and dark themes.
- Verify HACS install path and manual install path.
