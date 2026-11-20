/**
 * Note names: the pitch class of a name such as `F#` or `Bb`, and the name of a MIDI note.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

/** Semitones above C of each letter. */
const LETTER_CHROMA: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Semitones each accidental moves the letter. */
const ACCIDENTAL_SHIFT: Readonly<Record<string, number>> = { '#': 1, '♯': 1, b: -1, '♭': -1 };

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * The pitch class of a note name (0 for C, 11 for B): a letter in either case, then any number
 * of sharps or flats (`#`, `♯`, `b`, `♭`). Null for anything else, an octave included.
 */
export function noteChroma(name: string): number | null {
	let chroma = LETTER_CHROMA[name.charAt(0).toUpperCase()];
	if (chroma === undefined) return null;
	for (let i = 1; i < name.length; i++) {
		const shift = ACCIDENTAL_SHIFT[name.charAt(i)];
		if (shift === undefined) return null;
		chroma += shift;
	}
	return ((chroma % 12) + 12) % 12;
}

/** The name of a MIDI note with sharps and its octave, as in scientific pitch: 40 is `E2`. */
export function sharpNoteName(midi: number): string {
	const chroma = ((midi % 12) + 12) % 12;
	return `${SHARP_NAMES[chroma] ?? ''}${Math.floor(midi / 12) - 1}`;
}
