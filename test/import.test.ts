import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findTabSystems, isTabLine } from '../src/commands/import/asciiTab';
import { importSong } from '../src/commands/import/convert';
import { parseSong } from '../src/parser';

const fixtureDir = new URL('./fixtures/ug/', import.meta.url);
const privateDir = new URL('./fixtures/private/ug/', import.meta.url);
const read = (dir: URL, name: string) => readFileSync(new URL(name, dir), 'utf8');

/**
 * The words of a text, ignoring spacing, brackets, label colons and the directives the importer
 * adds: comparing them shows nothing was lost, invented or reordered.
 */
function words(text: string): string[] {
	return text
		.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
		.replace(/\[\/?(ch|tab)\]/g, '')
		.split(/\s+/)
		.map((word) => word.replace(/^\[|\]$/g, '').replace(/:$/, ''))
		.filter((word) => word !== '' && !['%ascii', '%endascii', '%t'].includes(word));
}

/** Every word of the output appears, in order, in the input from where the song starts. */
function expectWordsKept(input: string, body: string) {
	const out = words(body);
	const all = words(input);
	const start = all.indexOf(out[0] ?? '');
	expect(start).toBeGreaterThanOrEqual(0);
	expect(out).toEqual(all.slice(start));
}

describe('synthetic pastes', () => {
	it('reads an Ultimate Guitar paste', () => {
		const input = read(fixtureDir, 'ultimate-guitar.txt');
		const song = importSong(input);
		expect(song).toMatchObject({
			title: 'Clementine',
			artist: 'Traditional',
			key: 'C',
			capo: 1,
			tuning: 'E A D G B E',
			tempo: null,
			difficulty: null,
		});
		expect(song.body).toBe(read(fixtureDir, 'ultimate-guitar.songsheet'));
		expect(parseSong(song.body).errors).toEqual([]);
		expectWordsKept(input, song.body);
	});

	it('reads a Cifra Club paste', () => {
		const input = read(fixtureDir, 'cifra-club.txt');
		const song = importSong(input);
		expect(song).toMatchObject({ title: 'Scarborough Fair', artist: 'Traditional', key: 'Am', capo: null });
		expect(song.body).toBe(read(fixtureDir, 'cifra-club.songsheet'));
		expect(parseSong(song.body).errors).toEqual([]);
		expectWordsKept(input, song.body);
	});
});

describe('facts', () => {
	const facts = (line: string) => {
		const { body: _body, ...meta } = importSong(`Song Chords by Band\n${line}\n[Verse]\nla`);
		return meta;
	};

	it('reads facts run together on one line', () => {
		expect(facts('Tuning: E A D G B EKey: F#mCapo: 2nd fret')).toMatchObject({
			tuning: 'E A D G B E',
			key: 'F#m',
			capo: 2,
		});
	});

	it('writes a named tuning as notes', () => {
		expect(facts('Tuning: Half Step Down').tuning).toBe('Eb Ab Db Gb Bb Eb');
		expect(facts('Afinação: Meio tom abaixo').tuning).toBe('Eb Ab Db Gb Bb Eb');
		expect(facts('Tuning: D A D G B E').tuning).toBe('D A D G B E');
	});

	it('keeps a tuning it cannot read as written', () => {
		expect(facts('Tuning: Open C6').tuning).toBe('Open C6');
	});

	it('reads the capo in English and Portuguese', () => {
		expect(facts('Capo: no capo').capo).toBe(0);
		expect(facts('Capotraste na 3ª casa').capo).toBe(3);
	});

	it('reads the key from Tom, the difficulty and the tempo', () => {
		expect(facts('Tom: Am (forma dos acordes)').key).toBe('Am');
		expect(facts('Difficulty: novice').difficulty).toBe('beginner');
		expect(facts('BPM: 96').tempo).toBe(96);
	});

	it('drops the version from the title', () => {
		expect(importSong('Song (ver 2) Tabs by Band\n[Verse]\nla')).toMatchObject({ title: 'Song', artist: 'Band' });
	});

	it('has no title when the paste starts with the song', () => {
		const song = importSong('[Verse]\nAm\nla');
		expect(song).toMatchObject({ title: null, artist: null });
		expect(song.body).toBe('[Verse]\nAm\nla\n');
	});

	it('keeps an unknown line before the song', () => {
		expect(importSong('Song Chords by Band\nA note from the writer\n[Verse]\nla').body).toBe(
			'A note from the writer\n[Verse]\nla\n',
		);
	});
});

