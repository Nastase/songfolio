import { MarkdownRenderChild } from 'obsidian';
import type { AlphaTabApi, model, Settings } from '@coderline/alphatab';
import type { TabBlock } from '../../model/song';
import type { Meter } from '../../parser/tab';
import type { Tuning } from '../../parser/tuning';
import { loadAlphaTab, musicFontUrl, trackStyles, type AlphaTab } from './alphatab';
import { blockLine, buildTex } from './tex';

/** What a tab is drawn with, besides its block. */
export interface TabOptions {
	tuning: Tuning;
	meter: Meter | null;
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
		this.whenConnected(() => {
			this.start().catch((error: unknown) => {
				console.error('Songfolio: could not draw the tab', error);
				this.showErrors([{ line: this.tab.line, message: error instanceof Error ? error.message : String(error) }]);
				this.finish();
			});
		});
	}

	onunload(): void {
		this.unloaded = true;
		this.api?.destroy();
		this.api = null;
		this.finish();
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
		api.renderFinished.on(() => this.hideFooter());
		api.postRenderFinished.on(() => {
			this.hideFooter();
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
		if (footer.offsetHeight > FOOTER_MAX_HEIGHT) return;
		footer.addClass('songfolio-tab-footer');
		surface.setCssProps({ height: `${footer.offsetTop}px` });
	}
}

function firstLine(text: string): string {
	return text.split('\n')[0]?.trim() ?? text;
}
