import type { SongMeta, StrumPattern } from '../../model/song';
import type { TimeSignature } from '../../parser/strum';
import { renderPattern } from '../strum';

/**
 * Draws the song header: title, artist, then key, capo, tuning, tempo and difficulty (R3), and
 * every strumming pattern of the song, used or not (R5).
 */
export function renderHeader(
	meta: SongMeta,
	patterns: readonly StrumPattern[],
	time: TimeSignature,
	el: HTMLElement,
): void {
	el.createDiv({ cls: 'songfolio-title', text: meta.title });
	if (meta.artist) el.createDiv({ cls: 'songfolio-artist', text: meta.artist });
	renderFacts(meta, el);
	renderPatterns(patterns, time, el);
}

function renderFacts(meta: SongMeta, el: HTMLElement): void {
	const facts: [string, string | null][] = [
		['Key', meta.key],
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
