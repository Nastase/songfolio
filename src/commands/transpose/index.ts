import { Notice } from 'obsidian';
import type SongfolioPlugin from '../../main';
import { readProperty } from '../frontmatter';
import { editSongs, hasActiveNote, type SongTransform } from '../note';
import { MAX_CAPO, moveCapo, switchSpelling, transposeSong, type SongEdit } from './edit';

const TABS_KEPT = ' Tabs were not transposed.';

/**
 * Transpose (R13) and capo commands. They edit the songsheet block under the cursor, or every
 * block in the note; see `editSongs`.
 */
export function registerTransposeCommands(plugin: SongfolioPlugin): void {
	const { app } = plugin;

	const add = <R extends SongEdit>(
		id: string,
		name: string,
		transform: SongTransform<R>,
		done: (result: R) => string,
		refused?: (lines: readonly string[]) => string,
	) => {
		plugin.addCommand({
			id,
			name,
			checkCallback: (checking) => {
				if (!hasActiveNote(app)) return false;
				if (checking) return true;
				const transformOrRefuse: SongTransform<R> = (lines, blocks) => {
					const result = transform(lines, blocks);
					if (!result && refused) new Notice(refused(lines));
					return result;
				};
				editSongs(app, plugin.settings.blockName, transformOrRefuse)
					.then((result) => {
						if (result) new Notice(done(result));
					})
					.catch((error: unknown) => {
						console.error('Songfolio: could not edit the song', error);
						new Notice(`Could not edit the song: ${error instanceof Error ? error.message : String(error)}`);
					});
				return true;
			},
		});
	};

	const transposed = (direction: string) => (result: SongEdit) =>
		`Transposed ${direction}${result.key ? `, key ${result.key}` : ''}.${result.hasTab ? TABS_KEPT : ''}`;

	add('transpose-up', 'Transpose up a semitone', (lines, blocks) => transposeSong(lines, blocks, 1), transposed('up'));
	add('transpose-down', 'Transpose down a semitone', (lines, blocks) => transposeSong(lines, blocks, -1), transposed('down'));

	add('toggle-sharps-flats', 'Switch sharps and flats', switchSpelling, (result) =>
		result.spelling === 'flats' ? 'Chords now use flats.' : 'Chords now use sharps.',
	);

	const capoDone = (result: SongEdit & { capo: number }) =>
		`Capo ${result.capo}${result.key ? `, key ${result.key}` : ''}.${result.hasTab ? TABS_KEPT : ''}`;
	const capoRefused = (lines: readonly string[]) => {
		const capo = readProperty(lines, 'capo');
		if (capo !== null && !Number.isInteger(Number(capo))) return `Capo ${capo} is not a whole number of frets.`;
		return `The capo stays between 0 and ${MAX_CAPO}.`;
	};
	add('raise-capo', 'Raise capo, keep the sound', (lines, blocks) => moveCapo(lines, blocks, 1), capoDone, capoRefused);
	add('lower-capo', 'Lower capo, keep the sound', (lines, blocks) => moveCapo(lines, blocks, -1), capoDone, capoRefused);
}
