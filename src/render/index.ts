import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { Song } from '../model/song';
import { extractTabBlocks, LOG, PrintMode, renderTabs, s1log, s2log, TabMode } from './tab/spike';

export interface RenderContext {
	app: App;
	ctx: MarkdownPostProcessorContext;
	/** `performance.now()` when the code block processor was called (spike S1 timing). */
	startedAt: number;
}

/** Spike S2: longest time "Export to PDF" waits for tabs before printing anyway. */
const PRINT_TIMEOUT_MS = 10_000;

/**
 * Renders a parsed song into the block element.
 * Phase 0 placeholder: source text in order, with spike stand-ins:
 * S1 renders %tab blocks with alphaTab; S2 draws a fixed-size box for each %pattern line
 * (to test page breaks) and, during "Export to PDF", returns a promise so the export
 * waits for every tab.
 */
export function renderSong(song: Song, el: HTMLElement, rc: RenderContext): Promise<void> | void {
	const root = el.createDiv({ cls: 'songfolio' });
	root.createDiv({
		cls: 'songfolio-placeholder-note',
		text: `Songfolio: ${song.lines.length} lines, ${song.directives.length} directives`,
	});

	const blocks = extractTabBlocks(song.lines);
	const frontmatter = rc.app.metadataCache.getCache(rc.ctx.sourcePath)?.frontmatter;
	const raw: unknown = frontmatter?.['s1-mode'];
	const mode: TabMode = raw === 'eager' || raw === 'visible' ? raw : 'lazy';
	const printMode: PrintMode = frontmatter?.['s2-print'] === 'naive' ? 'naive' : 'await';
	const rawWidth: unknown = frontmatter?.['s2-width'];
	// Spike S2 defaults: the A4 text column with default margins, 2 bars a row, rows in flow.
	const printWidth = typeof rawWidth === 'number' && rawWidth >= 0 ? rawWidth || null : 654;
	const rawScale: unknown = frontmatter?.['s2-scale'];
	const printScale = typeof rawScale === 'number' && rawScale > 0 ? rawScale : 0.8;
	const rawBreaks: unknown = frontmatter?.['s2-breaks'];
	const printBreaks = rawBreaks === 'rows' || rawBreaks === 'block' ? rawBreaks : 'keep';
	// During "Export to PDF" the block is already attached inside the hidden print window.
	const print = el.closest('.print') !== null;
	if (print) s2log(`${rc.ctx.sourcePath}: print render, ${blocks.length} tabs, ${printMode}`);

	const timing =
		blocks.length > 0
			? root.createDiv({ cls: 'songfolio-s1-timing', text: `Rendering ${blocks.length} tabs (${mode})…` })
			: null;
	const containers = layoutLines(song.lines, root);
	if (blocks.length === 0 || !timing) return;

	let pending = blocks.length;
	let first: number | null = null;
	const onRendered = () => {
		const ms = Math.round(performance.now() - rc.startedAt);
		first ??= ms;
		pending--;
		const done = blocks.length - pending;
		const text =
			pending > 0
				? `${done}/${blocks.length} tabs (${mode}): first ${first} ms, latest ${ms} ms`
				: `${blocks.length} tabs (${mode}): first ${first} ms, all ${ms} ms`;
		timing.setText(print ? `${text} [print, ${printMode}]` : text);
		if (pending === 0) s1log(`${rc.ctx.sourcePath}: ${text}`);
	};

	const rendered = renderTabs(blocks, containers, {
		app: rc.app,
		ctx: rc.ctx,
		mode,
		tuning: frontmatter?.tuning,
		print,
		printMode,
		printWidth,
		printScale,
		printBreaks,
		onRendered,
	}).catch((error: unknown) => {
		console.error(`${LOG} failed`, error);
		timing.setText(`Tab rendering failed: ${String(error)}`);
	});

	if (!print || printMode !== 'await') return;
	return new Promise<void>((resolve) => {
		const timer = window.setTimeout(() => {
			s2log(`${rc.ctx.sourcePath}: gave up waiting after ${PRINT_TIMEOUT_MS} ms`);
			resolve();
		}, PRINT_TIMEOUT_MS);
		void rendered.then(() => {
			window.clearTimeout(timer);
			s2log(`${rc.ctx.sourcePath}: all tabs ready for print after ${Math.round(performance.now() - rc.startedAt)} ms`);
			resolve();
		});
	});
}

/**
 * Lays the block out in source order: text lines as preformatted text, a stand-in box per
 * `%pattern` line, and an empty container per `%tab` block. Returns the tab containers.
 */
function layoutLines(lines: string[], root: HTMLElement): HTMLElement[] {
	const containers: HTMLElement[] = [];
	let text: string[] = [];
	let inTab = false;
	const flush = () => {
		if (text.length > 0) root.createEl('pre', { cls: 'songfolio-source', text: text.join('\n') });
		text = [];
	};
	for (const line of lines) {
		const trimmed = line.trim();
		if (inTab) {
			if (trimmed === '%endtab') inTab = false;
		} else if (trimmed === '%tab') {
			flush();
			inTab = true;
			containers.push(root.createDiv({ cls: 'songfolio-tab' }));
		} else if (trimmed.startsWith('%pattern')) {
			flush();
			root.createDiv({ cls: 'songfolio-strum', text: `Strum stand-in: ${trimmed}` });
		} else {
			text.push(line);
		}
	}
	flush();
	return containers;
}
