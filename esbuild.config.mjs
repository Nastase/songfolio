import esbuild from 'esbuild';
import process from 'process';
import { builtinModules } from 'node:module';
import { copyFileSync, existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const banner = `/*
Songfolio, https://github.com/Nastase/songfolio (MIT License).
Bundled by esbuild from the sources in that repository. The licence notices of the bundled
third-party code, data and font are at the end of this file.
*/
`;

// The store installs only main.js, manifest.json and styles.css, so the licence notices of
// what main.js bundles must be inside it. esbuild moves the `/*! @license` comments to the
// end of the file; a release build without one of them fails.
const LICENCE_NOTICES = {
	alphaTab: 'Daniel Kuschny and Contributors',
	'chords-db': 'Copyright (c) 2026 Tabsy contributors',
	Bravura: 'SIL Open Font License, Version 1.1',
};

function checkLicenceNotices(file) {
	const bundle = readFileSync(file, 'utf8');
	const missing = Object.keys(LICENCE_NOTICES).filter((name) => !bundle.includes(LICENCE_NOTICES[name]));
	if (missing.length > 0) {
		console.error(`${file} lacks the licence notice of ${missing.join(', ')}`);
		process.exit(1);
	}
}

// No argument: watch build into the dev vault. `production`: release build of main.js at the
// repo root. `vault`: one production build into the dev vault, for the Android tablet (synced
// vault): the dev build's inline source maps would make main.js several times larger there.
const mode = process.argv[2] ?? 'dev';
const prod = mode === 'production' || mode === 'vault';
const intoVault = mode !== 'production';

// Into the dev vault, the plugin gets a .hotreload marker so the Hot Reload plugin reloads it on
// every rebuild.
const devPluginDir = 'dev-vault/.obsidian/plugins/songfolio';
const outfile = intoVault ? join(devPluginDir, 'main.js') : 'main.js';

/** Copies manifest.json and styles.css next to the dev build after each rebuild. */
const copyToDevVault = {
	name: 'copy-to-dev-vault',
	setup(build) {
		build.onEnd((result) => {
			if (result.errors.length > 0) return;
			mkdirSync(devPluginDir, { recursive: true });
			for (const file of ['manifest.json', 'styles.css']) {
				if (existsSync(file)) copyFileSync(file, join(devPluginDir, file));
			}
			writeFileSync(join(devPluginDir, '.hotreload'), '');
		});
	},
};

const context = await esbuild.context({
	banner: {
		js: banner,
	},
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtinModules,
	],
	format: 'cjs',
	target: 'es2022',
	logLevel: 'info',
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	// alphaTab's music font is inlined: the store installs only main.js, and no network calls.
	loader: { '.woff2': 'base64' },
	outfile,
	minify: prod,
	plugins: intoVault ? [copyToDevVault] : [],
});

if (prod) {
	await context.rebuild();
	checkLicenceNotices(outfile);
	process.exit(0);
} else {
	await context.watch();
	// esbuild only rebuilds for code changes; a styles.css change is copied on its own (Hot
	// Reload picks it up). The folder is watched: editors often save by replacing the file.
	watch('.', (_event, file) => {
		if (file === 'styles.css' && existsSync(file)) copyFileSync(file, join(devPluginDir, file));
	});
}
