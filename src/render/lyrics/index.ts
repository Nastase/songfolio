import type { Section, StrumRef } from '../../model/song';
import type { TimeSignature } from '../../parser/strum';
import { renderPattern } from '../strum';
import { rowsOf, type LineLayout, type Row } from './layout';

/**
 * Draws the song's sections: titles with their strumming pattern (R2), chords over lyrics, and
 * the raw text blocks.
 */
export function renderSections(
	sections: readonly Section[],
	time: TimeSignature,
	el: HTMLElement,
): void {
	for (const section of sections) {
		const sectionEl = el.createDiv({ cls: 'songfolio-section' });
		if (section.name !== null || section.strum) {
			const title = sectionEl.createDiv({ cls: 'songfolio-section-title' });
			if (section.name !== null) {
				title.createSpan({ cls: 'songfolio-section-name', text: section.name });
			}
			if (section.note) {
				title.createSpan({ cls: 'songfolio-section-note', text: section.note });
			}
			if (section.strum) renderStrum(section.strum, time, title, sectionEl);
		}
		for (const row of rowsOf(section.items)) renderRow(row, time, sectionEl);
	}
}

/**
 * The pattern's name as a tag in `tagEl`; with `+draw`, also a compact drawing in `drawEl`.
 * A name that matches no pattern is shown in the error colour (the error is listed above).
 */
function renderStrum(
	ref: StrumRef,
	time: TimeSignature,
	tagEl: HTMLElement,
	drawEl: HTMLElement,
): void {
	const tag = tagEl.createSpan({ cls: 'songfolio-strum-tag' });
	tag.createSpan({ cls: 'songfolio-strum-tag-label', text: 'Strum' });
	tag.createSpan({ cls: 'songfolio-strum-tag-name', text: ref.pattern?.name ?? ref.name });
	tag.toggleClass('songfolio-strum-tag-unknown', ref.pattern === null);
	if (ref.draw && ref.pattern) renderPattern(ref.pattern, time, drawEl, { compact: true });
}

function renderRow(row: Row, time: TimeSignature, el: HTMLElement): void {
	switch (row.kind) {
		case 'layout':
			renderLayout(row.layout, el);
			break;
		case 'text':
			el.createDiv({ cls: 'songfolio-text', text: row.text });
			break;
		case 'blank':
			el.createDiv({ cls: 'songfolio-blank' });
			break;
		case 'ascii':
			el.createEl('pre', { cls: 'songfolio-ascii', text: row.lines.join('\n') });
			break;
		case 'tab':
			// Drawn by alphaTab in Phase 4; until then the alphaTex source is shown as written.
			el.createEl('pre', { cls: 'songfolio-ascii songfolio-tab-source', text: row.source });
			break;
		case 'strum': {
			// A later %strum: the pattern changes from here on.
			const change = el.createDiv({ cls: 'songfolio-strum-change' });
			renderStrum(row, time, change, change);
			break;
		}
	}
}

function renderLayout(layout: LineLayout, el: HTMLElement): void {
	const line = el.createDiv({ cls: 'songfolio-line' });
	line.toggleClass('songfolio-chords-only', !layout.hasLyrics);
	for (const group of layout.groups) {
		const groupEl = line.createSpan({ cls: 'songfolio-group' });
		for (const cell of group) {
			const cellEl = groupEl.createSpan({ cls: 'songfolio-cell' });
			const chord = cellEl.createSpan({ cls: 'songfolio-chord', text: cell.chord });
			if (cell.kind === 'rhythm' || cell.kind === 'word') chord.addClass(`songfolio-${cell.kind}`);
			if (layout.hasLyrics) cellEl.createSpan({ cls: 'songfolio-lyric', text: cell.lyric });
		}
	}
}
