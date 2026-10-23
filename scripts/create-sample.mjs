import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';

// GLTFExporter uses the browser FileReader API to assemble its binary buffer.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(value => {
      this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const product = new THREE.Group();
product.name = 'Studio headphones - original sample';
const shell = new THREE.MeshStandardMaterial({ color: 0xa9e7cf, metalness: 0.42, roughness: 0.26 });
const cushion = new THREE.MeshStandardMaterial({ color: 0x172e29, roughness: 0.88 });
const steel = new THREE.MeshStandardMaterial({ color: 0xd4e5e0, metalness: 0.9, roughness: 0.2 });
function mesh(geometry, material, name, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.position.set(x, y, z);
  product.add(m);
  return m;
}
mesh(new THREE.TorusGeometry(1.02, 0.09, 12, 56, Math.PI), shell, 'Headband', 0, 0.2);
mesh(new THREE.TorusGeometry(0.94, 0.055, 10, 56, Math.PI), cushion, 'Padded headband', 0, 0.2);
for (const side of [-1, 1]) {
  const arm = mesh(new THREE.CapsuleGeometry(0.045, 0.52, 4, 10), steel, 'Adjustable arm', side * 0.99, 0.02);
  arm.rotation.z = side * 0.1;
  const cup = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.23, 48), shell, 'Ear cup', side * 1.01, -0.43);
  cup.rotation.z = Math.PI / 2;
  cup.scale.set(1, 1, 0.82);
  const pad = mesh(new THREE.TorusGeometry(0.31, 0.09, 12, 40), cushion, 'Ear cushion', side * 0.85, -0.43);
  pad.rotation.y = Math.PI / 2;
  pad.scale.set(0.82, 1, 1);
  const plate = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.012, 40), steel, 'Outer accent', side * 1.132, -0.43);
  plate.rotation.z = Math.PI / 2;
  plate.scale.set(1, 1, 0.82);
  const inset = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.016, 40), shell, 'Outer panel', side * 1.14, -0.43);
  inset.rotation.z = Math.PI / 2;
  inset.scale.set(1, 1, 0.82);
}
product.rotation.set(0.12, -0.48, -0.08);
const data = await new GLTFExporter().parseAsync(product, { binary: true });
await mkdir(new URL('../examples/', import.meta.url), { recursive: true });
await writeFile(new URL('../examples/studio-headphones.glb', import.meta.url), Buffer.from(data));
console.log(`Created original sample: ${data.byteLength} bytes`);
