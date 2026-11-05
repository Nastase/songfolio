import { describe, expect, it } from 'vitest';
import { parsePattern, parseTime } from '../src/parser/strum';
import {
	barWidth,
	beatLabels,
	describePattern,
	GEOMETRY,
	layoutPattern,
	slotCentre,
} from '../src/render/strum/layout';

const pattern = (args: string) => {
	const { pattern } = parsePattern(args, 1);
	if (!pattern) throw new Error(`Bad pattern: ${args}`);
	return pattern;
};

describe('beatLabels', () => {
	it('counts 1 & 2 & on an 8th grid', () => {
		expect(beatLabels(8, 4)).toEqual(['1', '&', '2', '&', '3', '&', '4', '&']);
		expect(beatLabels(8, 3)).toEqual(['1', '&', '2', '&', '3', '&']);
	});

	it('counts 1 e & a on a 16th grid', () => {
		expect(beatLabels(16, 2)).toEqual(['1', 'e', '&', 'a', '2', 'e', '&', 'a']);
	});
});

describe('layoutPattern', () => {
	it('cuts a pattern into bars and restarts the counts each bar', () => {
		const layout = layoutPattern(pattern('L 8: d.du .udu d.du .udu'), parseTime('4/4'));
		expect(layout.fits).toBe(true);
		expect(layout.bars).toHaveLength(2);
		expect(layout.bars[1]?.map((s) => s.label)).toEqual(['1', '&', '2', '&', '3', '&', '4', '&']);
	});

	it('marks the slots on the beat', () => {
		const layout = layoutPattern(pattern('S 16: D.du .udu X.du .udu'), parseTime(null));
		expect(layout.bars[0]?.slice(0, 5).map((s) => s.onBeat)).toEqual([true, false, false, false, true]);
	});

	it('uses the time signature', () => {
		const layout = layoutPattern(pattern('W 8: d.du du'), parseTime('3/4'));
		expect(layout.bars).toHaveLength(1);
		expect(layout.fits).toBe(true);
	});

	it('leaves a short last bar when the count is wrong', () => {
		const layout = layoutPattern(pattern('Bad 8: d.du .ud'), parseTime(null));
		expect(layout.fits).toBe(false);
		expect(layout.bars.map((bar) => bar.length)).toEqual([7]);
	});

	it('does not fit when a | is inside a bar', () => {
		expect(layoutPattern(pattern('S 8: d.du | .udu'), parseTime(null)).fits).toBe(false);
	});

	it('draws one row without counts when the time is not supported', () => {
		const layout = layoutPattern(pattern('C 8: d.du .udu d.du .udu'), parseTime('6/8'));
		expect(layout.bars).toHaveLength(1);
		expect(layout.bars[0]?.every((s) => s.label === null)).toBe(true);
	});
});

describe('describePattern', () => {
	it('names each stroke for screen readers', () => {
		expect(describePattern(pattern('A 8: D.ux'))).toBe('Pattern A: accented down, rest, up, muted up');
	});
});

describe('geometry', () => {
	it('fits a 16-slot bar on a phone', () => {
		// About 21em of text width at 340 px.
		expect(barWidth(16, 16) * GEOMETRY.UNIT_EM).toBeLessThanOrEqual(19);
		expect(slotCentre(8, 0)).toBeGreaterThan(0);
	});
});
