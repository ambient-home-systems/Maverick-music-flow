# HOMEii Music Flow 6.0.1

> [!CAUTION]
> Users upgrading from 5.9.3 must install and configure **HOMEii Flow Engine 1.0.1 first**, restart Home Assistant, and only then update the card. The Engine-first requirement introduced in 6.0.0 remains a breaking change.

## Fixed

- The heart in the main action wheel now opens the current-track action sheet instead of immediately toggling Like.
- The action sheet provides both **Like / Remove like** and **Add to playlist** when playlist editing is supported by the connected Engine and provider.
- Unavailable playlist actions remain hidden.
- Pinned-player Sticky and Exclusive modes now consistently return to the configured Master instead of the first visible or active player.
- Browsed cover art returns to the current track after inactivity, and queue artwork no longer flickers back to delayed player metadata.
- Diagnostics copying now works in restricted WebViews that reject the Clipboard API.
- The Players screen now gives **Play on this device** a clear, elegant primary action with context.
- The recommendations/recent side drawer no longer duplicates the complete bottom navigation dock.
- Player configuration validation and the visual editor now cover the Master, Sticky and Exclusive combinations.

After updating, fully reload the browser or Companion App so the new card module replaces the cached 6.0.0 bundle.
