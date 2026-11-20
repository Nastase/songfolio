import { describe, expect, it } from 'vitest';
import { readChord } from '../src/parser/chord';

/** The chord's notes as semitones above the root, lowest first; null when it is not a chord. */
function semitones(symbol: string): number[] | null {
	const chord = readChord(symbol);
	if (!chord) return null;
	return [...Array(12).keys()].filter((n) => (chord.tones & (1 << n)) !== 0);
}

/** Expects two symbols to read as the same chord: root, notes and bass. */
function expectSame(symbol: string, other: string) {
	const a = readChord(symbol);
	const b = readChord(other);
	expect(a, symbol).not.toBeNull();
	expect(b, other).not.toBeNull();
	expect([a?.rootChroma, a?.tones, a?.bassChroma], `${symbol} = ${other}`).toEqual([
		b?.rootChroma,
		b?.tones,
		b?.bassChroma,
	]);
}

describe('readChord: root and bass', () => {
	it('reads the root with its accidental', () => {
		expect(readChord('F#m')).toMatchObject({ root: 'F#', rootChroma: 6, bass: '', bassChroma: null });
		expect(readChord('Bb7')).toMatchObject({ root: 'Bb', rootChroma: 10 });
		expect(readChord('E♭maj7')).toMatchObject({ root: 'E♭', rootChroma: 3 });
		expect(readChord('Cb')).toMatchObject({ root: 'Cb', rootChroma: 11 });
	});

	it('reads the bass of a slash chord', () => {
		expect(readChord('D/F#')).toMatchObject({ root: 'D', bass: 'F#', bassChroma: 6 });
		expect(readChord('Am7/G')).toMatchObject({ root: 'A', bass: 'G', bassChroma: 7 });
		expectSame('G/B', 'G/B');
		expect(semitones('C/E')).toEqual(semitones('C'));
	});

	it('takes only a note after the last slash for the bass', () => {
		expect(readChord('C6/9/E')).toMatchObject({ bass: 'E' });
		expectSame('C6/9/E', 'C69/E');
		expect(readChord('D7/4')).toMatchObject({ bass: '' });
		expect(readChord('Bm7/b5')).toMatchObject({ bass: '' });
		expect(readChord('A7(4/9)')).toMatchObject({ bass: '' });
		expect(readChord('A7(4/9)/C#')).toMatchObject({ bass: 'C#' });
	});

	it('ignores a trailing strum slash', () => {
		expectSame('G/', 'G');
		expectSame('Em7/', 'Em7');
		expectSame('D/F#/', 'D/F#');
		expect(readChord('G//')).toBeNull();
	});
});

