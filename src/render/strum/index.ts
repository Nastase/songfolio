import type { StrumPattern } from '../../model/song';
import type { TimeSignature } from '../../parser/strum';
import {
	GEOMETRY as G,
	barWidth,
	describePattern,
	layoutPattern,
	slotCentre,
	type SlotLayout,
} from './layout';

export interface PatternOptions {
	/** Smaller drawing, for `%strum <name> +draw` inside a section. */
	compact?: boolean;
}

/**
 * Draws a strumming pattern as SVG (R6): one drawing per bar, so a long pattern wraps on a
 * narrow screen. Colours come from CSS classes, so the drawing follows the theme and the print
 * style.
 */
export function renderPattern(
	pattern: StrumPattern,
	time: TimeSignature,
	el: HTMLElement,
	options: PatternOptions = {},
): HTMLElement {
	const layout = layoutPattern(pattern, time);
	const box = el.createDiv({
		cls: 'songfolio-strum',
		attr: { role: 'img', 'aria-label': describePattern(pattern) },
	});
	box.toggleClass('songfolio-strum-compact', options.compact === true);
	box.toggleClass('songfolio-strum-invalid', !layout.fits);

	const height = time.supported ? G.height : G.heightWithoutCounts;
	layout.bars.forEach((bar, barIndex) => {
		const width = barWidth(pattern.grid, bar.length);
		const svg = box.createSvg('svg', {
			cls: 'songfolio-strum-bar',
			attr: {
				viewBox: `0 0 ${width} ${height}`,
				width: `${width * G.UNIT_EM}em`,
				height: `${height * G.UNIT_EM}em`,
				'aria-hidden': 'true',
			},
		});
		bar.forEach((slot, index) => drawSlot(svg, slot, slotCentre(pattern.grid, index)));
		if (barIndex < layout.bars.length - 1) {
			line(svg, 'songfolio-strum-barline', width - 0.5, G.arrowTop, width - 0.5, G.arrowBottom);
		}
	});
	return box;
}

function drawSlot(svg: SVGSVGElement, { slot, label, onBeat }: SlotLayout, x: number): void {
	if (label !== null) {
		const text = svg.createSvg('text', {
			cls: onBeat ? 'songfolio-strum-count songfolio-strum-beat' : 'songfolio-strum-count',
			attr: { x, y: G.countBaseline, 'text-anchor': 'middle', 'font-size': onBeat ? 9 : 8 },
		});
		text.setText(label);
	}

	if (slot.stroke === null) {
		svg.createSvg('circle', {
			cls: 'songfolio-strum-rest',
			attr: { cx: x, cy: (G.arrowTop + G.arrowBottom) / 2, r: 1.3 },
		});
		return;
	}

	const group = svg.createSvg('g', {
		cls: slot.accent ? 'songfolio-strum-stroke songfolio-strum-accent' : 'songfolio-strum-stroke',
	});
	const down = slot.stroke === 'down';
	const tail = down ? G.arrowTop : G.arrowBottom;
	const tip = down ? G.arrowBottom : G.arrowTop;
	const headBase = down ? tip - G.headLength : tip + G.headLength;

	line(group, 'songfolio-strum-shaft', x, tail, x, headBase);
	group.createSvg('path', {
		cls: 'songfolio-strum-head',
		attr: {
			d: `M ${x - G.headHalfWidth} ${headBase} L ${x + G.headHalfWidth} ${headBase} L ${x} ${tip} Z`,
		},
	});

	if (slot.muted) {
		// An × across the middle of the shaft.
		const mid = (tail + headBase) / 2;
		const size = 3;
		line(group, 'songfolio-strum-mute', x - size, mid - size, x + size, mid + size);
		line(group, 'songfolio-strum-mute', x - size, mid + size, x + size, mid - size);
	}

	if (slot.accent) {
		group.createSvg('path', {
			cls: 'songfolio-strum-accent-mark',
			attr: {
				d: `M ${x - 3} ${G.accentTop} L ${x + 3} ${(G.accentTop + G.accentBottom) / 2} L ${x - 3} ${G.accentBottom}`,
			},
		});
	}
}

function line(
	parent: SVGElement,
	cls: string,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): void {
	parent.createSvg('line', { cls, attr: { x1, y1, x2, y2 } });
}
