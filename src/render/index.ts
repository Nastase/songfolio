import type { Song } from '../model/song';

/**
 * Renders a parsed song into the block element.
 * Phase 0 placeholder: shows the source so the pipeline can be checked end to end.
 * Later phases delegate to header, lyrics, strum, tab and ascii renderers.
 */
export function renderSong(song: Song, el: HTMLElement): void {
	const root = el.createDiv({ cls: 'songfolio' });
	root.createDiv({
		cls: 'songfolio-placeholder-note',
		text: `Songfolio: ${song.lines.length} lines, ${song.directives.length} directives`,
	});
	root.createEl('pre', { cls: 'songfolio-source', text: song.lines.join('\n') });
}