describe('readChord: qualities', () => {
	it('reads triads', () => {
		expect(semitones('C')).toEqual([0, 4, 7]);
		for (const minor of ['Cm', 'Cmin', 'Cmi', 'C-']) expect(semitones(minor), minor).toEqual([0, 3, 7]);
		for (const dim of ['Cdim', 'C°', 'Cº']) expect(semitones(dim), dim).toEqual([0, 3, 6]);
		for (const aug of ['Caug', 'C+', 'C+5']) expect(semitones(aug), aug).toEqual([0, 4, 8]);
		for (const major of ['CM', 'Cmaj', 'CMaj']) expect(semitones(major), major).toEqual([0, 4, 7]);
		expect(semitones('C5')).toEqual([0, 7]);
	});

	it('reads suspended chords', () => {
		expect(semitones('Csus4')).toEqual([0, 5, 7]);
		expect(semitones('Csus')).toEqual([0, 5, 7]);
		expect(semitones('Csus2')).toEqual([0, 2, 7]);
		expect(semitones('Csus2sus4')).toEqual([0, 2, 5, 7]);
		expectSame('Csus24', 'Csus2sus4');
		expect(semitones('C7sus4')).toEqual([0, 5, 7, 10]);
		expect(semitones('Cmaj7sus2')).toEqual([0, 2, 7, 11]);
		expectSame('C9sus', 'C9sus4');
	});

	it('reads sevenths', () => {
		expect(semitones('C7')).toEqual([0, 4, 7, 10]);
		expect(semitones('Cm7')).toEqual([0, 3, 7, 10]);
		expect(semitones('Cdim7')).toEqual([0, 3, 6, 9]);
		expect(semitones('Cm7b5')).toEqual([0, 3, 6, 10]);
		expect(semitones('Caug7')).toEqual([0, 4, 8, 10]);
		for (const major of ['Cmaj7', 'CMaj7', 'Cma7', 'CM7', 'CΔ', 'CΔ7']) {
			expect(semitones(major), major).toEqual([0, 4, 7, 11]);
		}
		for (const minorMajor of ['CmM7', 'Cmmaj7', 'CmMaj7', 'C-Δ7']) {
			expect(semitones(minorMajor), minorMajor).toEqual([0, 3, 7, 11]);
		}
		expectSame('C°7', 'Cdim7');
		expectSame('Co7', 'Cdim7');
		expectSame('Cø', 'Cm7b5');
		expectSame('Cø7', 'Cm7b5');
		expectSame('C+7', 'Caug7');
	});

	it('reads sixths and extended chords', () => {
		expect(semitones('C6')).toEqual([0, 4, 7, 9]);
		expect(semitones('Cm6')).toEqual([0, 3, 7, 9]);
		expect(semitones('C69')).toEqual([0, 2, 4, 7, 9]);
		expectSame('C6/9', 'C69');
		expect(semitones('C9')).toEqual([0, 2, 4, 7, 10]);
		expect(semitones('Cmaj9')).toEqual([0, 2, 4, 7, 11]);
		expect(semitones('Cm9')).toEqual([0, 2, 3, 7, 10]);
		expect(semitones('C11')).toEqual([0, 2, 4, 5, 7, 10]);
		expect(semitones('Cm11')).toEqual([0, 2, 3, 5, 7, 10]);
		expect(semitones('C13')).toEqual([0, 2, 4, 7, 9, 10]);
		expect(semitones('Cmaj13')).toEqual([0, 2, 4, 7, 9, 11]);
		expectSame('CmMaj9', 'Cmmaj9');
	});

	it('reads added notes, which keep the chord tones', () => {
		expect(semitones('Cadd9')).toEqual([0, 2, 4, 7]);
		expectSame('Cadd2', 'Cadd9');
		expectSame('C2', 'Cadd9');
		expect(semitones('Cadd4')).toEqual([0, 4, 5, 7]);
		expectSame('Cadd11', 'Cadd4');
		expectSame('Cadd13', 'C6');
		expect(semitones('Cmadd9')).toEqual([0, 2, 3, 7]);
		expectSame('C6add9', 'C69');
		expect(semitones('C7add11')).toEqual([0, 4, 5, 7, 10]);
	});

	it('reads alterations', () => {
		expect(semitones('C7b9')).toEqual([0, 1, 4, 7, 10]);
		expect(semitones('C7#9')).toEqual([0, 3, 4, 7, 10]);
		expect(semitones('C7#11')).toEqual([0, 4, 6, 7, 10]);
		expect(semitones('C7b13')).toEqual([0, 4, 7, 8, 10]);
		expect(semitones('C7b5')).toEqual([0, 4, 6, 10]);
		expect(semitones('C7#5')).toEqual([0, 4, 8, 10]);
		expect(semitones('CMb5')).toEqual([0, 4, 6]);
		expect(semitones('Cmaj7#5')).toEqual([0, 4, 8, 11]);
		expect(semitones('Cm#5')).toEqual([0, 3, 8]);
		expect(semitones('Cmb6')).toEqual([0, 3, 7, 8]);
		expect(semitones('Cmb9')).toEqual([0, 1, 3, 7]);
		expectSame('C7alt', 'C7#5#9');
		expectSame('C7+5', 'C7#5');
		expectSame('C7+', 'C7#5');
		expectSame('C9+', 'C9#5');
		expectSame('Cm+', 'Cm#5');
		expectSame('Cm+7', 'CmM7');
		expectSame('C7b9#11', 'C7#11b9');
	});

	it('reads omitted notes', () => {
		expect(semitones('C7no5')).toEqual([0, 4, 10]);
		expect(semitones('Comit3')).toEqual([0, 7]);
	});
});

