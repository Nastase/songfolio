import { describe, expect, it } from 'vitest';
import type { ChordSymbol } from '../src/model/song';
import { setProperty, readProperty } from '../src/commands/frontmatter';
import { blockAt, findSongBlocks, renderedBlock } from '../src/commands/songBlocks';
import { moveCapo, rewriteChordLine, switchSpelling, transposeSong } from '../src/commands/transpose/edit';
import { keySpelling, transposeKey } from '../src/parser/key';
import { keyOfChord, respellChord, transposeChord } from '../src/parser/transpose';
import { parseChordSymbol } from '../src/parser/chordsheets/chordsUtils';

function symbol(text: string): ChordSymbol {
	const chord = parseChordSymbol(text);
	return { text, tonic: chord.tonic ?? '', bass: chord.bass ?? '' };
}

/** A note with properties and one songsheet block. */
function note(properties: string[], body: string[]): string[] {
	const head = properties.length > 0 ? ['---', ...properties, '---'] : [];
	return [...head, '```songsheet', ...body, '```'];
}

function blocks(lines: string[]) {
	return findSongBlocks(lines, 'songsheet');
}

/** The block's lines after transposing the whole note. */
function transposed(properties: string[], body: string[], semitones: number) {
	const lines = note(properties, body);
	const edit = transposeSong(lines, blocks(lines), semitones);
	const [block] = blocks(edit.lines);
	return { ...edit, body: block ? edit.lines.slice(block.start + 1, block.end) : [] };
}

describe('transposing a chord symbol', () => {
	it('moves the root and keeps the rest as written', () => {
		expect(transposeChord(symbol('Am7'), 2, 'sharps')).toBe('Bm7');
		expect(transposeChord(symbol('Cmaj7(#11)'), 1, 'flats')).toBe('Dbmaj7(#11)');
		expect(transposeChord(symbol('Bm7b5'), 1, 'sharps')).toBe('Cm7b5');
	});

	it('moves the bass of a slash chord, not a slash inside the chord type', () => {
		expect(transposeChord(symbol('G/B'), 2, 'sharps')).toBe('A/C#');
		expect(transposeChord(symbol('C6/9'), 2, 'sharps')).toBe('D6/9');
		expect(transposeChord(symbol('C6/9/E'), -2, 'flats')).toBe('Bb6/9/D');
		expect(transposeChord(symbol('E7(4/9)'), 1, 'sharps')).toBe('F7(4/9)');
	});

	it('keeps naturals natural', () => {
		expect(transposeChord(symbol('D#'), 1, 'sharps')).toBe('E');
		expect(transposeChord(symbol('E'), 1, 'flats')).toBe('F');
		expect(transposeChord(symbol('Gb'), -2, 'flats')).toBe('E');
		expect(respellChord(symbol('Cb'), 'flats')).toBe('B');
	});

	it('respells at the same pitch', () => {
		expect(respellChord(symbol('F#m'), 'flats')).toBe('Gbm');
		expect(respellChord(symbol('Bb/D'), 'sharps')).toBe('A#/D');
	});

	it('reads the key a chord stands in for', () => {
		expect(keyOfChord(symbol('Am7'))).toBe('Am');
		expect(keyOfChord(symbol('Cmaj7'))).toBe('C');
		expect(keyOfChord(symbol('Bbm'))).toBe('A#m');
	});
});

describe('transposing a key', () => {
	it('spells the new key with the fewest sharps or flats, keeping the suffix', () => {
		expect(transposeKey('G', 3)).toBe('Bb');
		expect(transposeKey('A minor', 2)).toBe('B minor');
		expect(transposeKey('Em', -1)).toBe('D#m');
		expect(transposeKey('C dorian', 1)).toBeNull();
	});

	it('tells sharp keys from flat keys by their signature', () => {
		expect(keySpelling('G')).toBe('sharps');
		expect(keySpelling('F')).toBe('flats');
		expect(keySpelling('Dm')).toBe('flats');
		expect(keySpelling('Em')).toBe('sharps');
		expect(keySpelling('C')).toBeNull();
		expect(keySpelling('Am')).toBeNull();
	});
});

