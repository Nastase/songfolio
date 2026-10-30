/**
 * The song model built by the parser and read by every renderer.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 *
 * Line numbers count from 1, the first line inside the code block.
 * Columns count characters after expanding tabs (see TAB_SIZE in the parser).
 */

/** A chord as written, without any Chord Sheets inline shape. */
export interface ChordSymbol {
	/** The symbol as written, e.g. 'Dm/E'. */
	text: string;
	/** Root note, e.g. 'D'. */
	tonic: string;
	/** Bass note of a slash chord, or '' when there is none. */
	bass: string;
}

/** Character offsets in the source line, end exclusive. Kept for transpose. */
export interface SourceRange {
	start: number;
	end: number;
}

/** One non-whitespace token of a chord line. */
export type ChordLineToken =
	| { kind: 'chord'; text: string; chord: ChordSymbol; col: number; range: SourceRange }
	/** Bar lines, strums and repeats: `|`, `/`, `%`, `N.C.`. */
	| { kind: 'rhythm'; text: string; col: number }
	/** Anything else on a chord line, e.g. `x4` or `(riff)`. */
	| { kind: 'word'; text: string; col: number };

/** A line of chords, normally shown over the lyric line below it. */
export interface ChordLine {
	kind: 'chords';
	line: number;
	tokens: ChordLineToken[];
}

/** A Chord Sheets inline chord, as in `[Am]lyrics`. */
export interface InlineChord {
	/** Shown text: the symbol plus any extra text inside the brackets. */
	text: string;
	chord: ChordSymbol;
	/** Column in the lyric text (with the inline chords removed). */
	col: number;
	range: SourceRange;
}

/** A line of lyrics (or any text that is not a chord line). */
export interface LyricLine {
	kind: 'lyrics';
	line: number;
	/** Tabs expanded, markers and inline chords removed, trailing spaces trimmed. */
	text: string;
	inlineChords: InlineChord[];
}

/** An empty or whitespace-only line. */
export interface BlankLine {
	kind: 'blank';
	line: number;
}

/**
 * ASCII tab shown as monospace text: a `%ascii`…`%endascii` block, or consecutive raw tab
 * lines such as `e|--3--|` (implicit).
 */
export interface AsciiBlock {
	kind: 'ascii';
	/** First line: the `%ascii` line, or the first tab line when implicit. */
	line: number;
	lines: string[];
	implicit: boolean;
	/** False when `%endascii` is missing (the block then runs to the end of the song). */
	closed: boolean;
}

/** A `%tab`…`%endtab` block of alphaTex beats (rendered in Phase 4). */
export interface TabBlock {
	kind: 'tab';
	line: number;
	source: string;
	closed: boolean;
}

export type SongItem = ChordLine | LyricLine | BlankLine | AsciiBlock | TabBlock;

export type DirectiveName = 'pattern' | 'strum' | 'shape';

/** A `%name args` line. Arguments stay raw until their phase validates them. */
export interface Directive {
	name: DirectiveName;
	args: string;
	line: number;
}

export interface Section {
	/** Null for the lines before the first section header. */
	name: string | null;
	/** Text after the header, as in `[Intro] (Piano Riff)`. */
	note: string | null;
	/** Line of the header; 0 for the lines before the first header. */
	line: number;
	/** The first `%strum` in the section. */
	strum: Directive | null;
	items: SongItem[];
}

/** A problem found while parsing, shown as an error on the block. */
export interface ParseError {
	message: string;
	line: number;
}

export interface Song {
	sections: Section[];
	/** Every directive in source order. */
	directives: Directive[];
	errors: ParseError[];
}

/** Header data read from the note's properties. */
export interface SongMeta {
	/** The `title` property, or the file name when it is empty. */
	title: string;
	artist: string | null;
	key: string | null;
	/** Null when there is no capo (0 or empty). */
	capo: number | null;
	tuning: string | null;
	tempo: number | null;
	difficulty: string | null;
}
