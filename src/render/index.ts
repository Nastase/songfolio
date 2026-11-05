import { MarkdownRenderChild, MarkdownView, TFile, type App, type MarkdownPostProcessorContext } from 'obsidian';
import type { ParseError, Song, SongMeta } from '../model/song';
import { parseSong } from '../parser';
import { readMeta, sameMeta } from '../parser/properties';
import { byLine, checkStrumming, parseTime } from '../parser/strum';
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
	/** The block source never changes for this child: Obsidian makes a new one when it does. */
	private readonly song: Song;
	/** Frontmatter given with the block; the metadata cache can lag behind it. */
	private readonly initialFrontmatter: unknown;
	private readonly ctx: MarkdownPostProcessorContext;

	constructor(
		containerEl: HTMLElement,
		private readonly host: SongBlockHost,
		source: string,
		ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
		this.sourcePath = ctx.sourcePath;
		this.ctx = ctx;
		this.initialFrontmatter = ctx.frontmatter as unknown;
		this.song = parseSong(source);
	}

	onload(): void {
		this.host.blocks.add(this);
		this.meta = readMeta(this.initialFrontmatter ?? this.cachedFrontmatter(), this.basename());
		this.render(this.meta);

		const { metadataCache, vault } = this.host.app;
		this.registerEvent(
			metadataCache.on('changed', (file) => {
				if (file.path === this.sourcePath) this.update();
			}),
		);
		this.registerEvent(
			vault.on('rename', (file, oldPath) => {
				if (oldPath !== this.sourcePath) return;
				this.sourcePath = file.path;
				this.update();
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

	private render(meta: SongMeta): void {
		const { song } = this;
		const root = this.containerEl.createDiv({ cls: 'songfolio' });
		root.toggleClass('songfolio-font-text', this.host.settings.lyricsFont === 'text');

		const time = parseTime(meta.time);
		const errors = [...song.errors, ...checkStrumming(song, time)].sort(byLine);
		if (errors.length > 0) renderErrors(errors, root);

		renderHeader(meta, song.patterns, time, root.createDiv({ cls: 'songfolio-header' }));
		this.spikeButtons(root);
		renderSections(song.sections, time, root.createDiv({ cls: 'songfolio-body' }));
	}

	/**
	 * Redraws the block when a property it uses changed. The whole block, not just the header:
	 * `time` changes the slot-count errors and the pattern drawings.
	 */
	private update(): void {
		const meta = readMeta(this.cachedFrontmatter(), this.basename());
		if (this.meta && sameMeta(meta, this.meta)) return;
		this.meta = meta;
		this.containerEl.empty();
		this.render(meta);
	}

	// SPIKE S3: throwaway buttons to test taps and writes from a rendered block.
	private spikeButtons(root: HTMLElement): void {
		const bar = root.createDiv({ cls: 'songfolio-spike' });
		const log = (...args: unknown[]) => console.log('[S3]', ...args);
		const write = (via: 'editor' | 'vault') => async (event: MouseEvent) => {
			log('click', via, event.type, 'target', (event.target as HTMLElement).tagName);
			const info = this.ctx.getSectionInfo(this.containerEl);
			log('sectionInfo', info ? { lineStart: info.lineStart, lineEnd: info.lineEnd } : null);
			if (!info) return;
			const line = `%shape C x3201${via === 'editor' ? '0' : '1'}`;
			const views = this.host.app.workspace.getLeavesOfType('markdown')
				.map((leaf) => leaf.view)
				.filter((view): view is MarkdownView => view instanceof MarkdownView && view.file?.path === this.sourcePath);
			log('open views', views.length, views.map((v) => v.getMode()));
			if (via === 'editor' && views[0]) {
				views[0].editor.replaceRange(line + '\n', { line: info.lineStart + 1, ch: 0 });
				log('wrote via editor');
				return;
			}
			const file = this.host.app.vault.getAbstractFileByPath(this.sourcePath);
			if (!(file instanceof TFile)) return;
			await this.host.app.vault.process(file, (data) => {
				const lines = data.split('\n');
				lines.splice(info.lineStart + 1, 0, line);
				return lines.join('\n');
			});
			log('wrote via vault.process');
		};
		const editorBtn = bar.createEl('button', { text: 'Spike: write via editor' });
		editorBtn.addEventListener('click', (e) => void write('editor')(e));
		const vaultBtn = bar.createEl('button', { text: 'Spike: write via vault' });
		vaultBtn.addEventListener('click', (e) => void write('vault')(e));
		for (const type of ['mousedown', 'pointerdown', 'touchstart'] as const) {
			bar.addEventListener(type, (e) => log(type, (e.target as HTMLElement).tagName));
		}
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
		const text = error.line === null ? error.message : `Line ${error.line}: ${error.message}`;
		list.createEl('li', { text });
	}
}