describe('readChord: degrees in parentheses and after slashes', () => {
	it('adds the degrees in parentheses to the chord before them', () => {
		expectSame('B7(b9)', 'B7b9');
		expectSame('Cm7(b5)', 'Cm7b5');
		expectSame('Cm(add9)', 'Cmadd9');
		expectSame('C6(9)', 'C69');
		expectSame('Cm(maj7)', 'CmMaj7');
		expectSame('C7(b9,#11)', 'C7b9#11');
		expectSame('C7(#11,b9)', 'C7b9#11');
		expectSame('C#m7(b5)/G', 'C#m7b5/G');
		expectSame('C7(5+)', 'C7#5');
		expectSame('C7(+5)', 'C7#5');
		expect(semitones('Bm(b9)')).toEqual([0, 1, 3, 7]);
	});

	it('adds a degree written after a slash', () => {
		expectSame('Bm7/b5', 'Bm7b5');
		expectSame('E7/b9', 'E7b9');
		expectSame('A7/9', 'A9');
		expectSame('Cm/maj7', 'CmMaj7');
		expectSame('Cm/maj7/B', 'CmMaj7/B');
	});

	it('keeps the notes of a chord whose added degree is written with add', () => {
		expect(semitones('C(add4)')).toEqual([0, 4, 5, 7]);
		expect(semitones('C7(add4)')).toEqual([0, 4, 5, 7, 10]);
		expectSame('D(add2)', 'Dadd9');
		expectSame('Am(add2)', 'Amadd9');
	});

	it('adds an 11 or a 13 to a seventh without implying the 9', () => {
		expectSame('A7(11)', 'A7add11');
		expectSame('A7/11', 'A7add4');
		expect(semitones('Am7/13')).toEqual([0, 3, 7, 9, 10]);
		expect(semitones('C7M(6)')).toEqual([0, 4, 7, 9, 11]);
		expectSame('D9(11)', 'D11');
		expectSame('D7/9/11', 'D11');
		expect(semitones('D6(11)')).toEqual([0, 4, 5, 7, 9]);
	});
});

describe('readChord: Brazilian cifra', () => {
	it('reads the cifra spellings', () => {
		expectSame('D7(9)', 'D9');
		expectSame('C(9)', 'Cadd9');
		expectSame('D7M', 'Dmaj7');
		expectSame('D7M(9)', 'Dmaj9');
		expectSame('C9M', 'Cmaj9');
		expectSame('Cm7M', 'CmMaj7');
		expectSame('Bm7(5-)', 'Bm7b5');
		expectSame('Bm7(5b)', 'Bm7b5');
		expectSame('E7(9-)', 'E7b9');
		expectSame('E7(9+)', 'E7#9');
		expectSame('C6(9/11+)', 'C69#11');
		expectSame('Cº7', 'Cdim7');
		expectSame('Cº', 'Cdim');
		expectSame('C5+', 'Caug');
	});

	it('reads 4 as a suspended fourth', () => {
		expectSame('D4', 'Dsus4');
		expectSame('A7(4)', 'A7sus4');
		expectSame('D7/4', 'D7sus4');
		expectSame('A4/7', 'A7sus4');
		expectSame('A7(4/9)', 'A9sus4');
		expectSame('A7(4/9)/C#', 'A9sus4/C#');
		expectSame('D7/4(9)', 'D9sus4');
		expectSame('G4(6)', 'G6sus4');
		expectSame('G4/6', 'G6sus4');
		expectSame('E4(7/9)', 'E9sus4');
		expectSame('E4/7/9', 'E9sus4');
		expectSame('C4(5+)', 'Csus4#5');
	});

	it('reads the older spellings without parentheses', () => {
		expectSame('Bm5-/7', 'Bm7b5');
		expectSame('Bm7-5', 'Bm7b5');
		expectSame('Bb5-/7', 'Bb7b5');
		expectSame('D7-5', 'D7b5');
		expectSame('B7-9', 'B7b9');
		expectSame('Am7+', 'AmMaj7');
		expectSame('Bm5+', 'Bm#5');
		expectSame('Dm5-', 'Ddim');
		expectSame('F#5-', 'F#Mb5');
		// A 7+ without the minor stays augmented.
		expectSame('A7+', 'A7#5');
	});
});

describe('readChord: not chords', () => {
	it('rejects words that only start like a chord', () => {
		for (const word of ['And', 'Add', 'Bad', 'Be', 'Dim', 'Aug', 'Go', 'Do', 'Ease', 'Fa', 'As', 'Am,', 'Em!']) {
			expect(readChord(word), word).toBeNull();
		}
	});

	it('needs an uppercase root', () => {
		for (const word of ['a', 'e', 'am', 'em', 'd', 'g', 'f', 'cm', 'go']) expect(readChord(word), word).toBeNull();
	});

	it('rejects other text in parentheses or after a slash', () => {
		for (const symbol of ['C(x2)', 'A(men)', 'E5(VII)', 'G(PM)', 'E(barre)', 'D(G)', 'G5/A5', 'C6/9/X', 'C(', 'C()']) {
			expect(readChord(symbol), symbol).toBeNull();
		}
	});

	it('rejects a plain 2 in parentheses, which means sus2 or add9 depending on the writer', () => {
		expect(readChord('D(2)')).toBeNull();
	});

	it('rejects degrees that make no sense', () => {
		for (const symbol of ['C1', 'C3', 'Cm5', 'C(5)', 'C(b11)', 'C(#13)', 'Cmm', 'C++', 'Co', 'H', 'N.C.', '', '|']) {
			expect(readChord(symbol), symbol).toBeNull();
		}
	});
});
