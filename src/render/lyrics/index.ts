import type { Section } from '../../model/song';
import { rowsOf, type LineLayout, type Row } from './layout';

/** Draws the song's sections: titles, chords over lyrics, and the raw text blocks. */
export function renderSections(sections: readonly Section[], el: HTMLElement): void {
	for (const section of sections) {
		const sectionEl = el.createDiv({ cls: 'songfolio-section' });
		if (section.name !== null) {
			const title = sectionEl.createDiv({ cls: 'songfolio-section-title' });
			title.createSpan({ cls: 'songfolio-section-name', text: section.name });
			if (section.note) {
				title.createSpan({ cls: 'songfolio-section-note', text: section.note });
			}
		}
		for (const row of rowsOf(section.items)) renderRow(row, sectionEl);
	}
}

function renderRow(row: Row, el: HTMLElement): void {
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
