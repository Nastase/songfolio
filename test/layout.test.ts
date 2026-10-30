import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSong } from '../src/parser';
import { layoutLine, rowsOf, type LineLayout } from '../src/render/lyrics/layout';

const fixture = (name: string) =>
	readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

/** Draws a layout as monospace text: each cell is as wide as its wider row. */
function draw(layout: LineLayout): { chords: string; lyrics: string } {
	let chords = '';
	let lyrics = '';
	for (const cell of layout.groups.flat()) {
		const width = Math.max(cell.chord.length, cell.lyric.length);
		chords += cell.chord.padEnd(width);
		lyrics += cell.lyric.padEnd(width);
	}
	return { chords: chords.trimEnd(), lyrics: lyrics.trimEnd() };
}

/** The text of each group, to see where a line may wrap. */
const groupLyrics = (layout: LineLayout) =>
	layout.groups.map((group) => group.map((cell) => cell.lyric).join(''));

const layoutOf = (source: string) => {
	const rows = rowsOf(parseSong(source).sections.flatMap((s) => s.items));
	const row = rows[0];
	if (row?.kind !== 'layout') throw new Error(`expected a layout row, got ${row?.kind}`);
	return row.layout;
};

describe('layoutLine', () => {
	it('draws a chord and lyric pair exactly as written in monospace', () => {
		const chords = 'Asus2                    E';
		const lyrics = '     A morning made of paper';
		expect(draw(layoutOf(`${chords}\n${lyrics}`))).toEqual({ chords, lyrics });
	});

	it('wraps only at word starts', () => {
		const layout = layoutOf('G              C\nSing it to the hills');
		expect(groupLyrics(layout)).toEqual(['Sing ', 'it ', 'to ', 'the ', 'hills']);
	});

	it('keeps a chord that starts mid-word with its word', () => {
		const layout = layoutOf('   D   G\nsunshine day');
		expect(groupLyrics(layout)).toEqual(['sunshine ', 'day']);
		expect(layout.groups[0]?.map((cell) => [cell.chord, cell.lyric])).toEqual([
			['', 'sun'],
			['D ', 'shin'],
			['G ', 'e '],
		]);
	});

	it('does not cut at a word that starts under a chord', () => {
		const layout = layoutOf('Asus2  D\n     A morning');
		expect(groupLyrics(layout)).toEqual(['     A ', 'morning']);
	});

	it('gives chords past the end of the lyric their own groups', () => {
		const layout = layoutOf('          Dm  Dm/E Dm/F Dm A\nWhere do I  start?');
		expect(draw(layout)).toEqual({
			chords: '          Dm  Dm/E Dm/F Dm A',
			lyrics: 'Where do I  start?',
		});
		const tail = layout.groups.slice(-3).map((g) => g.map((c) => c.chord.trim()).join('|'));
		expect(tail).toEqual(['Dm/F', 'Dm', 'A']);
	});

	it('keeps the spacing of a chord-only line and lets it wrap between tokens', () => {
		const line = '    | G      D |  Am   x4';
		const layout = layoutOf(line);
		expect(layout.hasLyrics).toBe(false);
		expect(draw(layout).chords).toBe(line);
		expect(layout.groups.map((g) => g.map((c) => c.chord).join(''))).toEqual([
			'    ', '| ', 'G      ', 'D ', '|  ', 'Am   ', 'x4',
		]);
		expect(layout.groups.flat().map((c) => c.kind)).toEqual([
			null, 'rhythm', 'chord', 'chord', 'rhythm', 'chord', 'word',
		]);
	});

	it('widens a cell when an inline chord is wider than its text', () => {
		const layout = layoutOf('[Am]a [G]day');
		expect(layout.groups.map((g) => g.map((c) => [c.chord, c.lyric]))).toEqual([
			[['Am ', 'a ']],
			[['G ', 'day']],
		]);
	});

	it('handles an empty token list', () => {
		expect(layoutLine([], 'words here').groups.map((g) => g.length)).toEqual([1, 1]);
	});
});

describe('rowsOf', () => {
	it('pairs a chord line only with the lyric line right below it', () => {
		const rows = rowsOf(parseSong('G\nla\nC\n\nlo\nD').sections.flatMap((s) => s.items));
		expect(rows.map((r) => (r.kind === 'layout' ? `layout:${r.layout.hasLyrics}` : r.kind))).toEqual([
			'layout:true', 'layout:false', 'blank', 'text', 'layout:false',
		]);
	});

	it('draws every pair of the fixtures exactly as written', () => {
		for (const name of ['real-syntax.songsheet', 'syntax-example.songsheet', 'chord-sheets-legacy.songsheet']) {
			const source = fixture(name).split('\n');
			const rows = rowsOf(parseSong(fixture(name)).sections.flatMap((s) => s.items));
			for (const row of rows) {
				if (row.kind !== 'layout') continue;
				const drawn = draw(row.layout);
				const chordSource = (source[row.line - 1] ?? '').replace(/\s*%c\s*$/, '').trimEnd();
				expect(drawn.chords, `${name}:${row.line}`).toBe(chordSource);
				if (row.layout.hasLyrics) {
					const lyricSource = (source[row.line] ?? '').replace(/\s*%t\s*$/, '').trimEnd();
					expect(drawn.lyrics, `${name}:${row.line + 1}`).toBe(lyricSource);
				}
			}
		}
	});
});
