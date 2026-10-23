import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const messages = [];
let failImage = false;
const figma = {
  currentPage: { selection: [] },
  ui: { postMessage: message => messages.push(message) },
  showUI() {}, notify() {},
  clientStorage: { async setAsync() {} },
  viewport: { center: { x: 800, y: 600 }, scrollAndZoomIntoView() {} },
  createFrame: () => ({ type: 'FRAME', removed: false, resize(w, h) { this.width = w; this.height = h; }, setPluginData() {} }),
  createImage: bytes => { if (failImage) throw new Error('Invalid image'); assert(bytes.length > 0); return { hash: 'test-image' }; }
};
vm.runInNewContext(readFileSync(new URL('../dist/code.js', import.meta.url), 'utf8'), { figma, __html__: '', Uint8Array });
const send = (type, payload = {}) => figma.ui.onmessage({ type, payload });
await send('render-preview', { bytes: [1] });
assert(messages.some(m => m.type === 'sync-result' && m.ok === false));
assert(!messages.some(m => m.type === 'sync-result' && m.ok === true));
await send('create-frame');
const frame = figma.currentPage.selection[0];
assert.equal(frame.width, 1600);
assert.equal(frame.height, 1200);
assert.equal(messages.at(-1).type, 'target-frame');
await send('render-preview', { bytes: [1, 2, 3], settings: {} });
assert.equal(frame.fills[0].imageHash, 'test-image');
assert.equal(messages.at(-1).ok, true);
failImage = true;
await send('render-preview', { bytes: [1], settings: {} });
assert.equal(messages.at(-1).ok, false);
frame.removed = true;
figma.currentPage.selection = [];
await send('render-preview', { bytes: [1] });
assert.equal(messages.at(-1).frame, null);
console.log('PASS: no false success; create frame; image fill acknowledgement; failed image; removed target.');
