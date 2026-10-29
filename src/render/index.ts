import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { Song } from '../model/song';
import { extractTabBlocks, LOG, renderTabs, s1log, TabMode } from './tab/spike';

export interface RenderContext {
	app: App;
	ctx: MarkdownPostProcessorContext;
	/** `performance.now()` when the code block processor was called (spike S1 timing). */
	startedAt: number;
}

/**
 * Renders a parsed song into the block element.
 * Phase 0 placeholder: shows the source so the pipeline can be checked end to end.
 * Spike S1 adds alphaTab rendering of %tab blocks below the source.
 */
export function renderSong(song: Song, el: HTMLElement, rc: RenderContext): void {
	const root = el.createDiv({ cls: 'songfolio' });
	root.createDiv({
		cls: 'songfolio-placeholder-note',
		text: `Songfolio: ${song.lines.length} lines, ${song.directives.length} directives`,
	});

	const blocks = extractTabBlocks(song.lines);
	if (blocks.length === 0) {
		root.createEl('pre', { cls: 'songfolio-source', text: song.lines.join('\n') });
		return;
	}

	const frontmatter = rc.app.metadataCache.getCache(rc.ctx.sourcePath)?.frontmatter;
	const raw: unknown = frontmatter?.['s1-mode'];
	const mode: TabMode = raw === 'eager' || raw === 'visible' ? raw : 'lazy';
	const timing = root.createDiv({ cls: 'songfolio-s1-timing', text: `Rendering ${blocks.length} tabs (${mode})…` });
	const containers = blocks.map(() => root.createDiv({ cls: 'songfolio-tab' }));

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
		timing.setText(text);
		if (pending === 0) s1log(`${rc.ctx.sourcePath}: ${text}`);
	};

	renderTabs(blocks, containers, {
		app: rc.app,
		ctx: rc.ctx,
		mode,
		tuning: frontmatter?.tuning,
		onRendered,
	}).catch((error: unknown) => {
		console.error(`${LOG} failed`, error);
		timing.setText(`Tab rendering failed: ${String(error)}`);
	});
}
