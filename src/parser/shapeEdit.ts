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
