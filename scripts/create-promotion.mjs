import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/create-promotion.mjs <screenshot-directory>');
const out = new URL('../assets/promotion/', import.meta.url);
await mkdir(out, { recursive: true });
for (const mode of ['light', 'dark', 'clay']) {
  await sharp(join(source, `${mode}-full.png`))
    .extract({ left: 420, top: 59, width: 700, height: 514 })
    .toFile(new URL(`render-${mode}.png`, out).pathname);
}
const image = async (name) => 'data:image/png;base64,' + (await readFile(new URL(name, out))).toString('base64');
const light = await image('render-light.png'), dark = await image('render-dark.png'), clay = await image('render-clay.png');
const font = 'Avenir Next,Helvetica,sans-serif';
const svg = (body, bg='#edf2ee') => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="${bg}"/><g font-family="${font}">${body}</g></svg>`;
const title = (y,text,size=96,fill='#142b24') => `<text x="100" y="${y}" fill="${fill}" font-size="${size}" font-weight="600" letter-spacing="-3">${text}</text>`;
const cover = svg(`
  <text x="100" y="108" fill="#b6ddcd" font-size="24" letter-spacing="4">GLB 3D FRAME PREVIEW</text>
  ${title(330,'From GLB',112,'#f2f5ec')}${title(460,'to your',112,'#f2f5ec')}${title(590,'Figma frame.',112,'#b6ddcd')}
  <text x="104" y="705" fill="#d4dfd5" font-size="31">Find the angle. Shape the light.</text>
  <text x="104" y="754" fill="#d4dfd5" font-size="31">Bring the render into your design.</text>
  <rect x="980" y="130" width="840" height="820" rx="32" fill="#f4f6f8"/>
  <image href="${light}" x="980" y="215" width="840" height="617"/>
  <text x="1030" y="900" fill="#456056" font-size="22">Actual plugin render / included sample</text>
  <text x="104" y="955" fill="#b6ddcd" font-size="25">FREE  /  OPEN SOURCE  /  LOCAL PROCESSING</text>
`, '#142b24');
const compare = svg(`
  <text x="100" y="105" fill="#456056" font-size="24" letter-spacing="4">ONE MODEL. DIFFERENT DIRECTIONS.</text>
  ${title(245,'Explore the look before you commit.',74)}
  <text x="104" y="319" fill="#456056" font-size="30">Adjust backgrounds, materials, lighting and framing in one place.</text>
  ${[[light,'Light / product presentation'],[dark,'Dark / contrast'],[clay,'Clay / form study']].map(([src,label],i)=>`<image href="${src}" x="${100+i*586}" y="410" width="548" height="403"/><text x="${100+i*586}" y="890" fill="#142b24" font-size="27">${label}</text>`).join('')}
  <text x="104" y="1000" fill="#456056" font-size="23">Rendered PNG output. Your GLB stays local. No plugin account or API key required.</text>
`);
const start = svg(`
  <text x="100" y="110" fill="#456056" font-size="24" letter-spacing="4">START WITH THE INCLUDED SAMPLE</text>
  ${title(270,'Your first render,',100)}${title(390,'without finding a model.',100)}
  <text x="106" y="520" fill="#456056" font-size="32">01   Try sample model</text>
  <text x="106" y="608" fill="#456056" font-size="32">02   Create New Frame</text>
  <text x="106" y="696" fill="#456056" font-size="32">03   Adjust, then Sync Frame</text>
  <image href="${dark}" x="1090" y="420" width="720" height="529"/>
  <text x="104" y="930" fill="#142b24" font-size="30">Already have a GLB? Import it directly.</text>
  <text x="104" y="985" fill="#456056" font-size="23">Includes an original, unbranded headphone model under the MIT license.</text>
`);
for (const [name, content] of [['01-cover',cover],['02-looks',compare],['03-quick-start',start]]) {
  await writeFile(new URL(`${name}.svg`,out),content);
  await sharp(Buffer.from(content)).png().toFile(new URL(`${name}-1920x1080.png`,out).pathname);
}
console.log('Exported 3 Community images at 1920 x 1080 using actual plugin renders.');
