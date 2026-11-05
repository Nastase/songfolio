/**
 * Strumming patterns: `%pattern <name> <grid>: <slots>` and `%strum <name> [+draw]`.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import type { ParseError, StrumPattern, StrumRef, StrumSlot } from '../model/song';

const PATTERN = /^(.+?)\s+(\d+)\s*:\s*(.*)$/;

/** Options a `%strum` line accepts after the name. */
const STRUM_OPTIONS = ['+draw'] as const;

/** Collapses runs of whitespace, so `Verse  riff` and `Verse riff` are the same name. */
export function normaliseName(name: string): string {
	return name.trim().replace(/\s+/g, ' ');
}

/** The key patterns are matched by: names match in any case. */
export function patternKey(name: string): string {
	return normaliseName(name).toLowerCase();
}

export interface PatternResult {
	/** Null when the line has errors. */
	pattern: StrumPattern | null;
	/** The pattern's name when it could be read, even if the line has errors. */
	name: string | null;
	errors: ParseError[];
}

/** Reads the arguments of a `%pattern` line. */
export function parsePattern(args: string, line: number): PatternResult {
	const match = PATTERN.exec(args);
	if (!match) {
		return {
			pattern: null,
			name: null,
			errors: [{ line, message: 'Write the pattern as %pattern <name> <8 or 16>: <slots>.' }],
		};
	}

	const name = normaliseName(match[1] ?? '');
	const gridText = match[2] ?? '';
	const errors: ParseError[] = [];
	if (name.includes('+')) errors.push({ line, message: `Pattern names cannot contain +: ${name}.` });

	const grid = gridText === '8' ? 8 : gridText === '16' ? 16 : null;
	if (grid === null) {
		errors.push({ line, message: `Pattern ${name}: the grid must be 8 or 16, not ${gridText}.` });
	}

	const slots: StrumSlot[] = [];
	const barLines: number[] = [];
	const bad = new Set<string>();
	for (const ch of match[3] ?? '') {
		if (/\s/.test(ch)) continue;
		if (ch === '|') {
			if (barLines[barLines.length - 1] !== slots.length) barLines.push(slots.length);
			continue;
		}
		const slot = readSlot(ch, slots.length);
		if (slot) slots.push(slot);
		else bad.add(ch);
	}
	if (bad.size > 0) {
		const chars = [...bad].map((ch) => `"${ch}"`).join(', ');
		errors.push({
			line,
			message: `Pattern ${name}: ${chars} ${bad.size === 1 ? 'is not a stroke' : 'are not strokes'}; use d, u, x, D, U, X, . or -.`,
		});
	} else if (slots.length === 0) {
		errors.push({ line, message: `Pattern ${name} has no slots.` });
	}

	if (errors.length > 0 || grid === null) return { pattern: null, name, errors };
	return {
		pattern: { name, key: patternKey(name), grid, slots, barLines, line },
		name,
		errors,
	};
}

/**
 * One slot symbol. A muted stroke takes the direction of its slot: even slots (on the beat
 * or the `&` of an 8th grid, `1` and `&` of a 16th grid) are down, odd slots are up.
 */
function readSlot(ch: string, index: number): StrumSlot | null {
	const accent = ch === 'D' || ch === 'U' || ch === 'X';
	switch (ch.toLowerCase()) {
		case 'd':
			return { stroke: 'down', muted: false, accent };
		case 'u':
			return { stroke: 'up', muted: false, accent };
		case 'x':
			return { stroke: index % 2 === 0 ? 'down' : 'up', muted: true, accent };
		case '.':
		case '-':
			return { stroke: null, muted: false, accent: false };
		default:
			return null;
	}
}

export interface StrumResult {
	/** Null when the line has no pattern name. Its pattern is resolved after parsing. */
	ref: StrumRef | null;
	errors: ParseError[];
}

/** Reads the arguments of a `%strum` line: a pattern name, then options such as `+draw`. */
export function parseStrum(args: string, line: number): StrumResult {
	const words = args.trim().split(/\s+/).filter((word) => word !== '');
	const options = words.filter((word) => word.startsWith('+'));
	const name = words.filter((word) => !word.startsWith('+')).join(' ');
	const errors: ParseError[] = [];

	for (const option of options) {
		if (!(STRUM_OPTIONS as readonly string[]).includes(option.toLowerCase())) {
			errors.push({ line, message: `Unknown %strum option ${option}; the only option is +draw.` });
		}
	}
	if (name === '') {
		errors.push({ line, message: '%strum needs a pattern name.' });
		return { ref: null, errors };
	}

	const draw = options.some((option) => option.toLowerCase() === '+draw');
	return { ref: { name, pattern: null, draw, line }, errors };
}
