import { MarkdownRenderChild, type App, type MarkdownPostProcessorContext } from 'obsidian';
import type { ParseError, SongMeta } from '../model/song';
import { parseSong } from '../parser';
import { readMeta, sameMeta } from '../parser/properties';
import type { LyricsFont } from '../settings';
import { renderHeader } from './header';
import { renderSections } from './lyrics';

/** What a block needs from the plugin. */
export interface SongBlockHost {
	app: App;
	settings: { lyricsFont: LyricsFont };
	/** Blocks on screen, so a settings change can reach them. */
	blocks: Set<SongBlock>;
}

/**
 * One rendered songsheet block. Lives as long as the block is on screen; its listeners are
 * removed when Obsidian unloads it.
 */
export class SongBlock extends MarkdownRenderChild {
	private sourcePath: string;
	private meta: SongMeta | null = null;
	private headerEl: HTMLElement | null = null;
	/** Frontmatter given with the block; the metadata cache can lag behind it. */
	private readonly initialFrontmatter: unknown;

	constructor(
		containerEl: HTMLElement,
		private readonly host: SongBlockHost,
		private readonly source: string,
		ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
		this.sourcePath = ctx.sourcePath;
		this.initialFrontmatter = ctx.frontmatter as unknown;
	}

	onload(): void {
		this.host.blocks.add(this);
		this.render();

		const { metadataCache, vault } = this.host.app;
		this.registerEvent(
			metadataCache.on('changed', (file) => {
				if (file.path === this.sourcePath) this.updateHeader();
			}),
		);
		this.registerEvent(
			vault.on('rename', (file, oldPath) => {
				if (oldPath !== this.sourcePath) return;
				this.sourcePath = file.path;
				this.updateHeader();
			}),
		);
	}

	onunload(): void {
		this.host.blocks.delete(this);
	}

	/** Applies settings that only change styling, without parsing again. */
	applySettings(): void {
		this.containerEl
			.querySelector('.songfolio')
			?.toggleClass('songfolio-font-text', this.host.settings.lyricsFont === 'text');
	}

	private render(): void {
		const song = parseSong(this.source);
		const root = this.containerEl.createDiv({ cls: 'songfolio' });
		root.toggleClass('songfolio-font-text', this.host.settings.lyricsFont === 'text');

		if (song.errors.length > 0) renderErrors(song.errors, root);

		this.headerEl = root.createDiv({ cls: 'songfolio-header' });
		this.meta = readMeta(this.initialFrontmatter ?? this.cachedFrontmatter(), this.basename());
		renderHeader(this.meta, this.headerEl);

		renderSections(song.sections, root.createDiv({ cls: 'songfolio-body' }));
	}

	/** Redraws only the header, and only when the properties it shows changed. */
	private updateHeader(): void {
		if (!this.headerEl) return;
		const meta = readMeta(this.cachedFrontmatter(), this.basename());
		if (this.meta && sameMeta(meta, this.meta)) return;
		this.meta = meta;
		this.headerEl.empty();
		renderHeader(meta, this.headerEl);
	}

	private cachedFrontmatter(): unknown {
		return this.host.app.metadataCache.getCache(this.sourcePath)?.frontmatter;
	}

	private basename(): string {
		const name = this.sourcePath.split('/').pop() ?? this.sourcePath;
		return name.replace(/\.md$/i, '');
	}
}

function renderErrors(errors: readonly ParseError[], el: HTMLElement): void {
	const list = el.createEl('ul', { cls: 'songfolio-errors' });
	for (const error of errors) {
		list.createEl('li', { text: `Line ${error.line}: ${error.message}` });
	}
}
