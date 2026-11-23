import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const theme = join(root, 'dist', 'X360-Blades');

await rm(theme, { recursive: true, force: true });
await mkdir(theme, { recursive: true });
for (const entry of ['skin.json', 'css', 'js', 'assets']) {
  await cp(join(root, entry), join(theme, entry), { recursive: true });
}
console.log('Theme: dist/X360-Blades/');
