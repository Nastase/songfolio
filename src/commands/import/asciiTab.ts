/**
 * Finds ASCII tab in pasted text: runs of string lines ("systems"), and the label or chord lines
 * that belong to them. Written for the importer; the ASCII → `%tab` conversion (R16) can reuse it.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

/** A string line: `e|--3--`, `E |-1-1-`, `D|2x`, or `E:---` (a colon needs dashes after it). */
const STRING_LINE = /^\s*[A-Ga-g][#b]?\s?(\||:\s*-)/;
/** A line of tab without a string name: `|---3---|`, `--0--2--`. */
const DASH_LINE = /^\s*[-0-9|hpbrxX/\\~().^*= ]*-{4,}[-0-9|hpbrxX/\\~().^*= ]*$/;
const BLANK = /^\s*$/;
const HEADER = /^\s*\[[^\]]+\]\s*$/;

/** Lines that may be part of a tab system. */
export function isTabLine(line: string): boolean {
	return STRING_LINE.test(line) || DASH_LINE.test(line);
}

/** Lines `start` to `end` (exclusive) of a text. */
export interface LineRange {
	start: number;
	end: number;
}

export interface TabSystem {
	/** The string lines. */
	strings: LineRange;
	/** The string lines plus the lines that touch them: labels and chords above, a note below. */
	box: LineRange;
}

/** Lines above a system that go with it: a label, then a chord line. */
const MAX_ABOVE = 2;
/** Lines below a system that go with it, such as `P.M . . .`. */
const MAX_BELOW = 1;

/**
 * Every tab system, in order. A system is a run of tab lines: two or more, or one with dashes.
 * Lines directly above or below it, with no blank line in between, join its box, so a chord
 * line stays over its columns. A line between two systems goes with the one below.
 */
export function findTabSystems(lines: readonly string[]): TabSystem[] {
	const runs: LineRange[] = [];
	for (let index = 0; index < lines.length; ) {
		if (!isTabLine(lines[index] ?? '')) {
			index++;
			continue;
		}
		const start = index;
		while (index < lines.length && isTabLine(lines[index] ?? '')) index++;
		const run = { start, end: index };
		const dashes = lines.slice(start, index).some((line) => /-{3,}/.test(line));
		if (index - start >= 2 || dashes) runs.push(run);
	}

	const taken = new Set<number>();
	for (const run of runs) for (let line = run.start; line < run.end; line++) taken.add(line);
	const free = (line: number) =>
		line >= 0 && line < lines.length && !taken.has(line) && !BLANK.test(lines[line] ?? '') && !HEADER.test(lines[line] ?? '');

	const systems = runs.map((strings) => ({ strings, box: { ...strings } }));
	// Lines above first, for every system, so a label between two systems goes with the lower one.
	for (const { strings, box } of systems) {
		while (strings.start - box.start < MAX_ABOVE && free(box.start - 1)) {
			box.start--;
			taken.add(box.start);
		}
	}
	for (const { strings, box } of systems) {
		while (box.end - strings.end < MAX_BELOW && free(box.end)) {
			taken.add(box.end);
			box.end++;
		}
	}
	return systems;
}
