/**
 * The chord library: guitar fingerings for a chord symbol, from chords-db (`guitarChords.ts`).
 * Pure: no Obsidian imports, unit-tested.
 *
 * Chords are matched by their notes, not by how they are written: `D7(9)` finds the library's
 * `9`, `Db` its `C#`, `Bm7(5-)` its `m7b5`. A slash chord needs a fingering with that bass.
 */

import { readChord, type Chord } from '../../parser/chord';
import { GUITAR_CHORDS } from './guitarChords';

/** A finger: 1 index to 4 little, `T` thumb, 0 none (open or muted string). */
export type Finger = number | 'T';

/** One fingering from the library. */
export interface LibraryFingering {
	/** One per string, low E to high E: the fret, 0 for open, null for muted. */
	frets: (number | null)[];
	/** One per string. */
	fingers: Finger[];
	/** Frets a finger holds across strings. */
	barres: number[];
}

/** One chord of the library, for tests. */
export interface LibraryEntry {
	key: string;
	suffix: string;
	/** The suffix written as a chord symbol after the key. */
	symbol: string;
	chord: Chord | null;
}

const STRINGS = 6;

/** Library suffixes that are words rather than chord symbols. */
const SUFFIX_SYMBOLS: Readonly<Record<string, string>> = { major: '', minor: 'm' };

/**
 * Chords by root, notes and bass, to the library entries that hold their fingerings: one, or
 * one per spelling of the bass when the library has both (`E/G#` and `E/Ab`).
 */
let index: Map<string, { bass: string; fingerings: string }[]> | null = null;

const keyOf = (chord: Chord) => `${chord.rootChroma}|${chord.tones}|${chord.bassChroma ?? ''}`;

/** Every chord of the library. */
export function libraryEntries(): LibraryEntry[] {
	return GUITAR_CHORDS.map((entry) => {
		const [key = '', suffix = ''] = entry.split(' ', 2);
		const symbol = key + (SUFFIX_SYMBOLS[suffix] ?? suffix);
		return { key, suffix, symbol, chord: readChord(symbol) };
	});
}

function buildIndex(): Map<string, { bass: string; fingerings: string }[]> {
	const map = new Map<string, { bass: string; fingerings: string }[]>();
	for (const entry of GUITAR_CHORDS) {
		const keyEnd = entry.indexOf(' ');
		const suffixEnd = entry.indexOf(' ', keyEnd + 1);
		const suffix = entry.slice(keyEnd + 1, suffixEnd);
		const chord = readChord(entry.slice(0, keyEnd) + (SUFFIX_SYMBOLS[suffix] ?? suffix));
		if (!chord) continue;
		const key = keyOf(chord);
		const found = { bass: chord.bass, fingerings: entry.slice(suffixEnd + 1) };
		const list = map.get(key);
		if (list) list.push(found);
		else map.set(key, [found]);
	}
	return map;
}

function decode(text: string): LibraryFingering {
	const frets: (number | null)[] = [];
	const fingers: Finger[] = [];
	for (let string = 0; string < STRINGS; string++) {
		const fret = text.charAt(string);
		frets.push(fret === 'x' ? null : parseInt(fret, 16));
		const finger = text.charAt(STRINGS + string);
		fingers.push(finger === 'T' ? 'T' : Number(finger));
	}
	const barres = [...text.slice(STRINGS * 2)].map((fret) => parseInt(fret, 16));
	return { frets, fingers, barres };
}

/**
 * The library's fingerings for a chord symbol, in the library's order; empty when it has none.
 * When the library spells the bass both ways, the entry spelled as written is used.
 */
export function libraryFingerings(symbol: string): LibraryFingering[] {
	const chord = readChord(symbol);
	if (!chord) return [];
	index ??= buildIndex();
	const entries = index.get(keyOf(chord));
	const entry = entries?.find((candidate) => candidate.bass === chord.bass) ?? entries?.[0];
	return entry ? entry.fingerings.split(' ').map(decode) : [];
}
