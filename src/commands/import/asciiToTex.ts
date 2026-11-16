/**
 * Best-effort conversion of ASCII tab to alphaTex beats for `%tab` (R16). ASCII tab has no
 * rhythm, so every beat is an 8th note, for you to fill in.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import { STRING_COUNT } from '../../model/song';
import { parseSong } from '../../parser';
import { findTabSystems, type TabSystem } from './asciiTab';

/** The first line of the converted tab. */
export const RHYTHM_COMMENT = '// Rhythm: every beat is an 8th note; fill in the durations.';

export interface ConvertedTab {
	/** Lines of alphaTex for the `%tab` block, or empty when nothing could be read. */
	lines: string[];
	/** Tab systems read. */
	systems: number;
	/** Systems left out because they do not have 6 strings. */
	notSixStrings: number;
	/** Characters on string lines that were not understood, such as `t` or `S`. */
	skipped: number;
}

/** The name and bar before a string's tab: `e|`, `E |`, `D:`. */
const STRING_NAME = /^\s*[A-Ga-g][#b]?\s?(\||:)/;
const IGNORED = /[-\s()*.=]/;

/** Converts lines of ASCII tab (the inside of an `%ascii` block, or pasted text). */
export function asciiToTex(lines: readonly string[]): ConvertedTab {
	const result: ConvertedTab = { lines: [], systems: 0, notSixStrings: 0, skipped: 0 };
	const bars: string[] = [];
	for (const system of findTabSystems(lines)) {
		const strings = lines.slice(system.strings.start, system.strings.end);
		// A system without dashes holds no notes, such as a `D|2x` repeat mark.
		if (!strings.some((line) => /-{2,}/.test(line))) continue;
		if (strings.length !== STRING_COUNT || !strings.every((line) => STRING_NAME.test(line))) {
			result.notSixStrings++;
			continue;
		}
		result.systems++;
		const read = readSystem(lines, system, strings);
		result.skipped += read.skipped;
		if (read.bars.length > 0) bars.push(read.bars.join(' | '));
	}
	if (bars.length > 0) result.lines = [RHYTHM_COMMENT, `:8 ${bars.join(' |\n')}`];
	return result;
}

interface Note {
	fret: number | 'x';
	/** alphaTex string: 1 is the top line (high e). */
	string: number;
	effects: string[];
}

interface Beat {
	col: number;
	notes: Note[];
	chord: string | null;
}

/** One system: its bars of beats, in alphaTex. */
function readSystem(lines: readonly string[], system: TabSystem, strings: readonly string[]): { bars: string[]; skipped: number } {
	let skipped = 0;
	const areas = strings.map(tabArea);
	const width = Math.max(...areas.map((area) => area.end));
	const start = Math.min(...areas.map((area) => area.start));

	const beats: Beat[] = [];
	const barCols: number[] = [];
	for (let col = start; col < width; col++) {
		const at = strings.map((line, index) => (col >= (areas[index]?.start ?? 0) && col < (areas[index]?.end ?? 0) ? (line[col] ?? '') : ''));
		if (at.filter((ch) => ch === '|').length >= STRING_COUNT / 2) {
			barCols.push(col);
			continue;
		}
		const notes: Note[] = [];
		at.forEach((ch, index) => {
			const line = strings[index] ?? '';
			const prev = line[col - 1] ?? '';
			if (/\d/.test(ch) && !/\d/.test(prev)) {
				const two = line.slice(col, col + 2);
				const fret = /^\d\d$/.test(two) && Number(two) <= 24 ? Number(two) : Number(ch);
				const after = line[col + String(fret).length] ?? '';
				notes.push({ fret, string: index + 1, effects: effectOf(after) });
			} else if (ch === 'x' || ch === 'X') {
				notes.push({ fret: 'x', string: index + 1, effects: [] });
			} else if (ch !== '' && !/\d/.test(ch) && !IGNORED.test(ch) && !isTechnique(ch, prev)) {
				skipped++;
			}
		});
		if (notes.length > 0) beats.push({ col, notes, chord: null });
	}

	placeChords(lines, system, beats);

	const bars: string[] = [];
	let current: string[] = [];
	let barIndex = 0;
	for (const beat of beats) {
		while (barIndex < barCols.length && (barCols[barIndex] ?? 0) < beat.col) {
			if (current.length > 0) bars.push(current.join(' '));
			current = [];
			barIndex++;
		}
		current.push(formatBeat(beat));
	}
	if (current.length > 0) bars.push(current.join(' '));
	return { bars, skipped };
}

/** Columns of a string line holding tab: after its name, up to a note after the last bar. */
function tabArea(line: string): { start: number; end: number } {
	const start = STRING_NAME.exec(line)?.[0].length ?? 0;
	const trimmed = line.trimEnd();
	const lastBar = trimmed.lastIndexOf('|');
	// `|2x` or `| (2x)` after the last bar is a repeat mark, not tab.
	const end = lastBar >= start && /[A-Za-z]/.test(trimmed.slice(lastBar + 1)) ? lastBar + 1 : trimmed.length;
	return { start, end };
}

/** A technique written right after a note: `5h7`, `5/7`, `7b`, `5~`. */
function effectOf(ch: string): string[] {
	if (ch === 'h' || ch === 'p') return ['h'];
	if (ch === '/' || ch === '\\' || ch === 's') return ['sl'];
	if (ch === 'b') return ['b (0 4)'];
	if (ch === '~' || ch === 'v') return ['v'];
	return [];
}

/** Technique letters after a note are read by `effectOf`; `r` (release) has no alphaTex form here. */
function isTechnique(ch: string, prev: string): boolean {
	return /[hp/\\sbr~v]/.test(ch) && /[\d)]/.test(prev);
}

