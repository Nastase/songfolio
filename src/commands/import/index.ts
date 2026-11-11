import { Notice } from 'obsidian';
import type SongfolioPlugin from '../../main';
import { createSongNote } from '../note';
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
