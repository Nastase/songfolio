import type { AsciiBlock } from '../../model/song';

/**
 * A `%ascii` block, or raw tab lines written without one, as monospace text that scrolls instead
 * of wrapping (R9).
 */
export function renderAscii(block: AsciiBlock, el: HTMLElement): void {
	el.createEl('pre', { cls: 'songfolio-ascii', text: block.lines.join('\n') });
}
