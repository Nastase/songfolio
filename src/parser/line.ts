/**
 * Reads one line of a song: its words, chords, rhythm marks and inline chords, and whether it is
 * a chord line or a lyric line.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 *
 * The line is read once, from left to right. Every token keeps where it is written (offsets in
 * the line, for transpose) and the column where it starts with tabs expanded (for alignment).
 */

import type { ChordSymbol, SourceRange } from '../model/song';
import { readChord } from './chord';

/** Columns per tab character, as Obsidian shows code blocks. */
export const TAB_SIZE = 4;

/** At the end of a line, forces a chord line. */
export const CHORD_LINE_MARKER = '%c';
/** At the end of a line, forces a lyric line. */
export const TEXT_LINE_MARKER = '%t';

interface Span {
	/** As written. */
	text: string;
	/** Offset of the first character in the line. */
	start: number;
	/** Offset after the last character. */
	end: number;
	/** Column of the first character, tabs expanded. */
	col: number;
}

export type LineToken =
	| (Span & { kind: 'space' | 'word' | 'rhythm' | 'marker' })
	/**
	 * A chord on a chord line. Also a chord written with a shape, `C[x32010]`: the shape is
	 * not used, and `symbol` covers the chord alone.
	 */
	| (Span & { kind: 'chord'; chord: ChordSymbol; symbol: SourceRange })
	/** A chord in brackets, `[Am]` or `[Am text]`: `aux` is the text after the symbol. */
	| (Span & { kind: 'inline'; chord: ChordSymbol; symbol: SourceRange; aux: string });

export interface ScannedLine {
	tokens: LineToken[];
	/**
	 * True when chords and rhythm marks are more than half of the line's words, or when the
	 * line ends with `%c` or holds a chord with a shape. `%t` makes it a lyric line.
	 */
	chordLine: boolean;
}

