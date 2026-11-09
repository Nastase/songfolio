import { MarkdownRenderChild, type App, type MarkdownPostProcessorContext } from 'obsidian';
import type { ParseError, Song, SongMeta } from '../model/song';
import { parseSong } from '../parser';
import { readMeta, sameMeta } from '../parser/properties';
import { byLine, checkStrumming, parseTime } from '../parser/strum';
import { songChords } from '../parser/chords';
import { checkTuning, parseTuning } from '../parser/tuning';
import type { LyricsFont } from '../settings';
import { renderHeader } from './header';
import { chordDiagrams } from './header/voicings';
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
	/**
	 * Frontmatter given with the block; the metadata cache can lag behind it. Live preview gives
	 * an empty object instead, so an empty one means "ask the cache".
	 */
	private readonly initialFrontmatter: unknown;

	constructor(
		containerEl: HTMLElement,
		private readonly host: SongBlockHost,
		source: string,
		ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
		this.sourcePath = ctx.sourcePath;
		this.initialFrontmatter = ctx.frontmatter as unknown;
		this.song = parseSong(source);
	}

	onload(): void {
		this.host.blocks.add(this);
		const given = hasProperties(this.initialFrontmatter) ? this.initialFrontmatter : null;
		this.meta = readMeta(given ?? this.cachedFrontmatter(), this.basename());
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
		const tuning = parseTuning(meta.tuning);
		const errors = [...song.errors, ...checkTuning(tuning), ...checkStrumming(song, time)].sort(byLine);
		if (errors.length > 0) renderErrors(errors, root);

		const header = root.createDiv({ cls: 'songfolio-header' });
		const diagrams = chordDiagrams(songChords(song), song.shapes, tuning);
		renderHeader(meta, { patterns: song.patterns, time, tuning, diagrams }, header);
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

	private cachedFrontmatter(): unknown {
		return this.host.app.metadataCache.getCache(this.sourcePath)?.frontmatter;
	}

	private basename(): string {
		const name = this.sourcePath.split('/').pop() ?? this.sourcePath;
		return name.replace(/\.md$/i, '');
	}
}

function hasProperties(frontmatter: unknown): boolean {
	return typeof frontmatter === 'object' && frontmatter !== null && Object.keys(frontmatter).length > 0;
}

function renderErrors(errors: readonly ParseError[], el: HTMLElement): void {
	const list = el.createEl('ul', { cls: 'songfolio-errors' });
	for (const error of errors) {
		const text = error.line === null ? error.message : `Line ${error.line}: ${error.message}`;
		list.createEl('li', { text });
	}
}
