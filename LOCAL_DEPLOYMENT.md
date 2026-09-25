# Local Deployment Guide

## Canonical Runtime

Use only this card type in Home Assistant:

`custom:maverick-music`

Use only this runtime package folder in Home Assistant `www`:

`/config/www/community/maverick-music-flow/`

Use only this Lovelace resource pattern:

`/local/community/maverick-music-flow/maverick-music.js?v=5.8.0`

From now on, bump only the query version after `?v=`.
Do not change the file name again unless there is a hard cache emergency.

## Project Source Of Truth

Main source file:

`src/maverick-music.js`

Stable deploy target:

`dist/`

`dist/` should always be the latest approved install package.

## Current 5.8.0 Mapping

- Edit: `src/maverick-music.js`
- Review/share: `dist/`
- Deploy to HA `www`: copy the full contents of `dist/` into `www/community/maverick-music-flow/` (or run `scripts/deploy-local.ps1`, which installs only `maverick-music.js`)
- Package includes: `maverick-music.js` plus `homeii-flow-logo.svg`, `homeii-flow-logo.png`, `homeii-flow-logo-v2.png`, `homeii-flow-icon.png`
- Lovelace type: `custom:maverick-music`
- Lovelace resource: `/local/community/maverick-music-flow/maverick-music.js?v=5.8.0`

## What `dist/` Contains

- `maverick-music.js` is the whole runtime. It is a single minified ES module produced by `vite build` and finished by `scripts/release.mjs`, which prepends the license banner (MIT for this project, Apache-2.0 for the bundled Sendspin client, MIT for Embla Carousel and opus-encdec) ahead of the `/*! MAVERICK_CARD_VERSION = "..."; */` banner. Sendspin, the Opus fallback decoder, Embla, the dictionaries, and the Heebo font are inlined, so the file loads nothing from sibling paths.
- The four `homeii-flow-*` images are copies of `docs/brand/` for the README and the HACS listing.

There are no `core/`, `config/`, `localization/`, `sendspin-js/`, or `vendor/` folders in `dist/` anymore; the sources stay in `src/` and `vendor/`.

## Cache Reset Rule

If a new version is approved:

1. Run the build/release script
2. Replace the contents of `www/community/maverick-music-flow/` with the contents of `dist/`
3. Update only the resource query version

Example:

`/local/community/maverick-music-flow/maverick-music.js?v=5.8.0`

## Foundation Note

Starting with `4.9.0`, release prep is expected to come from:

- `npm run build`
- `npm run release`
- `npm run lint`
- `npm test`

## Do Not Keep In The Repo

Old runtime snapshots and backup copies should live in Git history or GitHub Releases, not in the active repository.
