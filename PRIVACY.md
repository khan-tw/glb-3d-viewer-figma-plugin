# Privacy Policy

Last updated: 2026-10-23

## Summary

GLB 3D Frame Preview does not send user data to external servers and does not use analytics, ads, or third-party tracking.

## Data the plugin can access

The plugin may access the following data only while the user is actively using it:

- A local `.glb` file that the user explicitly selects from their computer.
- The currently selected Figma frame when the user chooses a target frame for preview sync.
- The rendered preview image generated from the selected model and current settings.
- The model's file name, which is included in exported viewer settings.

## Data storage

The plugin stores the last exported viewer settings in Figma `clientStorage`.
When syncing, it writes a PNG image fill and the viewer settings to the target
frame in the Figma document. These settings include the model's file name, but
not the original GLB file. The image and frame data follow that document's Figma
storage and sharing permissions. Do not sync sensitive models into a shared file.

The included sample model is bundled with the plugin; loading it does not
download a model or require an account. The plugin can also create an empty
target frame at the user's request.

The plugin does not upload the original GLB to a developer-operated or
third-party backend. Figma itself handles storage of the document and its images.

## Network access

The plugin declares no external network access in `manifest.json`.

## Data sharing

The plugin does not sell, share, or transfer user data to third parties.

## Contact

For support or privacy questions, open an issue at:

`https://github.com/khan-tw/glb-3d-viewer-figma-plugin/issues`
