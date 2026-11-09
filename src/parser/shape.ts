/**
 * Chord shapes: `%shape <chord> <frets>`, the fingering used for a chord.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import { MAX_FRET, STRING_COUNT, type ChordShape, type ParseError } from '../model/song';

const USAGE = 'Write the shape as %shape <chord> <frets>, e.g. %shape C x 3 2 0 1 0.';

export interface ShapeResult {
	/** Null when the line has errors. */
	shape: ChordShape | null;
	/** The chord when it could be read, even if the frets have errors. */
	chord: string | null;
	errors: ParseError[];
}

/**
 * Reads the arguments of a `%shape` line. Frets run from the low E string to the high E string,
 * separated by spaces (`8 10 10 9 8 8`). A single word is read one character per string
 * (`x32010`), as in the spec and Chord Sheets.
 */
export function parseShape(args: string, line: number): ShapeResult {
	const [chord, ...words] = args.trim().split(/\s+/).filter((word) => word !== '');
	if (!chord || words.length === 0) {
		return { shape: null, chord: chord ?? null, errors: [{ line, message: USAGE }] };
	}

	const tokens = words.length === 1 ? [...(words[0] ?? '')] : words;
	const frets: (number | null)[] = [];
	const bad: string[] = [];
	const tooHigh: number[] = [];
	for (const token of tokens) {
		if (token === 'x' || token === 'X') {
			frets.push(null);
		} else if (/^\d+$/.test(token)) {
			const fret = Number(token);
			if (fret > MAX_FRET) tooHigh.push(fret);
			frets.push(fret);
		} else if (!bad.includes(token)) {
			bad.push(token);
		}
	}

	const errors: ParseError[] = [];
	if (bad.length > 0) {
		const list = bad.map((token) => `"${token}"`).join(', ');
		const verb = bad.length === 1 ? 'is not a fret' : 'are not frets';
		errors.push({ line, message: `Shape ${chord}: ${list} ${verb}; use 0 to ${MAX_FRET}, or x for a muted string.` });
	} else if (frets.length !== STRING_COUNT) {
		const count = frets.length;
		errors.push({
			line,
			message: `Shape ${chord} has ${count} ${count === 1 ? 'string' : 'strings'}; give ${STRING_COUNT}, from low E to high E.`,
		});
	}
	if (tooHigh.length > 0) {
		errors.push({ line, message: `Shape ${chord}: fret ${tooHigh[0]} is too high; frets go up to ${MAX_FRET}.` });
	}
	if (errors.length === 0 && frets.every((fret) => fret === null)) {
		errors.push({ line, message: `Shape ${chord} mutes every string.` });
	}

	if (errors.length > 0) return { shape: null, chord, errors };
	return { shape: { chord, frets, line }, chord, errors };
}

/** Frets as the picker writes them: one number per string, x for muted. */
export function formatFrets(frets: readonly (number | null)[]): string {
	return frets.map((fret) => (fret === null ? 'x' : String(fret))).join(' ');
}
