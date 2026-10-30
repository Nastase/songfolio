/**
 * Wrap-safe layout of chords over lyrics (R1). Pure: no Obsidian imports, unit-tested.
 *
 * A line is cut into cells: each cell holds the chord (if any) that starts at its column and
 * the lyric text up to the next cut. Cells are drawn as small columns, chord above lyric, so a
 * chord always stays over the text it was written over, in any font. Cells are joined into
 * groups that never break apart, and the line may wrap only between groups, which start at
 * word boundaries.
 */

import type { AsciiBlock, ChordLine, SongItem, TabBlock } from '../../model/song';

export type TokenKind = 'chord' | 'rhythm' | 'word';

/** Something drawn in the chord row: a chord, a rhythm mark, or a word such as `x4`. */
export interface LayoutToken {
	kind: TokenKind;
	text: string;
	col: number;
}

export interface LayoutCell {
	/** Chord-row text; '' for a cell without a token. */
	chord: string;
	kind: TokenKind | null;
	/** Lyric-row text; '' on chord-only lines. */
	lyric: string;
}

export interface LineLayout {
	/** Wrap units: the line may only wrap between groups. */
	groups: LayoutCell[][];
	/** False for a chord line without a lyric line below it: draw the chord row only. */
	hasLyrics: boolean;
}

/**
 * Lays out chord-row tokens over a lyric. With `lyric` null the line is chord-only: each token
 * is its own group, padded so the source spacing is kept.
 */
export function layoutLine(tokens: readonly LayoutToken[], lyric: string | null): LineLayout {
	const sorted = [...tokens].sort((a, b) => a.col - b.col);
	const text = lyric ?? '';
	const lastCol = sorted.length > 0 ? (sorted[sorted.length - 1]?.col ?? 0) : 0;
	const padded = text.padEnd(lastCol);

	const tokenAt = new Map<number, LayoutToken>();
	for (const token of sorted) if (!tokenAt.has(token.col)) tokenAt.set(token.col, token);

	const cuts = new Set<number>([0, ...tokenAt.keys()]);
	for (let p = 1; p < text.length; p++) {
		if (isWordStart(text, p) && !insideToken(sorted, p)) cuts.add(p);
	}
	const starts = [...cuts].sort((a, b) => a - b);

	const groups: LayoutCell[][] = [];
	starts.forEach((start, k) => {
		const end = starts[k + 1] ?? padded.length;
		const token = tokenAt.get(start);
		const slice = padded.slice(start, end);
		if (slice === '' && !token) return;

		const cell: LayoutCell =
			lyric === null
				? { chord: (token?.text ?? '').padEnd(slice.length), kind: token?.kind ?? null, lyric: '' }
				: { chord: token ? `${token.text} ` : '', kind: token?.kind ?? null, lyric: slice };

		const current = groups[groups.length - 1];
		const newGroup = !current || start >= text.length || isWordStart(text, start);
		if (newGroup) groups.push([cell]);
		else current.push(cell);
	});

	return { groups, hasLyrics: lyric !== null };
}

function isWordStart(text: string, p: number): boolean {
	const ch = text[p];
	return ch !== undefined && ch !== ' ' && (p === 0 || text[p - 1] === ' ');
}

/**
 * True when column p falls under a token's text or the space after it. A word starting there
 * is not a cut, so a short word next to a wide chord does not push the line apart.
 */
function insideToken(tokens: readonly LayoutToken[], p: number): boolean {
	return tokens.some((token) => p > token.col && p <= token.col + token.text.length);
}

/** What the renderer draws for a section's items. */
export type Row =
	/** A chord line (with the lyric line below it, if any), or a lyric line with inline chords. */
	| { kind: 'layout'; line: number; layout: LineLayout }
	/** A lyric line without chords. */
	| { kind: 'text'; line: number; text: string }
	| { kind: 'blank'; line: number }
	| AsciiBlock
	| TabBlock;

/** Pairs each chord line with the lyric line right below it, and lays out both. */
export function rowsOf(items: readonly SongItem[]): Row[] {
	const rows: Row[] = [];
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item) continue;
		switch (item.kind) {
			case 'chords': {
				const next = items[i + 1];
				const lyric =
					next?.kind === 'lyrics' && next.inlineChords.length === 0 ? next.text : null;
				if (lyric !== null) i++;
				rows.push({ kind: 'layout', line: item.line, layout: layoutLine(tokensOf(item), lyric) });
				break;
			}
			case 'lyrics':
				rows.push(
					item.inlineChords.length > 0
						? {
								kind: 'layout',
								line: item.line,
								layout: layoutLine(
									item.inlineChords.map((c) => ({ kind: 'chord', text: c.text, col: c.col })),
									item.text,
								),
							}
						: { kind: 'text', line: item.line, text: item.text },
				);
				break;
			default:
				rows.push(item);
		}
	}
	return rows;
}

function tokensOf(line: ChordLine): LayoutToken[] {
	return line.tokens.map((token) => ({ kind: token.kind, text: token.text, col: token.col }));
}
