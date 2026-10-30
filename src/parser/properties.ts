import type { SongMeta } from '../model/song';

/**
 * Reads the header data from a note's frontmatter properties.
 * Values of the wrong type are ignored rather than reported: properties are edited outside the
 * block, so they are not block errors.
 */
export function readMeta(frontmatter: unknown, basename: string): SongMeta {
	const props = isRecord(frontmatter) ? frontmatter : {};
	const capo = readNumber(props.capo);
	return {
		title: readText(props.title) ?? basename,
		artist: readText(props.artist),
		key: readText(props.key),
		capo: capo ? capo : null,
		tuning: readText(props.tuning),
		tempo: readNumber(props.tempo),
		difficulty: readText(props.difficulty),
	};
}

/** Two metas are equal when every field is, so the header only re-renders on a real change. */
export function sameMeta(a: SongMeta, b: SongMeta): boolean {
	return (Object.keys(a) as (keyof SongMeta)[]).every((key) => a[key] === b[key]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Text of a property: links shown as their text, lists joined with commas. */
function readText(value: unknown): string | null {
	if (typeof value === 'number') return String(value);
	if (Array.isArray(value)) {
		const parts = value.map(readText).filter((part): part is string => part !== null);
		return parts.length > 0 ? parts.join(', ') : null;
	}
	if (typeof value !== 'string') return null;
	const text = stripLinks(value).trim();
	return text === '' ? null : text;
}

function readNumber(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(value)) return Number(value);
	return null;
}

/** `[[Note|Alias]]` → Alias, `[[Note#Heading]]` → Note, `[text](url)` → text. */
export function stripLinks(text: string): string {
	return text
		.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
		.replace(/\[\[([^\]#]+)(#[^\]]*)?\]\]/g, '$1')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}
