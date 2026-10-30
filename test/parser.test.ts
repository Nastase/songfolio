import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ChordLine, LyricLine, SongItem } from '../src/model/song';
import { parseSong } from '../src/parser';

const fixture = (name: string) =>
	readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

/** All items of all sections, in order. */
const items = (source: string): SongItem[] =>
	parseSong(source).sections.flatMap((section) => section.items);

const kinds = (source: string) => items(source).map((item) => item.kind);

const chordTexts = (item: SongItem | undefined) =>
	(item as ChordLine).tokens.map((token) => token.text);

describe('sections', () => {
	it('starts a section at [Name] alone on a line', () => {
		const song = parseSong('[Verse 1]\nla\n[Chorus x2] \nlo');
		expect(song.sections.map((s) => [s.name, s.note, s.line])).toEqual([
			['Verse 1', null, 1],
			['Chorus x2', null, 3],
		]);
	});

	it('keeps lines before the first header in an untitled section', () => {
		const song = parseSong('G C\nIntro words\n\n[Verse]\nla');
		expect(song.sections[0]?.name).toBeNull();
		expect(song.sections[0]?.items.map((i) => i.kind)).toEqual(['chords', 'lyrics', 'blank']);
	});

	it('drops the untitled section when it only holds blank lines and directives', () => {
		const song = parseSong('%pattern A 8: d.d. dudu\n\n[Verse]\nla');
		expect(song.sections.map((s) => s.name)).toEqual(['Verse']);
	});

	it('reads [Name] note as a section with a note', () => {
		const song = parseSong('[Intro] (Piano Riff)\nG C');
		expect(song.sections[0]).toMatchObject({ name: 'Intro', note: '(Piano Riff)' });
	});

	it('does not take an inline chord or a chord line for a header with a note', () => {
		expect(parseSong('[Am] la la').sections[0]?.name).toBeNull();
		expect(kinds('[Am] la la')).toEqual(['lyrics']);
		expect(kinds('[Intro] G C D')).toEqual(['chords']);
	});
});

describe('chord and lyric lines', () => {
	it('detects chord lines as Chord Sheets does', () => {
		expect(kinds('G              C\nPlain lyric line here')).toEqual(['chords', 'lyrics']);
	});

	it('keeps chord columns and drops whitespace tokens', () => {
		const [line] = items('  Am    G/B  x4');
		expect((line as ChordLine).tokens).toEqual([
			expect.objectContaining({ kind: 'chord', text: 'Am', col: 2 }),
			expect.objectContaining({ kind: 'chord', text: 'G/B', col: 8 }),
			{ kind: 'word', text: 'x4', col: 13 },
		]);
	});

	it('reads bar lines as rhythm marks', () => {
		const [line] = items('| G  D  | Am   | % |');
		expect((line as ChordLine).tokens.map((t) => t.kind)).toEqual([
			'rhythm', 'chord', 'chord', 'rhythm', 'chord', 'rhythm', 'rhythm', 'rhythm',
		]);
	});

	it('expands tabs to stops of 4', () => {
		const [line] = items('G\tC\t\tD');
		expect((line as ChordLine).tokens.map((t) => t.col)).toEqual([0, 4, 12]);
		const [lyric] = items('one\ttwo');
		expect((lyric as LyricLine).text).toBe('one two');
	});

	it('forces a chord line with %c and a lyric line with %t, and hides the marker', () => {
		const forced = items('A bla %c\nA bla C %t');
		expect(forced[0]?.kind).toBe('chords');
		expect(chordTexts(forced[0])).toEqual(['A', 'bla']);
		expect(forced[1]).toMatchObject({ kind: 'lyrics', text: 'A bla C' });
	});

	it('keeps leading spaces and trims trailing ones on lyric lines', () => {
		expect(items('     A million miles away   ')[0]).toMatchObject({
			text: '     A million miles away',
		});
	});

	it('treats whitespace-only lines as blank lines', () => {
		expect(kinds('la\n \n\t\nlo')).toEqual(['lyrics', 'blank', 'blank', 'lyrics']);
	});

	it('ignores the newline that ends the block', () => {
		expect(kinds('la\n')).toEqual(['lyrics']);
	});

	it('normalises Windows line endings', () => {
		expect(kinds('C G\r\nlyric\r\n')).toEqual(['chords', 'lyrics']);
	});
});

describe('inline chords', () => {
	it('takes inline chords out of the lyric with their columns', () => {
		const [line] = items('[Am]Some [Dm aux]lyrics');
		expect(line).toMatchObject({ kind: 'lyrics', text: 'Some lyrics' });
		expect((line as LyricLine).inlineChords.map((c) => [c.text, c.col])).toEqual([
			['Am', 0],
			['Dm aux', 5],
		]);
	});

	it('shows a chord with a Chord Sheets shape by its name only', () => {
		const [line] = items('C[x32010]  Dm6[4|x2x132]');
		expect(line?.kind).toBe('chords');
		expect(chordTexts(line)).toEqual(['C', 'Dm6']);
		expect((line as ChordLine).tokens[1]?.col).toBe(11);
	});
});

