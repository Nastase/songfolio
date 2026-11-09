/**
 * Fingerings for the chord diagrams (R4): from a `%shape` line or the chord library, moved to
 * the song's tuning.
 * Pure: no Obsidian imports, unit-tested.
 */

import type { Position } from '@tombatossals/chords-db';
import guitar from '@tombatossals/chords-db/lib/guitar.json';
import { STRING_COUNT, type ChordShape, type ChordSymbol } from '../../model/song';
import { parseChordSymbol } from '../../parser/chordsheets/chordsUtils';
import { addCustomChordTypes } from '../../parser/chordsheets/customChordTypes';
import type { Tuning } from '../../parser/tuning';
import { findDbChord } from './chordDb';

/** Frets a hand can cover: a library shape moved to another tuning must still fit. */
const HAND_SPAN = 4;

/** A finger held across strings at one fret. Strings count from 0, the low E string. */
export interface Barre {
	fret: number;
	from: number;
	to: number;
}

/** One way to play a chord. */
export interface Voicing {
	/** One per string, low E to high E: the fret, 0 for open, null for muted. */
	frets: (number | null)[];
	/** Finger per string (1 index to 4 little, 0 none); null when not known. */
	fingers: number[] | null;
	barres: Barre[];
}

export interface ChordDiagram {
	chord: ChordSymbol;
	/** The library's fingerings, in its order, moved to the song's tuning. Empty when none. */
	voicings: Voicing[];
	/** The fingering shown; null when there is none (a placeholder is drawn). */
	shown: Voicing | null;
	/** The `%shape` line of the chord, when it has one. */
	shape: ChordShape | null;
	/** Where `shown` is in `voicings`; null for a `%shape` that is not one of them. */
	index: number | null;
}

/**
 * Diagrams for the given chords: a chord's `%shape` when it has one, otherwise the library's
 * first fingering. With a tuning that does not move every string the same (drop D), library
 * fingerings move string by string and those that become unplayable are left out. `%shape`
 * lines are always drawn as written.
 */
export function chordDiagrams(
	chords: readonly ChordSymbol[],
	shapes: readonly ChordShape[],
	tuning: Tuning,
): ChordDiagram[] {
	const shapesByChord = new Map(shapes.map((shape) => [shape.chord, shape]));
	return chords.map((chord) => {
		const voicings = libraryVoicings(chord.text, tuning);
		const shape = shapesByChord.get(chord.text) ?? null;
		if (!shape) return { chord, voicings, shape, shown: voicings[0] ?? null, index: voicings[0] ? 0 : null };

		const index = voicings.findIndex((voicing) => sameFrets(voicing.frets, shape.frets));
		const shown = voicings[index] ?? { frets: shape.frets, fingers: null, barres: inferBarres(shape.frets) };
		return { chord, voicings, shape, shown, index: index >= 0 ? index : null };
	});
}

/** The library's fingerings of a chord, moved to the tuning. Empty when it has none. */
export function libraryVoicings(symbol: string, tuning: Tuning): Voicing[] {
	addCustomChordTypes();
	const dbChord = findDbChord(parseChordSymbol(symbol), guitar);
	if (!dbChord) return [];
	const voicings = dbChord.positions.map(fromPosition);
	// A tuning that moves every string the same keeps the shapes; one that cannot be read
	// counts as standard.
	if (!tuning.valid || tuning.shift !== null) return voicings;
	return voicings
		.map((voicing) => retune(voicing, tuning.offsets))
		.filter((voicing): voicing is Voicing => voicing !== null);
}

/** A library position, with its frets made absolute (the library counts from `baseFret`). */
export function fromPosition(position: Position): Voicing {
	const absolute = (fret: number) => (fret > 0 ? fret + position.baseFret - 1 : fret);
	const frets = position.frets.map((fret) => (fret < 0 ? null : absolute(fret)));
	const barres = position.barres.flatMap((relative): Barre[] => {
		const from = position.frets.indexOf(relative);
		const to = position.frets.lastIndexOf(relative);
		return from >= 0 && to > from ? [{ fret: absolute(relative), from, to }] : [];
	});
	return { frets, fingers: [...position.fingers], barres };
}

/**
 * Moves a standard-tuning fingering to another tuning, string by string: a string tuned 2
 * semitones down is played 2 frets higher. Null when the result is unplayable: a fret below 0,
 * or fretted notes over more than 4 frets. The moved fingering loses its finger numbers.
 */
export function retune(voicing: Voicing, offsets: readonly number[]): Voicing | null {
	const frets = voicing.frets.map((fret, string) => (fret === null ? null : fret - (offsets[string] ?? 0)));
	if (sameFrets(frets, voicing.frets)) return voicing;
	if (frets.some((fret) => fret !== null && fret < 0)) return null;
	const fretted = frets.filter((fret): fret is number => fret !== null && fret > 0);
	if (fretted.length > 0 && Math.max(...fretted) - Math.min(...fretted) >= HAND_SPAN) return null;
	return { frets, fingers: null, barres: inferBarres(frets) };
}

/**
 * A barre for a hand-written shape: the lowest fret, held from the first to the last string
 * that uses it, when every string between is fretted at or above it and at least one higher.
 * `1 3 3 2 1 1` has one; `x 0 2 2 2 0` (three fingers) does not.
 */
export function inferBarres(frets: readonly (number | null)[]): Barre[] {
	const fretted = frets.filter((fret): fret is number => fret !== null && fret > 0);
	if (fretted.length < 3) return [];
	const lowest = Math.min(...fretted);
	const from = frets.indexOf(lowest);
	const to = frets.lastIndexOf(lowest);
	if (to <= from) return [];
	const between = frets.slice(from, to + 1);
	if (between.some((fret) => fret === null || fret < lowest)) return [];
	if (!between.some((fret) => fret !== null && fret > lowest)) return [];
	return [{ fret: lowest, from, to }];
}

function sameFrets(a: readonly (number | null)[], b: readonly (number | null)[]): boolean {
	return a.length === STRING_COUNT && b.length === STRING_COUNT && a.every((fret, i) => fret === b[i]);
}
