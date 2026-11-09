import { describe, expect, it } from 'vitest';
import type { ChordShape } from '../src/model/song';
import { parseSong } from '../src/parser';
import { songChords } from '../src/parser/chords';
import { parseTuning } from '../src/parser/tuning';
import {
	chordDiagrams,
	fromPosition,
	inferBarres,
	libraryVoicings,
	retune,
	type Voicing,
} from '../src/render/header/voicings';

const standard = parseTuning(null);
const dropD = parseTuning('D A D G B E');

/** Frets as written in a `%shape` line, for short assertions. */
const text = (voicing: Voicing | null | undefined) =>
	voicing?.frets.map((fret) => (fret === null ? 'x' : String(fret))).join(' ');

const diagramsOf = (source: string, tuning = standard) => {
	const song = parseSong(source);
	return chordDiagrams(songChords(song), song.shapes, tuning);
};

describe('library fingerings', () => {
	it('makes frets absolute from the base fret and finds barre strings', () => {
		const voicing = fromPosition({
			frets: [-1, 1, 3, 3, 3, 1],
			fingers: [0, 1, 2, 3, 4, 1],
			baseFret: 3,
			barres: [1],
			midi: [],
		});
		expect(voicing).toEqual({
			frets: [null, 3, 5, 5, 5, 3],
			fingers: [0, 1, 2, 3, 4, 1],
			barres: [{ fret: 3, from: 1, to: 5 }],
		});
	});

	it('lists every fingering of a chord, the open one first', () => {
		const voicings = libraryVoicings('C', standard);
		expect(voicings.length).toBeGreaterThan(1);
		expect(text(voicings[0])).toBe('x 3 2 0 1 0');
		expect(voicings[0]?.fingers).toEqual([0, 3, 2, 0, 1, 0]);
	});

	it('finds chords by alias, enharmonic tonic and bass', () => {
		expect(text(libraryVoicings('Am', standard)[0])).toBe('x 0 2 2 1 0');
		expect(libraryVoicings('Db', standard).length).toBeGreaterThan(0);
		expect(text(libraryVoicings('G/B', standard)[0])).toBe('x 2 0 0 0 3');
	});

	it('has none for a chord missing from the library', () => {
		expect(libraryVoicings('C/D#', standard)).toEqual([]);
		expect(libraryVoicings('Hm', standard)).toEqual([]);
	});
});

describe('other tunings', () => {
	it('keeps the shapes when every string moves the same', () => {
		expect(libraryVoicings('G', parseTuning('Eb Ab Db Gb Bb Eb'))).toEqual(libraryVoicings('G', standard));
	});

	it('uses standard shapes when the tuning cannot be read', () => {
		expect(libraryVoicings('G', parseTuning('banjo'))).toEqual(libraryVoicings('G', standard));
	});

	it('moves each string by its offset: drop D plays the low string 2 frets higher', () => {
		expect(text(libraryVoicings('E', dropD)[0])).toBe('2 2 2 1 0 0');
		expect(text(libraryVoicings('G', dropD)[0])).toBe('5 2 0 0 0 3');
	});

	it('keeps a fingering whose moved strings are muted, finger numbers and all', () => {
		const [d] = libraryVoicings('D', dropD);
		expect(text(d)).toBe('x x 0 2 3 2');
		expect(d?.fingers).not.toBeNull();
	});

	it('drops finger numbers from a moved fingering', () => {
		expect(libraryVoicings('E', dropD)[0]?.fingers).toBeNull();
	});

	it('leaves out fingerings that become unplayable', () => {
		const moved = libraryVoicings('G', dropD);
		expect(moved.length).toBeLessThanOrEqual(libraryVoicings('G', standard).length);
		for (const voicing of moved) {
			const fretted = voicing.frets.filter((fret): fret is number => fret !== null && fret > 0);
			expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThan(4);
		}
	});

	it('rejects a fret below 0 or a span over 4 frets', () => {
		const open: Voicing = { frets: [0, 2, 2, 1, 0, 0], fingers: null, barres: [] };
		expect(retune(open, [1, 0, 0, 0, 0, 0])).toBeNull();
		const wide: Voicing = { frets: [3, 2, 0, 0, 0, 3], fingers: null, barres: [] };
		expect(retune(wide, [-3, 0, 0, 0, 0, 0])).toBeNull();
		expect(text(retune(wide, [-2, 0, 0, 0, 0, 0]))).toBe('5 2 0 0 0 3');
	});
});

describe('barres for hand-written shapes', () => {
	it('finds a barre held under higher frets', () => {
		expect(inferBarres([1, 3, 3, 2, 1, 1])).toEqual([{ fret: 1, from: 0, to: 5 }]);
		expect(inferBarres([null, 3, 5, 5, 5, 3])).toEqual([{ fret: 3, from: 1, to: 5 }]);
		expect(inferBarres([8, 10, 10, 9, 8, 8])).toEqual([{ fret: 8, from: 0, to: 5 }]);
	});

	it('finds none for single fingers, open or muted strings in between, or a flat row', () => {
		expect(inferBarres([null, null, 0, 2, 3, 1])).toEqual([]);
		expect(inferBarres([null, 0, 2, 2, 2, 0])).toEqual([]);
		expect(inferBarres([1, 3, 0, 2, 1, 1])).toEqual([]);
		expect(inferBarres([1, 3, null, 2, 1, 1])).toEqual([]);
	});
});

describe('chord diagrams', () => {
	it('shows the first library fingering of a chord without a %shape', () => {
		const [c] = diagramsOf('C\nla\n');
		expect(c).toMatchObject({ shape: null, index: 0 });
		expect(text(c?.shown)).toBe('x 3 2 0 1 0');
	});

	it('shows a %shape that is a library fingering with its fingers and barre', () => {
		const [c] = diagramsOf('%shape C x 3 5 5 5 3\nC\nla\n');
		expect(c?.index).toBeGreaterThan(0);
		expect(c?.shown?.fingers).not.toBeNull();
		expect(c?.shown?.barres).toEqual([{ fret: 3, from: 1, to: 5 }]);
		expect(c?.shape?.line).toBe(1);
	});

	it('shows any other %shape as written, without finger numbers', () => {
		const [c] = diagramsOf('%shape C x 3 2 0 1 3\nC\nla\n');
		expect(c).toMatchObject({ index: null, shown: { frets: [null, 3, 2, 0, 1, 3], fingers: null } });
		expect(c?.voicings.length).toBeGreaterThan(1);
	});

	it('draws a %shape as written in any tuning', () => {
		const [g] = diagramsOf('%shape G 3 2 0 0 0 3\nG\nla\n', dropD);
		expect(text(g?.shown)).toBe('3 2 0 0 0 3');
	});

	it('has nothing to show for a chord missing from the library, unless it has a %shape', () => {
		const [missing, shaped] = diagramsOf('%shape Cadd2/D# x 6 5 5 3 3\nC/D# Cadd2/D#\nla\n');
		expect(missing).toMatchObject({ voicings: [], shown: null, index: null, shape: null });
		expect(text(shaped?.shown)).toBe('x 6 5 5 3 3');
	});

	it('follows the order of the chords and ignores shapes for chords not in the song', () => {
		const shapes: ChordShape[] = [{ chord: 'F', frets: [1, 3, 3, 2, 1, 1], line: 1 }];
		const diagrams = chordDiagrams(songChords(parseSong('G C\nla\n')), shapes, standard);
		expect(diagrams.map((diagram) => diagram.chord.text)).toEqual(['G', 'C']);
		expect(diagrams.every((diagram) => diagram.shape === null)).toBe(true);
	});
});
