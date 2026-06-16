# GLB 3D Viewer Figma Plugin

Preview local `.glb` files inside a Figma plugin, tune WebGL / Three.js rendering parameters, and sync the current render into a selected Figma frame.

## Use in Figma

1. Open Figma Desktop.
2. Go to Plugins > Development > Import plugin from manifest.
3. Choose `manifest.json` from this folder.
4. Run `GLB 3D Frame Preview` from Plugins > Development.

## Features

- Load a local `.glb` file.
- Load Draco-compressed GLB files exported from Blender.
- Rotate the model by dragging the preview.
- Zoom with the mouse wheel.
- Adjust model scale and X/Y/Z rotation.
- Adjust camera FOV.
- Adjust key, ambient, hemisphere, fill, and rim lighting.
- Tune renderer exposure, shadows, fog, and studio environment intensity.
- Switch material preview modes: original, clay, normal, and wireframe.
- Choose transparent, dark, light, Figma gray, or warm backgrounds.
- Hide detected model floor / shadow meshes when needed.
- Live-sync the current WebGL render into a selected Figma frame.
- Resize the plugin window with compact/default/wide presets or the bottom-right drag handle.
- Copy or download JSON settings for engineering reference.

The Figma canvas preview is a synchronized PNG render. Figma plugin APIs do not allow a live WebGL runtime to be embedded directly inside a Figma frame, so the plugin updates the frame image fill whenever the view or parameters change.

## Exported JSON shape

```json
{
  "fileName": "model.glb",
  "fov": 45,
  "camera": {
    "position": { "x": 0, "y": 1.2, "z": 4 },
    "target": { "x": 0, "y": 0, "z": 0 }
  },
  "light": {
    "type": "directional",
    "intensity": 3,
    "color": "#ffffff",
    "position": { "x": 3, "y": 4, "z": 5 }
  },
  "ambientLight": {
    "intensity": 1.2
  },
  "hemisphereLight": {
    "enabled": true,
    "intensity": 0.8,
    "skyColor": "#ffffff",
    "groundColor": "#59616b"
  },
  "fillLight": {
    "enabled": true,
    "intensity": 1.4,
    "color": "#dcecff",
    "position": { "x": -4, "y": 2, "z": 3 }
  },
  "rimLight": {
    "enabled": true,
    "intensity": 1,
    "color": "#ffffff",
    "position": { "x": 0, "y": 3, "z": -5 }
  },
  "environment": {
    "mode": "studio",
    "intensity": 0.9
  },
  "material": {
    "mode": "original"
  },
  "fog": {
    "enabled": false,
    "color": "#111315",
    "near": 6,
    "far": 14
  },
  "renderer": {
    "toneMapping": "ACESFilmicToneMapping",
    "toneMappingExposure": 1.25,
    "outputColorSpace": "srgb",
    "backgroundMode": "transparent",
    "background": "transparent",
    "showFloor": true,
    "shadows": false
  }
}
```

## Development

```bash
npm install
npm run typecheck
npm run build
```

The Figma manifest points to the built files in `dist/`.

## Support

Use GitHub issues for bug reports and feature requests:

`https://github.com/khan-tw/glb-3d-viewer-figma-plugin/issues`

## Privacy

This plugin does not make external network requests. It works with local `.glb` files selected by the user, reads the currently selected Figma frame when syncing a preview, and stores the last exported settings in Figma client storage.

Full details are available in `PRIVACY.md`.

## License

MIT
