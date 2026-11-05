/**
 * Layout of a strumming pattern drawing (R6): bars, beat counts and geometry.
 * Pure: no Obsidian imports, unit-tested.
 */

import type { StrumPattern, StrumSlot } from '../../model/song';
import { barSlots, type TimeSignature } from '../../parser/strum';

/** Beat counts for one bar: `1 & 2 &` on an 8th grid, `1 e & a 2 e & a` on a 16th grid. */
export function beatLabels(grid: 8 | 16, beats: number): string[] {
	const subdivisions = grid === 8 ? ['&'] : ['e', '&', 'a'];
	const labels: string[] = [];
	for (let beat = 1; beat <= beats; beat++) labels.push(String(beat), ...subdivisions);
	return labels;
}

export interface SlotLayout {
	slot: StrumSlot;
	/** Beat count under the slot; null when the time is not supported. */
	label: string | null;
	/** True on the beat itself (`1`, `2`…), drawn stronger than `e & a`. */
	onBeat: boolean;
}

export interface PatternLayout {
	/** One entry per bar; each bar is drawn on its own so a long pattern wraps. */
	bars: SlotLayout[][];
	/** False when the slot count is not a whole number of bars. */
	fits: boolean;
}

/**
 * Cuts a pattern into bars. Counts restart each bar. With an unsupported time the whole pattern
 * is one row without counts; with a wrong slot count the last bar is short.
 */
export function layoutPattern(pattern: StrumPattern, time: TimeSignature): PatternLayout {
	if (!time.supported) {
		const row = pattern.slots.map((slot) => ({ slot, label: null, onBeat: false }));
		return { bars: [row], fits: true };
	}

	const size = barSlots(pattern.grid, time.beats);
	const labels = beatLabels(pattern.grid, time.beats);
	const perBeat = pattern.grid / 4;
	const bars: SlotLayout[][] = [];
	pattern.slots.forEach((slot, index) => {
		const position = index % size;
		if (position === 0) bars.push([]);
		bars[bars.length - 1]?.push({
			slot,
			label: labels[position] ?? null,
			onBeat: position % perBeat === 0,
		});
	});
	return { bars, fits: pattern.slots.length % size === 0 };
}

/** Text for screen readers: `Pattern A: down, rest, accented down, muted up`. */
export function describePattern(pattern: StrumPattern): string {
	const strokes = pattern.slots.map((slot) => {
		if (slot.stroke === null) return 'rest';
		return [slot.accent ? 'accented' : '', slot.muted ? 'muted' : '', slot.stroke]
			.filter((word) => word !== '')
			.join(' ');
	});
	return `Pattern ${pattern.name}: ${strokes.join(', ')}`;
}

/**
 * Drawing geometry in viewBox units. One unit is `UNIT_EM` em, so the drawing scales with the
 * text. A 16-slot bar is 18em wide, which fits a phone (about 21em at 340 px).
 */
export const GEOMETRY = {
	UNIT_EM: 1 / 11,
	/** Slot width: 8th slots are wider, as there are half as many. */
	slotWidth: { 8: 18, 16: 12 } as Record<8 | 16, number>,
	/** Space before the first slot and after the last. */
	padding: 3,
	/** Accent mark `>`, above the arrow. */
	accentTop: 1,
	accentBottom: 7,
	/** Arrow, from its tail to its tip. */
	arrowTop: 10,
	arrowBottom: 30,
	headLength: 6,
	headHalfWidth: 3.5,
	/** Baseline of the beat counts. */
	countBaseline: 41,
	/** Total height with counts, and without (unsupported time). */
	height: 44,
	heightWithoutCounts: 33,
} as const;

/** Width of a bar in viewBox units. */
export function barWidth(grid: 8 | 16, slots: number): number {
	return GEOMETRY.padding * 2 + GEOMETRY.slotWidth[grid] * slots;
}

/** Horizontal centre of slot `index` in a bar. */
export function slotCentre(grid: 8 | 16, index: number): number {
	return GEOMETRY.padding + GEOMETRY.slotWidth[grid] * (index + 0.5);
}
