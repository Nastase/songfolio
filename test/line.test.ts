import { describe, expect, it } from 'vitest';
import { advanceColumn, expandTabs, scanLine, type LineToken } from '../src/parser/line';

/** The line's tokens without spaces, as `kind:text`. */
function shown(text: string): string[] {
	return scanLine(text)
		.tokens.filter((token) => token.kind !== 'space')
		.map((token) => `${token.kind}:${token.text}`);
}

const isChordLine = (text: string) => scanLine(text).chordLine;

function token(text: string, index: number): LineToken | undefined {
	return scanLine(text).tokens.filter((t) => t.kind !== 'space')[index];
}

describe('scanLine: tokens', () => {
	it('splits a lyric line into words and spaces, with offsets and columns', () => {
		expect(scanLine('Hello  world').tokens).toEqual([
			{ kind: 'word', text: 'Hello', start: 0, end: 5, col: 0 },
			{ kind: 'space', text: '  ', start: 5, end: 7, col: 5 },
			{ kind: 'word', text: 'world', start: 7, end: 12, col: 7 },
		]);
	});

	it('reads the chords of a chord line with their symbols', () => {
		expect(shown('Am  G/B   Cmaj7')).toEqual(['chord:Am', 'chord:G/B', 'chord:Cmaj7']);
		expect(token('Am  G/B', 1)).toMatchObject({
			kind: 'chord',
			chord: { text: 'G/B', tonic: 'G', bass: 'B' },
			start: 4,
			end: 7,
			symbol: { start: 4, end: 7 },
		});
	});

	it('expands tabs to stops of 4 in columns', () => {
		const cols = scanLine('G\tC\t\tD').tokens.filter((t) => t.kind === 'chord').map((t) => t.col);
		expect(cols).toEqual([0, 4, 12]);
		expect(advanceColumn(2, '\tx')).toBe(5);
		expect(expandTabs('\t', 1)).toBe('   ');
		expect(expandTabs('  ', 1)).toBe('  ');
	});

	it('keeps other words of a chord line as words', () => {
		expect(shown('G  C  D  x2 (riff)')).toEqual(['chord:G', 'chord:C', 'chord:D', 'word:x2', 'word:(riff)']);
	});

	it('handles empty and blank lines', () => {
		expect(scanLine('')).toEqual({ tokens: [], chordLine: false });
		expect(scanLine('   ')).toMatchObject({ chordLine: false, tokens: [{ kind: 'space' }] });
	});
});

describe('scanLine: rhythm marks', () => {
	it('reads bar lines, strums and repeats on a chord line', () => {
		expect(shown('| G / / / | Am  % |')).toEqual([
			'rhythm:|', 'chord:G', 'rhythm:/', 'rhythm:/', 'rhythm:/', 'rhythm:|', 'chord:Am', 'rhythm:%', 'rhythm:|',
		]);
		expect(isChordLine('| / /  |    %    |')).toBe(true);
	});

	it('splits a bar line before a chord and strum slashes after it', () => {
		expect(shown('|G  Am|  G/')).toEqual(['rhythm:|', 'chord:G', 'word:Am|', 'chord:G', 'rhythm:/']);
		expect(token('G// C', 0)).toMatchObject({ kind: 'chord', chord: { text: 'G' }, symbol: { start: 0, end: 1 } });
	});

	it('reads no-chord marks written as a whole word', () => {
		expect(shown('G  N.C.  NC  N. C.  n.c.')).toEqual([
			'chord:G', 'rhythm:N.C.', 'rhythm:NC', 'rhythm:N. C.', 'rhythm:n.c.',
		]);
		expect(shown('NCAA')).toEqual(['word:NCAA']);
	});

	it('leaves marks in lyrics as words', () => {
		expect(shown('look at this / that thing')).toEqual([
			'word:look', 'word:at', 'word:this', 'word:/', 'word:that', 'word:thing',
		]);
		expect(shown('either/or')).toEqual(['word:either/or']);
	});
});

