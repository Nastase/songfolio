import { Notice, type App } from 'obsidian';
import type SongfolioPlugin from '../../main';
import { readProperty } from '../frontmatter';
import { editRenderedSong, editSongs, hasActiveNote, type RenderedSong, type SongTransform } from '../note';
import { MAX_CAPO, moveCapo, switchSpelling, transposeSong, type SongEdit } from './edit';

const TABS_KEPT = ' Tabs were not transposed.';

/** The notice after a transpose. */
function transposed(semitones: number, result: SongEdit): string {
	const direction = semitones > 0 ? 'up' : 'down';
	return `Transposed ${direction}${result.key ? `, key ${result.key}` : ''}.${result.hasTab ? TABS_KEPT : ''}`;
}

/** Shows the notice for a finished edit, or the error that stopped it. */
function report<R>(edit: Promise<R | null>, done: (result: R) => string): void {
	edit
		.then((result) => {
			if (result) new Notice(done(result));
		})
		.catch((error: unknown) => {
			console.error('Songfolio: could not edit the song', error);
			new Notice(`Could not edit the song: ${error instanceof Error ? error.message : String(error)}`);
		});
}

/** Transposes one rendered song by `semitones`, and the note's `key` with it: the header buttons. */
export function transposeRenderedSong(app: App, blockName: string, song: RenderedSong, semitones: number): void {
	report(
		editRenderedSong(app, blockName, song, (lines, blocks) => transposeSong(lines, blocks, semitones)),
		(result) => transposed(semitones, result),
	);
}

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
				report(editSongs(app, plugin.settings.blockName, transformOrRefuse), done);
				return true;
			},
		});
	};

	for (const [id, name, semitones] of [
		['transpose-up', 'Transpose up a semitone', 1],
		['transpose-down', 'Transpose down a semitone', -1],
	] as const) {
		add(id, name, (lines, blocks) => transposeSong(lines, blocks, semitones), (result) => transposed(semitones, result));
	}

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
