import { songsheetMode, type Mode } from './mode';

/** Obsidian's CodeMirror 5 compatibility object; not part of its documented API. */
interface LegacyCodeMirror {
	defineMode(name: string, factory: () => Mode): void;
	modes?: Record<string, unknown>;
}

/**
 * Registers the songsheet mode under the block name, so Obsidian highlights the block's source
 * in source mode and in live preview while the cursor is in it (R14). Nothing happens when
 * Obsidian does not offer legacy modes. Returns the function that removes the mode.
 */
export function registerHighlighting(win: Window, blockName: string): () => void {
	const codeMirror = (win as Window & { CodeMirror?: LegacyCodeMirror }).CodeMirror;
	if (typeof codeMirror?.defineMode !== 'function') return () => {};
	const name = blockName.toLowerCase();
	codeMirror.defineMode(name, songsheetMode);
	return () => {
		if (codeMirror.modes) delete codeMirror.modes[name];
	};
}
