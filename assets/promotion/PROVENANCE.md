# Promotion Assets

The PNGs were composed from screenshots of the real plugin UI loading
`examples/studio-headphones.glb`. The model is an original procedural asset,
distributed under the repository's MIT license. No third-party product imagery,
logos, textures, customer files, or generative mockups are used.

- `01-cover-1920x1080.png`: primary Community cover.
- `02-looks-1920x1080.png`: actual light, dark, and clay renders.
- `03-quick-start-1920x1080.png`: onboarding for version 1.1.0.
- Matching SVGs preserve editable copy and layout.

Use the quick-start image only with the release that includes the sample and
frame-creation buttons. These are promotional compositions of actual rendered
output, not screenshots of a Figma canvas containing interactive 3D.

To regenerate the layouts, run `scripts/create-promotion.mjs` with Sharp available
and a directory containing the three source screenshots. Its crop coordinates
target a 1910 x 1075 browser viewport; re-check them for a different viewport.
