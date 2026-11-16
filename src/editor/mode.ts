/**
 * A CodeMirror 5-style tokenizer for songsheet blocks in source mode (R14): directives, section
 * headers, chords, line markers and tab. Obsidian highlights a fenced code block with the mode
 * named like its language, through its legacy-mode support; this is not an editor extension.
 * Lines are read as the parser reads them (`readLineKind`).
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import { isChordSymbol, readLineKind, type LineKind } from '../parser';

/** The part of CodeMirror's `StringStream` the mode uses. */
export interface Stream {
	sol(): boolean;
	eol(): boolean;
	match(pattern: RegExp, consume?: boolean): RegExpMatchArray | null | boolean;
	skipToEnd(): void;
	next(): string | null | undefined;
	readonly string: string;
}

export interface ModeState {
	open: 'tab' | 'ascii' | null;
	kind: LineKind;
}

export interface Mode {
	startState(): ModeState;
	copyState(state: ModeState): ModeState;
	token(stream: Stream, state: ModeState): string | null;
}

/**
 * Token styles, as Obsidian's themes colour them in code blocks: directives `keyword`, section
 * headers `builtin`, chords `variable-2`, tab `string`, line markers, rhythm marks and options
 * `meta`, a header's note `comment`.
 */
export const STYLE = {
	directive: 'keyword',
	header: 'builtin',
	chord: 'variable-2',
	tab: 'string',
	mark: 'meta',
	note: 'comment',
} as const;

const MARKER = /^%[ct]\s*$/;
const INLINE_CHORD = /^\[([^\s\]]+)[^\]]*\]/;

export function songsheetMode(): Mode {
	return {
		startState: () => ({ open: null, kind: 'lyrics' }),
		copyState: (state) => ({ ...state }),
		token(stream, state) {
			if (stream.sol()) {
				const read = readLineKind(stream.string, state.open);
				state.kind = read.kind;
				state.open = read.open;
			}
			switch (state.kind) {
				case 'block-fence':
					stream.skipToEnd();
					return STYLE.directive;
				case 'block-body':
				case 'tab-line':
					stream.skipToEnd();
					return STYLE.tab;
				case 'directive':
					return directiveToken(stream);
				case 'header':
					if (stream.match(/^\s*\[[^\]]+\]/)) return STYLE.header;
					stream.skipToEnd();
					return STYLE.note;
				case 'chords':
					return chordToken(stream);
				case 'lyrics':
					return lyricToken(stream);
			}
		},
	};
}

function directiveToken(stream: Stream): string | null {
	if (stream.sol() && stream.match(/^\s*%[a-z]+/)) return STYLE.directive;
	if (stream.match(/^\s+/)) return null;
	const word = stream.match(/^\S+/);
	return Array.isArray(word) && word[0].startsWith('+') ? STYLE.mark : null;
}

function chordToken(stream: Stream): string | null {
	if (stream.match(/^\s+/)) return null;
	if (stream.match(MARKER)) return STYLE.mark;
	const word = stream.match(/^\S+/);
	if (!Array.isArray(word)) {
		stream.next();
		return null;
	}
	const text = word[0];
	const inline = INLINE_CHORD.exec(text)?.[1];
	if (isChordSymbol(inline ?? text.replace(/\[.*$/, ''))) return STYLE.chord;
	if (/^([|/%]+|[Nn]\.?[Cc]\.?)$/.test(text)) return STYLE.mark;
	return null;
}

function lyricToken(stream: Stream): string | null {
	const inline = stream.match(INLINE_CHORD, false);
	if (Array.isArray(inline) && isChordSymbol(inline[1] ?? '')) {
		stream.match(INLINE_CHORD);
		return STYLE.chord;
	}
	if (stream.match(/^\s%[ct]\s*$/)) return STYLE.mark;
	if (!stream.match(/^\s*[^[\s]+/) && !stream.match(/^\s+/)) stream.next();
	return null;
}
