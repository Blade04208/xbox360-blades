import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const target = process.argv[2] ?? 'all';

if (!['all', 'theme', 'plugin'].includes(target)) {
  throw new Error('Build target must be theme or plugin, or omitted to build both.');
}

await mkdir(output, { recursive: true });

if (target === 'all' || target === 'theme') {
  const theme = join(output, 'X360-Blades');
  await rm(theme, { recursive: true, force: true });
  await mkdir(theme);
  for (const entry of ['skin.json', 'css', 'js', 'assets']) {
    await cp(join(root, entry), join(theme, entry), { recursive: true });
  }
  console.log('Theme: dist/X360-Blades/');
}

if (target === 'all' || target === 'plugin') {
  const require = createRequire(import.meta.url);
  const starlight = require.resolve('@steambrew/starlight/bin/starlight.js');
  await rm(join(output, 'x360-blades-sounds.star'), { force: true });
  execFileSync(process.execPath, [
    starlight,
    '--dir', join(root, 'plugins/x360-blades-sounds'),
    '--of', output,
    '--release',
    'pack',
  ], { cwd: root, stdio: 'inherit' });
}
