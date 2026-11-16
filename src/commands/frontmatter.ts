/**
 * Reads and sets one simple property in a note's text, so an edit of the block and of a property
 * can be one change (and one undo step) in the editor.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 *
 * Only top-level scalar properties are handled (`key: C`, `capo: 2`, `key: "C#m"`); anything
 * else (a list, a block value) is left alone.
 */

/** Lines of the properties: from the line after the opening `---` to the closing one. */
function frontmatterLines(lines: readonly string[]): { start: number; end: number } | null {
	if (lines[0]?.trimEnd() !== '---') return null;
	for (let index = 1; index < lines.length; index++) {
		if (lines[index]?.trimEnd() === '---') return { start: 1, end: index };
	}
	return null;
}

const SCALAR = /^(?<name>[^\s:#][^:]*?):(?<space>[ \t]*)(?<value>.*?)\s*$/;

interface PropertyLine {
	index: number;
	/** The value without quotes; null when empty or not a scalar. */
	value: string | null;
	/** False for a list or a block value, which is never changed. */
	scalar: boolean;
	quote: '' | '"' | "'";
}

function findProperty(lines: readonly string[], name: string): PropertyLine | null {
	const range = frontmatterLines(lines);
	if (!range) return null;
	for (let index = range.start; index < range.end; index++) {
		const groups = SCALAR.exec(lines[index] ?? '')?.groups;
		if (!groups || groups.name !== name) continue;
		const raw = (groups.value ?? '').replace(/(^|\s+)#.*$/, '');
		if (raw === '') {
			// An empty value, unless an indented list or block follows on the next lines.
			const next = index + 1 < range.end ? (lines[index + 1] ?? '') : '';
			return { index, value: null, scalar: !/^(\s+\S|-\s)/.test(next), quote: '' };
		}
		if (/^[[{|>&*!-]/.test(raw)) return { index, value: null, scalar: false, quote: '' };
		const quote = raw[0] === '"' || raw[0] === "'" ? raw[0] : '';
		const value = quote && raw.endsWith(quote) && raw.length > 1 ? raw.slice(1, -1) : raw;
		return { index, value, scalar: true, quote };
	}
	return null;
}

/** A property's value as text, or null when it is missing, empty or not a scalar. */
export function readProperty(lines: readonly string[], name: string): string | null {
	return findProperty(lines, name)?.value ?? null;
}

/** Whether a text value must be quoted to stay text in YAML. */
function needsQuotes(value: string): boolean {
	return value === '' || /^[\s[{|>&*!%@`#,?:'"-]/.test(value) || /: | #|\s$/.test(value);
}

function format(value: string | number, quote: PropertyLine['quote']): string {
	if (typeof value === 'number') return String(value);
	const mark = quote || (needsQuotes(value) ? '"' : '');
	if (mark === '"') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	if (mark === "'") return `'${value.replace(/'/g, "''")}'`;
	return value;
}

/**
 * Sets a top-level property, keeping its quotes. With `add`, a missing property is added at the
 * end of the properties (and the properties are created when the note has none). Returns the
 * lines unchanged when the property is not a scalar, or is missing and `add` is false.
 */
export function setProperty(
	lines: readonly string[],
	name: string,
	value: string | number,
	add: boolean,
): string[] {
	const result = [...lines];
	const found = findProperty(lines, name);
	if (found) {
		if (!found.scalar) return result;
		result[found.index] = `${name}: ${format(value, found.quote)}`;
		return result;
	}
	if (!add) return result;
	const range = frontmatterLines(lines);
	if (range) result.splice(range.end, 0, `${name}: ${format(value, '')}`);
	else result.unshift('---', `${name}: ${format(value, '')}`, '---');
	return result;
}
