# Release Verification: 1.2.0

Verified on October 23, 2026 on macOS with Figma Desktop.

## Published Artifacts

- Source release commit: `8c590d00256606d4c5fba287ae2a199d653c2b53`.
- [GitHub release v1.2.0](https://github.com/khan-tw/glb-3d-viewer-figma-plugin/releases/tag/v1.2.0): plugin ZIP, original MIT sample ZIP, and SHA-256 checksums.
- [Figma Community](https://www.figma.com/community/plugin/1689584566677007084): Version 3, release notes identify version 1.2.0. Checked without signing in.
- Both public ZIPs were downloaded without authentication and matched the local SHA-256 checksums. Plugin archive integrity passed.

## Automated Checks

- Type checking and production build passed.
- Mock controller checks passed: missing target, new 1600 x 1200 frame, image-fill acknowledgement, image failure, and removed target.
- Preset checks passed: valid roundtrip, ten malformed/incompatible presets rejected, unknown keys removed, and README example import.
- Dependency audit reported zero known vulnerabilities at verification time.
- Gitleaks found no secrets in the staged release changes or final ZIP contents. This is scoped scan evidence, not a guarantee that every possible sensitive value can be detected.
- Archive contents matched the packaging whitelist byte-for-byte. No promotional videos, raw recordings, local fonts, or credentials were included.

## Published Plugin Acceptance

The plugin was opened from its Community page into a new dedicated test file,
not run from the local development manifest.

- The published UI showed the three-step workflow and Look / Position / Light / More categories.
- The built-in headphone GLB loaded successfully.
- Create New Frame created a 1600 x 1200 frame.
- Warm background and manual Sync Frame produced a real Figma image fill and a success acknowledgement.
- Live sync was off initially. Enabling it and changing to Clay updated the Figma image fill; the image hash changed.
- One preview drag changed rotation to X 8 / Y 40 degrees. One Undo restored X 0 / Y 0 degrees.
- Applying `{}` as settings displayed a recoverable validation error without losing the preview. The preview remained usable when changing the appearance afterward.
- Use Selected Frame selected the existing test frame, disabled live sync, and allowed another successful manual sync.

## Scope And Limits

Before release, the same UI build was also checked in development for local GLB
import, invalid GLB recovery, valid JSON file import/export, window presets,
materials, position, lighting, and reset controls. Build success is separate
from the published-plugin acceptance above.

This is not exhaustive compatibility testing of every GLB exporter, large model,
GPU, Windows installation, or assistive-technology combination. No claim of
zero defects is made.
