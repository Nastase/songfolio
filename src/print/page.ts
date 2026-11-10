/**
 * The page "Export to PDF" prints on, from the options its dialog saves (`pdfExportSettings`).
 * Pure, so it is unit-tested without Obsidian.
 */

/** Where content is laid out on one printed page, in CSS px (96 per inch). */
export interface PrintArea {
	width: number;
	height: number;
}

/** Paper sizes offered by the export dialog, portrait, in mm (as Electron prints them). */
const PAPER_MM: Record<string, readonly [number, number]> = {
	A3: [297, 420],
	A4: [210, 297],
	A5: [148, 210],
	Legal: [215.9, 355.6],
	Letter: [215.9, 279.4],
	Tabloid: [279.4, 431.8],
};

const PX_PER_MM = 96 / 25.4;

/** Electron's default margin, 1 cm on every side. "Minimal" and "None" both print without margin. */
const DEFAULT_MARGIN_PX = 10 * PX_PER_MM;

/** What the export uses when the settings cannot be read: A4 portrait, default margins, 100 %. */
const FALLBACK = { pageSize: 'A4', landscape: false, margin: '0', downscalePercent: 100 };

/**
 * The area inside the margins, in the px the page is laid out in: downscaling to 80 % lays the
 * content out 1 / 0.8 wider and taller. Values that cannot be read fall back to A4 defaults.
 */
export function printArea(settings: unknown): PrintArea {
	const given = typeof settings === 'object' && settings !== null ? (settings as Record<string, unknown>) : {};
	const pageSize = typeof given.pageSize === 'string' && given.pageSize in PAPER_MM ? given.pageSize : FALLBACK.pageSize;
	const landscape = typeof given.landscape === 'boolean' ? given.landscape : FALLBACK.landscape;
	const margin = given.margin === '0' || given.margin === '1' || given.margin === '2' ? given.margin : FALLBACK.margin;
	const percent =
		typeof given.downscalePercent === 'number' && given.downscalePercent >= 10 && given.downscalePercent <= 100
			? given.downscalePercent
			: FALLBACK.downscalePercent;

	const [short, long] = PAPER_MM[pageSize] ?? [210, 297];
	const [widthMm, heightMm] = landscape ? [long, short] : [short, long];
	const marginPx = margin === '0' ? DEFAULT_MARGIN_PX : 0;
	const scale = percent / 100;
	return {
		width: (widthMm * PX_PER_MM - 2 * marginPx) / scale,
		height: (heightMm * PX_PER_MM - 2 * marginPx) / scale,
	};
}
