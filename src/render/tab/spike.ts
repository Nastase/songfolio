// Spikes S1 and S2 (throwaway, not merged): render %tab blocks with alphaTab, time them,
// and (S2) wait for them during "Export to PDF".
// Phase 4 rebuilds this properly on top of the parser.
import { MarkdownRenderChild } from 'obsidian';
import type { App, MarkdownPostProcessorContext } from 'obsidian';
import bravuraWoff2 from '@coderline/alphatab/font/Bravura.woff2';

export const LOG = '[songfolio:s1]';

/**
 * Spike timing output, read in DevTools (desktop) or chrome://inspect (tablet).
 * Uses console.debug, the level store rules allow: turn on "Verbose" in the console to see it.
 */
export function s1log(message: string): void {
	console.debug(`${LOG} ${message}`);
}

/** How tab blocks are rendered; picked per note with the `s1-mode` property. */
export type TabMode = 'lazy' | 'eager' | 'visible';

export interface TabBlock {
	beats: string;
	line: number;
}

/** Collects the lines between `%tab` and `%endtab`. Spike-only: Phase 1 moves this to the parser. */
export function extractTabBlocks(lines: string[]): TabBlock[] {
	const blocks: TabBlock[] = [];
	let current: string[] | null = null;
	let start = 0;
	lines.forEach((text, index) => {
		const trimmed = text.trim();
		if (trimmed === '%tab') {
			current = [];
			start = index + 1;
		} else if (trimmed === '%endtab' && current) {
			blocks.push({ beats: current.join('\n'), line: start });
			current = null;
		} else if (current) {
			current.push(text);
		}
	});
	return blocks;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Standard tuning as MIDI numbers, low E to high E. */
const STANDARD = [40, 45, 50, 55, 59, 64];

/**
 * Turns the `tuning` property (low to high, no octaves, e.g. "D A D G B E") into
 * alphaTex `\tuning (E4 B3 G3 D3 A2 D2)`: high to low, each string in the octave
 * closest to standard tuning.
 */
export function tuningToTex(tuning: unknown): string {
	const names = typeof tuning === 'string' ? tuning.match(/[A-Ga-g][#b]?/g) ?? [] : [];
	const midi =
		names.length === 6
			? names.map((name, i) => {
					const base = PITCH[name[0]!.toUpperCase()]!;
					const pc = (base + (name[1] === '#' ? 1 : name[1] === 'b' ? 11 : 0)) % 12;
					const std = STANDARD[i]!;
					const up = (pc - (std % 12) + 12) % 12;
					return up <= 6 ? std + up : std + up - 12;
				})
			: STANDARD;
	const notes = midi
		.map((m) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`)
		.reverse();
	return `\\tuning (${notes.join(' ')})`;
}

/** Resolves an Obsidian CSS variable to a concrete colour that alphaTab can read. */
function cssColor(host: HTMLElement, variable: string): string {
	const probe = host.createSpan();
	probe.setCssProps({ color: `var(${variable})` });
	const color = getComputedStyle(probe).color;
	probe.remove();
	return color;
}

/** Spike S2 logging, same rules as `s1log`. */
export function s2log(message: string): void {
	console.debug(`[songfolio:s2] ${message}`);
}

/**
 * Spike S2: how tabs behave inside Obsidian's PDF export.
 * - `naive`: exactly like S1 (lazy loading, `visible` observer, nothing awaited).
 * - `await`: lazy loading and the observer off, export waits for every tab.
 */
export type PrintMode = 'naive' | 'await';

export interface TabRenderOptions {
	app: App;
	ctx: MarkdownPostProcessorContext;
	mode: TabMode;
	tuning: unknown;
	/** True when the block is rendered by "Export to PDF" (inside `.print`). */
	print: boolean;
	printMode: PrintMode;
	/** Spike S2 width fix: fixed tab width in px while printing, if set. */
	printWidth: number | null;
	/** Spike S2: alphaTab `display.scale` while printing (1 when unset). */
	printScale: number;
	/**
	 * Spike S2 page breaks: keep the whole tab on one page (`block`), only each row (`rows`),
	 * or rows in flow plus the whole tab when it fits on a page (`keep`).
	 */
	printBreaks: 'block' | 'rows' | 'keep';
	/** Called once per block, when alphaTab first finishes rendering it. */
	onRendered: (index: number) => void;
}

/**
 * Renders each tab block into its own container. alphaTab is imported only here.
 * Resolves when every block has finished rendering (all partials drawn) or failed.
 */
export async function renderTabs(
	blocks: TabBlock[],
	containers: HTMLElement[],
	options: TabRenderOptions,
): Promise<void> {
	const printAwait = options.print && options.printMode === 'await';
	const finished: Promise<void>[] = [];
	const importStart = performance.now();
	const at = await import('@coderline/alphatab');
	s1log(`alphaTab import: ${Math.round(performance.now() - importStart)} ms`);

	const host = containers[0]!;
	const colors = {
		mainGlyphColor: cssColor(host, '--text-normal'),
		secondaryGlyphColor: cssColor(host, '--text-muted'),
		scoreInfoColor: cssColor(host, '--text-normal'),
		staffLineColor: cssColor(host, '--text-faint'),
		barSeparatorColor: cssColor(host, '--text-muted'),
		barNumberColor: cssColor(host, '--text-faint'),
	};
	const tuning = tuningToTex(options.tuning);

	blocks.forEach((block, index) => {
		const el = containers[index]!;
		const child = new MarkdownRenderChild(el);
		options.ctx.addChild(child);

		let api: InstanceType<typeof at.AlphaTabApi> | null = null;
		let finish: () => void = () => {};
		finished.push(new Promise<void>((resolve) => (finish = resolve)));
		const start = () => {
			if (options.print && options.printWidth) {
				el.setCssProps({ width: `${options.printWidth}px` });
			}
			if (options.print) {
				el.addClass(`songfolio-print-${options.printBreaks}`);
				if (options.printBreaks === 'keep') el.addClass('songfolio-print-rows');
				s2log(
					`block ${index} (line ${block.line}): width ${el.offsetWidth} px, ` +
						`window ${el.win.innerWidth}×${el.win.innerHeight}, mode ${options.printMode}`,
				);
			}
			// Phase timings for this block, read with `obsidian dev:dom selector=[data-s1]`.
			const created = performance.now();
			const phases: string[] = [];
			const mark = (name: string) => {
				phases.push(`${name} +${Math.round(performance.now() - created)}`);
				el.setAttribute('data-s1', phases.join(', '));
			};
			api = new at.AlphaTabApi(el, {
				core: {
					useWorkers: false,
					engine: 'svg',
					enableLazyLoading: options.mode !== 'eager' && !printAwait,
					smuflFontSources: new Map([
						[at.FontFileFormat.Woff2, `data:font/woff2;base64,${bravuraWoff2}`],
					]),
					logLevel: at.LogLevel.Warning,
				},
				player: { playerMode: at.PlayerMode.Disabled },
				display: {
					layoutMode: at.LayoutMode.Page,
					resources: colors,
					scale: options.print ? options.printScale : 1,
				},
				notation: { rhythmMode: at.TabRhythmMode.ShowWithBars },
			});
			mark('created');
			let done = false;
			api.scoreLoaded.on(() => mark('scoreLoaded'));
			api.renderStarted.on(() => mark('renderStarted'));
			api.renderFinished.on(() => {
				mark('renderFinished');
				if (done) return;
				done = true;
				options.onRendered(index);
			});
			api.postRenderFinished.on(() => {
				mark('postRenderFinished');
				if (options.print) {
					const fonts = el.doc.fonts;
					s2log(
						`block ${index} postRenderFinished +${Math.round(performance.now() - created)} ms, ` +
							`alphaTab font in print window: ${fonts.check('12px alphaTab') ? 'yes' : 'no'}, ` +
							`svg ${el.querySelectorAll('svg').length}`,
					);
				}
				finish();
			});
			api.error.on((error) => {
				console.error(`${LOG} tab at line ${block.line}`, error);
				el.createDiv({ cls: 'songfolio-error', text: `Tab error at line ${block.line}: ${error.message}` });
				finish();
			});
			api.tex(`\\track "Guitar"\n\\staff {tabs}\n${tuning}\n${block.beats}`);
		};

		if (options.mode === 'visible' && !printAwait) {
			// Reserve roughly the rendered height (about one bar per row) so blocks
			// below the screen are not all "visible" at zero height.
			const bars = block.beats.split('|').length;
			el.addClass('songfolio-tab-pending');
			el.setCssProps({ '--songfolio-tab-estimate': `${bars * 130}px` });
			let observer: IntersectionObserver | null = null;
			let unloaded = false;
			// The block is not in the DOM yet when the processor runs; wait for it, then
			// observe relative to Obsidian's scroll container so rootMargin applies.
			const observe = () => {
				if (unloaded) return;
				if (!el.isConnected) {
					window.requestAnimationFrame(observe);
					return;
				}
				const root = el.closest('.cm-scroller, .markdown-preview-view');
				observer = new IntersectionObserver(
					(entries) => {
						if (entries.some((e) => e.isIntersecting)) {
							observer?.disconnect();
							start();
							api?.renderFinished.on(() => el.removeClass('songfolio-tab-pending'));
						}
					},
					{ root, rootMargin: '200px' },
				);
				observer.observe(el);
			};
			observe();
			child.register(() => {
				unloaded = true;
				observer?.disconnect();
			});
		} else {
			start();
		}
		child.register(() => {
			api?.destroy();
			finish();
		});
	});
	await Promise.all(finished);
}
