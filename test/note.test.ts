import { describe, expect, it } from 'vitest';
import { noteChroma, sharpNoteName } from '../src/parser/note';

describe('noteChroma', () => {
	it('gives the pitch class of a natural note, in either case', () => {
		expect(['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(noteChroma)).toEqual([0, 2, 4, 5, 7, 9, 11]);
		expect(noteChroma('e')).toBe(4);
	});

	it('reads sharps and flats, written as letters or symbols', () => {
		expect(noteChroma('F#')).toBe(6);
		expect(noteChroma('F♯')).toBe(6);
		expect(noteChroma('Bb')).toBe(10);
		expect(noteChroma('B♭')).toBe(10);
		expect(noteChroma('bb')).toBe(10);
	});

	it('wraps around C', () => {
		expect(noteChroma('Cb')).toBe(11);
		expect(noteChroma('B#')).toBe(0);
		expect(noteChroma('C##')).toBe(2);
	});

	it('returns null for anything that is not a note name', () => {
		for (const name of ['', 'H', 'E2', 'Cm', 'C x', '#']) expect(noteChroma(name)).toBeNull();
	});
});

describe('sharpNoteName', () => {
	it('names MIDI notes with sharps and octaves', () => {
		expect([40, 45, 50, 55, 59, 64].map(sharpNoteName)).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
		expect(sharpNoteName(38)).toBe('D2');
		expect(sharpNoteName(61)).toBe('C#4');
		expect(sharpNoteName(60)).toBe('C4');
	});
});
