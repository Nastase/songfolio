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

/** One slot of a strumming pattern: a stroke, or none (the hand keeps moving). */
export interface StrumSlot {
	/** Null for no stroke (`.` or `-`). A muted `x` takes the direction of its slot. */
	stroke: 'down' | 'up' | null;
	muted: boolean;
	accent: boolean;
}

/** A `%pattern <name> <grid>: <slots>` line. */
export interface StrumPattern {
	/** As written, with runs of whitespace collapsed. */
	name: string;
	/** Lower-cased name: patterns are matched in any case. */
	key: string;
	/** Note value of one slot. */
	grid: 8 | 16;
	slots: StrumSlot[];
	/** Slot indexes where a `|` bar line was written; checked against the bar length. */
	barLines: number[];
	line: number;
}

/** A `%strum <name> [+draw]` line. */
export interface StrumRef {
	/** As written, with runs of whitespace collapsed. */
	name: string;
	/** Null when no pattern has that name (or its `%pattern` line has errors). */
	pattern: StrumPattern | null;
	/** `+draw`: draw the pattern in the section, not only its name. */
	draw: boolean;
	line: number;
}

/** A `%strum` after a section's first line: the pattern changes at that point. */
export interface StrumChange extends StrumRef {
	kind: 'strum';
}

export type SongItem = ChordLine | LyricLine | BlankLine | AsciiBlock | TabBlock | StrumChange;

/** Strings on the guitar; `%shape` gives one fret per string. */
export const STRING_COUNT = 6;

/** Highest fret a `%shape` may use. */
export const MAX_FRET = 24;

/** A `%shape <chord> <frets>` line: the fingering used for that chord. */
export interface ChordShape {
	/** The chord symbol as written; chords match it exactly, case included. */
	chord: string;
	/** One per string, low E to high E: the fret, 0 for open, null for muted. */
	frets: (number | null)[];
	line: number;
}

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
	/** The `%strum` before the section's first line, shown beside its title. */
	strum: StrumRef | null;
	items: SongItem[];
}

/** A problem found while parsing, shown as an error on the block. */
export interface ParseError {
	message: string;
	/** Null for a problem with a property, such as an unsupported `time`. */
	line: number | null;
}

export interface Song {
	sections: Section[];
	/** Every valid `%pattern`, in source order; the first wins when names repeat. */
	patterns: StrumPattern[];
	/** Every valid `%shape`, in source order; the first wins when a chord repeats. */
	shapes: ChordShape[];
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
	/** The `time` property as written, e.g. '3/4'. Null when empty (4/4). */
	time: string | null;
	difficulty: string | null;
}
