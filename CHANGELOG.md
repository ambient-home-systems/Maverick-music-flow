# Changelog

This changelog starts fresh with the Maverick Music fork. For the project's history prior to the rename, see [docs/releases/CHANGELOG_upstream.md](docs/releases/CHANGELOG_upstream.md).

## 6.0.1 — Maverick Music (first release)

Maverick Music is a fork and rename of the HOMEii Music Flow card and its Engine backend, published as an independent project. Existing HOMEii Music Flow / HOMEii Flow Engine installations must migrate; see the breaking changes below.

### Breaking changes

- **New card type and resource filename.** The custom element, dashboard resource path, and card options were renamed from `homeii-*` to `maverick-*`.

  ```yaml
  # before
  type: custom:homeii-music-flow
  homeii_engine_mode: required
  homeii_engine_timeout_ms: 3500
  ```

  ```yaml
  # after
  type: custom:maverick-music
  engine_mode: required
  engine_timeout_ms: 3500
  ```

  Update the dashboard resource to the new bundle filename:

  ```text
  # before
  /hacsfiles/homeii-music-flow/homeii-music-flow.js

  # after
  /hacsfiles/maverick-music-flow/maverick-music.js
  ```

- **English-only interface.** Multi-language support and the translated dictionaries have been removed. Maverick Music is English-only.
- **Forked Engine.** The required backend integration is now [Maverick Music Engine](https://github.com/ambient-home-systems/maverick-music-flow-engine) (Home Assistant domain `maverick_music_flow`), a fork of HOMEii Flow Engine. Install and configure it before updating the card; the old Engine is not compatible with this card.
- **Removed `language` and `rtl` options.** Interface language selection and right-to-left layout support have been removed along with the options that configured them.
- **Renamed storage keys, migrated automatically.** Browser-local settings (theme, layout, pinned players, timers, and so on) move from the old `homeii_music_flow_*` storage keys to the new `maverick_music_*` keys automatically the first time the renamed card loads. Nothing needs to be reconfigured.

See [Getting Started](docs/getting-started.md) for the current install steps and [Configuration](docs/configuration.md) for the full option reference.
