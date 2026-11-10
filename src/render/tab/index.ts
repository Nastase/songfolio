import { MarkdownRenderChild } from 'obsidian';
import type { AlphaTabApi, model, Settings } from '@coderline/alphatab';
import type { TabBlock } from '../../model/song';
import type { Meter } from '../../parser/tab';
import type { Tuning } from '../../parser/tuning';
import type { PrintPage } from '../../print';
import { loadAlphaTab, musicFontUrl, trackStyles, type AlphaTab } from './alphatab';
import { blockLine, buildTex } from './tex';

/** What a tab is drawn with, besides its block. */
export interface TabOptions {
	tuning: Tuning;
	meter: Meter | null;
	/** Drawn for "Export to PDF" on this page: at once, whole, at the width of its text column. */
	print: PrintPage | null;
}

/** alphaTab colours, from CSS tokens on `.songfolio` (see styles.css), so they follow the theme. */
const COLORS = {
	mainGlyphColor: '--songfolio-tab-main',
	secondaryGlyphColor: '--songfolio-tab-secondary',
	scoreInfoColor: '--songfolio-tab-main',
	staffLineColor: '--songfolio-tab-staff',
	barSeparatorColor: '--songfolio-tab-secondary',
	barNumberColor: '--songfolio-tab-staff',
} as const;

/** Left, top, right, bottom, in px before scaling. */
const PADDING = [2, 4, 2, 4] as const;

/** Scale in the PDF: two bars of 8th notes per row on an A4 page, frets still readable (S2). */
const PRINT_SCALE = 0.8;

/**
 * A tab up to this share of a page is kept on one page; a taller one breaks between rows, or it
 * would leave most of a page empty before it.
 */
const KEEP_WHOLE_SHARE = 0.9;

/** How far from the screen a tab starts drawing. */
const VISIBLE_MARGIN = '200px';

/** Rough size of a bar of 8th notes and of a row of tab, to reserve space before it is drawn. */
const BAR_WIDTH = 300;
const ROW_HEIGHT = 130;

/** Height of alphaTab's footer line (12 px text), with room for scaling. */
const FOOTER_MAX_HEIGHT = 20;

/** Parts of a score that the song header already shows, or that only matter for playback. */
const HIDDEN = [
	'ScoreTitle', 'ScoreSubTitle', 'ScoreArtist', 'ScoreAlbum', 'ScoreWords', 'ScoreMusic',
	'ScoreWordsAndMusic', 'ScoreCopyright', 'GuitarTuning', 'TrackNames', 'ChordDiagrams',
	'EffectDynamics', 'EffectTempo',
] as const;

/**
 * One `%tab` block drawn by alphaTab as a tab-only staff with rhythm (R8). A child of its song
 * block, so alphaTab is destroyed when the block is unloaded or drawn again.
 */
export class TabView extends MarkdownRenderChild {
	private api: AlphaTabApi | null = null;
	private alphaTab: AlphaTab | null = null;
	private unloaded = false;
	private finish: () => void = () => {};
	/** Settles when the tab is drawn, has failed, or is unloaded. */
	readonly done: Promise<void>;
	private readonly surface: HTMLElement;

	constructor(
		containerEl: HTMLElement,
		private readonly tab: TabBlock,
		private readonly options: TabOptions,
	) {
		super(containerEl);
		this.done = new Promise((resolve) => (this.finish = resolve));
		containerEl.addClass('songfolio-tab');
		this.surface = containerEl.createDiv({ cls: 'songfolio-tab-surface' });
	}

	onload(): void {
		// An empty %tab draws nothing.
		if (this.tab.beats.trim() === '') {
			this.finish();
			return;
		}
		if (this.options.print) {
			// The export window has no scrolling, and it waits for `done` (spike S2).
			this.whenConnected(() => this.draw());
			return;
		}
		this.whenConnected(() => {
			this.reserveHeight();
			this.whenVisible(() => this.draw());
		});
	}

