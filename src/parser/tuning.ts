/**
 * The `tuning` property: 6 notes from the low string to the high string.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import { Note } from 'tonal';
import { STRING_COUNT, type ParseError } from '../model/song';

/** Standard tuning, low to high, without octaves. */
export const STANDARD_TUNING = ['E', 'A', 'D', 'G', 'B', 'E'] as const;

/** Tuning names people write instead of notes, matched in any case. */
const NAMED_TUNINGS: Record<string, string> = {
	standard: 'E A D G B E',
	'e standard': 'E A D G B E',
	'drop d': 'D A D G B E',
	'half step down': 'Eb Ab Db Gb Bb Eb',
	'eb standard': 'Eb Ab Db Gb Bb Eb',
	'whole step down': 'D G C F A D',
	'd standard': 'D G C F A D',
	'open d': 'D A D F# A D',
	'open g': 'D G D G B D',
};

/** A note with an optional octave, which is ignored: `E`, `Eb`, `F#`, `e`, `E2`. */
const NOTE = /^([A-Ga-g])([#b♯♭]?)\d?$/;
const NOTES_RUN = /[A-Ga-g][#b♯♭]?\d?/g;

export type Tuning =
	| {
			valid: true;
			/** Low to high, as read: `Eb`, `F#`. */
			notes: string[];
			/**
			 * Semitones each string is tuned from standard, the nearest way: drop D is
			 * `[-2, 0, 0, 0, 0, 0]`. Ties (6 semitones) count as down.
			 */
			offsets: number[];
			/** The offset when every string moves by the same amount (0 for standard), else null. */
			shift: number | null;
	  }
	/** Not 6 notes: chord diagrams and tabs use standard tuning. */
	| { valid: false; text: string };

/** Reads the `tuning` property. Empty means standard tuning. */
export function parseTuning(text: string | null): Tuning {
	const value = (text ?? '').trim();
	const named = NAMED_TUNINGS[value.toLowerCase().replace(/[\s-]+/g, ' ')];
	const notes = readNotes(named ?? (value === '' ? STANDARD_TUNING.join(' ') : value));
	if (!notes) return { valid: false, text: value };

	const offsets = notes.map((note, index) => offset(note, STANDARD_TUNING[index] ?? 'E'));
	const first = offsets[0] ?? 0;
	const shift = offsets.every((value) => value === first) ? first : null;
	return { valid: true, notes, offsets, shift };
}

/**
 * Notes separated by spaces, commas or dashes, or written together (`EADGBE`, `EbAbDbGbBbEb`).
 * Written together, a `b` after a note is a flat, unless that does not give 6 notes: `eadgbe`.
 */
function readNotes(value: string): string[] | null {
	const words = value.split(/[\s,-]+/).filter((word) => word !== '');
	let notes = words;
	if (words.length === 1) {
		notes = [...(value.match(NOTES_RUN) ?? [])];
		if (notes.join('') !== value) return null;
		if (notes.length !== STRING_COUNT && /^[A-Ga-g]+$/.test(value)) notes = [...value];
	}
	if (notes.length !== STRING_COUNT) return null;

	const result: string[] = [];
	for (const word of notes) {
		const match = NOTE.exec(word);
		if (!match) return null;
		const accidental = (match[2] ?? '').replace('♯', '#').replace('♭', 'b');
		result.push((match[1] ?? '').toUpperCase() + accidental);
	}
	return result;
}

/** Semitones from the standard note to the tuned note, in -6 to 5. */
function offset(note: string, standard: string): number {
	const diff = (Note.chroma(note) ?? 0) - (Note.chroma(standard) ?? 0);
	const up = ((diff % 12) + 12) % 12;
	return up >= 6 ? up - 12 : up;
}

/** The error for a tuning that cannot be read, shown without a line number. */
export function checkTuning(tuning: Tuning): ParseError[] {
	if (tuning.valid) return [];
	return [
		{
			line: null,
			message: `Tuning ${tuning.text} is not 6 notes from low to high, such as E A D G B E; chord diagrams and tabs use standard tuning.`,
		},
	];
}
