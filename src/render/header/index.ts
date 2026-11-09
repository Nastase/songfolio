import type { SongMeta, StrumPattern } from '../../model/song';
import { soundingKey } from '../../parser/key';
import type { TimeSignature } from '../../parser/strum';
import { STANDARD_TUNING, type Tuning } from '../../parser/tuning';
import { renderPattern } from '../strum';
import { renderChord } from './diagram';
import type { ChordDiagram } from './voicings';

/** What the header reads besides the properties. */
export interface HeaderContext {
	patterns: readonly StrumPattern[];
	time: TimeSignature;
	tuning: Tuning;
	/** One per distinct chord of the song, in order of first appearance. */
	diagrams: readonly ChordDiagram[];
}

/**
 * Draws the song header: title, artist, then key, sounding key, capo, tuning, tempo and
 * difficulty (R3), a diagram for every chord (R4), and every strumming pattern of the song, used
 * or not (R5).
 */
export function renderHeader(meta: SongMeta, context: HeaderContext, el: HTMLElement): void {
	const { patterns, time, tuning, diagrams } = context;
	el.createDiv({ cls: 'songfolio-title', text: meta.title });
	if (meta.artist) el.createDiv({ cls: 'songfolio-artist', text: meta.artist });
	renderFacts(meta, tuning, el);
	renderChords(diagrams, tuning.valid ? tuning.notes : STANDARD_TUNING, el);
	renderPatterns(patterns, time, el);
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

function renderChords(diagrams: readonly ChordDiagram[], strings: readonly string[], el: HTMLElement): void {
	if (diagrams.length === 0) return;
	const row = el.createDiv({ cls: 'songfolio-diagrams' });
	for (const diagram of diagrams) renderChord(diagram, strings, row);
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