	private draw(): void {
		this.start().catch((error: unknown) => {
			console.error('Songfolio: could not draw the tab', error);
			this.showErrors([{ line: this.tab.line, message: error instanceof Error ? error.message : String(error) }]);
			this.finish();
		});
	}

	onunload(): void {
		this.unloaded = true;
		this.api?.destroy();
		this.api = null;
		this.finish();
	}

	/** Draws the tab again in the current theme's colours (alphaTab writes them as SVG attributes). */
	recolor(): void {
		const { api, alphaTab } = this;
		if (!api || !alphaTab) return;
		this.applyColors(alphaTab, api.settings);
		api.updateSettings();
		api.render();
	}

	/** Colours are read from CSS, which needs the block in the document. */
	private whenConnected(callback: () => void): void {
		const check = () => {
			if (this.unloaded) return;
			if (this.containerEl.isConnected) callback();
			else this.containerEl.win.requestAnimationFrame(check);
		};
		check();
	}

	/**
	 * Starts alphaTab only when the tab comes near the screen (spike S1): long songs stay cheap,
	 * and Obsidian's hidden copy of the other view (reading or editing) never draws its tabs.
	 * The observer's root must be Obsidian's scroll container, or the margin is ignored.
	 */
	private whenVisible(callback: () => void): void {
		const root = this.containerEl.closest('.cm-scroller, .markdown-preview-view');
		if (!root) {
			// A hover popover, a canvas card or an export: no scroll container to watch.
			callback();
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				callback();
			},
			{ root, rootMargin: VISIBLE_MARGIN },
		);
		observer.observe(this.containerEl);
		this.register(() => observer.disconnect());
	}

	/**
	 * Until alphaTab has drawn the tab, an empty container would count as on screen with every
	 * other one, so it gets about the height it will have.
	 */
	private reserveHeight(): void {
		const bars = Math.max(1, this.tab.beats.split('|').filter((bar) => bar.trim() !== '').length);
		const perRow = Math.max(1, Math.floor(this.containerEl.clientWidth / BAR_WIDTH));
		const height = Math.ceil(bars / perRow) * ROW_HEIGHT;
		this.containerEl.addClass('songfolio-tab-pending');
		this.containerEl.setCssProps({ '--songfolio-tab-estimate': `${height}px` });
	}

	private async start(): Promise<void> {
		const at = await loadAlphaTab();
		if (this.unloaded) return;
		this.alphaTab = at;

		const settings = this.settings(at);
		const { tex, preludeLines } = buildTex(this.tab.beats, this.options.tuning, this.options.meter);
		const score = this.read(at, tex, settings, preludeLines);
		if (!score) {
			this.finish();
			return;
		}

		const api = trackStyles(this.containerEl.doc, () => new at.AlphaTabApi(this.surface, settings));
		this.api = api;
		api.renderFinished.on(() => {
			this.containerEl.removeClass('songfolio-tab-pending');
			this.hideFooter();
		});
		api.postRenderFinished.on(() => {
			this.hideFooter();
			this.keepWholeIfFits();
			this.finish();
		});
		api.error.on((error) => {
			this.showErrors([{ line: this.tab.line, message: error.message }]);
			this.finish();
		});
		api.renderScore(score, [0]);
	}

	private settings(at: AlphaTab): Settings {
		const settings = new at.Settings();
		settings.core.useWorkers = false;
		settings.core.engine = 'svg';
		settings.core.logLevel = at.LogLevel.Warning;
		settings.core.smuflFontSources = new Map([[at.FontFileFormat.Woff2, musicFontUrl()]]);
		settings.player.playerMode = at.PlayerMode.Disabled;
		settings.display.layoutMode = at.LayoutMode.Page;
		if (this.options.print) {
			// alphaTab's lazy loading draws only the rows inside the export window's viewport.
			settings.core.enableLazyLoading = false;
			settings.display.scale = PRINT_SCALE;
		}
		// alphaTab pads a page by 35 px; the tab sits in the song instead, aligned with the text.
		settings.display.padding = [...PADDING];
		settings.notation.rhythmMode = at.TabRhythmMode.ShowWithBars;
		for (const element of HIDDEN) settings.notation.elements.set(at.NotationElement[element], false);
		this.applyColors(at, settings);
		return settings;
	}

	private applyColors(at: AlphaTab, settings: Settings): void {
		const resources = settings.display.resources;
		for (const [key, variable] of Object.entries(COLORS) as [keyof typeof COLORS, string][]) {
			const color = at.model.Color.fromJson(this.cssColor(variable));
			if (color) resources[key] = color;
		}
	}

	/** Resolves a CSS colour token to a concrete colour that alphaTab can read. */
	private cssColor(variable: string): string {
		const probe = this.containerEl.createSpan();
		probe.setCssProps({ color: `var(${variable})` });
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	}

	/**
	 * Reads the alphaTex first, so errors come with positions: they are shown in place of the
	 * tab, with block line numbers. Warnings are ignored.
	 */
	private read(at: AlphaTab, tex: string, settings: Settings, preludeLines: number): model.Score | null {
		const importer = new at.importer.AlphaTexImporter();
		importer.logErrors = false;
		importer.initFromString(tex, settings);
		let score: model.Score | null = null;
		let failure = '';
		try {
			score = importer.readScore();
		} catch (error) {
			failure = error instanceof Error ? error.message : String(error);
		}
		const errors = [
			...importer.lexerDiagnostics.items,
			...importer.parserDiagnostics.items,
			...importer.semanticDiagnostics.items,
		]
			.filter((diagnostic) => diagnostic.severity === at.importer.alphaTex.AlphaTexDiagnosticsSeverity.Error)
			.map((diagnostic) => ({
				line: blockLine(this.tab.line, diagnostic.start?.line ?? 0, preludeLines),
				message: firstLine(diagnostic.message),
			}));
		if (errors.length > 0) {
			this.showErrors(errors);
			return null;
		}
		if (!score) this.showErrors([{ line: this.tab.line, message: failure }]);
		return score;
	}

	private showErrors(errors: { line: number; message: string }[]): void {
		this.containerEl.removeClass('songfolio-tab-pending');
		this.surface.empty();
		const list = this.containerEl.createEl('ul', { cls: 'songfolio-errors songfolio-tab-errors' });
		for (const error of errors) list.createEl('li', { text: `Line ${error.line}: ${error.message}` });
	}

	/**
	 * alphaTab always draws "rendered by alphaTab" as the last part of the tab, and no setting turns
	 * it off. Hide it and give its height back (alphaTab is credited in the README). It is found by
	 * position: with lazy loading its text is only drawn once it scrolls into view.
	 */
	private hideFooter(): void {
		const surface = this.surface.querySelector<HTMLElement>('.at-surface');
		const footer = surface?.lastElementChild;
		if (!surface || !footer?.instanceOf(HTMLElement) || surface.childElementCount < 2) return;
		if (footer.hasClass('songfolio-tab-footer') || footer.offsetHeight > FOOTER_MAX_HEIGHT) return;
		// Read before hiding: a hidden footer has no position.
		const height = footer.offsetTop;
		footer.addClass('songfolio-tab-footer');
		surface.setCssProps({ height: `${height}px` });
	}

	/** In print, marks a tab that fits on one page to be kept whole (see styles.css). */
	private keepWholeIfFits(): void {
		const { print } = this.options;
		if (!print) return;
		const height = this.containerEl.getBoundingClientRect().height;
		this.containerEl.toggleClass('songfolio-print-keep', height <= print.height * KEEP_WHOLE_SHARE);
	}
}

function firstLine(text: string): string {
	return text.split('\n')[0]?.trim() ?? text;
}
