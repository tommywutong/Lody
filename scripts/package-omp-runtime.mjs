import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import * as tar from 'tar';
import { compressStream } from 'zstd-stream';

const execFile = promisify(execFileCallback);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'packages', 'acp-extension-omp');
const outputIndex = process.argv.indexOf('--output');
if (outputIndex < 0 || !process.argv[outputIndex + 1]) {
  throw new Error('Usage: node scripts/package-omp-runtime.mjs --output <directory>');
}
const output = path.resolve(process.argv[outputIndex + 1]);
const scratch = await mkdtemp(path.join(tmpdir(), 'lody-omp-runtime-'));
try {
  await execFile('corepack', ['pnpm', '--dir', source, 'build']);
  await execFile('corepack', ['pnpm', '--dir', source, 'pack', '--pack-destination', scratch]);
  const packageTarballName = (await readdir(scratch)).find((entry) => entry.endsWith('.tgz'));
  if (!packageTarballName) throw new Error('OMP package tarball was not created');
  const packageTarball = path.join(scratch, packageTarballName);
  const installRoot = path.join(scratch, 'install');
  await execFile('npm', ['install', '--prefix', installRoot, '--install-strategy=nested', '--omit=dev', '--ignore-scripts', packageTarball]);
  const packageDir = path.join(installRoot, 'node_modules', 'acp-extension-omp');
  await cp(packageDir, path.join(scratch, 'package'), { recursive: true, dereference: true });
  const archive = path.join(scratch, 'runtime.tar.zst');
  const tarPath = path.join(scratch, 'runtime.tar');
  await tar.c({ cwd: scratch, file: tarPath, portable: true, noMtime: true, mtime: new Date(0) }, ['package']);
  const compressed = await compressStream(Readable.toWeb(createReadStream(tarPath)), { level: 19 });
  await writeFile(archive, new Uint8Array(await new Response(compressed).arrayBuffer()));
  const bytes = await readFile(archive);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const packageJson = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
  const version = `${packageJson.version}-local.${sha256.slice(0, 12)}`;
  const fileName = `lody-omp-${version}.tar.zst`;
  const manifest = {
    name: 'omp',
    version,
    kind: 'node-package',
    minNodeVersion: packageJson.engines.node.match(/>=([0-9.]+)/)?.[1],
    artifact: {
      fileName,
      sha256,
      size: (await stat(archive)).size,
      compression: 'zstd',
      cmd: 'package/dist/index.js',
    },
  };
  await mkdir(output, { recursive: true });
  await cp(archive, path.join(output, fileName));
  await writeFile(path.join(output, `${fileName}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
