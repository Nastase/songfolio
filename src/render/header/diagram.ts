import { setTooltip } from 'obsidian';
import {
	DIAGRAM as D,
	describeVoicing,
	diagramHeight,
	diagramWidth,
	fretY,
	layoutDiagram,
	MIN_FRETS,
	rowY,
	stringX,
	type DiagramLayout,
} from './diagramLayout';
import type { ChordDiagram } from './voicings';

/**
 * Draws one chord: its name over a diagram of the fingering shown (R4), or a placeholder when
 * the chord library has none and there is no `%shape`. Colours come from CSS classes, so the
 * drawing follows the theme and the print style.
 */
export function renderChord(
	diagram: ChordDiagram,
	tuning: readonly string[],
	el: HTMLElement,
): HTMLElement {
	const card = el.createDiv({ cls: 'songfolio-diagram' });
	card.createDiv({ cls: 'songfolio-diagram-name', text: diagram.chord.text });

	const { shown } = diagram;
	if (!shown) {
		card.addClass('songfolio-diagram-missing');
		const message = `${diagram.chord.text} is not in the chord library. Add a %shape line for it.`;
		drawPlaceholder(card, message);
		const caption = card.createDiv({ cls: 'songfolio-diagram-caption', text: 'Add %shape' });
		setTooltip(caption, message);
		return card;
	}

	drawDiagram(card, layoutDiagram(shown), describeVoicing(diagram.chord.text, shown, tuning));
	return card;
}

function createDiagramSvg(el: HTMLElement, fretCount: number, label: string): SVGSVGElement {
	const width = diagramWidth();
	const height = diagramHeight(fretCount);
	return el.createSvg('svg', {
		cls: 'songfolio-diagram-svg',
		attr: {
			viewBox: `0 0 ${width} ${height}`,
			width: `${width * D.UNIT_EM}em`,
			height: `${height * D.UNIT_EM}em`,
			role: 'img',
			'aria-label': label,
		},
	});
}

function drawGrid(svg: SVGSVGElement, fretCount: number, nut: boolean): void {
	for (let string = 0; string < 6; string++) {
		line(svg, 'songfolio-diagram-string', stringX(string), fretY(0), stringX(string), fretY(fretCount));
	}
	for (let fret = 0; fret <= fretCount; fret++) {
		const cls = fret === 0 && nut ? 'songfolio-diagram-nut' : 'songfolio-diagram-fret';
		line(svg, cls, stringX(0), fretY(fret), stringX(5), fretY(fret));
	}
}

function drawDiagram(el: HTMLElement, layout: DiagramLayout, label: string): void {
	const svg = createDiagramSvg(el, layout.fretCount, label);
	drawGrid(svg, layout.fretCount, layout.startFret === 1);

	if (layout.startFret > 1) {
		text(svg, 'songfolio-diagram-base-fret', String(layout.startFret), D.left - 5, rowY(1) + 2.5, 'end');
	}

	layout.markers.forEach((marker, string) => {
		const x = stringX(string);
		const y = D.markerY;
		const size = D.markerSize;
		if (marker === 'open') {
			svg.createSvg('circle', { cls: 'songfolio-diagram-open', attr: { cx: x, cy: y, r: size } });
		} else if (marker === 'muted') {
			line(svg, 'songfolio-diagram-muted', x - size, y - size, x + size, y + size);
			line(svg, 'songfolio-diagram-muted', x - size, y + size, x + size, y - size);
		}
	});

	for (const barre of layout.barres) {
		const y = rowY(barre.row);
		const x = stringX(barre.from) - D.dotRadius;
		svg.createSvg('rect', {
			cls: 'songfolio-diagram-barre',
			attr: {
				x,
				y: y - D.dotRadius,
				width: stringX(barre.to) - stringX(barre.from) + D.dotRadius * 2,
				height: D.dotRadius * 2,
				rx: D.dotRadius,
			},
		});
		if (barre.finger !== null) {
			text(svg, 'songfolio-diagram-finger', String(barre.finger), stringX(barre.from), y + 2, 'middle');
		}
	}

	for (const dot of layout.dots) {
		const x = stringX(dot.string);
		const y = rowY(dot.row);
		svg.createSvg('circle', { cls: 'songfolio-diagram-dot', attr: { cx: x, cy: y, r: D.dotRadius } });
		if (dot.finger !== null) text(svg, 'songfolio-diagram-finger', String(dot.finger), x, y + 2, 'middle');
	}
}

function drawPlaceholder(el: HTMLElement, label: string): void {
	const svg = createDiagramSvg(el, MIN_FRETS, label);
	drawGrid(svg, MIN_FRETS, true);
	const centre = (stringX(0) + stringX(5)) / 2;
	text(svg, 'songfolio-diagram-unknown', '?', centre, fretY(MIN_FRETS / 2) + 6, 'middle');
}

function line(parent: SVGElement, cls: string, x1: number, y1: number, x2: number, y2: number): void {
	parent.createSvg('line', { cls, attr: { x1, y1, x2, y2 } });
}

function text(
	parent: SVGElement,
	cls: string,
	value: string,
	x: number,
	y: number,
	anchor: 'start' | 'middle' | 'end',
): void {
	parent.createSvg('text', { cls, attr: { x, y, 'text-anchor': anchor } }).setText(value);
}
