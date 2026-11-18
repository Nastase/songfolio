import { describe, expect, it } from 'vitest';
import { formatDuration, readDuration, readMeta } from '../src/parser/properties';
import { leadIn, lineHeightOf, scrollSpeed, step } from '../src/render/scroll/speed';

describe('the duration property', () => {
	it('reads m:ss and h:mm:ss', () => {
		expect(readDuration('3:45')).toBe(225);
		expect(readDuration(' 10:05 ')).toBe(605);
		expect(readDuration('1:02:03')).toBe(3723);
	});

	it('reads a number of seconds, as YAML 1.1 reads an unquoted 3:45', () => {
		expect(readDuration(225)).toBe(225);
		expect(readDuration('200')).toBe(200);
	});

	it('is null when empty, zero or unreadable', () => {
		for (const value of [null, '', '0:00', 0, -5, '3:75', 'three minutes', {}]) {
			expect(readDuration(value)).toBeNull();
		}
	});

	it('is part of the header data and formats back to m:ss', () => {
		expect(readMeta({ duration: '4:05' }, 'x').duration).toBe(245);
		expect(formatDuration(245)).toBe('4:05');
		expect(formatDuration(3723)).toBe('1:02:03');
	});
});

describe('autoscroll speed', () => {
	const measure = { bodyHeight: 2600, viewHeight: 800, lineHeight: 24, linesPerMinute: 30 };

	it('with a duration, scrolls the body less one screen in that time', () => {
		expect(scrollSpeed({ ...measure, duration: 180 })).toBe(10);
		expect(scrollSpeed({ ...measure, bodyHeight: 500, duration: 180 })).toBe(0);
	});

	it('without one, scrolls the set lines per minute', () => {
		expect(scrollSpeed({ ...measure, duration: null })).toBe(12);
	});

	it('reads the line height in pixels', () => {
		expect(lineHeightOf('24px', '16px')).toBe(24);
		expect(lineHeightOf('1.25', '16px')).toBe(20);
		expect(lineHeightOf('normal', '16px')).toBe(24);
	});

	it('keeps fractions of pixels between frames and caps long pauses', () => {
		let carry = 0;
		let pixels = 0;
		for (let frame = 0; frame < 60; frame++) {
			const moved = step(carry, 12, 1 / 60);
			carry = moved.carry;
			pixels += moved.pixels;
		}
		expect(pixels + carry).toBeCloseTo(12);
		expect(carry).toBeLessThan(1);
		expect(step(0, 12, 5).pixels).toBe(1);
	});
});

describe('autoscroll lead-in', () => {
	it('brings the first line to the top in about half a second, never past it', () => {
		let gap = 600;
		let frames = 0;
		while (gap > 0 && frames < 1000) {
			const pixels = leadIn(gap, 1 / 60);
			expect(pixels).toBeGreaterThan(0);
			expect(pixels).toBeLessThanOrEqual(Math.ceil(gap));
			gap -= pixels;
			frames++;
		}
		expect(gap).toBeLessThanOrEqual(0);
		expect(frames).toBeLessThan(90);
	});

	it('moves on the first frame and caps long pauses', () => {
		expect(leadIn(600, 0)).toBe(1);
		expect(leadIn(600, 5)).toBe(leadIn(600, 0.1));
		expect(leadIn(0.5, 1 / 60)).toBe(1);
		expect(leadIn(0, 1 / 60)).toBe(0);
		expect(leadIn(-20, 1 / 60)).toBe(0);
	});
});
