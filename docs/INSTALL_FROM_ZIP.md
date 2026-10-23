# Install From a Release ZIP

This ZIP installs GLB 3D Frame Preview through Figma's development-plugin menu.
It does not automatically update the Community installation. For the managed
Community version, use the [public plugin page](https://www.figma.com/community/plugin/1689584566677007084).

1. Extract the entire ZIP into a folder you will keep on your computer.
2. Open Figma Desktop and a test design file.
3. Choose Plugins > Development > Import plugin from manifest.
4. Select `manifest.json` from the extracted folder.
5. Run GLB 3D Frame Preview from Plugins > Development.
6. Choose Try sample model, then Create New Frame.
7. Adjust the view, choose Sync Frame, and check the image in the new frame.

Use a dedicated test frame: Sync Frame replaces the target's fills with a PNG.
Live sync is off by default. GLB files are processed locally, while images and
settings synced into Figma follow the document's sharing permissions.

No Node installation, account, API key, or network download is required by the
plugin itself. Keep `manifest.json` and the `dist` folder together.

The separate sample ZIP contains the original MIT-licensed headphone GLB,
its walkthrough, and the license. It is optional because the plugin already
includes the sample.
