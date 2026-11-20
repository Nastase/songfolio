import { describe, expect, it } from 'vitest';
import { libraryEntries, libraryFingerings } from '../src/render/header/library';

/** The first fingering's frets, as written in a `%shape` line. */
const first = (symbol: string) =>
	libraryFingerings(symbol)[0]?.frets.map((fret) => (fret === null ? 'x' : String(fret))).join(' ');

describe('library entries', () => {
	it('reads every chord of the library', () => {
		const unread = libraryEntries().filter((entry) => entry.chord === null).map((entry) => entry.symbol);
		expect(unread).toEqual([]);
	});

	it('has no two chords with the same notes and bass, except for the spelling of the bass', () => {
		const seen = new Map<string, string>();
		const repeats: string[] = [];
		for (const { symbol, chord } of libraryEntries()) {
			if (!chord) continue;
			const key = `${chord.rootChroma}|${chord.tones}|${chord.bassChroma ?? ''}`;
			const earlier = seen.get(key);
			if (earlier && earlier.split('/')[1] === chord.bass) repeats.push(`${earlier} = ${symbol}`);
			if (!earlier) seen.set(key, symbol);
		}
		expect(repeats).toEqual([]);
	});

	it('covers the 12 keys', () => {
		expect(new Set(libraryEntries().map((entry) => entry.key)).size).toBe(12);
	});
});

describe('libraryFingerings', () => {
	it('decodes frets, fingers and barres, frets counted from the nut', () => {
		const [open, barre] = libraryFingerings('C');
		expect(open).toEqual({ frets: [null, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], barres: [] });
		expect(barre).toEqual({ frets: [null, 3, 5, 5, 5, 3], fingers: [0, 1, 2, 3, 4, 1], barres: [3] });
	});

	it('reads frets above 9 and the thumb', () => {
		const high = libraryFingerings('C6').find((fingering) => fingering.fingers.includes('T'));
		expect(high).toEqual({ frets: [8, null, 10, 9, 10, 8], fingers: ['T', 0, 3, 2, 4, 1], barres: [] });
	});

	it('finds a chord however it is written, by its notes', () => {
		expect(first('D7(9)')).toBe(first('D9'));
		expect(first('Bm7(5-)')).toBe(first('Bm7b5'));
		expect(first('Bm7/b5')).toBe(first('Bm7b5'));
		expect(first('D7M')).toBe(first('Dmaj7'));
		expect(first('Csus')).toBe(first('Csus4'));
		expect(first('C4')).toBe(first('Csus4'));
		expect(first('Cmadd9')).toBe('x 3 1 0 3 3');
		expect(first('CMb5')).toBe(first('C(b5)'));
		expect(first('C(b5)')).toBe('x 3 4 5 5 0');
	});

	it('finds a root however it is spelled', () => {
		expect(first('Db')).toBe(first('C#'));
		expect(first('D#m')).toBe(first('Ebm'));
		expect(first('E♭m')).toBe(first('Ebm'));
		expect(first('Gb7')).toBe(first('F#7'));
	});

	it('finds slash chords by their bass, preferring the bass as written', () => {
		expect(first('C/E')).toBe('0 3 2 0 1 0');
		expect(first('G/B')).toBe('x 2 0 0 0 3');
		expect(first('E/G#')).toBe('x x x 1 0 0');
		expect(first('E/Ab')).toBe('x x 6 4 5 7');
	});

	it('finds a slash chord whose bass the library spells the other way', () => {
		expect(first('C/D#')).toBe(first('C/Eb'));
		expect(first('C/D#')).toBeDefined();
	});

	it('has nothing for a slash chord whose bass it lacks, rather than the chord alone', () => {
		expect(libraryFingerings('C7/E')).toEqual([]);
		expect(libraryFingerings('Amadd9/G')).toEqual([]);
	});

	it('has nothing for chords it lacks or text that is not a chord', () => {
		expect(libraryFingerings('Dmadd11')).toEqual([]);
		expect(libraryFingerings('Hm')).toEqual([]);
		expect(libraryFingerings('')).toEqual([]);
	});
});
