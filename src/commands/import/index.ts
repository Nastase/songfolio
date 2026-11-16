import { Notice, type Editor } from 'obsidian';
import type SongfolioPlugin from '../../main';
import { createSongNote } from '../note';
import { blockAt, findSongBlocks } from '../songBlocks';
import { convertAsciiAt } from './asciiToTex';
import { ImportModal } from './importModal';

/** "Import song from clipboard" (R11): a pasted song becomes a new song note. */
export function registerImportCommand(plugin: SongfolioPlugin): void {
	const { app } = plugin;
	plugin.addCommand({
		id: 'import-song-from-clipboard',
		name: 'Import song from clipboard',
		callback: () => {
			new ImportModal(app, (song, title, artist) => {
				const { key, capo, tuning, tempo, difficulty, body } = song;
				const values = { title, artist, key, capo, tuning, tempo, difficulty };
				createSongNote(app, plugin.settings, values, body).catch((error: unknown) => {
					console.error('Songfolio: could not import the song', error);
					new Notice(`Could not import the song: ${error instanceof Error ? error.message : String(error)}`);
				});
			}).open();
		},
	});
}

/** "Convert ASCII tab to %tab" (R16): the ASCII tab at the cursor gets a `%tab` block below it. */
export function registerConvertTabCommand(plugin: SongfolioPlugin): void {
	plugin.addCommand({
		id: 'convert-ascii-tab',
		name: 'Convert ASCII tab to %tab',
		editorCallback: (editor) => convertTabAtCursor(editor, plugin.settings.blockName),
	});
}

function convertTabAtCursor(editor: Editor, blockName: string): void {
	const cursor = editor.getCursor().line;
	const lines = editor.getValue().split('\n');
	const block = blockAt(findSongBlocks(lines, blockName), cursor);
	const insertion =
		block && cursor > block.start && cursor < block.end
			? convertAsciiAt(lines.slice(block.start + 1, block.end).join('\n'), cursor - block.start - 1)
			: null;
	if (!block || !insertion) {
		new Notice('To convert a tab, first go to a line of an ASCII tab in a song.');
		return;
	}
	const { converted } = insertion;
	if (converted.lines.length === 0) {
		new Notice('No tab with 6 strings was found to convert.');
		return;
	}

	const at = block.start + 1 + insertion.after;
	editor.replaceRange(`\n${insertion.lines.join('\n')}`, { line: at, ch: editor.getLine(at).length });
	editor.setCursor({ line: at + 3, ch: 0 });

	const systems = converted.systems === 1 ? 'the tab' : `${converted.systems} tab systems`;
	const notes = [
		converted.notSixStrings > 0 ? `${converted.notSixStrings} without 6 strings left out.` : '',
		converted.skipped > 0 ? `${converted.skipped} unknown marks skipped.` : '',
	].filter((note) => note !== '');
	new Notice(`Converted ${systems} to %tab. Every beat is an 8th note: fill in the rhythm. ${notes.join(' ')}`.trim());
}
