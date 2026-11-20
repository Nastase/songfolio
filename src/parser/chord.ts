/**
 * Chord symbols: reads `Am7`, `D/F#`, `G7(b9)` or `Bm7(5-)` into a root, a bass and the notes
 * of the chord.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 *
 * One grammar covers the usual ways of writing chords: pop and jazz symbols (`Cmaj7`, `C-7`,
 * `CΔ`, `C°7`, `Cø`), extensions in parentheses or after slashes (`C7(b9,#11)`, `Bm7/b5`,
 * `C6/9`) and the Brazilian cifra (`C7M`, `C7(4/9)`, `Bm5-/7`, `A4` for Asus4, `Cº`). The notes
 * are kept as a set of pitch classes above the root, so two spellings of one chord compare
 * equal: `D7(9)` and `D9`, `Bm7(5-)` and `Bm7b5`.
 */

import { noteChroma } from './note';

export interface Chord {
	/** The root as written: `C`, `F#`, `B♭`. */
	root: string;
	/** Pitch class of the root, 0 for C. */
	rootChroma: number;
	/** The bass of a slash chord as written, or '' when there is none. */
	bass: string;
	/** Pitch class of the bass; null when there is none. */
	bassChroma: number | null;
	/** The notes, as semitones above the root: bit n is set for n semitones; bit 0 is the root. */
	tones: number;
}

