import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(join(root, path));
const pkg = JSON.parse(await read('package.json'));
const manifest = JSON.parse(await read('manifest.json'));
assert.equal(manifest.id, '1689584566677007084', 'Use the existing Community plugin');
assert.deepEqual(manifest.networkAccess.allowedDomains, ['none']);
assert.equal(manifest.main, 'dist/code.js');
assert.equal(manifest.ui, 'dist/ui.html');
assert(/^[\w.-]+$/.test(pkg.version), 'Safe package version required');

const model = await read('examples/studio-headphones.glb');
assert.equal(model.toString('ascii', 0, 4), 'glTF');
assert.equal(model.readUInt32LE(4), 2);
assert.equal(model.readUInt32LE(8), model.length);

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = resolve(root, 'releases', `${pkg.version}-${timestamp}`);
await mkdir(dirname(output), { recursive: true });
await mkdir(output);
const notes = Buffer.from(`# GLB 3D Frame Preview ${pkg.version}\n\n${await read('CHANGELOG.md')}`);
const plugin = new Map(await Promise.all([
  'manifest.json', 'dist/code.js', 'dist/ui.html', 'LICENSE', 'PRIVACY.md'
].map(async path => [path, await read(path)])));
plugin.set('INSTALL.md', await read('docs/INSTALL_FROM_ZIP.md'));
plugin.set('RELEASE_NOTES.md', notes);
const sample = new Map([
  ['studio-headphones.glb', model],
  ['README.md', await read('examples/README.md')],
  ['LICENSE', await read('LICENSE')]
]);

const sums = [];
for (const [name, entries] of [
  [`glb-3d-frame-preview-${pkg.version}.zip`, plugin],
  [`studio-headphones-sample-${pkg.version}.zip`, sample]
]) {
  // A whitelist keeps raw recordings, local fonts, secrets, and draft ads out.
  const stage = await mkdtemp(join(tmpdir(), 'glb-release-'));
  try {
    for (const [path, bytes] of entries) {
      assert(bytes.length > 0, `${path} must not be empty`);
      await mkdir(dirname(join(stage, path)), { recursive: true });
      await writeFile(join(stage, path), bytes);
    }
    const archive = join(output, name);
    execFileSync('zip', ['-X', '-q', archive, ...entries.keys()], { cwd: stage });
    execFileSync('unzip', ['-tq', archive]);
    const paths = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
    assert.deepEqual(paths.sort(), [...entries.keys()].sort(), 'Archive contents must match the whitelist');
    for (const [path, expected] of entries) {
      const actual = execFileSync('unzip', ['-p', archive, path], { maxBuffer: 32 * 1024 * 1024 });
      assert(actual.equals(expected), `Archive mismatch: ${path}`);
    }
    sums.push(`${createHash('sha256').update(await readFile(archive)).digest('hex')}  ${name}`);
    console.log(`Verified ${name}: ${entries.size} files; exact content match`);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
await writeFile(join(output, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`);
await writeFile(join(output, 'RELEASE_NOTES.md'), notes);
console.log(`Verified local release packages: ${output}`);
console.log('No code, release, Community listing, or promotional draft was published.');