describe('chord lines keep their columns', () => {
	const up = (steps: number) => (chord: ChordSymbol) => transposeChord(chord, steps, 'sharps');

	it('pads a shorter chord and lets a longer one take the spaces after it', () => {
		expect(rewriteChordLine('C#m    G#   A', up(1))).toBe('Dm     A    A#');
		expect(rewriteChordLine('C      G    A', up(1))).toBe('C#     G#   A#');
	});

	it('moves a token right only when not even one space is left', () => {
		expect(rewriteChordLine('E F G', up(1))).toBe('F F# G#');
		expect(rewriteChordLine('E F    G', up(1))).toBe('F F#   G#');
	});

	it('keeps rhythm marks, words and the %c marker at their columns', () => {
		expect(rewriteChordLine('| C  / / | G  x2  %c', up(2))).toBe('| D  / / | A  x2  %c');
		expect(rewriteChordLine('[Intro] G C D', up(2))).toBe('[Intro] A D E');
	});

	it('leaves a line whose chords do not change as written, trailing spaces included', () => {
		expect(rewriteChordLine('  N.C.   ', up(1))).toBe('  N.C.   ');
	});

	it('writes a changed line with tabs as spaces', () => {
		expect(rewriteChordLine('C\tG', up(2))).toBe('D   A');
	});
});

describe('transposing a song', () => {
	it('moves chord lines, inline chords and the key, and spells like the new key', () => {
		const result = transposed(['key: G', 'capo: 0'], ['[Verse]', 'G       D/F#', 'Some words here', '[Em]more [C]words'], 3);
		expect(result.key).toBe('Bb');
		expect(result.lines).toContain('key: Bb');
		expect(result.body).toEqual(['[Verse]', 'Bb      F/A', 'Some words here', '[Gm]more [Eb]words']);
	});

	it('in C, keeps the way most chords are written', () => {
		expect(transposed(['key: B'], ['B Bb Eb'], 1).body).toEqual(['C B  E']);
		expect(transposed(['key: Am'], ['Am', 'la'], -1).body).toEqual(['G#m', 'la']);
	});

	it('without a readable key, lets the first chord stand in for it', () => {
		const result = transposed([], ['F  C  Bb'], 1);
		expect(result.key).toBeNull();
		expect(result.body).toEqual(['F# C# B']);
		expect(transposed(['key: unknown'], ['C  F  G'], 1).body).toEqual(['Db Gb Ab']);
	});

	it('moves a closed %shape and removes one with open strings', () => {
		const body = ['%shape Am 5 7 7 5 5 5', '%shape C x32010', '', 'Am C', 'la'];
		expect(transposed(['key: Am'], body, 2).body).toEqual(['%shape Bm 7 9 9 7 7 7', '', 'Bm D', 'la']);
	});

	it('removes a closed %shape that would leave the frets', () => {
		const body = ['%shape F 1 3 3 2 1 1', 'F'];
		expect(transposed(['key: F'], body, -1).body).toEqual(['E']);
	});

	it('never edits tab, ASCII tab, headers or other directives', () => {
		const body = [
			'%pattern A 8: d.du .udu',
			'[A]',
			'%strum A',
			'A  D',
			'la la',
			'%tab',
			':8 0.5{ch "A"} 2.4',
			'%endtab',
			'%ascii',
			'e|--0--|',
			'%endascii',
			'e|--2--3--|',
		];
		const result = transposed(['key: A'], body, 2);
		expect(result.hasTab).toBe(true);
		expect(result.body).toEqual(['%pattern A 8: d.du .udu', '[A]', '%strum A', 'B  E', ...body.slice(4)]);
	});

	it('leaves the rest of the note alone, and only edits the blocks given', () => {
		const lines = [...note(['key: C'], ['C']), 'text C', '```songsheet', 'C', '```'];
		const [first] = blocks(lines);
		const edit = transposeSong(lines, first ? [first] : [], 2);
		expect(edit.lines).toEqual(['---', 'key: D', '---', '```songsheet', 'D', '```', 'text C', '```songsheet', 'C', '```']);
	});

	it('comes back to the source after 12 semitones when no token had to move', () => {
		const body = ['[Verse]', 'Bb     Gm      Eb   F', 'Some  lyrics are here', '[Cm7]Words [F/A]here'];
		let lines = note(['key: Bb'], body);
		for (let step = 0; step < 12; step++) lines = transposeSong(lines, blocks(lines), 1).lines;
		expect(lines).toEqual(note(['key: Bb'], body));
	});

	it('keeps tokens written without a space between them together', () => {
		const up = (chord: ChordSymbol) => transposeChord(chord, 1, 'sharps');
		expect(rewriteChordLine('[Intro]G  D', up)).toBe('[Intro]G# D#');
	});

	it('keeps a closed %shape while it stays on the neck, up to fret 24', () => {
		let lines = note(['key: Bb'], ['%shape Bb 6 8 8 7 6 6', 'Bb']);
		for (let step = 0; step < 12; step++) lines = transposeSong(lines, blocks(lines), 1).lines;
		expect(lines).toContain('%shape Bb 18 20 20 19 18 18');
		for (let step = 0; step < 5; step++) lines = transposeSong(lines, blocks(lines), 1).lines;
		expect(lines.some((line) => line.startsWith('%shape'))).toBe(false);
	});
});

