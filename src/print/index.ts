/**
 * Obsidian's native "Export to PDF" (spike S2): it renders the note into a hidden window under
 * `body > .print`, waits for the promises code block handlers return, then prints.
 */

import type { App } from 'obsidian';
import { printArea } from './page';

/** A stuck tab must never hang the export. */
const EXPORT_TIMEOUT_MS = 10_000;

/** Obsidian's padding on each side of an exported note, when it cannot be measured. */
const FALLBACK_PADDING_PX = 32;

/** The page a block is printed on, in CSS px. */
export interface PrintPage {
	/** Width of the text column: tabs are drawn this wide. */
	width: number;
	/** Height of the printed area of one page. */
	height: number;
}

/** True when the block is rendered for "Export to PDF". The block is already attached then. */
export function isPrinting(el: HTMLElement): boolean {
	return el.closest('.print') !== null;
}

/**
 * The page chosen in the export dialog, which saves its options before the note is rendered.
 * `getConfig` is not part of Obsidian's published API: anything unexpected gives A4.
 */
export function readPrintPage(app: App, el: HTMLElement): PrintPage {
	let settings: unknown = null;
	try {
		const vault = app.vault as unknown as { getConfig?: (key: string) => unknown };
		settings = vault.getConfig?.('pdfExportSettings');
	} catch {
		// Keep the fallback.
	}
	const area = printArea(settings);
	return { width: Math.floor(area.width - horizontalPadding(el)), height: Math.floor(area.height) };
}

/** Obsidian pads the exported note on both sides; the text column is what is left. */
function horizontalPadding(el: HTMLElement): number {
	const view = el.closest('.markdown-preview-view');
	if (!view) return 2 * FALLBACK_PADDING_PX;
	const style = el.win.getComputedStyle(view);
	const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
	return Number.isFinite(padding) ? padding : 2 * FALLBACK_PADDING_PX;
}

/** Settles when `ready` does, or after the timeout: the export then goes on with what is drawn. */
export function waitForExport(ready: Promise<void>, win: Window): Promise<void> {
	return new Promise((resolve) => {
		const timer = win.setTimeout(() => {
			console.warn('Songfolio: a tab took too long to draw for the PDF export');
			resolve();
		}, EXPORT_TIMEOUT_MS);
		void ready.then(() => {
			win.clearTimeout(timer);
			resolve();
		});
	});
}

/**
 * Paper cannot scroll: an ASCII tab wider than the text column, or a chord line with a group that
 * cannot wrap, is scaled down to fit (`zoom`). Measured in the export window, which is wider than
 * the page.
 */
export function fitWideParts(root: HTMLElement, width: number): void {
	root.querySelectorAll<HTMLElement>('.songfolio-ascii').forEach((el) => fitToWidth(el, width, maxContentWidth(el)));
	root.querySelectorAll<HTMLElement>('.songfolio-line').forEach((el) => fitToWidth(el, width, widestGroup(el)));
}

function fitToWidth(el: HTMLElement, width: number, natural: number): void {
	if (natural <= width) return;
	el.setCssProps({ zoom: String(Math.floor((width / natural) * 1000) / 1000) });
}

/** Width of the element without wrapping or scrolling. */
function maxContentWidth(el: HTMLElement): number {
	el.setCssProps({ width: 'max-content' });
	const width = el.getBoundingClientRect().width;
	el.setCssProps({ width: '' });
	return width;
}

/** A chord line wraps between its groups; only a group wider than the page needs scaling. */
function widestGroup(line: HTMLElement): number {
	let widest = 0;
	line.querySelectorAll<HTMLElement>('.songfolio-group').forEach((group) => {
		widest = Math.max(widest, group.getBoundingClientRect().width);
	});
	return widest;
}
