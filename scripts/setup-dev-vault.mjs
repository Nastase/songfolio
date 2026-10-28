// Downloads the Hot Reload plugin (https://github.com/pjeby/hot-reload) into the dev vault.
// Run once after cloning: npm run setup:vault
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dev-vault/.obsidian/plugins/hot-reload';
const base = 'https://raw.githubusercontent.com/pjeby/hot-reload/master';

mkdirSync(dir, { recursive: true });
for (const file of ['main.js', 'manifest.json']) {
	const res = await fetch(`${base}/${file}`);
	if (!res.ok) throw new Error(`Failed to download ${file}: ${res.status}`);
	writeFileSync(join(dir, file), await res.text());
	console.log(`Downloaded ${join(dir, file)}`);
}
console.log('Hot Reload installed. Run `npm run dev`, then open dev-vault in Obsidian.');
