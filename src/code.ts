const selectedFrame = figma.currentPage.selection.length === 1 ? figma.currentPage.selection[0] : null;
let targetFrame: FrameNode | null = selectedFrame?.type === "FRAME" ? selectedFrame : null;

figma.showUI(__html__, {
  width: 920,
  height: 680,
  themeColors: true
});

figma.ui.postMessage({
  type: "target-frame",
  frame: targetFrame ? { name: targetFrame.name, width: targetFrame.width, height: targetFrame.height } : null
});

if (!targetFrame) {
  figma.notify("Select one Figma frame before running GLB 3D Viewer.");
}

function getSelectedFrame() {
  const selected = figma.currentPage.selection.length === 1 ? figma.currentPage.selection[0] : null;
  return selected?.type === "FRAME" ? selected : null;
}

function getTargetFrame() {
  if (targetFrame && !targetFrame.removed) return targetFrame;
  targetFrame = getSelectedFrame();
  return targetFrame;
}

figma.ui.onmessage = async (message) => {
  const payload = message.payload ?? {};

  if (message.type === "request-target-frame") {
    figma.ui.postMessage({
      type: "target-frame",
      frame: targetFrame ? { name: targetFrame.name, width: targetFrame.width, height: targetFrame.height } : null
    });
    return;
  }

  if (message.type === "notify") {
    figma.notify(payload.text ?? "");
    return;
  }

  if (message.type === "export-settings") {
    await figma.clientStorage.setAsync("last-glb-viewer-settings", message.payload);
    figma.notify("Viewer parameters saved in plugin storage.");
    return;
  }

  if (message.type === "render-preview") {
    const frame = getTargetFrame();
    if (!frame) {
      figma.notify("Select one frame, then run the plugin again.");
      return;
    }
    const sourceBytes = payload.bytes;
    if (!sourceBytes) {
      figma.notify("No preview image was received from the plugin UI.");
      return;
    }
    const bytes = sourceBytes instanceof Uint8Array ? sourceBytes : new Uint8Array(sourceBytes);
    const image = figma.createImage(bytes);
    frame.fills = [
      {
        type: "IMAGE",
        scaleMode: "FILL",
        imageHash: image.hash
      }
    ];
    frame.setPluginData("glbViewerSettings", JSON.stringify(payload.settings ?? {}));
    return;
  }

  if (message.type === "use-selected-frame") {
    targetFrame = getSelectedFrame();
    figma.ui.postMessage({
      type: "target-frame",
      frame: targetFrame ? { name: targetFrame.name, width: targetFrame.width, height: targetFrame.height } : null
    });
    figma.notify(targetFrame ? `Target frame: ${targetFrame.name}` : "Select one Figma frame first.");
    return;
  }

  if (message.type === "resize-ui") {
    const width = Math.max(560, Math.min(1400, Number(payload.width) || 920));
    const height = Math.max(520, Math.min(1100, Number(payload.height) || 680));
    figma.ui.resize(width, height);
    return;
  }

  if (message.type === "close") {
    figma.closePlugin();
  }
};
