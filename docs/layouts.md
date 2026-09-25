# Layouts And Mobile Modes

Maverick Music can behave as a full music dashboard, a compact card, or a phone-first music screen.

## Recommended Home Assistant Views

### Panel View

Best for:

- a dedicated music dashboard
- wall tablets
- large touchscreens
- a clean app-like interface

Panel view gives Maverick Music the most predictable space.

### Section View

Best for:

- modern Home Assistant dashboards
- a full-width music section
- combining Maverick Music with a small number of related cards

Use Section view when you want the card to feel large without taking over the entire dashboard.

### Masonry View

Best for:

- dashboards with many mixed cards
- compact Maverick Music placement
- secondary music controls

Masonry can resize cards unpredictably. If Maverick Music looks like a mini-player after saving the dashboard, try Panel or Section view.

## Phone Display Modes

Maverick Music supports phone layout modes:

- **Auto:** the card chooses behavior based on available space.
- **Full:** phone interface stays in the normal dashboard surface.
- **Compact:** smaller player card for dashboards with multiple cards.
- **Edge to edge:** phone interface occupies the viewport like a frontmost app.

Use **Edge to edge** when Maverick Music is the main phone experience.

## Compact To Fullscreen

When compact mode expands, Maverick Music opens a full-screen surface.

This is designed to prevent:

- button overlap
- layered menus over old controls
- partial mobile sheets
- confusing duplicate controls

Full-screen menus should appear in front and use the available phone viewport.

## Edge To Edge

Edge to edge mode gives the phone layout a more native app feeling.

Behavior:

- the card takes over the viewport
- full-screen menus open as frontmost layers
- the top close button returns to Full mode
- the fullscreen button appears only on the main player surface

Edge to edge is blocked inside the Home Assistant visual editor to prevent fullscreen flicker while editing.

## Tablet And Desktop

Tablet and desktop layouts can show larger panels and richer surfaces:

- Studio / Control Room
- wide library grids
- queue and player panels
- richer settings surfaces

Studio is intended for larger screens. Phone layouts focus on player, queue, library, and quick actions instead.

## Small Square Screens

Small square displays, such as some wall panels, may need a dedicated layout in the future.

For now:

- use compact or full mode
- reduce visual effects with performance settings
- avoid placing too many cards in the same view
- prefer Section or Panel layout over dense Masonry dashboards

## Performance Profiles

If a device is weak or old:

- reduce background motion
- avoid extreme dynamic effects
- use a simpler theme mode
- keep fewer heavy cards in the same dashboard
- prefer stable local network access

Diagnostics can help identify browser, viewport, and device context.

