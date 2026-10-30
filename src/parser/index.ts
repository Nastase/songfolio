import type {
	AsciiBlock,
	ChordLineToken,
	ChordSymbol,
	Directive,
	DirectiveName,
	InlineChord,
	ParseError,
	Section,
	Song,
	SongItem,
	TabBlock,
} from '../model/song';
import { parseChordSymbol, type SheetChord } from './chordsheets/chordsUtils';
import { addCustomChordTypes } from './chordsheets/customChordTypes';
import { tokenizeLine } from './chordsheets/tokenizeLine';
import { isChordToken, type Token } from './chordsheets/tokens';

/** Chord Sheets' line markers: at the end of a line, force a chord line or a lyric line. */
export const CHORD_LINE_MARKER = '%c';
export const TEXT_LINE_MARKER = '%t';

/** Columns per tab character, as Obsidian shows code blocks. */
export const TAB_SIZE = 4;

const DIRECTIVES: readonly DirectiveName[] = ['pattern', 'strum', 'shape'];

const DIRECTIVE = /^\s*%([a-z]+)(?=\s|$)\s*(.*?)\s*$/;
const ESCAPED_TEXT_LINE = /\s%t\s*$/;
const BLOCK_END = /^\s*%end(tab|ascii)\s*$/;
const HEADER = /^\s*\[([^\]]+)\]\s*$/;
const HEADER_WITH_NOTE = /^\s*\[([^\]]+)\]\s*([^[]*?)\s*$/;
const BLANK = /^\s*$/;
/** A raw ASCII tab line: string name, bar, then dashes, e.g. `e|--3---|` or `D|---| x2`. */
const TAB_TEXT_LINE = /^\s*[A-Ga-g][#b]?\|.*-{2,}/;
const LINE_MARKER_AT_END = /%[ct]\s*$/;

/**
 * Parses the source of a songsheet block into a song model.
 * The only place that understands the block syntax.
 */
export function parseSong(source: string): Song {
	addCustomChordTypes();

	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	// A block's source ends with a newline; that last empty line is not part of the song.
	if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();

	const sections: Section[] = [];
	const directives: Directive[] = [];
	const errors: ParseError[] = [];

	let section: Section = { name: null, note: null, line: 0, strum: null, items: [] };
	sections.push(section);
	const add = (item: SongItem) => section.items.push(item);

	let block: AsciiBlock | TabBlock | null = null;
	let blockLines: string[] = [];
	let implicitAscii: AsciiBlock | null = null;

	const closeBlock = (closed: boolean) => {
		if (!block) return;
		block.closed = closed;
		if (block.kind === 'tab') block.source = blockLines.join('\n');
		else block.lines = blockLines;
		block = null;
		blockLines = [];
	};

	lines.forEach((text, index) => {
		const line = index + 1;

		// 1. Inside %tab or %ascii, only the matching end line counts.
		if (block) {
			const end = BLOCK_END.exec(text);
			if (end && end[1] === block.kind) closeBlock(true);
			else blockLines.push(text);
			return;
		}

		// Raw tab lines that follow each other form one implicit ASCII block.
		if (TAB_TEXT_LINE.test(text) && !LINE_MARKER_AT_END.test(text)) {
			if (!implicitAscii) {
				implicitAscii = { kind: 'ascii', line, lines: [], implicit: true, closed: true };
				add(implicitAscii);
			}
			implicitAscii.lines.push(text);
			return;
		}
		implicitAscii = null;

		// 2. Directives.
		const directive = DIRECTIVE.exec(text);
		if (directive && !ESCAPED_TEXT_LINE.test(text)) {
			const name = directive[1] ?? '';
			const args = directive[2] ?? '';
			if (name !== 'c' && name !== 't') {
				if ((DIRECTIVES as readonly string[]).includes(name)) {
					const parsed: Directive = { name: name as DirectiveName, args, line };
					directives.push(parsed);
					if (parsed.name === 'strum' && !section.strum) section.strum = parsed;
				} else if (name === 'tab') {
					block = { kind: 'tab', line, source: '', closed: false };
					add(block);
				} else if (name === 'ascii') {
					block = { kind: 'ascii', line, lines: [], implicit: false, closed: false };
					add(block);
				} else if (name === 'endtab' || name === 'endascii') {
					const opening = name.slice(3);
					errors.push({ line, message: `%${name} has no matching %${opening}.` });
				} else {
					errors.push({ line, message: `Unknown directive %${name}.` });
				}
				return;
			}
		}

		// 3. Section headers: `[Name]`, or `[Name] note` when Name is not a chord.
		const header = readHeader(text);
		if (header) {
			section = { name: header.name, note: header.note, line, strum: null, items: [] };
			sections.push(section);
			return;
		}

		// 4. Blank lines.
		if (BLANK.test(text)) {
			add({ kind: 'blank', line });
			return;
		}

		// 5. Chord lines and lyric lines, detected as Chord Sheets does.
		add(classifyLine(text, line));
	});

	// TypeScript cannot see the assignments inside forEach, so widen the type back.
	const open = block as AsciiBlock | TabBlock | null;
	if (open) {
		errors.push({
			line: open.line,
			message: `%${open.kind} is not closed; add %end${open.kind}.`,
		});
		closeBlock(false);
	}

	// Drop the implicit first section when it holds nothing visible.
	const first = sections[0];
	if (first && first.items.every((item) => item.kind === 'blank')) sections.shift();

	return { sections, directives, errors };
}

/** Reads `[Name]` alone, or `[Name] note`. Returns null when the line is not a header. */
function readHeader(text: string): { name: string; note: string | null } | null {
	const plain = HEADER.exec(text)?.[1];
	if (plain !== undefined) return { name: plain.trim(), note: null };

	const match = HEADER_WITH_NOTE.exec(text);
	const name = match?.[1]?.trim();
	const note = match?.[2];
	if (!name || !note) return null;
	// `[Am] lyrics` is an inline chord, not a header.
	if (isChord(name)) return null;
	// `[Intro] G C D` stays a chord line, as in Chord Sheets.
	if (tokenizeLine(note, 0, CHORD_LINE_MARKER, TEXT_LINE_MARKER).isChordLine) return null;
	return { name, note };
}

function isChord(text: string): boolean {
	return Boolean(parseChordSymbol(text).tonic);
}

function classifyLine(text: string, line: number): SongItem {
	const { tokens, isChordLine } = tokenizeLine(text, 0, CHORD_LINE_MARKER, TEXT_LINE_MARKER);
	return isChordLine ? chordLine(tokens, line) : lyricLine(tokens, line);
}

/** Advances a column over text, expanding tabs. */
function advance(col: number, value: string): number {
	for (const ch of value) col = ch === '\t' ? (Math.floor(col / TAB_SIZE) + 1) * TAB_SIZE : col + 1;
	return col;
}

function expandTabs(value: string, col: number): string {
	return value.includes('\t') ? ' '.repeat(advance(col, value) - col) : value;
}

function toSymbol(token: Token & { chord: SheetChord; chordSymbol: { value: string } }): ChordSymbol {
	return {
		text: token.chordSymbol.value,
		tonic: token.chord.tonic ?? '',
		bass: token.chord.bass ?? '',
	};
}

function rangeOf(token: Token) {
	return { start: token.range[0], end: token.range[1] };
}

function chordLine(tokens: Token[], line: number): SongItem {
	const result: ChordLineToken[] = [];
	let col = 0;
	for (const token of tokens) {
		if (isChordToken(token)) {
			const chord = toSymbol(token);
			const aux = token.inlineChord?.auxText?.value ?? '';
			result.push({ kind: 'chord', text: chord.text + aux, chord, col, range: rangeOf(token) });
		} else if (token.type === 'rhythm' || token.type === 'word') {
			result.push({ kind: token.type, text: token.value, col });
		}
		col = advance(col, token.value);
	}
	return { kind: 'chords', line, tokens: result };
}

function lyricLine(tokens: Token[], line: number): SongItem {
	let text = '';
	const inlineChords: InlineChord[] = [];
	for (const token of tokens) {
		if (token.type === 'marker') continue;
		if (isChordToken(token) && token.inlineChord) {
			const chord = toSymbol(token);
			const aux = token.inlineChord.auxText?.value ?? '';
			inlineChords.push({ text: chord.text + aux, chord, col: text.length, range: rangeOf(token) });
			continue;
		}
		text += token.type === 'whitespace' ? expandTabs(token.value, text.length) : token.value;
	}
	return { kind: 'lyrics', line, text: text.trimEnd(), inlineChords };
}
