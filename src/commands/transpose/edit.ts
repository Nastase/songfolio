/**
 * Transposes the chords of a song in the note's text, or switches their sharps and flats (R13).
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 *
 * Only what the parser reads as chords changes: chord lines, inline chords and `%shape` lines.
 * Tab (`%tab`, `%ascii`, raw tab lines), section headers and other directives are never edited.
 */

import { MAX_FRET, type ChordShape, type ChordSymbol, type Song } from '../../model/song';
import { parseSong } from '../../parser';
import { readChord } from '../../parser/chord';
import { scanLine } from '../../parser/line';
import { keySpelling, readKey, transposeKey, type Spelling } from '../../parser/key';
import { formatFrets } from '../../parser/shape';
import { accidentals, keyOfChord, respellChord, respellKey, transposeChord } from '../../parser/transpose';
import { readProperty, setProperty } from '../frontmatter';
import type { SongBlockRange } from '../songBlocks';

/** What happens to each chord symbol. */
type Rewrite = (chord: ChordSymbol) => string;

/** What happens to a `%shape` line: its new text, or null to remove it. */
type ShapeRewrite = (shape: ChordShape, chord: string, line: string) => string | null;

// --- One block -------------------------------------------------------------------------------

/**
 * Rewrites every chord of a block's source. Chord-line tokens keep their columns: see
 * `rewriteChordLine`. The source's line endings are kept.
 */
function rewriteBlock(source: string, song: Song, rewrite: Rewrite, rewriteShape: ShapeRewrite): string {
	const eol = source.includes('\r\n') ? '\r\n' : '\n';
	const lines: (string | null)[] = source.split(/\r?\n/);

	for (const section of song.sections) {
		for (const item of section.items) {
			const index = item.line - 1;
			const text = lines[index];
			if (text == null) continue;
			if (item.kind === 'chords') {
				lines[index] = rewriteChordLine(text, rewrite);
			} else if (item.kind === 'lyrics' && item.inlineChords.length > 0) {
				let result = text;
				// From the end, so earlier ranges stay right.
				for (const inline of [...item.inlineChords].reverse()) {
					const { start, end } = inline.symbol;
					result = result.slice(0, start) + rewrite(inline.chord) + result.slice(end);
				}
				lines[index] = result;
			}
		}
	}

	for (const shape of song.shapes) {
		const index = shape.line - 1;
		const text = lines[index];
		if (text == null) continue;
		const symbol = chordSymbol(shape.chord);
		if (!symbol) continue;
		lines[index] = rewriteShape(shape, rewrite(symbol), text);
	}

	return lines.filter((line): line is string => line !== null).join(eol);
}

/**
 * A chord line with its chords rewritten. Every token keeps its column when it can: a shorter
 * chord is padded with spaces, a longer one takes the spaces after it. A token moves right only
 * when not even one space would be left before it, and later tokens go back to their columns.
 * Lines whose chords do not change are returned as they are.
 */
export function rewriteChordLine(text: string, rewrite: Rewrite): string {
	const { tokens } = scanLine(text);

	let changed = false;
	let spaced = true;
	/** Non-space tokens; `glued` when no space separated it from the one before. */
	const placed: { col: number; text: string; glued: boolean }[] = [];
	for (const token of tokens) {
		if (token.kind === 'space') {
			spaced = true;
			continue;
		}
		const glued = !spaced;
		spaced = false;
		let value = token.text;
		if (token.kind === 'chord' || token.kind === 'inline') {
			const next = rewrite(token.chord);
			if (next !== token.chord.text) {
				changed = true;
				const from = token.symbol.start - token.start;
				value = value.slice(0, from) + next + value.slice(token.symbol.end - token.start);
			}
		}
		placed.push({ col: token.col, text: value, glued });
	}
	if (!changed) return text;

	let result = '';
	for (const token of placed) {
		if (token.glued) {
			result += token.text;
			continue;
		}
		const at = result === '' ? token.col : Math.max(token.col, result.length + 1);
		result = result.padEnd(at) + token.text;
	}
	return result;
}

function chordSymbol(text: string): ChordSymbol | null {
	const chord = readChord(text);
	return chord && { text, tonic: chord.root, bass: chord.bass };
}

/** The chord name of a `%shape` line, at the position it is written. */
const SHAPE_LINE = /^(\s*%shape\s+)(\S+)(.*)$/;

/** A `%shape` line with its chord renamed and the rest kept as written. */
function renameShape(chord: string, line: string): string {
	const match = SHAPE_LINE.exec(line);
	if (!match) return line;
	return `${match[1] ?? ''}${chord}${match[3] ?? ''}`;
}

/**
 * The `%shape` line of a transposed chord. A shape with no open strings moves by the same number
 * of frets, when every fret stays in 1 to 24. Otherwise the line is removed and the library's
 * fingering is used: a moved open shape is rarely the one you would play.
 */
function moveShape(semitones: number): ShapeRewrite {
	return (shape, chord, line) => {
		const fretted = shape.frets.filter((fret): fret is number => fret !== null);
		if (fretted.some((fret) => fret === 0)) return null;
		const moved = shape.frets.map((fret) => (fret === null ? null : fret + semitones));
		if (moved.some((fret) => fret !== null && (fret < 1 || fret > MAX_FRET))) return null;
		const indent = /^\s*/.exec(line)?.[0] ?? '';
		return `${indent}%shape ${chord} ${formatFrets(moved)}`;
	};
}

// --- Spelling --------------------------------------------------------------------------------

