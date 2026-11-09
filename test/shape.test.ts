import { describe, expect, it } from 'vitest';
import { parseSong } from '../src/parser';
import { formatFrets, parseShape } from '../src/parser/shape';

const fretsOf = (args: string) => parseShape(args, 1).shape?.frets;
const errorsOf = (args: string) => parseShape(args, 7).errors;

describe('%shape', () => {
	it('reads frets separated by spaces, low E to high E', () => {
		expect(parseShape('C 8 10 10 9 8 8', 3)).toEqual({
			shape: { chord: 'C', frets: [8, 10, 10, 9, 8, 8], line: 3 },
			chord: 'C',
			errors: [],
		});
	});

	it('reads x and X as muted strings and 0 as open', () => {
		expect(fretsOf('C x 3 2 0 1 0')).toEqual([null, 3, 2, 0, 1, 0]);
		expect(fretsOf('D X X 0 2 3 2')).toEqual([null, null, 0, 2, 3, 2]);
	});

	it('reads a single word one character per string', () => {
		expect(fretsOf('Fm 133111')).toEqual([1, 3, 3, 1, 1, 1]);
		expect(fretsOf('Dm xx0231')).toEqual([null, null, 0, 2, 3, 1]);
	});

	it('keeps the chord symbol as written', () => {
		expect(parseShape('F#m7b5/E 0 x 4 5 5 5', 1).shape?.chord).toBe('F#m7b5/E');
	});

	it('ignores extra spaces', () => {
		expect(fretsOf('  G   3 2 0 0 0 3  ')).toEqual([3, 2, 0, 0, 0, 3]);
	});

	it('reports a line without frets or chord', () => {
		const usage = 'Write the shape as %shape <chord> <frets>, e.g. %shape C x 3 2 0 1 0.';
		expect(parseShape('', 7)).toEqual({ shape: null, chord: null, errors: [{ line: 7, message: usage }] });
		expect(parseShape('C', 7)).toEqual({ shape: null, chord: 'C', errors: [{ line: 7, message: usage }] });
	});

	it('reports the wrong number of strings', () => {
		expect(errorsOf('Fm 13311')).toEqual([
			{ line: 7, message: 'Shape Fm has 5 strings; give 6, from low E to high E.' },
		]);
		expect(errorsOf('C 8 10 10 9 8 8 8')[0]?.message).toBe(
			'Shape C has 7 strings; give 6, from low E to high E.',
		);
	});

	it('reports characters that are not frets, each once', () => {
		expect(errorsOf('C x3y01y')).toEqual([
			{ line: 7, message: 'Shape C: "y" is not a fret; use 0 to 24, or x for a muted string.' },
		]);
		expect(errorsOf('C 3|x32010')[0]?.message).toBe(
			'Shape C: "|" is not a fret; use 0 to 24, or x for a muted string.',
		);
		expect(errorsOf('C x 3 2 0 1 o')[0]?.message).toContain('"o" is not a fret');
		expect(errorsOf('C x,3,2 0 1 0')[0]?.message).toContain('"x,3,2" is not a fret');
	});

	it('reports a fret above 24', () => {
		expect(errorsOf('C 25 x x x x x')).toEqual([
			{ line: 7, message: 'Shape C: fret 25 is too high; frets go up to 24.' },
		]);
		expect(errorsOf('C 24 x x x x x')).toEqual([]);
	});

	it('reports a shape that mutes every string', () => {
		expect(errorsOf('C xxxxxx')).toEqual([{ line: 7, message: 'Shape C mutes every string.' }]);
	});

	it('writes frets one number per string', () => {
		expect(formatFrets([null, 3, 2, 0, 1, 0])).toBe('x 3 2 0 1 0');
		expect(formatFrets([8, 10, 10, 9, 8, 8])).toBe('8 10 10 9 8 8');
	});
});

describe('%shape in a song', () => {
	it('collects valid shapes in source order, from anywhere in the block', () => {
		const song = parseSong('%shape Fm 133111\n[Verse]\nFm\nla\n%shape C x 3 2 0 1 0\n');
		expect(song.errors).toEqual([]);
		expect(song.shapes).toEqual([
			{ chord: 'Fm', frets: [1, 3, 3, 1, 1, 1], line: 1 },
			{ chord: 'C', frets: [null, 3, 2, 0, 1, 0], line: 5 },
		]);
	});

	it('matches chords exactly, so Am and AM are different shapes', () => {
		const song = parseSong('%shape Am x02210\n%shape AM x02220\n');
		expect(song.errors).toEqual([]);
		expect(song.shapes.map((shape) => shape.chord)).toEqual(['Am', 'AM']);
	});

	it('keeps the first shape of a chord and reports a repeat on the later line', () => {
		const song = parseSong('%shape C x32010\n%shape C 8 10 10 9 8 8\n');
		expect(song.shapes).toEqual([{ chord: 'C', frets: [null, 3, 2, 0, 1, 0], line: 1 }]);
		expect(song.errors).toEqual([{ line: 2, message: 'Shape C is already defined on line 1.' }]);
	});

	it('counts a first shape with errors, so a later one is still a repeat', () => {
		const song = parseSong('%shape C x3201\n%shape C x32010\n');
		expect(song.shapes).toEqual([]);
		expect(song.errors.map((error) => error.line)).toEqual([1, 2]);
		expect(song.errors[1]?.message).toBe('Shape C is already defined on line 1.');
	});

	it('leaves the rest of the song as it was when a shape has errors', () => {
		const song = parseSong('%shape C nope\n[Verse]\nC\nla\n');
		expect(song.errors).toHaveLength(1);
		expect(song.sections[0]?.name).toBe('Verse');
		expect(song.sections[0]?.items.map((item) => item.kind)).toEqual(['chords', 'lyrics']);
	});
});
