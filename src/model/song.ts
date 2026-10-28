/**
 * The song model built by the parser and read by every renderer.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 * Phase 1 fills this out (sections, chord/lyric lines, patterns, shapes, tabs).
 */

/** A `%name args` directive line, kept raw until its feature is implemented. */
export interface Directive {
	name: string;
	args: string;
	line: number;
}

/** A problem found while parsing, shown as an error on the block (R7). */
export interface ParseError {
	message: string;
	line: number;
}

export interface Song {
	lines: string[];
	directives: Directive[];
	errors: ParseError[];
}
