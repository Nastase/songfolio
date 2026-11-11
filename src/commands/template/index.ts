import { Notice, stringifyYaml, TFile } from 'obsidian';
import type SongfolioPlugin from '../../main';
import { createSongNote, songFolder } from '../note';
import { assignPropertyTypes } from '../propertyTypes';
import { STARTER_BLOCK } from '../songNote';
import { BASE_FILE_NAME, starterBase } from './base';
import { NewSongModal } from './newSongModal';

/** The library commands: a new song note and the starter base (R12). */
export function registerTemplateCommands(plugin: SongfolioPlugin): void {
	const { app } = plugin;

	plugin.addCommand({
		id: 'new-song',
		name: 'New song',
		callback: () => {
			new NewSongModal(app, ({ title, artist }) => {
				createSongNote(app, plugin.settings, { title, artist }, STARTER_BLOCK).catch((error: unknown) =>
					report('Could not create the song', error),
				);
			}).open();
		},
	});

	plugin.addCommand({
		id: 'create-songs-base',
		name: 'Create starter songs base',
		callback: () => {
			createBase(plugin).catch((error: unknown) => report('Could not create the songs base', error));
		},
	});
}

/** Creates `Songs.base` in the song folder and opens it; an existing one is opened unchanged. */
async function createBase(plugin: SongfolioPlugin): Promise<void> {
	const { app, settings } = plugin;
	const folder = await songFolder(app, settings);
	const path = folder.isRoot() ? `${BASE_FILE_NAME}.base` : `${folder.path}/${BASE_FILE_NAME}.base`;

	const existing = app.vault.getAbstractFileByPath(path);
	let file: TFile;
	if (existing instanceof TFile) {
		new Notice(`${path} already exists, so it was left unchanged.`);
		file = existing;
	} else {
		const marker = { name: settings.markerProperty, value: settings.markerValue };
		file = await app.vault.create(path, stringifyYaml(starterBase(marker)));
		await assignPropertyTypes(app, marker.name);
	}
	await app.workspace.getLeaf(false).openFile(file);
}

function report(what: string, error: unknown): void {
	console.error(`Songfolio: ${what.toLowerCase()}`, error);
	new Notice(`${what}: ${error instanceof Error ? error.message : String(error)}`);
}
