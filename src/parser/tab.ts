/**
 * The inside of a `%tab`…`%endtab` block: alphaTex beats, which alphaTab draws (R8).
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 *
 * Only what Songfolio needs is read here: the metadata a `%tab` may not hold, and the chord
 * names above the beats. alphaTab itself checks the rest when it draws the tab.
 */

import type { ChordSymbol, ParseError } from '../model/song';
import { parseChordSymbol } from './chordsheets/chordsUtils';

/** Added by the plugin around the beats (see `src/render/tab/tex.ts`). */
const ADDED_BY_PLUGIN = new Set(['track', 'staff']);

/**
 * Score, track and staff metadata of alphaTex 1.8: they describe the whole score, not the beats.
 * Allowed: bar metadata (`\ts`, `\ks`, `\tempo`, `\section`, repeats…), `\voice`, `\chord`,
 * `\lyrics` and `\articulation`.
 */
const NOT_ALLOWED = new Set([
	// Score metadata.
	'title', 'subtitle', 'artist', 'album', 'words', 'music', 'wordsandmusic', 'copyright',
	'copyright2', 'instructions', 'notices', 'tab', 'systemslayout', 'defaultsystemslayout',
	'showdynamics', 'hidedynamics', 'usesystemsignseparator', 'multibarrest', 'bracketextendmode',
	'singletracktracknamepolicy', 'multitracktracknamepolicy', 'firstsystemtracknamemode',
	'othersystemstracknamemode', 'firstsystemtracknameorientation',
	'othersystemstracknameorientation', 'extendbarlines', 'chorddiagramsinscore', 'hideemptystaves',
	'hideemptystavesinfirstsystem', 'showsinglestaffbrackets', 'defaultbarnumberdisplay',
	// Track and staff: the plugin adds them, with the tuning from the property.
	'track', 'staff', 'tuning', 'capo', 'instrument',
	// Tab is never transposed (R13).
	'transpose', 'displaytranspose',
]);

export interface TabContent {
	/** The source with lines that may not be used blanked, so line numbers still match. */
	beats: string;
	/** Chords named with `{ch "Am"}`, in order of first appearance, by symbol. */
	chords: ChordSymbol[];
	errors: ParseError[];
}

/**
 * Reads the source of a `%tab` block whose `%tab` line is `line`: its first source line is
 * `line + 1` in the block.
 */
export function readTab(source: string, line: number): TabContent {
	const lines = source.split('\n');
	const errors: ParseError[] = [];
	const ignored = new Set<number>();
	const chords = new Map<string, ChordSymbol>();

	const tokens = tokenize(source);
	for (const token of tokens) {
		if (token.kind !== 'tag') continue;
		const tag = token.text.toLowerCase();
		if (!NOT_ALLOWED.has(tag) || ignored.has(token.line)) continue;
		ignored.add(token.line);
		errors.push({ line: line + 1 + token.line, message: tagMessage(token.text, tag) });
	}

	// A chord named on an ignored line is not drawn, so it gets no diagram either.
	tokens.forEach((token, index) => {
		if (token.kind !== 'word' || !token.inEffects || token.text.toLowerCase() !== 'ch') return;
		const name = tokens[index + 1];
		if (!name || (name.kind !== 'string' && name.kind !== 'word') || ignored.has(name.line)) return;
		const chord = chordSymbol(name.text);
		if (chord && !chords.has(chord.text)) chords.set(chord.text, chord);
	});

	const beats = lines.map((text, index) => (ignored.has(index) ? '' : text)).join('\n');
	return { beats, chords: [...chords.values()], errors };
}

function tagMessage(written: string, tag: string): string {
	if (ADDED_BY_PLUGIN.has(tag)) {
		return `\\${written} is added by the plugin: %tab holds beats only. The line is ignored.`;
	}
	if (tag === 'tuning') {
		return '\\tuning comes from the tuning property: %tab holds beats only. The line is ignored.';
	}
	return `\\${written} cannot be used in %tab, which holds beats only. The line is ignored.`;
}

function chordSymbol(text: string): ChordSymbol | null {
	const value = text.trim();
	const chord = parseChordSymbol(value);
	if (!chord.tonic) return null;
	return { text: value, tonic: chord.tonic, bass: chord.bass ?? '' };
}

interface TabToken {
	kind: 'tag' | 'string' | 'word';
	text: string;
	/** 0-based line within the tab source. */
	line: number;
	/** Inside `{…}`, where beat and note effects such as `ch "Am"` are written. */
	inEffects: boolean;
}

/** Characters that end a word: whitespace and alphaTex punctuation. */
const WORD_END = /[\s{}()[\]"'\\|/:*]/;

/**
 * A minimal alphaTex lexer: metadata tags, strings and words, skipping `//` and `/* *\/`
 * comments. Anything else is skipped.
 */
function tokenize(source: string): TabToken[] {
	const tokens: TabToken[] = [];
	let line = 0;
	let depth = 0;
	let i = 0;
	const at = (offset = 0) => source[i + offset] ?? '';

	while (i < source.length) {
		const ch = at();
		if (ch === '\n') {
			line++;
			i++;
		} else if (ch === '/' && at(1) === '/') {
			while (i < source.length && at() !== '\n') i++;
		} else if (ch === '/' && at(1) === '*') {
			i += 2;
			while (i < source.length && !(at() === '*' && at(1) === '/')) {
				if (at() === '\n') line++;
				i++;
			}
			i += 2;
		} else if (ch === '"' || ch === "'") {
			const start = line;
			let text = '';
			i++;
			while (i < source.length && at() !== ch) {
				if (at() === '\\') i++;
				if (at() === '\n') line++;
				text += at();
				i++;
			}
			i++;
			tokens.push({ kind: 'string', text, line: start, inEffects: depth > 0 });
		} else if (ch === '\\') {
			i++;
			while (at() === '\\') i++;
			let text = '';
			while (i < source.length && /[A-Za-z0-9]/.test(at())) text += source[i++];
			if (text !== '') tokens.push({ kind: 'tag', text, line, inEffects: depth > 0 });
		} else if (ch === '{') {
			depth++;
			i++;
		} else if (ch === '}') {
			depth = Math.max(0, depth - 1);
			i++;
		} else if (WORD_END.test(ch)) {
			i++;
		} else {
			let text = '';
			while (i < source.length && !WORD_END.test(at())) text += source[i++];
			tokens.push({ kind: 'word', text, line, inEffects: depth > 0 });
		}
	}
	return tokens;
}
