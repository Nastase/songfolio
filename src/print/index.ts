/**
 * Obsidian's native "Export to PDF" (spike S2): it renders the note into a hidden window under
 * `body > .print`, waits for the promises code block handlers return, then prints.
 */

/** A stuck tab must never hang the export. */
const EXPORT_TIMEOUT_MS = 10_000;

/** True when the block is rendered for "Export to PDF". The block is already attached then. */
export function isPrinting(el: HTMLElement): boolean {
	return el.closest('.print') !== null;
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