describe('song lines', () => {
	it('removes Ultimate Guitar markup', () => {
		expect(importSong('[Verse]\n[ch]Am[/ch]   [ch]C[/ch]\nla').body).toBe('[Verse]\nAm   C\nla\n');
	});

	it('keeps chords over lyrics aligned when splitting a header from its chords', () => {
		expect(importSong('[Verse] Am      C\n        lyrics here').body).toBe('[Verse]\n        Am      C\n        lyrics here\n');
	});

	it('keeps an inline chord line and a header with a note', () => {
		expect(importSong('[Am] la la\n[Intro] (piano)').body).toBe('[Am] la la\n[Intro] (piano)\n');
	});

	it('turns a known label alone on a line into a section, not other lines ending in a colon', () => {
		expect(importSong('Verse 2:\nla\nHe said:\nlo').body).toBe('[Verse 2]\nla\nHe said:\nlo\n');
	});

	it('keeps a lyric line starting with % as text', () => {
		const song = importSong('[Verse]\n%here we go\n%100 sure');
		expect(song.body).toBe('[Verse]\n%here we go %t\n%100 sure\n');
		expect(parseSong(song.body).errors).toEqual([]);
	});

	it('expands tabs and drops trailing spaces', () => {
		expect(importSong('[Verse]\nAm\tC   \nla').body).toBe('[Verse]\nAm  C\nla\n');
	});
});

describe('ASCII tab', () => {
	it('reads string lines with and without a space before the bar', () => {
		expect(isTabLine('e|--3--|')).toBe(true);
		expect(isTabLine('E |-1-1-')).toBe(true);
		expect(isTabLine('E:---0---')).toBe(true);
		expect(isTabLine('|----3----|')).toBe(true);
		expect(isTabLine('Am --- C')).toBe(false);
		expect(isTabLine('Am  C  G')).toBe(false);
		expect(isTabLine('A: hello')).toBe(false);
	});

	it('gives a label between two systems to the lower one', () => {
		const lines = ['E|---|', 'B|---|', 'Part 2', 'E|---|', 'B|---|'];
		expect(findTabSystems(lines).map((system) => system.box)).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 5 },
		]);
	});

	it('takes at most two lines above and one below', () => {
		const lines = ['one', 'two', 'three', 'E|---|', 'B|---|', 'P.M', 'after'];
		expect(findTabSystems(lines)[0]?.box).toEqual({ start: 1, end: 6 });
	});

	it('needs two lines, or dashes, to be a system', () => {
		expect(findTabSystems(['D|2x'])).toEqual([]);
		expect(findTabSystems(['e|---3---|'])).toHaveLength(1);
	});
});

/** Real pastes are copyrighted: they stay in a gitignored folder, and these tests skip without it. */
describe.skipIf(!existsSync(privateDir))('private pastes', () => {
	const names = existsSync(privateDir)
		? readdirSync(privateDir).filter((name) => name.endsWith('.txt'))
		: [];
	const expected = existsSync(new URL('expected.json', privateDir))
		? (JSON.parse(read(privateDir, 'expected.json')) as Record<string, Record<string, unknown>>)
		: {};

	it.each(names)('%s imports without errors, losing nothing', async (name) => {
		const input = read(privateDir, name);
		const song = importSong(input);
		expect(parseSong(song.body).errors).toEqual([]);
		expectWordsKept(input, song.body);
		const meta = expected[name.replace(/\.txt$/, '')];
		if (meta) expect(song).toMatchObject(meta);
		await expect(song.body).toMatchFileSnapshot(
			`./fixtures/private/ug/__snapshots__/${name.replace(/\.txt$/, '.songsheet')}`,
		);
	});
});
