import { describe, expect, it } from 'vitest';
import { soundingKey } from '../src/parser/key';

describe('sounding key', () => {
	it('moves the key up by the capo', () => {
		expect(soundingKey('C', 2, 0)).toBe('D');
		expect(soundingKey('G', 5, 0)).toBe('C');
		expect(soundingKey('Am', 3, 0)).toBe('Cm');
	});

	it('moves the key by a whole tuning shift, with or without a capo', () => {
		expect(soundingKey('E', null, -1)).toBe('Eb');
		expect(soundingKey('G', 2, -1)).toBe('Ab');
		expect(soundingKey('D', null, -2)).toBe('C');
	});

	it('is null when the song sounds as written', () => {
		expect(soundingKey('C', null, 0)).toBeNull();
		expect(soundingKey('C', 0, null)).toBeNull();
		expect(soundingKey('C', 1, -1)).toBeNull();
	});

	it('ignores a tuning whose strings do not all move the same (drop D)', () => {
		expect(soundingKey('D', null, null)).toBeNull();
		expect(soundingKey('D', 2, null)).toBe('E');
	});

	it('spells major keys with the fewest sharps or flats', () => {
		const keys = [...Array(12).keys()].map((capo) => soundingKey('C', capo, 0) ?? 'C');
		expect(keys).toEqual(['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']);
	});

	it('spells minor keys with the fewest sharps or flats', () => {
		const keys = [...Array(12).keys()].map((capo) => soundingKey('Am', capo, 0) ?? 'Am');
		expect(keys).toEqual(['Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m']);
	});

	it('keeps the way the key is written after the tonic', () => {
		expect(soundingKey('A minor', 2, 0)).toBe('B minor');
		expect(soundingKey('C major', 1, 0)).toBe('Db major');
		expect(soundingKey('Emin', 1, 0)).toBe('Fmin');
		expect(soundingKey('CM', 1, 0)).toBe('DbM');
		expect(soundingKey('A Minor', 1, 0)).toBe('Bb Minor');
		expect(soundingKey('C MAJOR', 1, 0)).toBe('Db MAJOR');
	});

	it('reads sharps, flats and a lower-case tonic', () => {
		expect(soundingKey('F#', 1, 0)).toBe('G');
		expect(soundingKey('Bb', 1, 0)).toBe('B');
		expect(soundingKey('B♭', 1, 0)).toBe('B');
		expect(soundingKey('c', 2, 0)).toBe('D');
	});

	it('is null for a key it cannot read', () => {
		for (const key of [null, '', 'C dorian', 'Cmajor7', 'H', 'Am7', 'C/G']) {
			expect(soundingKey(key, 2, 0)).toBeNull();
		}
	});

	it('is null for a capo that is not a whole number of frets', () => {
		expect(soundingKey('C', 2.5, 0)).toBeNull();
		expect(soundingKey('C', -1, 0)).toBeNull();
	});
});
