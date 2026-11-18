/**
 * Finds the songsheet blocks in a note's text, for the commands that edit them.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

/** A fenced block, by line (from 0): the opening and closing fence lines. */
export interface SongBlockRange {
	/** The opening fence line. */
	start: number;
	/** The closing fence line, or the last line + 1 when the block is not closed. */
	end: number;
}

/** An opening fence: up to 3 spaces, then 3 or more backticks or tildes, then the language. */
const OPEN = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/;

/**
 * Every fenced code block named `blockName` (in any case, as Obsidian matches it), in order.
 * Blocks inside callouts or quotes (`> ```songsheet`) are not found. A block whose closing fence
 * is missing runs to the end of the note, as in Obsidian.
 */
export function findSongBlocks(lines: readonly string[], blockName: string): SongBlockRange[] {
	const blocks: SongBlockRange[] = [];
	const name = blockName.toLowerCase();
	for (let index = 0; index < lines.length; index++) {
		const open = OPEN.exec(lines[index] ?? '');
		if (!open) continue;
		const fence = open[1] ?? '';
		const close = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`);
		let end = index + 1;
		while (end < lines.length && !close.test(lines[end] ?? '')) end++;
		if ((open[2] ?? '').toLowerCase() === name) blocks.push({ start: index, end });
		index = end;
	}
	return blocks;
}

/** The block holding a line (fences included), or null. */
export function blockAt(blocks: readonly SongBlockRange[], line: number): SongBlockRange | null {
	return blocks.find((block) => line >= block.start && line <= block.end) ?? null;
}

/** Lines of a note's text, and its line ending, so an edit can keep it. */
export function splitLines(text: string): { lines: string[]; eol: string } {
	return { lines: text.split(/\r?\n/), eol: text.includes('\r\n') ? '\r\n' : '\n' };
}

/**
 * The block a song was rendered from: the songsheet block whose opening fence is on line
 * `fenceStart` (from 0), when its text is still `source`. Null when the note changed since.
 */
export function renderedBlock(
	lines: readonly string[],
	blockName: string,
	fenceStart: number,
	source: string,
): SongBlockRange | null {
	const block = findSongBlocks(lines, blockName).find((found) => found.start === fenceStart);
	if (!block) return null;
	const body = lines.slice(block.start + 1, block.end).join('\n');
	return normalise(body) === normalise(source) ? block : null;
}

function normalise(source: string): string {
	return source.replace(/\r\n?/g, '\n').replace(/\n$/, '');
}
