import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const slugs = readdirSync(path.join(root, 'packages/registry/items')).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).sort();
for (const slug of slugs) {
  const item = JSON.parse(readFileSync(path.join(root, 'packages/registry/items', `${slug}.json`), 'utf8'));
  const directory = path.join(root, 'packages/ui/src/components', slug);
  const files = item.files.map(name => {
    if (path.basename(name) !== name) throw new Error('Invalid filename');
    const content = readFileSync(path.join(directory, name), 'utf8');
    return { name, content, sha256: createHash('sha256').update(content).digest('hex') };
  });
  const artifact = JSON.stringify({ ...item, files }, null, 2) + '\n';
  const target = path.join(root, 'packages/registry/generated', `${slug}.json`);
  if (check) {
    if (readFileSync(target, 'utf8') !== artifact) throw new Error(`Registry source is stale: ${slug}`);
    console.log(`${slug}: registry matches exact implementation, examples and license.`);
  } else {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, artifact);
  }
}
