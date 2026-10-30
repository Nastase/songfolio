import { describe, expect, it } from 'vitest';
import { readMeta, sameMeta, stripLinks } from '../src/parser/properties';

describe('readMeta', () => {
	it('reads every header property', () => {
		expect(
			readMeta(
				{
					title: 'Oh! Susanna',
					artist: 'Stephen Foster',
					key: 'G',
					capo: 2,
					tuning: 'E A D G B E',
					tempo: 100,
					difficulty: 'beginner',
				},
				'file',
			),
		).toEqual({
			title: 'Oh! Susanna',
			artist: 'Stephen Foster',
			key: 'G',
			capo: 2,
			tuning: 'E A D G B E',
			tempo: 100,
			difficulty: 'beginner',
		});
	});

	it('uses the file name when the title is missing or empty', () => {
		expect(readMeta({ title: '  ' }, 'Foo Fighters - Walk').title).toBe('Foo Fighters - Walk');
		expect(readMeta(undefined, 'Song').title).toBe('Song');
		expect(readMeta(null, 'Song').title).toBe('Song');
	});

	it('leaves missing, empty and wrongly typed values empty', () => {
		expect(readMeta({ artist: null, key: '', tempo: 'fast', difficulty: {} }, 'x')).toMatchObject({
			artist: null,
			key: null,
			tempo: null,
			difficulty: null,
		});
	});

	it('treats capo 0 or empty as no capo', () => {
		expect(readMeta({ capo: 0 }, 'x').capo).toBeNull();
		expect(readMeta({ capo: null }, 'x').capo).toBeNull();
		expect(readMeta({ capo: '3' }, 'x').capo).toBe(3);
	});

	it('reads numbers written as text', () => {
		expect(readMeta({ tempo: ' 65 ' }, 'x').tempo).toBe(65);
	});

	it('shows linked values as their text and joins lists', () => {
		expect(readMeta({ artist: '[[Foo Fighters]]' }, 'x').artist).toBe('Foo Fighters');
		expect(readMeta({ artist: ['[[Simon]]', 'Garfunkel'] }, 'x').artist).toBe('Simon, Garfunkel');
	});
});

describe('stripLinks', () => {
	it('keeps the text of wiki and markdown links', () => {
		expect(stripLinks('[[Note|Alias]]')).toBe('Alias');
		expect(stripLinks('[[Note#Heading]]')).toBe('Note');
		expect(stripLinks('by [site](https://example.com)')).toBe('by site');
	});
});

describe('sameMeta', () => {
	it('compares every field', () => {
		const meta = readMeta({ key: 'C' }, 'x');
		expect(sameMeta(meta, readMeta({ key: 'C' }, 'x'))).toBe(true);
		expect(sameMeta(meta, readMeta({ key: 'D' }, 'x'))).toBe(false);
	});
});
