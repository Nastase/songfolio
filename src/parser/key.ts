/**
 * Keys: the `key` property (the key of the shapes as written), moved by the capo and a tuning for
 * the sounding key, or by the transpose commands.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import { Note } from 'tonal';

/** A key: tonic, then nothing (major), `m`, `M`, or a word: `min`, `maj`, `minor`, `major`. */
const KEY = /^([A-Ga-g][#b♯♭]?)(\s*[A-Za-z]*)$/;
const MAJOR_WORD = /^(M|maj|major)?$/i;
const MINOR_WORD = /^(min|minor)$/i;

/** Spellings with the fewest sharps or flats, by pitch class from C. Ties go to sharps. */
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

/** Major keys, by pitch class from C, whose signature has sharps (G D A E B F#) or flats. */
const MAJOR_SIGNATURES: readonly (Spelling | null)[] = [
	null, 'flats', 'sharps', 'flats', 'sharps', 'flats', 'sharps', 'sharps', 'flats', 'sharps', 'flats', 'sharps',
];

/** How the black-key notes are written. */
export type Spelling = 'sharps' | 'flats';

/** A key that could be read. */
export interface Key {
	/** Pitch class of the tonic, 0 for C. */
	chroma: number;
	minor: boolean;
	/** What follows the tonic, as written: '', 'm', ' minor'… */
	suffix: string;
}

/** Reads a key such as `C`, `F#m`, `Bb major`. Null when it cannot be read. */
export function readKey(key: string | null): Key | null {
	const match = KEY.exec((key ?? '').trim());
	if (!match) return null;
	const tonic = (match[1] ?? '').replace('♯', '#').replace('♭', 'b');
	const chroma = Note.chroma(tonic.charAt(0).toUpperCase() + tonic.slice(1));
	if (chroma === undefined) return null;
	const suffix = match[2] ?? '';
	const word = suffix.trim();
	const minor = word === 'm' || MINOR_WORD.test(word);
	if (!minor && !MAJOR_WORD.test(word)) return null;
	return { chroma, minor, suffix };
}

/**
 * The key moved by a number of semitones, spelled with the fewest sharps or flats and keeping
 * what follows the tonic as written. Null when the key cannot be read.
 */
export function transposeKey(key: string | null, semitones: number): string | null {
	const read = readKey(key);
	if (!read) return null;
	const names = read.minor ? MINOR_KEYS : MAJOR_KEYS;
	return (names[mod12(read.chroma + semitones)] ?? '') + read.suffix;
}

/**
 * Whether a key's signature has sharps or flats; null for C major and A minor, which have none,
 * and for a key that cannot be read.
 */
export function keySpelling(key: string | null): Spelling | null {
	const read = readKey(key);
	if (!read) return null;
	// A minor key has the signature of its relative major, 3 semitones up.
	return MAJOR_SIGNATURES[mod12(read.chroma + (read.minor ? 3 : 0))] ?? null;
}

/**
 * The key the song sounds in, or null when it sounds as written, the key cannot be read, or the
 * capo is not a whole number of frets. `shift` is the tuning's whole shift in semitones (-1 for
 * Eb tuning), or null when the strings do not all move the same.
 */
export function soundingKey(key: string | null, capo: number | null, shift: number | null): string | null {
	if (capo !== null && (!Number.isInteger(capo) || capo < 0)) return null;
	const semitones = (capo ?? 0) + (shift ?? 0);
	if (semitones === 0) return null;
	return transposeKey(key, semitones);
}

export function mod12(value: number): number {
	return ((value % 12) + 12) % 12;
}