describe('scanLine: chord line or lyric line', () => {
	it('is a chord line when chords are more than half of the words', () => {
		expect(isChordLine('A')).toBe(true);
		expect(isChordLine('A bla')).toBe(false);
		expect(isChordLine('A bla C')).toBe(true);
		expect(isChordLine('Am G F (a comment breaks it) C')).toBe(false);
	});

	it('does not take lyrics with capitalised chord-like words for chords', () => {
		expect(isChordLine('A man and a dog')).toBe(false);
		expect(isChordLine('E a Ema e a Ana')).toBe(false);
		expect(isChordLine('Do you go')).toBe(false);
	});

	it('follows %c and %t at the end of the line, and hides them', () => {
		expect(scanLine('Am G F (a comment breaks it) C %c').chordLine).toBe(true);
		expect(scanLine('A C E %t').chordLine).toBe(false);
		expect(shown('A bla %c')).toEqual(['chord:A', 'word:bla', 'marker:%c']);
		expect(scanLine('%c')).toEqual({ tokens: [{ kind: 'marker', text: '%c', start: 0, end: 2, col: 0 }], chordLine: true });
		expect(shown('words %c here')).toEqual(['word:words', 'word:%', 'word:c', 'word:here']);
	});

	it('only counts a marker that ends the line after a space', () => {
		expect(scanLine('Am%c').chordLine).toBe(false);
		expect(scanLine('G C %c  ').tokens.some((t) => t.kind === 'marker')).toBe(true);
	});
});

describe('scanLine: inline chords', () => {
	it('reads chords in brackets inside lyrics, with their text', () => {
		const { tokens, chordLine } = scanLine('[Am]Some [F# spec.]lyrics');
		expect(chordLine).toBe(false);
		expect(tokens.filter((t) => t.kind === 'inline')).toEqual([
			expect.objectContaining({ text: '[Am]', start: 0, end: 4, symbol: { start: 1, end: 3 }, aux: '', chord: { text: 'Am', tonic: 'A', bass: '' } }),
			expect.objectContaining({ text: '[F# spec.]', start: 9, symbol: { start: 10, end: 12 }, aux: ' spec.' }),
		]);
	});

	it('reads an inline chord inside a word', () => {
		const { tokens, chordLine } = scanLine('A[D]men');
		expect(chordLine).toBe(false);
		expect(tokens.map((t) => `${t.kind}:${t.text}`)).toEqual(['word:A', 'inline:[D]', 'word:men']);
	});

	it('keeps bracketed text that is not a chord as text, without counting it', () => {
		expect(shown('[x2]  G  C')).toEqual(['word:[x2]', 'chord:G', 'chord:C']);
		expect(scanLine('[Verse 1]').chordLine).toBe(false);
		expect(shown('[Verse 1')).toEqual(['word:[Verse', 'word:1']);
	});

	it('does not let inline text run over a closing bracket', () => {
		expect(shown('[Am]lyrics]')).toEqual(['inline:[Am]', 'word:lyrics]']);
	});
});

describe('scanLine: chords with a shape', () => {
	it('reads the chord, drops the shape and makes a chord line', () => {
		const { tokens, chordLine } = scanLine('C[x32010]  Dm6[4|x2x132]');
		expect(chordLine).toBe(true);
		expect(tokens.filter((t) => t.kind === 'chord')).toEqual([
			expect.objectContaining({ text: 'C[x32010]', col: 0, symbol: { start: 0, end: 1 }, chord: { text: 'C', tonic: 'C', bass: '' } }),
			expect.objectContaining({ text: 'Dm6[4|x2x132]', col: 11, symbol: { start: 11, end: 14 } }),
		]);
	});

	it('reads shapes with spaced or comma-separated frets, barre marks and note names', () => {
		for (const line of ['Db[8 10 x 12 12 12] la', 'Bb[9,8,8,8,9,8] la', 'Bø[2|_12x231_] la', 'Cmaj7[E G B D] la']) {
			expect(isChordLine(line), line).toBe(true);
		}
	});

	it('needs a chord before the shape, and nothing but frets or notes in it', () => {
		expect(shown('Test[abc] lyrics')).toEqual(['word:Test', 'word:[abc]', 'word:lyrics']);
		expect(isChordLine('C*4[3|x32010] la la')).toBe(false);
		expect(isChordLine('E[x02210]nd of it')).toBe(false);
	});
});
