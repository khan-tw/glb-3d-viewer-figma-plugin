"use strict";
(() => {
  // src/code.ts
  var selectedFrame = figma.currentPage.selection.length === 1 ? figma.currentPage.selection[0] : null;
  var targetFrame = (selectedFrame == null ? void 0 : selectedFrame.type) === "FRAME" ? selectedFrame : null;
  figma.showUI(__html__, {
    width: 920,
    height: 680,
    themeColors: true
  });
  figma.ui.postMessage({
    type: "target-frame",
    frame: targetFrame ? { name: targetFrame.name, width: targetFrame.width, height: targetFrame.height } : null
  });
  function getSelectedFrame() {
    const selected = figma.currentPage.selection.length === 1 ? figma.currentPage.selection[0] : null;
    return (selected == null ? void 0 : selected.type) === "FRAME" ? selected : null;
  }
  function getTargetFrame() {
    if (targetFrame && !targetFrame.removed) return targetFrame;
    targetFrame = getSelectedFrame();
    return targetFrame;
  }
  figma.ui.onmessage = async (message) => {
    var _a, _b, _c, _d, _e;
    const payload = (_a = message.payload) != null ? _a : {};
    if (message.type === "request-target-frame") {
      targetFrame = getTargetFrame();
      figma.ui.postMessage({
        type: "target-frame",
        frame: targetFrame ? { name: targetFrame.name, width: targetFrame.width, height: targetFrame.height } : null
      });
      return;
    }
    if (message.type === "create-frame") {
      const frame = figma.createFrame();
      frame.name = "3D product render";
      frame.resize(1600, 1200);
      frame.x = figma.viewport.center.x - frame.width / 2;
      frame.y = figma.viewport.center.y - frame.height / 2;
      frame.fills = [];
      targetFrame = frame;
      figma.currentPage.selection = [frame];
      figma.viewport.scrollAndZoomIntoView([frame]);
      figma.ui.postMessage({ type: "target-frame", frame: { name: frame.name, width: frame.width, height: frame.height } });
      return;
    }
    if (message.type === "notify") {
      figma.notify((_b = payload.text) != null ? _b : "");
      return;
    }
    if (message.type === "export-settings") {
      await figma.clientStorage.setAsync("last-glb-viewer-settings", (_d = (_c = message.payload) == null ? void 0 : _c.settings) != null ? _d : message.payload);
      return;
    }
    if (message.type === "render-preview") {
      const frame = getTargetFrame();
      if (!frame) {
        figma.ui.postMessage({ type: "sync-result", ok: false, error: "Choose or create a frame to sync." });
        figma.ui.postMessage({ type: "target-frame", frame: null });
        return;
      }
      const sourceBytes = payload.bytes;
      if (!sourceBytes) {
        figma.ui.postMessage({ type: "sync-result", ok: false, error: "No preview image was received. Try again." });
        return;
      }
      try {
        const bytes = sourceBytes instanceof Uint8Array ? sourceBytes : new Uint8Array(sourceBytes);
        const image = figma.createImage(bytes);
        frame.fills = [
          {
            type: "IMAGE",
            scaleMode: "FILL",
            imageHash: image.hash
          }
        ];
        frame.setPluginData("glbViewerSettings", JSON.stringify((_e = payload.settings) != null ? _e : {}));
        figma.ui.postMessage({ type: "sync-result", ok: true, frameName: frame.name });
      } catch (e) {
        figma.ui.postMessage({ type: "sync-result", ok: false, error: "Could not update the frame. Try another frame." });
      }
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
})();