describe('switching sharps and flats', () => {
	it('respells chords, %shape names and the key; frets unchanged', () => {
		const lines = note(['key: F#m'], ['%shape F#m 2 4 4 2 2 2', 'F#m  C#7  D', '[A]la']);
		const edit = switchSpelling(lines, blocks(lines));
		expect(edit.spelling).toBe('flats');
		expect(edit.lines).toEqual(note(['key: Gbm'], ['%shape Gbm 2 4 4 2 2 2', 'Gbm  Db7  D', '[A]la']));
	});

	it('goes to sharps when most chords are flats', () => {
		const lines = note([], ['Bb Eb F#']);
		const edit = switchSpelling(lines, blocks(lines));
		expect(edit.spelling).toBe('sharps');
		expect(edit.lines).toContain('A# D# F#');
	});
});

describe('moving the capo', () => {
	it('raises the capo and moves the chords down, so the song sounds the same', () => {
		const lines = note(['key: A', 'capo: 0'], ['A  E', 'la']);
		const edit = moveCapo(lines, blocks(lines), 2);
		expect(edit?.capo).toBe(2);
		expect(edit?.lines).toEqual(note(['key: G', 'capo: 2'], ['G  D', 'la']));
	});

	it('adds the capo property when there is none', () => {
		const lines = note(['key: A'], ['A']);
		expect(moveCapo(lines, blocks(lines), 1)?.lines).toEqual(note(['key: Ab', 'capo: 1'], ['Ab']));
	});

	it('refuses to go below 0 or above 12', () => {
		const lines = note(['capo: 0'], ['A']);
		expect(moveCapo(lines, blocks(lines), -1)).toBeNull();
		const high = note(['capo: 12'], ['A']);
		expect(moveCapo(high, blocks(high), 1)).toBeNull();
	});
});

describe('finding songsheet blocks', () => {
	it('finds backtick and tilde fences, in any case, and skips other blocks', () => {
		const lines = ['```js', 'x', '```', '~~~~SongSheet', '```', 'C', '~~~~', '```songsheet', 'G'];
		expect(findSongBlocks(lines, 'songsheet')).toEqual([
			{ start: 3, end: 6 },
			{ start: 7, end: 9 },
		]);
	});

	it('finds the block holding a line', () => {
		const found = findSongBlocks(['a', '```songsheet', 'C', '```', 'b'], 'songsheet');
		expect(blockAt(found, 2)).toEqual({ start: 1, end: 3 });
		expect(blockAt(found, 4)).toBeNull();
	});

	it('finds the block a song was rendered from, only while its text is unchanged', () => {
		const lines = ['a', '```songsheet', 'C', 'Hello', '```', '```songsheet', 'G', '```'];
		expect(renderedBlock(lines, 'songsheet', 1, 'C\nHello\n')).toEqual({ start: 1, end: 4 });
		expect(renderedBlock(lines, 'songsheet', 5, 'G')).toEqual({ start: 5, end: 7 });
		expect(renderedBlock(lines, 'songsheet', 1, 'D\nHello')).toBeNull();
		expect(renderedBlock(lines, 'songsheet', 2, 'C\nHello')).toBeNull();
	});
});

describe('properties in the note text', () => {
	const props = ['---', 'title: Song', 'key: "C#m"', 'capo:', 'tags:', '  - folk', '---', 'text'];

	it('reads scalar values without quotes', () => {
		expect(readProperty(props, 'key')).toBe('C#m');
		expect(readProperty(props, 'capo')).toBeNull();
		expect(readProperty(props, 'tags')).toBeNull();
		expect(readProperty(['key: C'], 'key')).toBeNull();
	});

	it('keeps quotes, fills an empty value and leaves lists alone', () => {
		expect(setProperty(props, 'key', 'Dm', false)[2]).toBe('key: "Dm"');
		expect(setProperty(props, 'capo', 2, false)[3]).toBe('capo: 2');
		expect(setProperty(props, 'tags', 'x', false)).toEqual(props);
	});

	it('adds a missing property only when asked, creating the properties if needed', () => {
		expect(setProperty(props, 'tempo', 90, false)).toEqual(props);
		expect(setProperty(props, 'tempo', 90, true)[6]).toBe('tempo: 90');
		expect(setProperty(['text'], 'capo', 1, true)).toEqual(['---', 'capo: 1', '---', 'text']);
	});
});
