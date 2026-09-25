# HOMEii Music Flow 5.9.2

HOMEii Music Flow 5.9.2 is a small hotfix release for the in-card Settings screen.

## Why This Release Exists

Some users could not open the in-card Settings screen and saw this error:

```text
this._settingsSectionAnnouncements is not a function
```

That also blocked access to in-card Diagnostics, which made it harder to investigate the open empty-queue reports.

## Fixed

- Fixed the in-card Settings crash caused by the missing Announcements settings section.
- Restored the Announcements section inside in-card Settings.
- Restored access to Music Assistant Diagnostics from the card Settings screen.
- Added regression coverage so the Settings screen must render Announcements and Diagnostics without throwing.
- Improved the setup message for users who configure `ma_url` / `ma_token` without the Home Assistant Music Assistant integration.

## Important Note About Queue Reports

This release does **not** claim to fix the empty Queue issue.

It restores Diagnostics access so affected users can now provide the useful report:

1. Update to `5.9.2`.
2. Open HOMEii Music Flow.
3. Open Settings inside the card.
4. Open the Music Assistant section.
5. Open Diagnostics.
6. Run Diagnostics while Music Assistant shows a queue but HOMEii shows an empty queue.
7. Copy and paste the full report into the GitHub issue.

## Direct Music Assistant / Sendspin Clarification

`ma_url` and `ma_token` are for Direct Music Assistant access and Sendspin / This Device features.

They do not replace the Home Assistant Music Assistant integration. For the full card experience, Music Assistant should still be connected to Home Assistant and expose at least one Music Assistant `media_player`.

## Validation

- `node --check src/homeii-music-flow.js`
- `node --check dist/homeii-music-flow.js`
- `npm.cmd test -- tests/runtime-baseline.test.js tests/settings-accordion.test.js`
- Production build and release artifact sync passed locally for `5.9.2`.

## Manual Resource Refresh

After updating, use a hard refresh or update the resource cache-buster:

```text
/local/community/homeii-music-flow/homeii-music-flow.js?v=5.9.2
```
