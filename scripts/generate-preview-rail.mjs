import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const item = JSON.parse(readFileSync(path.join(root, 'packages/registry/items/preview-rail.json'), 'utf8'));
const directory = path.join(root, 'packages/ui/src/components/preview-rail');
const files = item.files.map(name => {
  if (path.basename(name) !== name) throw new Error('Invalid filename');
  const content = readFileSync(path.join(directory, name), 'utf8');
  return { name, content, sha256: createHash('sha256').update(content).digest('hex') };
});
const artifact = JSON.stringify({ ...item, files }, null, 2) + '\n';
const target = path.join(root, 'packages/registry/generated/preview-rail.json');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== artifact) throw new Error('Registry source is stale');
  console.log('Registry matches exact implementation, examples and license.');
} else {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, artifact);
}
