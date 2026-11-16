import { setIcon } from 'obsidian';
import type { SongMeta, StrumPattern } from '../../model/song';
import { soundingKey } from '../../parser/key';
import { formatDuration } from '../../parser/properties';
import type { TimeSignature } from '../../parser/strum';
import { STANDARD_TUNING, type Tuning } from '../../parser/tuning';
import { SCROLL_BUTTON } from '../scroll';
import { renderPattern } from '../strum';
import { renderChord } from './diagram';
import { shapeChoices, type ChordDiagram, type ShapeChoice } from './voicings';

/** What the header reads besides the properties. */
export interface HeaderContext {
	patterns: readonly StrumPattern[];
	time: TimeSignature;
	tuning: Tuning;
	/** One per distinct chord of the song, in order of first appearance. */
	diagrams: readonly ChordDiagram[];
	/** Opens the shape chooser for a chord (R4). Diagrams are only pickable when given. */
	onPick?: (diagram: ChordDiagram, choices: ShapeChoice[], strings: readonly string[]) => void;
	/** Starts or stops autoscroll (R17). No button when missing, as in print. */
	scroll?: { scrolling: boolean; toggle: () => void };
}

/**
 * Draws the song header: title, artist, then key, sounding key, capo, tuning, tempo and
 * difficulty (R3), a diagram for every chord (R4), and every strumming pattern of the song, used
 * or not (R5).
 */
export function renderHeader(meta: SongMeta, context: HeaderContext, el: HTMLElement): void {
	const { patterns, time, tuning, diagrams, onPick, scroll } = context;
	if (scroll) renderScrollButton(scroll, el);
	el.createDiv({ cls: 'songfolio-title', text: meta.title });
	if (meta.artist) el.createDiv({ cls: 'songfolio-artist', text: meta.artist });
	renderFacts(meta, tuning, el);
	renderChords(diagrams, tuning.valid ? tuning.notes : STANDARD_TUNING, el, onPick);
	renderPatterns(patterns, time, el);
}

function renderScrollButton(scroll: NonNullable<HeaderContext['scroll']>, el: HTMLElement): void {
	const button = el.createEl('button', { cls: `${SCROLL_BUTTON} clickable-icon` });
	showScrolling(button, scroll.scrolling);
	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		scroll.toggle();
	});
}

/** Shows on the autoscroll button whether the song is scrolling. */
export function showScrolling(button: HTMLElement, scrolling: boolean): void {
	setIcon(button, scrolling ? 'pause' : 'play');
	button.setAttribute('aria-label', scrolling ? 'Stop autoscroll' : 'Start autoscroll');
	button.toggleClass('is-active', scrolling);
}

function renderFacts(meta: SongMeta, tuning: Tuning, el: HTMLElement): void {
	// A tuning that cannot be read counts as standard, as for the diagrams.
	const shift = tuning.valid ? tuning.shift : 0;
	const facts: [string, string | null][] = [
		['Key', meta.key],
		['Sounding key', soundingKey(meta.key, meta.capo, shift)],
		['Capo', meta.capo === null ? null : String(meta.capo)],
		['Tuning', meta.tuning],
		['Tempo', meta.tempo === null ? null : `${meta.tempo} bpm`],
		['Duration', meta.duration === null ? null : formatDuration(meta.duration)],
		['Difficulty', meta.difficulty],
	];
	const shown = facts.filter((fact): fact is [string, string] => fact[1] !== null);
	if (shown.length === 0) return;

	const list = el.createDiv({ cls: 'songfolio-meta' });
	for (const [label, value] of shown) {
		const item = list.createSpan({ cls: 'songfolio-meta-item' });
		item.createSpan({ cls: 'songfolio-meta-label', text: label });
		item.createSpan({ cls: 'songfolio-meta-value', text: value });
	}
}

function renderChords(
	diagrams: readonly ChordDiagram[],
	strings: readonly string[],
	el: HTMLElement,
	onPick: HeaderContext['onPick'],
): void {
	if (diagrams.length === 0) return;
	const row = el.createDiv({ cls: 'songfolio-diagrams' });
	for (const diagram of diagrams) {
		// A chord with nothing to choose between (one fingering, or none) is not pickable.
		const choices = shapeChoices(diagram);
		const pick = onPick && choices.length > 0 ? () => onPick(diagram, choices, strings) : undefined;
		renderChord(diagram, strings, row, pick);
	}
}

function renderPatterns(
	patterns: readonly StrumPattern[],
	time: TimeSignature,
	el: HTMLElement,
): void {
	if (patterns.length === 0) return;
	const list = el.createDiv({ cls: 'songfolio-patterns' });
	for (const pattern of patterns) {
		const card = list.createDiv({ cls: 'songfolio-pattern' });
		card.createDiv({ cls: 'songfolio-pattern-name', text: pattern.name });
		renderPattern(pattern, time, card);
	}
}
