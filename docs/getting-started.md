# Getting Started

This guide gets Maverick Music running in Home Assistant for the first time.

## Before You Install

Confirm these first:

- Music Assistant is installed, running, and connected to Home Assistant.
- Home Assistant shows at least one Music Assistant player as a `media_player`. Confirm you can control it from Home Assistant before adding Maverick Music.
- Music Assistant's API schema is **63 or newer**, and you have (or can create) a Music Assistant API token.

Maverick Music is a visual frontend for [Maverick Music Engine](https://github.com/ambient-home-systems/maverick-music-flow-engine). It does not replace Music Assistant and it does not create players by itself, and it does not run without the Engine.

## 1. Install And Configure The Engine

The Engine is a Home Assistant **custom integration**, not an add-on, and must be installed before the card.

**Via HACS:** add the [Engine repository](https://github.com/ambient-home-systems/maverick-music-flow-engine) as a custom Integration repository, then download **Maverick Music Engine**.

**Manual install:** copy the package's `custom_components/maverick_music_flow` directory into `/config/custom_components/maverick_music_flow`. The `manifest.json` file must sit directly inside that directory, not inside a second nested `maverick_music_flow` folder:

```text
/config/
  configuration.yaml
  custom_components/
    maverick_music_flow/
      manifest.json
      __init__.py
      config_flow.py
      ...other files and subfolders...
```

Then:

1. Restart Home Assistant (copying files alone does not load the integration).
2. In Music Assistant, open **Settings → Profile** and create a long-lived access token.
3. Find the direct Music Assistant server address reachable from Home Assistant (for example `http://192.168.1.100:8095`). Do not use the Home Assistant address, a dashboard URL, or an ingress path.
4. In Home Assistant, go to **Settings → Devices & services → Add integration**, search for **Maverick Music Engine**, and either sign in with a Music Assistant username/password or paste the API token from step 2, along with the server URL from step 3.
5. Confirm the integration entry loads without a setup error before continuing.

See the [Engine repository](https://github.com/ambient-home-systems/maverick-music-flow-engine) for full installation, configuration, and automation-service documentation.

## 2. Install With HACS

1. Open Home Assistant.
2. Open HACS.
3. Open **Custom repositories**.
4. Add this repository:

```text
https://github.com/ambient-home-systems/maverick-music-flow
```

5. Select category **Dashboard**.
6. Download **Maverick Music**.
7. Refresh the browser or restart Home Assistant if the card is not available immediately.

If HACS does not add the resource automatically, add:

```text
/hacsfiles/maverick-music-flow/maverick-music.js
```

## Manual Install

1. Create this folder:

```text
/config/www/community/maverick-music-flow/
```

2. Copy the full contents of `dist/` into that folder.
3. Add this Dashboard resource:

```text
/local/community/maverick-music-flow/maverick-music.js
```

Type: **JavaScript module**.

4. If you need to force a stale cache to refresh after an update, append a version query string, e.g. `?v=6.0.1`.

## First Card

Minimal configuration:

```yaml
type: custom:maverick-music
```

Recommended first configuration:

```yaml
type: custom:maverick-music
theme_mode: auto
```

If you want the card to start on a specific player:

```yaml
type: custom:maverick-music
entity: media_player.living_room
```

## First Run Checklist

After adding the card:

1. Open the card.
2. Select a player.
3. Play something through Music Assistant.
4. Open Library and confirm playlists/albums/tracks load.
5. Open Queue and confirm current/upcoming items load.
6. Open Settings and run Diagnostics, and confirm the expected card and Engine versions and connection status.

If something fails, copy the Diagnostics report and use [Troubleshooting](./troubleshooting.md).

## Best First Dashboard Layout

For a dedicated music dashboard:

- Use **Panel view** for the most app-like experience.
- Use **Section view** when you want the card to share the dashboard with a few related cards.
- Use **Masonry** only if the card is one widget among many.

For phones:

- Use **Full** or **Edge to edge** for a full music app feeling.
- Use **Compact** when the card sits among other dashboard cards.

## Reusable Dashboards

Maverick Music includes two tools that make shared dashboards easier:

- `card_id` for separating local settings between card instances.
- URL player overrides for opening the same dashboard directly to a specific player.

Example card:

```yaml
type: custom:maverick-music
card_id: house-music
```

Example dashboard URL:

```text
https://homeassistant.example.com/lovelace/music?player=kitchen_sonos
```

When the page opens, Maverick Music tries to select the player from the URL. This is useful when you reuse the same dashboard for different rooms, tablets, or users.

For the full rules, see [Configuration: Reusable Dashboards](./configuration.md#reusable-dashboards).

## Troubleshooting Setup Problems

| Symptom | Check |
| --- | --- |
| Engine not listed under Add integration | Folder nesting, manifest location, and a full Home Assistant restart |
| Invalid API response during Engine setup | The direct Music Assistant URL/port; an HA/ingress login page is not the API |
| Token rejected | Generate/paste a Music Assistant profile token; remove accidental surrounding whitespace |
| Unsupported version/schema | Update Music Assistant to a compatible API schema (63+) |
| Custom element does not exist | Resource URL/type, file availability, and a full browser reload |
| No players or playback fails | Verify the official Music Assistant integration and native Music Assistant playback first |

For anything else, see [Troubleshooting](./troubleshooting.md).

## Updating

After updating through HACS:

1. Refresh Home Assistant.
2. If the old version still appears, hard-refresh the browser.
3. On mobile, restart the Home Assistant Companion app if needed.
4. Confirm the version in card settings or Diagnostics.
