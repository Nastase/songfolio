import { describe, expect, it } from 'vitest';
import { checkTuning, parseTuning } from '../src/parser/tuning';

const notesOf = (text: string | null) => {
	const tuning = parseTuning(text);
	return tuning.valid ? tuning.notes : null;
};

describe('tuning property', () => {
	it('is standard when empty', () => {
		for (const text of [null, '', '  ']) {
			expect(parseTuning(text)).toEqual({
				valid: true,
				notes: ['E', 'A', 'D', 'G', 'B', 'E'],
				offsets: [0, 0, 0, 0, 0, 0],
				shift: 0,
			});
		}
	});

	it('reads notes written together, or separated by spaces, commas or dashes', () => {
		const standard = ['E', 'A', 'D', 'G', 'B', 'E'];
		for (const text of ['EADGBE', 'E A D G B E', 'E,A,D,G,B,E', 'E-A-D-G-B-E', 'EADGBe', 'eadgbe']) {
			expect(notesOf(text)).toEqual(standard);
		}
	});

	it('reads sharps and flats, written together or apart', () => {
		const halfDown = ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'];
		expect(notesOf('Eb Ab Db Gb Bb Eb')).toEqual(halfDown);
		expect(notesOf('EbAbDbGbBbEb')).toEqual(halfDown);
		expect(notesOf('D# G# C# F# A# D#')).toEqual(['D#', 'G#', 'C#', 'F#', 'A#', 'D#']);
		expect(notesOf('E♭ A♭ D♭ G♭ B♭ E♭')).toEqual(halfDown);
	});

	it('reads b as the note B when a flat would not give 6 notes', () => {
		expect(notesOf('DADGbe')).toEqual(['D', 'A', 'D', 'G', 'B', 'E']);
	});

	it('ignores octaves', () => {
		expect(notesOf('E2 A2 D3 G3 B3 E4')).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
	});

	it('reads common tuning names in any case', () => {
		expect(notesOf('Standard')).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
		expect(notesOf('drop D')).toEqual(['D', 'A', 'D', 'G', 'B', 'E']);
		expect(notesOf('Half-step down')).toEqual(['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb']);
		expect(notesOf('Open G')).toEqual(['D', 'G', 'D', 'G', 'B', 'D']);
	});

	it('gives the offset of each string from standard', () => {
		expect(parseTuning('D A D G B E')).toMatchObject({ offsets: [-2, 0, 0, 0, 0, 0], shift: null });
		expect(parseTuning('DADGAD')).toMatchObject({ offsets: [-2, 0, 0, 0, -2, -2], shift: null });
		expect(parseTuning('F A D G B E')).toMatchObject({ offsets: [1, 0, 0, 0, 0, 0] });
		expect(parseTuning('Bb A D G B E')).toMatchObject({ offsets: [-6, 0, 0, 0, 0, 0] });
	});

	it('gives a shift when every string moves by the same amount', () => {
		expect(parseTuning('Eb Ab Db Gb Bb Eb')).toMatchObject({ shift: -1 });
		expect(parseTuning('D G C F A D')).toMatchObject({ shift: -2 });
		expect(parseTuning('F Bb Eb Ab C F')).toMatchObject({ shift: 1 });
	});

	it('rejects anything that is not 6 notes', () => {
		for (const text of ['EADGB', 'E A D G B E A', 'EbAbDbGbBb', 'E A D G B H', 'banjo', 'E A D G B Ex']) {
			expect(parseTuning(text)).toEqual({ valid: false, text });
		}
	});

	it('reports an invalid tuning without a line number', () => {
		expect(checkTuning(parseTuning('EADGB'))).toEqual([
			{
				line: null,
				message:
					'Tuning EADGB is not 6 notes from low to high, such as E A D G B E; chord diagrams and tabs use standard tuning.',
			},
		]);
		expect(checkTuning(parseTuning('DADGBE'))).toEqual([]);
	});
});
