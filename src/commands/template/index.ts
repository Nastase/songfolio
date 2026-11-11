import { Notice } from 'obsidian';
import type SongfolioPlugin from '../../main';
import { createSongNote } from '../note';
import { STARTER_BLOCK } from '../songNote';
import { NewSongModal } from './newSongModal';

/** The library commands: a new song note (R12). */
export function registerTemplateCommands(plugin: SongfolioPlugin): void {
	plugin.addCommand({
		id: 'new-song',
		name: 'New song',
		callback: () => {
			new NewSongModal(plugin.app, ({ title, artist }) => {
				createSongNote(plugin.app, plugin.settings, { title, artist }, STARTER_BLOCK).catch(
					(error: unknown) => {
						console.error('Songfolio: could not create the song', error);
						new Notice(`Could not create the song: ${errorText(error)}`);
					},
				);
			}).open();
		},
	});
}

export function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