/** A root or bass: an uppercase letter and at most one sharp or flat. */
const ROOT = /^[A-G][#b♯♭]?/;
const NOTE = /^[A-G][#b♯♭]?$/;

const CODE_A = 65;
const CODE_G = 71;

/**
 * Reads a chord symbol. Null when the text is not one: lyrics such as `And` or `Go`, a root in
 * lowercase, or anything the grammar does not read to the end (`C(x2)`, `E(barre)`).
 * A trailing `/`, a strum mark as in `G/ / /`, is ignored.
 */
export function readChord(text: string): Chord | null {
	const first = text.charCodeAt(0);
	if (!(first >= CODE_A && first <= CODE_G)) return null;
	const root = ROOT.exec(text)?.[0] ?? '';
	let quality = text.slice(root.length);
	if (quality.endsWith('/')) quality = quality.slice(0, -1);

	// Only a note after the last slash is a bass: in `C6/9` or `D7/4` the slash adds a degree.
	let bass = '';
	const slash = quality.lastIndexOf('/');
	if (slash >= 0 && NOTE.test(quality.slice(slash + 1))) {
		bass = quality.slice(slash + 1);
		quality = quality.slice(0, slash);
	}

	const tones = readTones(quality);
	if (tones === null) return null;
	return {
		root,
		rootChroma: noteChroma(root) ?? 0,
		bass,
		bassChroma: bass === '' ? null : noteChroma(bass),
		tones,
	};
}

/** The bit of a note `semitones` above the root. */
const bit = (semitones: number) => 1 << semitones;

type Alteration = 'flat' | 'sharp' | 'major' | null;

/** A degree such as `b9`, `11+`, `4` or `maj7`. */
interface Degree {
	num: number;
	alteration: Alteration;
}

const ALTERATIONS: Readonly<Record<string, Alteration>> = {
	b: 'flat', '♭': 'flat', '-': 'flat', '#': 'sharp', '♯': 'sharp', '+': 'sharp',
};

/** Degree numbers, longest first so that `13` is not read as `1`. */
const DEGREE_NUMBERS = ['13', '11', '9', '7', '6', '5', '4', '2'] as const;

/** Words for a major seventh written as a degree: `m(maj7)`, `m/M7`. */
const MAJOR_SEVENTHS = ['maj7', 'Maj7', 'ma7', 'M7', '7M', 'Δ7', 'Δ'] as const;

/**
 * The notes of a chord quality (what follows the root), or null when it cannot be read.
 *
 * Reads, in order: a triad word (`m`, `dim`, `ø`, `aug`…), a major seventh word (`maj`, `M`,
 * `Δ`), the extension number (`6`, `69`, `7`, `9`, `11`, `13`, and without a triad word `5`,
 * `4` or `2`), then any number of changes: `sus`, `add`, alterations (`b5`, `#9`, `5-`, `11+`),
 * `no3`/`omit5`, degree lists in parentheses and degrees after slashes.
 */
function readTones(text: string): number | null {
	let pos = 0;
	let third: number | null = 4;
	let fifth: number | null = 7;
	let seventh: number | null = null;
	let added = 0;
	let dim = false;
	/** A major seventh word was written (`maj`, `M`, `Δ`): a 7 is then a major seventh. */
	let majorSeventh = false;

	const at = (offset = 0) => text.charAt(pos + offset);
	const isDigit = (ch: string) => ch >= '0' && ch <= '9';
	const take = (word: string) => {
		if (!text.startsWith(word, pos)) return false;
		pos += word.length;
		return true;
	};

	// 1. The triad.
	let triadWord = false;
	if (!startsMajorWord()) {
		if (take('min') || take('mi') || take('m') || take('-')) {
			triadWord = true;
			third = 3;
			// `m+7` is the minor-major seventh, `m+` the minor triad with a sharp fifth.
			if (take('+')) {
				if (at() === '7') majorSeventh = true;
				else {
					fifth = 8;
					take('5');
				}
			}
		} else if (take('dim') || take('°') || take('º') || (at() === 'o' && (at(1) === '7' || at(1) === 'M') && take('o'))) {
			triadWord = true;
			dim = true;
			third = 3;
			fifth = 6;
		} else if (take('ø') || take('Ø')) {
			triadWord = true;
			third = 3;
			fifth = 6;
			seventh = 10;
			take('7');
		} else if (take('aug') || take('+')) {
			triadWord = true;
			fifth = 8;
			take('5');
		}
	}

	// 2. A major seventh word: `maj7`, `mM7`, `CΔ` (which is a major seventh by itself).
	let delta = false;
	if (startsMajorWord()) {
		triadWord = true;
		majorSeventh = true;
		delta = at() === 'Δ';
		pos += majorWordLength();
	}

	// 3. The extension: each implies the ones below it (a 9 has a 7, an 11 a 9 and a 7).
	let extension = 0;
	if (take('69')) {
		added |= bit(9) | bit(2);
	} else if (take('6')) {
		added |= bit(9);
	} else {
		for (const num of [13, 11, 9, 7]) {
			if (take(String(num))) {
				extension = num;
				break;
			}
		}
		if (extension === 0 && !triadWord) {
			if (at() === '5' && ALTERATIONS[at(1)] === undefined) {
				// `C5`, the power chord. `C5-` and `C5+` alter the fifth, read below.
				pos++;
				third = null;
			} else if (take('4')) {
				third = 5;
			} else if (take('2')) {
				added |= bit(2);
			}
		}
	}
	if (extension > 0) {
		seventh = majorSeventh ? 11 : dim ? 9 : 10;
		if (extension >= 9) added |= bit(2);
		if (extension === 11) added |= bit(5);
		if (extension === 13) added |= bit(9);
		// Cifra writes the major seventh after the number: `7M`, `9M`.
		if (take('M')) seventh = 11;
		// A `+` right after the number: `m7+` is the minor-major seventh, `7+` the augmented seventh.
		else if (at() === '+' && !isDigit(at(1))) {
			pos++;
			if (third === 3) seventh = 11;
			else fifth = 8;
		}
	} else if (delta) {
		seventh = 11;
	}

	// 4. Changes, in any number and order.
	while (pos < text.length) {
		if (take('sus2sus4') || take('sus24')) {
			third = null;
			added |= bit(2) | bit(5);
		} else if (take('sus')) {
			if (take('2')) third = 2;
			else {
				take('4');
				third = 5;
			}
		} else if (take('add')) {
			const degree = readDegree();
			if (!degree || !applyDegree(degree, true)) return null;
		} else if (take('alt')) {
			if (seventh === null) return null;
			fifth = 8;
			added |= bit(3);
		} else if (take('no') || take('omit')) {
			if (take('3')) third = null;
			else if (take('5')) fifth = null;
			else return null;
		} else if (take('(')) {
			do {
				const viaAdd = take('add');
				const degree = readDegree();
				if (!degree || !applyDegree(degree, viaAdd)) return null;
			} while (take(',') || take('/'));
			if (!take(')')) return null;
		} else if (take('/')) {
			const degree = readDegree();
			if (!degree || !applyDegree(degree, false)) return null;
		} else {
			// Only an altered degree may follow without `add`, parentheses or a slash: `7b9`, `5-`.
			const degree = readDegree();
			if (!degree || degree.alteration === null || !applyDegree(degree, false)) return null;
		}
	}

	return bit(0) | (third === null ? 0 : bit(third)) | (fifth === null ? 0 : bit(fifth)) |
		(seventh === null ? 0 : bit(seventh)) | added;

	function startsMajorWord(): boolean {
		return majorWordLength() > 0;
	}

	/** Length of the major seventh word at `pos`, or 0. `ma` counts only before a number. */
	function majorWordLength(): number {
		if (text.startsWith('maj', pos) || text.startsWith('Maj', pos)) return 3;
		if ((text.startsWith('ma', pos) || text.startsWith('Ma', pos)) && isDigit(at(2))) return 2;
		if (at() === 'M' || at() === 'Δ' || at() === '^') return 1;
		return 0;
	}

	/** A degree at `pos`: a major seventh word, or a number with an alteration before or after it. */
	function readDegree(): Degree | null {
		for (const word of MAJOR_SEVENTHS) if (take(word)) return { num: 7, alteration: 'major' };
		const before = ALTERATIONS[at()];
		if (before !== undefined) pos++;
		const num = DEGREE_NUMBERS.find((candidate) => take(candidate));
		if (num === undefined) return null;
		let alteration = before ?? null;
		// An alteration after the number (`5-`, `9+`), unless it belongs to the next degree (`b9#11`).
		const after = ALTERATIONS[at()];
		if (after !== undefined && !isDigit(at(1))) {
			if (alteration !== null) return null;
			alteration = after;
			pos++;
		}
		return { num: Number(num), alteration };
	}

	/**
	 * Applies one degree. A 4 suspends the third and an altered 5th or 7th replaces the plain
	 * one; everything else adds a note, and so does any degree written with `add`.
	 */
	function applyDegree({ num, alteration }: Degree, viaAdd: boolean): boolean {
		const flat = alteration === 'flat';
		const sharp = alteration === 'sharp';
		switch (num) {
			case 2:
				// A plain 2 is sus2 in cifra and add9 elsewhere: only `add2` is clear.
				if (!viaAdd || alteration !== null) return false;
				added |= bit(2);
				return true;
			case 4:
				if (flat) return false;
				if (sharp) added |= bit(6);
				else if (viaAdd) added |= bit(5);
				else third = 5;
				return true;
			case 5:
				if (viaAdd || !(flat || sharp)) return false;
				fifth = flat ? 6 : 8;
				return true;
			case 6:
				if (sharp) return false;
				added |= bit(flat ? 8 : 9);
				return true;
			case 7:
				if (viaAdd) return false;
				seventh = alteration === 'major' || sharp ? 11 : flat ? 10 : dim ? 9 : 10;
				return true;
			case 9:
				added |= bit(flat ? 1 : sharp ? 3 : 2);
				return true;
			case 11:
				if (flat) return false;
				added |= bit(sharp ? 6 : 5);
				return true;
			case 13:
				if (sharp) return false;
				added |= bit(flat ? 8 : 9);
				return true;
			default:
				return false;
		}
	}
}