/** Chord names on a chord line above the system go on the nearest beat. */
function placeChords(lines: readonly string[], system: TabSystem, beats: Beat[]): void {
	if (beats.length === 0) return;
	for (let index = system.box.start; index < system.strings.start; index++) {
		const song = parseSong(lines[index] ?? '');
		for (const item of song.sections.flatMap((section) => section.items)) {
			if (item.kind !== 'chords') continue;
			for (const token of item.tokens) {
				if (token.kind !== 'chord') continue;
				let nearest: Beat | null = null;
				for (const beat of beats) {
					if (beat.chord !== null) continue;
					if (!nearest || Math.abs(beat.col - token.col) < Math.abs(nearest.col - token.col)) nearest = beat;
				}
				if (nearest) nearest.chord = token.chord.text;
			}
		}
	}
}

function formatBeat(beat: Beat): string {
	const note = (n: Note, extra: string[] = []) => {
		const effects = [...n.effects, ...extra];
		return `${n.fret}.${n.string}${effects.length > 0 ? `{${effects.join(' ')}}` : ''}`;
	};
	const chord = beat.chord === null ? [] : [`ch "${beat.chord.replace(/"/g, '')}"`];
	const [only] = beat.notes;
	if (beat.notes.length === 1 && only) return note(only, chord);
	const notes = `(${beat.notes.map((n) => note(n)).join(' ')})`;
	return chord.length > 0 ? `${notes}{${chord.join(' ')}}` : notes;
}

/** Where the converted `%tab` goes, and its lines. */
export interface TabInsertion {
	/** The block line (from 0) after which the `%tab` block is inserted. */
	after: number;
	/** `%tab`, the converted lines, `%endtab`. */
	lines: string[];
	converted: ConvertedTab;
}

/**
 * Converts the ASCII tab at line `line` (from 0) of a block's source: an `%ascii` block or raw
 * tab lines. The `%tab` block goes right after it, which is kept. Null when the line is not in
 * an ASCII tab.
 */
export function convertAsciiAt(source: string, line: number): TabInsertion | null {
	const song = parseSong(source);
	for (const item of song.sections.flatMap((section) => section.items)) {
		if (item.kind !== 'ascii') continue;
		const first = item.line - 1;
		const last = item.implicit ? first + item.lines.length - 1 : first + item.lines.length + (item.closed ? 1 : 0);
		if (line < first || line > last) continue;
		const converted = asciiToTex(item.lines);
		return { after: last, lines: ['%tab', ...converted.lines, '%endtab'], converted };
	}
	return null;
}
