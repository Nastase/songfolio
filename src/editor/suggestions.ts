/**
 * What to suggest while typing in a songsheet block (R15): directives, pattern names after
 * `%strum`, chords after `%shape`, and the `%c` / `%t` line markers.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import { parseSong } from '../parser';
import { songChords } from '../parser/chords';
import { formatFrets } from '../parser/shape';
import { patternKey } from '../parser/strum';
import type { Tuning } from '../parser/tuning';
import { libraryVoicings } from '../render/header/voicings';

export interface Suggestion {
	/** What the list shows. */
	label: string;
	/** A short hint beside it. */
	detail: string;
	/** Replaces the typed text, from `SuggestContext.from` to the cursor. */
	text: string;
	/** Where the cursor goes, as lines and a column after the start of `text`; end of `text` when missing. */
	cursor?: { line: number; ch: number };
}

export interface SuggestContext {
	/** Column where the replaced text starts, on the cursor's line. */
	from: number;
	/** The typed text being completed. */
	query: string;
	suggestions: Suggestion[];
}

interface Directive {
	name: string;
	detail: string;
	/** Text after the name: a space for directives with arguments. */
	after: string;
}

const DIRECTIVES: readonly Directive[] = [
	{ name: 'pattern', detail: 'Strumming pattern: name, 8 or 16, slots', after: ' ' },
	{ name: 'strum', detail: 'Use a pattern from here on', after: ' ' },
	{ name: 'shape', detail: 'Chord fingering, low E to high E', after: ' ' },
	{ name: 'tab', detail: 'Tab in alphaTex, until %endtab', after: '' },
	{ name: 'ascii', detail: 'ASCII tab, until %endascii', after: '' },
];

const MARKERS: readonly Suggestion[] = [
	{ label: '%c', detail: 'Read this line as chords', text: '%c' },
	{ label: '%t', detail: 'Read this line as lyrics', text: '%t' },
];

const DIRECTIVE_START = /^(\s*)%([a-z]*)$/;
const MARKER_END = /\S\s+%([ct]?)$/;
const STRUM = /^\s*%strum\s+/;
const SHAPE = /^\s*%shape\s+(\S*)$/;
const BLOCK = /^\s*%(tab|ascii|endtab|endascii)\s*$/;

/**
 * Suggestions for the cursor at column `ch` of line `line` in a block's source lines, or null
 * when there is nothing to suggest. `tuning` gives the library fingering written after a chord.
 */
export function suggestAt(lines: readonly string[], line: number, ch: number, tuning: Tuning): SuggestContext | null {
	const text = lines[line] ?? '';
	const before = text.slice(0, ch);
	const open = openBlock(lines, line);

	// Inside %tab or %ascii, only the end line.
	if (open) {
		const match = DIRECTIVE_START.exec(before);
		if (!match) return null;
		const end = `%end${open}`;
		const query = `%${match[2] ?? ''}`;
		if (!end.startsWith(query)) return null;
		const from = (match[1] ?? '').length;
		return { from, query, suggestions: [{ label: end, detail: `Ends the ${open === 'tab' ? 'tab' : 'ASCII tab'}`, text: end }] };
	}

	const directive = DIRECTIVE_START.exec(before);
	if (directive) {
		const typed = directive[2] ?? '';
		const from = (directive[1] ?? '').length;
		const suggestions = DIRECTIVES.filter((item) => item.name.startsWith(typed)).map((item) => directiveSuggestion(item));
		return suggestions.length > 0 ? { from, query: `%${typed}`, suggestions } : null;
	}

	const marker = MARKER_END.exec(before);
	if (marker) {
		const typed = marker[1] ?? '';
		const suggestions = MARKERS.filter((item) => item.label.startsWith(`%${typed}`));
		return { from: ch - typed.length - 1, query: `%${typed}`, suggestions };
	}

	const strum = STRUM.exec(before);
	if (strum) return strumSuggestions(lines, before, strum[0].length);

	const shape = SHAPE.exec(before);
	if (shape) return shapeSuggestions(lines, shape[1] ?? '', ch, tuning);

	return null;
}

function directiveSuggestion(item: Directive): Suggestion {
	const label = `%${item.name}`;
	if (item.after !== '') return { label, detail: item.detail, text: label + item.after };
	// A block: its end line too, with the cursor on the empty line between.
	return { label, detail: item.detail, text: `${label}\n\n%end${item.name}`, cursor: { line: 1, ch: 0 } };
}

/** `%strum <name>`: the block's patterns; once a name is written, `+draw`. */
function strumSuggestions(lines: readonly string[], before: string, start: number): SuggestContext | null {
	const typed = before.slice(start);
	const patterns = parseSong(lines.join('\n')).patterns;

	const option = /^(.*\S)\s+(\+\w*)$/.exec(typed) ?? /^(.*\S)\s+()$/.exec(typed);
	const named = option ? patterns.some((pattern) => pattern.key === patternKey(option[1] ?? '')) : false;
	if (option && named) {
		const query = option[2] ?? '';
		if (!'+draw'.startsWith(query)) return null;
		const draw = { label: '+draw', detail: 'Also draw the pattern here', text: '+draw' };
		return { from: before.length - query.length, query, suggestions: [draw] };
	}

	const query = patternKey(typed);
	const suggestions = patterns
		.filter((pattern) => pattern.key.startsWith(query))
		.map((pattern) => ({ label: pattern.name, detail: `${pattern.grid}ths, line ${pattern.line}`, text: pattern.name }));
	return suggestions.length > 0 ? { from: start, query: typed, suggestions } : null;
}

/** `%shape <chord>`: the song's chords without a shape, with the library's first fingering. */
function shapeSuggestions(lines: readonly string[], typed: string, ch: number, tuning: Tuning): SuggestContext | null {
	const song = parseSong(lines.join('\n'));
	const shaped = new Set(song.shapes.map((shape) => shape.chord));
	const suggestions = songChords(song)
		.filter((chord) => !shaped.has(chord.text) && chord.text.startsWith(typed))
		.map((chord) => {
			const [first] = libraryVoicings(chord.text, tuning);
			const frets = first ? ` ${formatFrets(first.frets)}` : ' ';
			return {
				label: chord.text,
				detail: first ? formatFrets(first.frets) : 'Not in the library',
				text: chord.text + frets,
			};
		});
	return suggestions.length > 0 ? { from: ch - typed.length, query: typed, suggestions } : null;
}

/** The `%tab` or `%ascii` block that is open at a line, as the parser reads it. */
function openBlock(lines: readonly string[], line: number): 'tab' | 'ascii' | null {
	let open: 'tab' | 'ascii' | null = null;
	for (let index = 0; index < line; index++) {
		const match = BLOCK.exec(lines[index] ?? '');
		if (!match) continue;
		const name = match[1] ?? '';
		if (open === null && (name === 'tab' || name === 'ascii')) open = name;
		else if (open !== null && name === `end${open}`) open = null;
	}
	return open;
}