/** Every chord symbol a song writes: chord lines, inline chords and `%shape` names. */
function writtenChords(song: Song): ChordSymbol[] {
	const chords: ChordSymbol[] = [];
	for (const section of song.sections) {
		for (const item of section.items) {
			if (item.kind === 'chords') {
				for (const token of item.tokens) if (token.kind === 'chord') chords.push(token.chord);
			} else if (item.kind === 'lyrics') {
				for (const inline of item.inlineChords) chords.push(inline.chord);
			}
		}
	}
	for (const shape of song.shapes) {
		const symbol = chordSymbol(shape.chord);
		if (symbol) chords.push(symbol);
	}
	return chords;
}

/** Sharps or flats, as most of the chords are written now. Ties, and none at all, go to sharps. */
function currentSpelling(songs: readonly Song[]): Spelling {
	let sharps = 0;
	let flats = 0;
	for (const song of songs) {
		for (const chord of writtenChords(song)) {
			const count = accidentals(chord);
			sharps += count.sharps;
			flats += count.flats;
		}
	}
	return flats > sharps ? 'flats' : 'sharps';
}

/** The first chord of the songs, which stands in for the key when there is no readable `key`. */
function firstChord(songs: readonly Song[]): ChordSymbol | null {
	for (const song of songs) {
		const [chord] = writtenChords(song);
		if (chord) return chord;
	}
	return null;
}

/**
 * How chords are spelled after moving by `semitones`: like the new key (sharp keys sharps, flat
 * keys flats). In C or A minor, which have neither, the way most chords are written now.
 */
function spellingAfter(key: string | null, songs: readonly Song[], semitones: number): Spelling {
	const stand = readKey(key) ? key : (() => {
		const chord = firstChord(songs);
		return chord ? keyOfChord(chord) : null;
	})();
	return keySpelling(transposeKey(stand, semitones)) ?? currentSpelling(songs);
}

// --- The note --------------------------------------------------------------------------------

export interface SongEdit {
	/** The note's lines after the edit. */
	lines: string[];
	/** The new `key` property, or null when the note has no readable `key`. */
	key: string | null;
	/** True when a block holds tab (`%tab`, `%ascii` or raw tab lines), which is never transposed. */
	hasTab: boolean;
}

/** Applies a block edit to some blocks of a note, from the last so earlier lines stay put. */
function editBlocks(
	lines: readonly string[],
	blocks: readonly SongBlockRange[],
	edit: (source: string, song: Song) => string,
): string[] {
	const result = [...lines];
	for (const block of [...blocks].sort((a, b) => b.start - a.start)) {
		const body = result.slice(block.start + 1, block.end);
		const source = body.join('\n');
		const edited = edit(source, parseSong(source));
		result.splice(block.start + 1, body.length, ...edited.split('\n'));
	}
	return result;
}

function songsOf(lines: readonly string[], blocks: readonly SongBlockRange[]): Song[] {
	return blocks.map((block) => parseSong(lines.slice(block.start + 1, block.end).join('\n')));
}

function hasTab(songs: readonly Song[]): boolean {
	return songs.some((song) =>
		song.sections.some((section) => section.items.some((item) => item.kind === 'tab' || item.kind === 'ascii')),
	);
}

/**
 * Transposes the chords of `blocks` by `semitones`, and the `key` property with them. The
 * lines are those of the whole note, with LF or CRLF line endings removed.
 */
export function transposeSong(lines: readonly string[], blocks: readonly SongBlockRange[], semitones: number): SongEdit {
	const songs = songsOf(lines, blocks);
	const key = readProperty(lines, 'key');
	const spelling = spellingAfter(key, songs, semitones);
	const rewrite: Rewrite = (chord) => transposeChord(chord, semitones, spelling);
	let result = editBlocks(lines, blocks, (source, song) => rewriteBlock(source, song, rewrite, moveShape(semitones)));

	const newKey = transposeKey(key, semitones);
	if (newKey !== null) result = setProperty(result, 'key', newKey, false);
	return { lines: result, key: newKey, hasTab: hasTab(songs) };
}

/**
 * Writes every chord of `blocks`, the `%shape` chord names and the `key` property with the
 * other accidentals: sharps when most are flats now, flats otherwise.
 */
export function switchSpelling(lines: readonly string[], blocks: readonly SongBlockRange[]): SongEdit & { spelling: Spelling } {
	const songs = songsOf(lines, blocks);
	const spelling: Spelling = currentSpelling(songs) === 'flats' ? 'sharps' : 'flats';
	const rewrite: Rewrite = (chord) => respellChord(chord, spelling);
	let result = editBlocks(lines, blocks, (source, song) =>
		rewriteBlock(source, song, rewrite, (_shape, chord, line) => renameShape(chord, line)),
	);

	const key = readProperty(lines, 'key');
	const newKey = key === null ? null : respellKey(key, spelling);
	if (newKey !== null && newKey !== key) result = setProperty(result, 'key', newKey, false);
	return { lines: result, key: newKey ?? key, hasTab: hasTab(songs), spelling };
}

/** The highest capo the capo commands set. */
export const MAX_CAPO = 12;

/**
 * Moves the capo by `frets` and the chords the other way, so the song sounds the same. Null
 * when the capo would leave 0 to 12, or when the `capo` property is not a whole number.
 */
export function moveCapo(
	lines: readonly string[],
	blocks: readonly SongBlockRange[],
	frets: number,
): (SongEdit & { capo: number }) | null {
	const written = readProperty(lines, 'capo');
	const capo = written === null ? 0 : Number(written);
	if (!Number.isInteger(capo)) return null;
	const next = capo + frets;
	if (next < 0 || next > MAX_CAPO) return null;
	const edit = transposeSong(lines, blocks, -frets);
	return { ...edit, lines: setProperty(edit.lines, 'capo', next, true), capo: next };
}
