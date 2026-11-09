/**
 * Edits `%shape` lines in a block's source, for the fingering picker (R4).
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import { parseSong } from '.';
import { formatFrets } from './shape';

const SHAPE_LINE = /^(\s*)%shape(?=\s|$)\s*(\S*)/;
const OPENING_DIRECTIVE = /^\s*%(pattern|shape)(\s|$)/;

/**
 * Sets the `%shape` line of a chord in a block's source, for the fingering picker. Replaces the
 * chord's first `%shape` line, or adds one after the `%pattern` and `%shape` lines that open the
 * block (at the top when there are none). With `frets` null the chord goes back to the library:
 * its `%shape` line is removed. Repeats of the chord's line, which are errors, are removed too.
 * Everything else, line endings included, is left as it was.
 */
export function setShapeLine(source: string, chord: string, frets: readonly (number | null)[] | null): string {
	const eol = source.includes('\r\n') ? '\r\n' : '\n';
	const lines = source.split(/\r?\n/);
	const text = frets === null ? null : `%shape ${chord} ${formatFrets(frets)}`;

	// Only lines the parser reads as `%shape` directives: not those inside %tab or %ascii.
	const directiveLines = new Set(
		parseSong(source)
			.directives.filter((directive) => directive.name === 'shape')
			.map((directive) => directive.line - 1)
			.filter((index) => SHAPE_LINE.exec(lines[index] ?? '')?.[2] === chord),
	);
	const [first] = [...directiveLines];

	const result: string[] = [];
	lines.forEach((line, index) => {
		if (!directiveLines.has(index)) {
			result.push(line);
		} else if (index === first && text !== null) {
			result.push((SHAPE_LINE.exec(line)?.[1] ?? '') + text);
		}
	});

	if (first === undefined && text !== null) {
		let at = 0;
		while (at < result.length && OPENING_DIRECTIVE.test(result[at] ?? '')) at++;
		result.splice(at, 0, text);
	}
	return result.join(eol);
}

/** Block source for comparison: LF line endings, without the final newline. */
function normalise(source: string): string {
	return source.replace(/\r\n?/g, '\n').replace(/\n$/, '');
}

/**
 * Sets a chord's `%shape` line in the text between a block's fences, if that text is still the
 * source the block was rendered from. Null when it changed since: nothing is written then.
 */
export function editBlockBody(
	body: string,
	renderedSource: string,
	chord: string,
	frets: readonly (number | null)[] | null,
): string | null {
	if (normalise(body) !== normalise(renderedSource)) return null;
	return setShapeLine(body, chord, frets);
}

/**
 * Sets a chord's `%shape` line in a whole note, in the block whose fences are on lines
 * `fenceStart` and `fenceEnd` (from 0). Null when that block is no longer the rendered source.
 */
export function editNote(
	note: string,
	fenceStart: number,
	fenceEnd: number,
	renderedSource: string,
	chord: string,
	frets: readonly (number | null)[] | null,
): string | null {
	const eol = note.includes('\r\n') ? '\r\n' : '\n';
	const lines = note.split(eol);
	if (fenceStart < 0 || fenceEnd <= fenceStart || fenceEnd >= lines.length) return null;
	const body = lines.slice(fenceStart + 1, fenceEnd).join(eol);
	const edited = editBlockBody(body, renderedSource, chord, frets);
	if (edited === null) return null;
	const bodyLines = edited === '' ? [] : edited.split(eol);
	return [...lines.slice(0, fenceStart + 1), ...bodyLines, ...lines.slice(fenceEnd)].join(eol);
}
