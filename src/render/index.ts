import { MarkdownRenderChild, type App, type MarkdownPostProcessorContext } from 'obsidian';
import type { ParseError, Song, SongMeta, TabBlock } from '../model/song';
import { parseSong } from '../parser';
import { readMeta, sameMeta } from '../parser/properties';
import { byLine, checkStrumming, parseTime } from '../parser/strum';
import { songChords } from '../parser/chords';
import { checkTabTime, parseMeter, type Meter } from '../parser/tab';
import { checkTuning, parseTuning, type Tuning } from '../parser/tuning';
import type { LyricsFont } from '../settings';
import { renderHeader } from './header';
import { ShapeChooser } from './header/chooser';
import { saveShape } from './header/saveShape';
import { chordDiagrams, type ChordDiagram, type ShapeChoice } from './header/voicings';
import { addPageFooter, fitWideParts, isPrinting, readPrintPage, type PrintPage } from '../print';
import { renderSections } from './lyrics';
import { TabView } from './tab';

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
	/** Kept to locate the block in the note when a shape is picked. */
	private readonly ctx: MarkdownPostProcessorContext;
	private readonly source: string;
	/** The block's tabs as drawn now; removed (and alphaTab destroyed) when the block is redrawn. */
	private tabs: TabView[] = [];
	/** The page when rendered for "Export to PDF" (spike S2), null on screen. */
	readonly print: PrintPage | null;
	/** Settles once every tab of the first render is drawn (or failed); the PDF export waits for it. */
	readonly ready: Promise<void>;
	private setReady: () => void = () => {};

	constructor(
		containerEl: HTMLElement,
		private readonly host: SongBlockHost,
		source: string,
		ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
		this.sourcePath = ctx.sourcePath;
		this.initialFrontmatter = ctx.frontmatter as unknown;
		this.ctx = ctx;
		this.source = source;
		this.song = parseSong(source);
		this.print = isPrinting(containerEl) ? readPrintPage(host.app, containerEl) : null;
		this.ready = new Promise((resolve) => (this.setReady = resolve));
	}

	/** Rendered for "Export to PDF": the export waits for `ready`. */
	get printing(): boolean {
		return this.print !== null;
	}

	onload(): void {
		this.host.blocks.add(this);
		const given = hasProperties(this.initialFrontmatter) ? this.initialFrontmatter : null;
		this.meta = readMeta(given ?? this.cachedFrontmatter(), this.basename());
		this.render(this.meta);
		if (this.print) this.register(addPageFooter(this.containerEl.doc, this.meta.title));
		void Promise.all(this.tabs.map((tab) => tab.done)).then(() => this.setReady());

		const { metadataCache, vault, workspace } = this.host.app;
		// alphaTab cannot follow CSS variables, so tabs are drawn again when the theme changes.
		this.registerEvent(workspace.on('css-change', () => this.tabs.forEach((tab) => tab.recolor())));
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
		this.setReady();
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
		if (this.print) root.setCssProps({ '--songfolio-print-width': `${this.print.width}px` });

		const time = parseTime(meta.time);
		const tuning = parseTuning(meta.tuning);
		const errors = [
			...song.errors,
			...checkTuning(tuning),
			...checkStrumming(song, time),
			...checkTabTime(song, meta.time),
		].sort(byLine);
		if (errors.length > 0) renderErrors(errors, root);

		this.renderHeader(meta, root.createDiv({ cls: 'songfolio-header' }));
		const meter = parseMeter(meta.time);
		const renderTab = (tab: TabBlock, el: HTMLElement) => this.addTab(tab, el, tuning, meter);
		renderSections(song.sections, time, root.createDiv({ cls: 'songfolio-body' }), renderTab);
		if (this.print) fitWideParts(root, this.print.width);
	}

	private renderHeader(meta: SongMeta, el: HTMLElement): void {
		const { song } = this;
		const time = parseTime(meta.time);
		const tuning = parseTuning(meta.tuning);
		const diagrams = chordDiagrams(songChords(song), song.shapes, tuning);
		const onPick = (diagram: ChordDiagram, choices: ShapeChoice[], strings: readonly string[]) =>
			this.chooseShape(diagram, choices, strings);
		renderHeader(meta, { patterns: song.patterns, time, tuning, diagrams, onPick }, el);
	}

	private addTab(tab: TabBlock, el: HTMLElement, tuning: Tuning, meter: Meter | null): void {
		this.tabs.push(this.addChild(new TabView(el, tab, { tuning, meter, print: this.print })));
	}

	private removeTabs(): void {
		for (const tab of this.tabs) this.removeChild(tab);
		this.tabs = [];
	}

	/**
	 * Redraws the block when a property it uses changed. `time` and `tuning` change the errors,
	 * the strum drawings and the tabs, so the whole block is drawn again; any other property
	 * changes only the header, and the tabs are kept.
	 */
	private update(): void {
		const meta = readMeta(this.cachedFrontmatter(), this.basename());
		const previous = this.meta;
		if (previous && sameMeta(meta, previous)) return;
		this.meta = meta;

		const header = this.containerEl.querySelector<HTMLElement>('.songfolio-header');
		if (previous && header && meta.time === previous.time && meta.tuning === previous.tuning) {
			header.empty();
			this.renderHeader(meta, header);
			return;
		}
		this.removeTabs();
		this.containerEl.empty();
		this.render(meta);
	}

	/** Opens the shape chooser; a pick is written to this block, which then renders again. */
	private chooseShape(diagram: ChordDiagram, choices: ShapeChoice[], strings: readonly string[]): void {
		const { app } = this.host;
		const target = { ctx: this.ctx, el: this.containerEl, sourcePath: this.sourcePath, source: this.source };
		new ShapeChooser(app, diagram, choices, strings, (frets) => {
			void saveShape(app, target, diagram.chord.text, frets);
		}).open();
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
