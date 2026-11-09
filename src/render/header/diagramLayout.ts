/**
 * Layout of a chord diagram (R4): which frets are shown, the dots, barres and string markers.
 * Pure: no Obsidian imports, unit-tested.
 */

import { STANDARD_TUNING } from '../../parser/tuning';
import type { Voicing } from './voicings';

/** Frets a diagram shows at least, as chord books do. */
export const MIN_FRETS = 4;

export interface DotLayout {
	/** String, from 0 (low E). */
	string: number;
	/** Row from 1, the first fret shown. */
	row: number;
	/** Finger number, or null when not known. */
	finger: number | null;
}

export interface BarreLayout {
	row: number;
	from: number;
	to: number;
	finger: number | null;
}

export interface DiagramLayout {
	/** First fret shown: 1 draws the nut, anything higher is labelled beside the first row. */
	startFret: number;
	/** Rows drawn, at least `MIN_FRETS`. */
	fretCount: number;
	/** Above each string: x for muted, o for open, null for fretted. */
	markers: ('muted' | 'open' | null)[];
	dots: DotLayout[];
	barres: BarreLayout[];
}

/**
 * Lays out a fingering. Shapes that fit in the first 4 frets start at the nut; higher ones start
 * at their lowest fret. A dot on a barre's fret, inside the barre, is left to the barre.
 */
export function layoutDiagram(voicing: Voicing): DiagramLayout {
	const fretted = voicing.frets.filter((fret): fret is number => fret !== null && fret > 0);
	const highest = fretted.length > 0 ? Math.max(...fretted) : 0;
	const startFret = highest <= MIN_FRETS ? 1 : Math.min(...fretted);
	const fretCount = Math.max(MIN_FRETS, highest - startFret + 1);
	const finger = (string: number) => {
		const value = voicing.fingers?.[string];
		return value ? value : null;
	};

	const barres = voicing.barres.map((barre) => ({
		row: barre.fret - startFret + 1,
		from: barre.from,
		to: barre.to,
		finger: finger(barre.from),
	}));
	const underBarre = (string: number, fret: number) =>
		voicing.barres.some((barre) => barre.fret === fret && string >= barre.from && string <= barre.to);

	const dots: DotLayout[] = [];
	voicing.frets.forEach((fret, string) => {
		if (fret === null || fret === 0 || underBarre(string, fret)) return;
		dots.push({ string, row: fret - startFret + 1, finger: finger(string) });
	});

	const markers = voicing.frets.map((fret) => (fret === null ? 'muted' : fret === 0 ? 'open' : null));
	return { startFret, fretCount, markers, dots, barres };
}

/**
 * Text for screen readers: `C: low E muted, A fret 3, D fret 2, G open, B fret 1, high E open`.
 * Strings are named after the tuning, low to high.
 */
export function describeVoicing(
	chord: string,
	voicing: Voicing,
	tuning: readonly string[] = STANDARD_TUNING,
): string {
	const strings = voicing.frets.map((fret, string) => {
		const note = tuning[string] ?? `string ${string + 1}`;
		const name = string === 0 ? `low ${note}` : string === voicing.frets.length - 1 ? `high ${note}` : note;
		if (fret === null) return `${name} muted`;
		return fret === 0 ? `${name} open` : `${name} fret ${fret}`;
	});
	return `${chord}: ${strings.join(', ')}`;
}

/**
 * Drawing geometry in viewBox units. One unit is `UNIT_EM` em, so the drawing scales with the
 * text: a 4-fret diagram is about 5.7em wide, so 3 fit side by side on a phone.
 */
export const DIAGRAM = {
	UNIT_EM: 1 / 12,
	stringGap: 10,
	fretGap: 12,
	/** Room on the left for the base-fret number. */
	left: 13,
	right: 5,
	/** Room above the nut for the x and o markers. */
	top: 12,
	bottom: 2,
	dotRadius: 4,
	markerY: 6,
	markerSize: 2.6,
} as const;

export function diagramWidth(): number {
	return DIAGRAM.left + DIAGRAM.stringGap * 5 + DIAGRAM.right;
}

export function diagramHeight(fretCount: number): number {
	return DIAGRAM.top + DIAGRAM.fretGap * fretCount + DIAGRAM.bottom;
}

export function stringX(string: number): number {
	return DIAGRAM.left + DIAGRAM.stringGap * string;
}

/** Centre of a row, between its two fret lines. */
export function rowY(row: number): number {
	return DIAGRAM.top + DIAGRAM.fretGap * (row - 0.5);
}

export function fretY(fret: number): number {
	return DIAGRAM.top + DIAGRAM.fretGap * fret;
}
