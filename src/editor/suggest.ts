import {
	EditorSuggest,
	type App,
	type Editor,
	type EditorPosition,
	type EditorSuggestContext,
	type EditorSuggestTriggerInfo,
	type TFile,
} from 'obsidian';
import { blockAt, findSongBlocks } from '../commands/songBlocks';
import { readMeta } from '../parser/properties';
import { parseTuning } from '../parser/tuning';
import { suggestAt, type Suggestion } from './suggestions';

/**
 * Autocomplete inside songsheet blocks (R15), in live preview with the cursor in the block and
 * in source mode. Uses Obsidian's editor suggest, not an editor extension.
 */
export class SongSuggest extends EditorSuggest<Suggestion> {
	/** Suggestions found by the last trigger, for `getSuggestions`. */
	private found: Suggestion[] = [];

	constructor(
		app: App,
		private readonly blockName: () => string,
	) {
		super(app);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
		const before = editor.getLine(cursor.line).slice(0, cursor.ch);
		// Cheap check first: every suggestion follows a `%` on the line.
		if (!before.includes('%')) return null;

		const lines = editor.getValue().split('\n');
		const block = blockAt(findSongBlocks(lines, this.blockName()), cursor.line);
		if (!block || cursor.line <= block.start || cursor.line >= block.end) return null;

		const frontmatter = file ? this.app.metadataCache.getFileCache(file)?.frontmatter : undefined;
		const tuning = parseTuning(readMeta(frontmatter, '').tuning);
		const body = lines.slice(block.start + 1, block.end);
		const context = suggestAt(body, cursor.line - block.start - 1, cursor.ch, tuning);
		if (!context) return null;

		this.found = context.suggestions;
		return {
			start: { line: cursor.line, ch: context.from },
			end: cursor,
			query: context.query,
		};
	}

	getSuggestions(_context: EditorSuggestContext): Suggestion[] {
		return this.found;
	}

	renderSuggestion(suggestion: Suggestion, el: HTMLElement): void {
		el.addClass('songfolio-suggestion');
		el.createDiv({ cls: 'songfolio-suggestion-label', text: suggestion.label });
		el.createDiv({ cls: 'songfolio-suggestion-detail', text: suggestion.detail });
	}

	selectSuggestion(suggestion: Suggestion, _evt: MouseEvent | KeyboardEvent): void {
		const context = this.context;
		if (!context) return;
		const { editor, start, end } = context;
		editor.replaceRange(suggestion.text, start, end);
		const lines = suggestion.text.split('\n');
		const cursor = suggestion.cursor ?? {
			line: lines.length - 1,
			ch: (lines[lines.length - 1] ?? '').length,
		};
		editor.setCursor({
			line: start.line + cursor.line,
			ch: cursor.line === 0 ? start.ch + cursor.ch : cursor.ch,
		});
		this.close();
	}
}