const SPACE = /\s+/y;
/** `%c` or `%t`, with only spaces after it. */
const MARKER = /%[ct](?=\s*$)/y;
/** Bar lines, strums and repeats. */
const RHYTHM = /[|/%]+/y;
/** No chord: `N.C.`, `NC`, `N. C.`, as a whole word. */
const NO_CHORD = /[Nn]\.?\s?[Cc]\.?(?=\s|$)/y;
/** A bracketed group: a symbol with no spaces, then any other text, e.g. `[Am]`, `[F# spec.]`. */
const BRACKET = /\[([^\s[\]]+)([^[\]]*)\]/y;
/** Characters up to a space or an opening bracket. */
const WORD_PART = /[^\s[]+/y;
/** What a shape after a chord holds: frets, fingers, barre marks or note names. */
const SHAPE = /^[0-9A-Gb#x_,| ]+$/;
const LETTER = /\p{L}/u;
/** Strum slashes after a chord: `G/`, `G//`. */
const TRAILING_SLASHES = /\/+$/;

/** Matches a sticky pattern at `pos`. */
function matchAt(pattern: RegExp, text: string, pos: number): RegExpExecArray | null {
	pattern.lastIndex = pos;
	return pattern.exec(text);
}

/** Advances a column over text, expanding tabs to the next stop. */
export function advanceColumn(col: number, text: string): number {
	for (const ch of text) col = ch === '\t' ? (Math.floor(col / TAB_SIZE) + 1) * TAB_SIZE : col + 1;
	return col;
}

/** Text with its tabs replaced by the spaces they show, when it starts at `col`. */
export function expandTabs(text: string, col: number): string {
	return text.includes('\t') ? ' '.repeat(advanceColumn(col, text) - col) : text;
}

function symbolOf(text: string): ChordSymbol | null {
	const chord = readChord(text);
	return chord && { text, tonic: chord.root, bass: chord.bass };
}

/** Where a word ends: at a space, or at a bracketed group that follows it. */
function wordEnd(text: string, pos: number): number {
	let end = pos;
	for (;;) {
		end += matchAt(WORD_PART, text, end)?.[0].length ?? 0;
		if (text[end] !== '[' || matchAt(BRACKET, text, end)) return end;
		// A bracket that does not close is part of the word.
		end++;
	}
}

/** Reads one line. */
export function scanLine(text: string): ScannedLine {
	const tokens: LineToken[] = [];
	/** Chords and rhythm marks that stay so only on a chord line, by index in `tokens`. */
	const candidates: number[] = [];
	let chords = 0;
	let marks = 0;
	let words = 0;
	let marker: string | null = null;
	let shaped = false;
	let pos = 0;
	let col = 0;

	const span = (end: number): Span => {
		const value = text.slice(pos, end);
		const result = { text: value, start: pos, end, col };
		col = advanceColumn(col, value);
		pos = end;
		return result;
	};
	const candidate = (token: LineToken) => {
		candidates.push(tokens.length);
		tokens.push(token);
	};

	while (pos < text.length) {
		let match = matchAt(SPACE, text, pos);
		if (match) {
			tokens.push({ kind: 'space', ...span(pos + match[0].length) });
			continue;
		}
		if (matchAt(MARKER, text, pos)) {
			marker = text.slice(pos, pos + 2);
			tokens.push({ kind: 'marker', ...span(pos + 2) });
			continue;
		}
		match = matchAt(BRACKET, text, pos);
		if (match) {
			const symbol = match[1] ?? '';
			const chord = symbolOf(symbol);
			const start = pos + 1;
			const at = span(pos + match[0].length);
			// Bracketed text that is not a chord is not counted as a word.
			if (chord) {
				tokens.push({ kind: 'inline', ...at, chord, symbol: { start, end: start + symbol.length }, aux: match[2] ?? '' });
			} else {
				tokens.push({ kind: 'word', ...at });
			}
			continue;
		}
		match = matchAt(RHYTHM, text, pos) ?? matchAt(NO_CHORD, text, pos);
		if (match) {
			marks++;
			candidate({ kind: 'rhythm', ...span(pos + match[0].length) });
			continue;
		}

		const end = wordEnd(text, pos);
		const word = text.slice(pos, end);
		words++;

		// A chord with its shape: `C[x32010]`, `Dm6[4|x2x132]`, `Cmaj7[E G B D]`.
		const shape = text[end] === '[' ? matchAt(BRACKET, text, end) : null;
		if (shape) {
			const content = (shape[1] ?? '') + (shape[2] ?? '');
			const after = text[end + shape[0].length] ?? '';
			const chord = SHAPE.test(content) && !readChord(content) && !LETTER.test(after) ? symbolOf(word) : null;
			if (chord) {
				const symbol = { start: pos, end };
				tokens.push({ kind: 'chord', ...span(end + shape[0].length), chord, symbol });
				shaped = true;
				words--;
				continue;
			}
		}

		// A chord followed by strum slashes, as in `G/`: two tokens.
		const trailing = TRAILING_SLASHES.exec(word)?.[0] ?? '';
		const head = trailing && trailing.length < word.length ? symbolOf(word.slice(0, -trailing.length)) : null;
		if (head) {
			chords++;
			marks++;
			const symbol = { start: pos, end: end - trailing.length };
			candidate({ kind: 'chord', ...span(symbol.end), chord: head, symbol });
			candidate({ kind: 'rhythm', ...span(end) });
			continue;
		}
		const chord = symbolOf(word);
		if (chord) {
			chords++;
			const symbol = { start: pos, end };
			candidate({ kind: 'chord', ...span(end), chord, symbol });
			continue;
		}
		tokens.push({ kind: 'word', ...span(end) });
	}

	const chordLine =
		marker === CHORD_LINE_MARKER || shaped || (marker !== TEXT_LINE_MARKER && 2 * (chords + marks) > words);
	if (!chordLine) {
		for (const index of candidates) {
			const token = tokens[index];
			if (token) tokens[index] = { kind: 'word', text: token.text, start: token.start, end: token.end, col: token.col };
		}
	}
	return { tokens, chordLine };
}
