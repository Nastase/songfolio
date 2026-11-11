import { moment, normalizePath, Notice, TFile, TFolder, type App } from 'obsidian';
import type { SongfolioSettings } from '../settings';
import { assignPropertyTypes } from './propertyTypes';
import { codeBlock, songFileName, songProperties, type SongValues } from './songNote';

/**
 * The folder for new songs: the song folder setting, created if missing, or Obsidian's default
 * location for new notes when the setting is empty.
 */
export async function songFolder(app: App, settings: SongfolioSettings): Promise<TFolder> {
	const path = normalizePath(settings.songFolder.trim());
	if (path === '' || path === '/') {
		return app.fileManager.getNewFileParent(app.workspace.getActiveFile()?.path ?? '');
	}
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFolder) return existing;
	if (existing) throw new Error(`${path} is a file, not a folder.`);
	return app.vault.createFolder(path);
}

/** A path in the folder that no file uses yet: `name.ext`, then `name 2.ext`, `name 3.ext`… */
export function freePath(app: App, folder: TFolder, name: string, extension: string): string {
	const base = folder.isRoot() ? '' : `${folder.path}/`;
	for (let count = 1; ; count++) {
		const path = normalizePath(`${base}${name}${count === 1 ? '' : ` ${count}`}.${extension}`);
		if (!app.vault.getAbstractFileByPath(path)) return path;
	}
}

/** Properties of the song template note, or null when there is none or it cannot be read. */
function templateProperties(app: App, settings: SongfolioSettings): Record<string, unknown> | null {
	const path = settings.templatePath.trim();
	if (path === '') return null;
	const file = app.vault.getAbstractFileByPath(normalizePath(path));
	if (!(file instanceof TFile)) {
		new Notice(`Song template ${path} was not found, so the default properties are used.`);
		return null;
	}
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	return frontmatter ? structuredClone(frontmatter) : null;
}

/**
 * Creates a song note in the song folder, named `Artist - Title`, with its properties and a
 * block holding `body`, then opens it.
 */
export async function createSongNote(
	app: App,
	settings: SongfolioSettings,
	values: SongValues,
	body: string,
): Promise<TFile> {
	const marker = { name: settings.markerProperty, value: settings.markerValue };
	const properties = songProperties(values, marker, templateProperties(app, settings), (format) =>
		moment().format(format),
	);
	const artist = typeof values.artist === 'string' ? values.artist : null;

	const folder = await songFolder(app, settings);
	const path = freePath(app, folder, songFileName(values.title, artist), 'md');
	// The leading newline leaves a blank line between the properties and the block.
	const file = await app.vault.create(path, `\n${codeBlock(settings.blockName, body)}`);
	// Obsidian writes the YAML, so any value a template holds is quoted the way it expects.
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		Object.assign(frontmatter, properties);
	});
	await assignPropertyTypes(app, marker.name);
	await app.workspace.getLeaf(false).openFile(file);
	return file;
}
