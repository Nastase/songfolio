import { MarkdownView, moment, normalizePath, Notice, TFile, TFolder, type App, type Editor } from 'obsidian';
import type { SongfolioSettings } from '../settings';
import { assignPropertyTypes } from './propertyTypes';
import { blockAt, findSongBlocks, splitLines, type SongBlockRange } from './songBlocks';
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

// --- Editing the songs of the open note -----------------------------------------------------

/** The editor of a note, when it is open in live preview or source mode. */
export function openEditor(app: App, path: string): Editor | null {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === path && view.getMode() === 'source') {
			return view.editor;
		}
	}
	return null;
}

/**
 * The editor showing an element: the live preview or source view it is drawn in, when that view
 * holds the note at `path` (not a note embedding it). Null in reading view.
 */
export function editorShowing(app: App, el: HTMLElement, path: string): Editor | null {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (
			view instanceof MarkdownView &&
			view.getMode() === 'source' &&
			view.file?.path === path &&
			view.contentEl.contains(el)
		) {
			return view.editor;
		}
	}
	return null;
}

/** Whether the active view is a Markdown note, where the song commands apply. */
export function hasActiveNote(app: App): boolean {
	return app.workspace.getActiveViewOfType(MarkdownView)?.file != null;
}

/** An edit of a note's lines, given the song blocks to edit. Null when nothing can be done. */
export type SongTransform<R extends { lines: string[] }> = (
	lines: readonly string[],
	blocks: readonly SongBlockRange[],
) => R | null;

/**
 * Edits the songs of the active note: the songsheet block under the cursor in live preview or
 * source mode, otherwise every songsheet block in the note.
 * Through the editor when the note is open in live preview or source mode, as one change, so
 * one Ctrl+Z undoes it; otherwise (reading view) through the vault. Returns the transform's
 * result, or null when there was no note, no song, or nothing to do.
 */
export async function editSongs<R extends { lines: string[] }>(
	app: App,
	blockName: string,
	transform: SongTransform<R>,
): Promise<R | null> {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	const file = view?.file;
	if (!view || !file) return null;

	const active = view.getMode() === 'source' ? view.editor : null;
	const editor = active ?? openEditor(app, file.path);
	const cursor = active ? active.getCursor().line : null;

	const run = (text: string): { text: string; result: R | null } => {
		const { lines, eol } = splitLines(text);
		const blocks = findSongBlocks(lines, blockName);
		const atCursor = cursor === null ? null : blockAt(blocks, cursor);
		if (blocks.length === 0) {
			new Notice('There is no song in this note.');
			return { text, result: null };
		}
		const result = transform(lines, atCursor ? [atCursor] : blocks);
		return { text: result ? result.lines.join(eol) : text, result };
	};

	if (editor) {
		const before = editor.getValue();
		const { text, result } = run(before);
		if (text !== before) replaceChanged(editor, before, text);
		return result;
	}

	let result: R | null = null;
	await app.vault.process(file, (text) => {
		const edit = run(text);
		result = edit.result;
		return edit.text;
	});
	return result;
}

/** Replaces only the part of the editor's text that changed, as one undoable change. */
function replaceChanged(editor: Editor, before: string, after: string): void {
	let prefix = 0;
	const shortest = Math.min(before.length, after.length);
	while (prefix < shortest && before[prefix] === after[prefix]) prefix++;
	let suffix = 0;
	while (
		suffix < shortest - prefix &&
		before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
	) {
		suffix++;
	}
	editor.transaction({
		changes: [
			{
				from: editor.offsetToPos(prefix),
				to: editor.offsetToPos(before.length - suffix),
				text: after.slice(prefix, after.length - suffix),
			},
		],
	});
}
