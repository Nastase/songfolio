import { describe, expect, it } from 'vitest';
import { describeVoicing, layoutDiagram } from '../src/render/header/diagramLayout';
import type { Voicing } from '../src/render/header/voicings';

const voicing = (frets: (number | null)[], fingers: number[] | null = null, barres: Voicing['barres'] = []) => ({
	frets,
	fingers,
	barres,
});

describe('chord diagram layout', () => {
	it('starts at the nut when the shape fits in the first 4 frets', () => {
		const layout = layoutDiagram(voicing([null, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]));
		expect(layout).toEqual({
			startFret: 1,
			fretCount: 4,
			markers: ['muted', null, null, 'open', null, 'open'],
			dots: [
				{ string: 1, row: 3, finger: 3 },
				{ string: 2, row: 2, finger: 2 },
				{ string: 4, row: 1, finger: 1 },
			],
			barres: [],
		});
	});

	it('starts at the lowest fret when the shape goes above fret 4', () => {
		const layout = layoutDiagram(voicing([null, 3, 5, 5, 5, 3]));
		expect(layout.startFret).toBe(3);
		expect(layout.fretCount).toBe(4);
		expect(layout.dots.map((dot) => dot.row)).toEqual([1, 3, 3, 3, 1]);
	});

	it('draws more rows for a wide shape', () => {
		expect(layoutDiagram(voicing([1, null, null, null, null, 6])).fretCount).toBe(6);
		expect(layoutDiagram(voicing([null, 7, null, null, null, 12])).fretCount).toBe(6);
	});

	it('leaves dots on a barre to the barre, and keeps the ones above it', () => {
		const layout = layoutDiagram(
			voicing([1, 3, 3, 2, 1, 1], [1, 3, 4, 2, 1, 1], [{ fret: 1, from: 0, to: 5 }]),
		);
		expect(layout.barres).toEqual([{ row: 1, from: 0, to: 5, finger: 1 }]);
		expect(layout.dots).toEqual([
			{ string: 1, row: 3, finger: 3 },
			{ string: 2, row: 3, finger: 4 },
			{ string: 3, row: 2, finger: 2 },
		]);
	});

	it('places a barre on its row when the diagram starts higher', () => {
		const layout = layoutDiagram(voicing([8, 10, 10, 9, 8, 8], null, [{ fret: 8, from: 0, to: 5 }]));
		expect(layout.startFret).toBe(8);
		expect(layout.barres).toEqual([{ row: 1, from: 0, to: 5, finger: null }]);
	});

	it('shows no finger numbers when they are not known', () => {
		const layout = layoutDiagram(voicing([3, 2, 0, 0, 0, 3]));
		expect(layout.dots.every((dot) => dot.finger === null)).toBe(true);
	});

	it('handles a shape with only open and muted strings', () => {
		expect(layoutDiagram(voicing([0, 0, 0, 0, null, null]))).toMatchObject({ startFret: 1, fretCount: 4, dots: [] });
	});
});

describe('chord diagram description', () => {
	it('names every string from low to high', () => {
		expect(describeVoicing('C', voicing([null, 3, 2, 0, 1, 0]))).toBe(
			'C: low E muted, A fret 3, D fret 2, G open, B fret 1, high E open',
		);
	});

	it('names the strings after the tuning', () => {
		expect(describeVoicing('G', voicing([5, 2, 0, 0, 0, 3]), ['D', 'A', 'D', 'G', 'B', 'E'])).toBe(
			'G: low D fret 5, A fret 2, D open, G open, B open, high E fret 3',
		);
	});
});
