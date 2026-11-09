import { MarkdownView, Notice, type App, type Editor, type MarkdownPostProcessorContext } from 'obsidian';
import { editBlockBody, editNote } from '../../parser/shapeEdit';

/** The rendered block a picked shape is written to. */
export interface ShapeTarget {
	ctx: MarkdownPostProcessorContext;
	/** The block's element, which Obsidian locates in the note. */
	el: HTMLElement;
	sourcePath: string;
	/** The source the block was rendered from; the write is refused if the note no longer has it. */
	source: string;
}

/**
 * Writes a picked shape into the block it was picked from, leaving the rest of the note as it
 * is (R4). Through the editor when the note is open in live preview or source mode, so Ctrl+Z
 * undoes it; otherwise (reading view, an embed) through the vault, which cannot be undone.
 */
export async function saveShape(
	app: App,
	target: ShapeTarget,
	chord: string,
	frets: (number | null)[] | null,
): Promise<void> {
	const info = target.ctx.getSectionInfo(target.el);
	if (!info) {
		new Notice('Chord shapes can only be changed from the note itself.');
		return;
	}

	const editor = openEditor(app, target.sourcePath);
	if (editor) {
		const from = { line: info.lineStart + 1, ch: 0 };
		const to = { line: info.lineEnd, ch: 0 };
		const edited = editBlockBody(editor.getRange(from, to), target.source, chord, frets);
		if (edited === null) changed();
		else editor.replaceRange(edited, from, to);
		return;
	}

	const file = app.vault.getFileByPath(target.sourcePath);
	if (!file) return;
	let stale = false;
	await app.vault.process(file, (note) => {
		const edited = editNote(note, info.lineStart, info.lineEnd, target.source, chord, frets);
		stale = edited === null;
		return edited ?? note;
	});
	if (stale) changed();
}

/** The editor of the note, when it is open in live preview or source mode. */
function openEditor(app: App, path: string): Editor | null {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === path && view.getMode() === 'source') {
			return view.editor;
		}
	}
	return null;
}

function changed(): void {
	new Notice('The song changed since it was shown. Try again.');
}
