import { describe, expect, it } from 'vitest';
import { cssString, pageFooterCss, printArea } from '../src/print/page';

const settings = (overrides: Record<string, unknown> = {}) => ({
	pageSize: 'A4',
	landscape: false,
	margin: '0',
	downscalePercent: 100,
	...overrides,
});

describe('print area', () => {
	it('is the A4 page inside 1 cm margins', () => {
		const area = printArea(settings());
		// 210 × 297 mm less 2 cm: S2 measured a 654 px text column after Obsidian's 2 × 32 px padding.
		expect(Math.round(area.width - 64)).toBe(654);
		expect(Math.round(area.height)).toBe(1047);
	});

	it('reads every paper size of the export dialog', () => {
		const widths = ['A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid'].map((pageSize) =>
			Math.round(printArea(settings({ pageSize })).width),
		);
		expect(widths).toEqual([1047, 718, 484, 740, 740, 980]);
	});

	it('swaps width and height in landscape', () => {
		const portrait = printArea(settings({ pageSize: 'A5' }));
		const landscape = printArea(settings({ pageSize: 'A5', landscape: true }));
		expect(landscape.width).toBeCloseTo(portrait.height);
		expect(landscape.height).toBeCloseTo(portrait.width);
	});

	it('has no margin for "minimal" and "none"', () => {
		expect(Math.round(printArea(settings({ margin: '2' })).width)).toBe(794);
		expect(Math.round(printArea(settings({ margin: '1' })).width)).toBe(794);
	});

	it('lays the page out wider when the export downscales it', () => {
		const full = printArea(settings());
		const downscaled = printArea(settings({ downscalePercent: 80 }));
		expect(downscaled.width).toBeCloseTo(full.width / 0.8);
		expect(downscaled.height).toBeCloseTo(full.height / 0.8);
	});

	it('falls back to A4 with default margins when the settings cannot be read', () => {
		const a4 = printArea(settings());
		expect(printArea(undefined)).toEqual(a4);
		expect(printArea(null)).toEqual(a4);
		expect(printArea('A5')).toEqual(a4);
		expect(printArea({})).toEqual(a4);
		expect(printArea(settings({ pageSize: 'B5', margin: 3, downscalePercent: 0, landscape: 'yes' }))).toEqual(a4);
	});
});

describe('page footer', () => {
	it('shows the title and page number from page 2 on', () => {
		const css = pageFooterCss('Greensleeves');
		expect(css).toContain('content: "Greensleeves · page " counter(page) " of " counter(pages)');
		expect(css).toContain('@page :first { @bottom-center { content: none; } }');
	});

	it('escapes the title as a CSS string', () => {
		expect(cssString('Say "hi"')).toBe('"Say \\"hi\\""');
		expect(cssString('back\\slash')).toBe('"back\\\\slash"');
		expect(cssString('two\nlines')).toBe('"two lines"');
	});
});
