import type { App, MarkdownPostProcessorContext } from 'obsidian';
import { editorShowing } from '../commands/note';
import { eventElement } from './dom';

/** Parts of a song that do something of their own when clicked: they never open the source. */
const INTERACTIVE = 'button, a, input, select, textarea, [role="button"]';

/** The rendered block whose source a click opens. */
export interface EditTarget {
	ctx: MarkdownPostProcessorContext;
	/** The block's element, which Obsidian locates in the note. */
	el: HTMLElement;
	sourcePath: string;
}

/**
 * In live preview, a click anywhere on the song opens its source, as Obsidian's "Edit this
 * block" button does: the cursor goes to the block's first line. Clicks on buttons and chord
 * diagrams, and selecting text, work as before. Does nothing in reading view.
 */
export function editOnClick(app: App, target: EditTarget, event: MouseEvent): void {
	if (event.defaultPrevented || event.button !== 0) return;
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
	if (eventElement(event)?.closest(INTERACTIVE)) return;
	const selection = target.el.win.getSelection();
	if (selection && !selection.isCollapsed && target.el.contains(selection.anchorNode)) return;

	const editor = editorShowing(app, target.el, target.sourcePath);
	const info = editor ? target.ctx.getSectionInfo(target.el) : null;
	if (!editor || !info) return;
	editor.setCursor({ line: info.lineStart + 1, ch: 0 });
	editor.focus();
}
