<h1 align="center">Maverick Music</h1>
<p align="center"><strong>Make your Home Assistant dashboard feel like a place for music.</strong><br>Artwork-driven atmosphere, contextual controls, and your Music Assistant library — across the screens in your home.</p>

## What It Is

Maverick Music is a premium [Music Assistant](https://www.music-assistant.io/) dashboard card for Home Assistant. An artwork-first now-playing screen, contextual action wheels, library browsing, queue management, multi-room control, timers/schedules, and more — all built for touch and for the way people actually listen at home.

The card is the visual interface only. [Maverick Music Engine](https://github.com/ambient-home-systems/maverick-music-flow-engine), a companion Home Assistant integration, is the required backend: it owns the authenticated Music Assistant connection, proxies artwork, and serves players, queue, library, search, grouping, schedules, timers, statistics, announcements, and diagnostics to the card. The browser never needs direct Music Assistant credentials.

## Requirements

- Home Assistant with Dashboard custom cards enabled.
- [Music Assistant](https://www.music-assistant.io/) installed, running, and connected to Home Assistant, with Music Assistant API schema **63 or newer**.
- [Maverick Music Engine](https://github.com/ambient-home-systems/maverick-music-flow-engine) `1.0.0`, installed and configured with a valid Music Assistant API token, before installing the card.
- At least one Music Assistant player exposed as a Home Assistant `media_player`.
- HACS for the easiest install path, or manual access to `/config/www/community/`.
- A modern browser: Chrome, Edge, Safari, or a current Android/iOS browser.

Install and configure the Engine first — see the [Engine repository](https://github.com/ambient-home-systems/maverick-music-flow-engine) — then install the card below.

## Install With HACS

Add this repository as a custom Dashboard repository in HACS:

```text
https://github.com/ambient-home-systems/maverick-music-flow
```

Select category **Dashboard**, then download **Maverick Music**.

If HACS does not add the resource automatically, add:

```text
/hacsfiles/maverick-music-flow/maverick-music.js
```

## Manual Install

1. Create `/config/www/community/maverick-music-flow/`.
2. Copy the full contents of `dist/` into that folder.
3. Add this Dashboard resource as a **JavaScript module**:

```text
/local/community/maverick-music-flow/maverick-music.js
```

## Add The Card

```yaml
type: custom:maverick-music
```

See [Getting Started](docs/getting-started.md) for the full walkthrough, first-run checklist, and recommended dashboard layouts.

## Documentation

- [Getting Started](docs/getting-started.md) — install, first card, first-run checklist
- [Configuration](docs/configuration.md) — YAML options, Music Assistant connection, `card_id`, URL player overrides
- [Features](docs/features.md) — main player, library, queue, FLOW, Studio, lyrics, announcements
- [Diagnostics](docs/diagnostics.md) — what Diagnostics checks and how to read a report
- [Troubleshooting](docs/troubleshooting.md) — missing artwork, empty queue, no players, and other common problems
- [Changelog](CHANGELOG.md) · [Release notes](docs/releases/)

## Development

```text
npm install
npm run build
npm run lint
npm test
```

## Support

Maverick Music is free and built as an independent community project. If it improves your Home Assistant music dashboard and you want to support continued polish, fixes, documentation, and new features, sponsorship is appreciated. Stars, feedback, and bug reports also help a lot.

## Credits

Maverick Music is an independent community project and is not an official Music Assistant or Home Assistant project. It is a fork of the [HOMEii Music Flow](https://github.com/r11a/homeii-music-flow) project by [r11a](https://github.com/r11a), used and continued here under its [MIT license](LICENSE).

Credit and thanks:

- [Music Assistant](https://www.music-assistant.io/) for the music server, Home Assistant integration, library model, player control, announcements, and Sendspin support that make this card possible.
- [Sendspin](https://www.music-assistant.io/player-support/sendspin/) and the Open Home Foundation for the browser/local playback protocol used by the "This device" player flow.
- [Home Assistant](https://www.home-assistant.io/) for the dashboard platform.
- [HACS](https://www.hacs.xyz/) for the custom repository distribution path.
- [Embla Carousel](https://www.embla-carousel.com/) for the packaged swipe foundation.
- The original HOMEii Music Flow contributors whose work this fork builds on.

## License

[MIT](LICENSE)
