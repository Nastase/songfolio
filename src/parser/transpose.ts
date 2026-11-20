/**
 * Moving chord symbols by semitones and writing their sharps or flats (R13).
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 *
 * Only the root and the bass of a symbol change; the rest stays as written (`m7b5`, `6/9`,
 * `7(4/9)`…).
 */

import type { ChordSymbol } from '../model/song';
import { mod12, readKey, type Spelling } from './key';
import { noteChroma } from './note';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A note name at the start of a symbol: a letter and its accidentals. */
const NOTE = /^[A-G](?:[#b♯♭])*/;

/** The name of a pitch class (0 for C). Naturals stay natural: never E#, B#, Cb or Fb. */
export function noteName(chroma: number, spelling: Spelling): string {
	return (spelling === 'flats' ? FLAT_NAMES : SHARP_NAMES)[mod12(chroma)] ?? '';
}

/** Where the root and the bass are written in a chord symbol. */
interface NoteSpans {
	root: { start: number; end: number; chroma: number };
	bass: { start: number; end: number; chroma: number } | null;
}

function noteSpans(chord: ChordSymbol): NoteSpans | null {
	const { text } = chord;
	const root = NOTE.exec(text)?.[0];
	const rootChroma = root === undefined ? null : noteChroma(root);
	if (root === undefined || rootChroma === null) return null;
	const spans: NoteSpans = { root: { start: 0, end: root.length, chroma: rootChroma }, bass: null };

	if (chord.bass) {
		const slash = text.lastIndexOf('/');
		const bass = slash > 0 ? NOTE.exec(text.slice(slash + 1))?.[0] : undefined;
		const bassChroma = bass === undefined ? null : noteChroma(bass);
		if (bass !== undefined && bassChroma !== null && slash + 1 + bass.length === text.length) {
			spans.bass = { start: slash + 1, end: text.length, chroma: bassChroma };
		}
	}
	return spans;
}

/**
 * The chord symbol moved by `semitones`, its root and bass written with `spelling`.
 * A symbol whose root cannot be read is returned as it is.
 */
export function transposeChord(chord: ChordSymbol, semitones: number, spelling: Spelling): string {
	const spans = noteSpans(chord);
	if (!spans) return chord.text;
	const { text } = chord;
	const { root, bass } = spans;
	let result = noteName(root.chroma + semitones, spelling) + text.slice(root.end, bass?.start ?? text.length);
	if (bass) result += noteName(bass.chroma + semitones, spelling);
	return result;
}

/** The chord symbol with its root and bass written with `spelling`, at the same pitch. */
export function respellChord(chord: ChordSymbol, spelling: Spelling): string {
	return transposeChord(chord, 0, spelling);
}

/** How many sharp and flat notes a chord's root and bass are written with. */
export function accidentals(chord: ChordSymbol): { sharps: number; flats: number } {
	const spans = noteSpans(chord);
	const count = { sharps: 0, flats: 0 };
	if (!spans) return count;
	for (const span of [spans.root, spans.bass]) {
		if (!span) continue;
		const name = chord.text.slice(span.start, span.end);
		if (/[#♯]/.test(name)) count.sharps++;
		else if (/[b♭]/.test(name)) count.flats++;
	}
	return count;
}

/**
 * The key a chord stands in for, when the song has no readable `key`: its root, minor when the
 * chord is (`Am`, `F#m7`, but not `Cmaj7`). Null when the root cannot be read.
 */
export function keyOfChord(chord: ChordSymbol): string | null {
	const spans = noteSpans(chord);
	if (!spans) return null;
	const rest = chord.text.slice(spans.root.end);
	const minor = /^(m(?!aj)|min|-)/.test(rest);
	return noteName(spans.root.chroma, 'sharps') + (minor ? 'm' : '');
}

/** The key written with `spelling` at the same pitch, keeping what follows the tonic. */
export function respellKey(key: string, spelling: Spelling): string | null {
	const read = readKey(key);
	if (!read) return null;
	return noteName(read.chroma, spelling) + read.suffix;
}
