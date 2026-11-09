/**
 * The sounding key: the `key` property (the key of the shapes as written) moved by the capo and
 * by a tuning that moves every string by the same amount.
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

/**
 * The key the song sounds in, or null when it sounds as written, the key cannot be read, or the
 * capo is not a whole number of frets. `shift` is the tuning's whole shift in semitones (-1 for
 * Eb tuning), or null when the strings do not all move the same.
 */
export function soundingKey(key: string | null, capo: number | null, shift: number | null): string | null {
	const match = KEY.exec((key ?? '').trim());
	if (!match) return null;
	if (capo !== null && (!Number.isInteger(capo) || capo < 0)) return null;

	const semitones = (capo ?? 0) + (shift ?? 0);
	if (semitones === 0) return null;

	const tonic = (match[1] ?? '').replace('♯', '#').replace('♭', 'b');
	const chroma = Note.chroma(tonic.charAt(0).toUpperCase() + tonic.slice(1));
	if (chroma === undefined) return null;

	const suffix = match[2] ?? '';
	const word = suffix.trim();
	const minor = word === 'm' || MINOR_WORD.test(word);
	if (!minor && !MAJOR_WORD.test(word)) return null;
	const names = minor ? MINOR_KEYS : MAJOR_KEYS;
	return (names[(((chroma + semitones) % 12) + 12) % 12] ?? '') + suffix;
}
