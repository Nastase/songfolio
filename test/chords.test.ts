import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSong } from '../src/parser';
import { songChords } from '../src/parser/chords';

const fixture = (name: string) =>
	readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const chordsOf = (source: string) => songChords(parseSong(source)).map((chord) => chord.text);

describe('song chords', () => {
	it('lists each chord once, in order of first appearance across sections', () => {
		expect(chordsOf('[Verse]\nC   G   Am\nla\n[Chorus]\nF   C   G\nla\n')).toEqual(['C', 'G', 'Am', 'F']);
	});

	it('includes chords before the first section and inline chords', () => {
		expect(chordsOf('D A\n[Verse]\n[Em]Some [Bm7]words [D]here\n')).toEqual(['D', 'A', 'Em', 'Bm7']);
	});

	it('keeps chords that are written differently apart', () => {
		expect(chordsOf('G G/B C# Db\n')).toEqual(['G', 'G/B', 'C#', 'Db']);
	});

	it('leaves out bar lines, N.C., repeats and other words', () => {
		expect(chordsOf('| G  G/B | C  G |  x2\nG  C/G  G  N.C.\n')).toEqual(['G', 'G/B', 'C', 'C/G']);
	});

	it('shows a Chord Sheets inline shape by its chord only', () => {
		expect(chordsOf('C[x32010]  Dm6[4|x2x132]  C\n')).toEqual(['C', 'Dm6']);
	});

	it('leaves out what is inside %tab and %ascii', () => {
		expect(chordsOf('%tab\n:8 0.5 2.3\n%endtab\n%ascii\nE A D\n%endascii\nC\n')).toEqual(['C']);
	});

	it('is empty for a song without chords', () => {
		expect(chordsOf('[Verse]\nJust words here\n')).toEqual([]);
	});

	it('reads the chords of a real Chord Sheets song', () => {
		const chords = songChords(parseSong(fixture('real-syntax.songsheet'))).map((chord) => chord.text);
		expect(chords.length).toBeGreaterThan(0);
		expect(new Set(chords).size).toBe(chords.length);
	});
});
