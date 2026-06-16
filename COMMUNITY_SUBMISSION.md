# Figma Community Submission

## Listing basics

Name:
`GLB 3D Frame Preview`

Tagline:
`Preview local GLB models in Figma and tune lighting, materials, and framing before syncing to a frame.`

Category:
`Design tools`

Support contact:
`https://github.com/khan-tw/glb-3d-viewer-figma-plugin/issues`

Privacy policy:
`https://github.com/khan-tw/glb-3d-viewer-figma-plugin/blob/main/PRIVACY.md`

## Description

Preview local `.glb` files directly inside Figma, adjust the Three.js render in real time, and sync the current view back into a selected frame as a high-resolution image fill.

Use it to quickly evaluate model framing and presentation without leaving your design workflow.

Features:

- Import local GLB and Draco-compressed GLB files
- Rotate and zoom the model in the preview
- Adjust scale, FOV, exposure, shadows, fog, and background
- Tune key, ambient, hemisphere, fill, and rim lighting
- Switch between original, clay, normal, and wireframe material views
- Hide detected floor or shadow meshes when they get in the way
- Sync the current render into a selected Figma frame
- Resize the plugin window while working
- Copy or download the current render settings as JSON

Notes:

- The synced Figma result is a rendered image, not a live embedded 3D viewer
- The plugin does not make external network requests

## Security disclosure draft

Suggested answers, based on the current code:

- External network requests: No
- Third-party analytics or tracking: No
- User authentication: No
- Local file access: Yes, only when the user explicitly selects a local `.glb` file
- Data storage: Yes, stores the last exported settings in Figma `clientStorage`
- Third-party data sharing: No

## Assets

Icon:
`assets/plugin-icon-128.png`

Thumbnail:
`assets/community-thumbnail-1920x1080.png`