describe('directives', () => {
	it('collects %pattern, %strum and %shape with their line numbers', () => {
		const song = parseSong(fixture('syntax-example.songsheet'));
		expect(song.directives.map((d) => [d.name, d.line])).toEqual([
			['pattern', 1],
			['pattern', 2],
			['shape', 3],
			['strum', 6],
			['strum', 10],
		]);
		expect(song.directives[0]).toEqual({ name: 'pattern', args: 'A 8: d.d. dudu', line: 1 });
		expect(song.errors).toEqual([]);
	});

	it('attaches %strum to its section', () => {
		const song = parseSong('[Verse]\n%strum A\nG');
		expect(song.sections[0]?.strum).toEqual({ name: 'strum', args: 'A', line: 2 });
	});

	it('reports an unknown directive on its line and hides it', () => {
		const song = parseSong('[Verse]\n%foo bar\nla');
		expect(song.errors).toEqual([{ line: 2, message: 'Unknown directive %foo.' }]);
		expect(song.sections[0]?.items.map((i) => i.kind)).toEqual(['lyrics']);
	});

	it('does not take Chord Sheets rhythm marks or markers for directives', () => {
		const song = parseSong('| G | % |\n%%\n%c\n%hey there %t');
		expect(song.errors).toEqual([]);
		// A bare %c is an empty forced chord line, as in Chord Sheets.
		expect(song.sections[0]?.items.map((i) => i.kind)).toEqual([
			'chords', 'chords', 'chords', 'lyrics',
		]);
	});

	it('reports %endtab without %tab', () => {
		expect(parseSong('%endtab').errors).toEqual([
			{ line: 1, message: '%endtab has no matching %tab.' },
		]);
	});
});

describe('tab and ascii blocks', () => {
	it('keeps the raw content of %tab and %ascii', () => {
		const song = parseSong(fixture('syntax-example.songsheet'));
		const blocks = song.sections.flatMap((s) => s.items).filter((i) => i.kind === 'tab' || i.kind === 'ascii');
		expect(blocks).toEqual([
			{ kind: 'tab', line: 17, source: ':8 8.3{h} 10.3{v} 10.3 8.3 6.3', closed: true },
			{
				kind: 'ascii', line: 22, implicit: false, closed: true,
				lines: ['e|-----------------|', 'B|--9/11-11--------|'],
			},
		]);
	});

	it('keeps headers and % lines inside a block as content', () => {
		const [block] = items('%ascii\n[Verse]\n%foo\n%endtab\n%endascii');
		expect(block).toMatchObject({ kind: 'ascii', lines: ['[Verse]', '%foo', '%endtab'] });
	});

	it('reports an unclosed block and runs it to the end of the song', () => {
		const song = parseSong('[Solo]\n%tab\n:8 0.5\n[Outro]');
		expect(song.errors).toEqual([{ line: 2, message: '%tab is not closed; add %endtab.' }]);
		expect(song.sections).toHaveLength(1);
		expect(song.sections[0]?.items[0]).toEqual({
			kind: 'tab', line: 2, source: ':8 0.5\n[Outro]', closed: false,
		});
	});

	it('groups consecutive raw tab lines into one implicit ascii block', () => {
		const song = parseSong('e|-3---3--|\nB|--0---0-| x2\n\nG C');
		expect(song.sections[0]?.items).toEqual([
			{
				kind: 'ascii', line: 1, implicit: true, closed: true,
				lines: ['e|-3---3--|', 'B|--0---0-| x2'],
			},
			{ kind: 'blank', line: 3 },
			expect.objectContaining({ kind: 'chords' }),
		]);
	});

	it('does not take bar-line chord lines for tab lines', () => {
		expect(kinds('| G  D  | Am |\nA G D')).toEqual(['chords', 'chords']);
	});
});

describe('Chord Sheets songs', () => {
	it('parses the syntax of the real songs', () => {
		const song = parseSong(fixture('real-syntax.songsheet'));
		expect(song.errors).toEqual([]);
		expect(
			song.sections.map((s) => [s.name, s.note, s.items.map((i) => i.kind).join(' ')]),
		).toEqual([
			['Intro', '(Piano Riff)', 'ascii blank chords blank'],
			['Verse 1', null, 'chords lyrics chords lyrics chords lyrics blank'],
			['Chorus x2', null, 'chords lyrics chords lyrics blank'],
			['Outro', null, 'chords chords'],
		]);
		const outro = song.sections[3]?.items ?? [];
		expect(outro.flatMap((line) => chordTexts(line))).toEqual([
			'Cadd9', 'D', 'A#sus2', 'F', 'G', 'A#sus2', 'Bm7', 'F#m', 'Fmaj7', 'Em/G', 'Dmadd11',
		]);
	});

	it('parses the legacy fixture without errors', () => {
		const song = parseSong(fixture('chord-sheets-legacy.songsheet'));
		expect(song.errors).toEqual([]);
		expect(song.sections.map((s) => s.name)).toEqual(['Verse']);
		expect(song.sections[0]?.items.map((i) => i.kind)).toEqual([
			'chords', 'lyrics', 'chords', 'lyrics', 'chords', 'lyrics',
		]);
	});
});
