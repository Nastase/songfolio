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
		duration: readDuration(props.duration),
		time: readText(props.time),
		difficulty: readText(props.difficulty),
	};
}

const CLOCK = /^\s*(?:(\d+):)?(\d+):([0-5]\d)\s*$/;

/**
 * A song's length in seconds, from `m:ss` or `h:mm:ss` (`3:45`), or a number of seconds: YAML 1.1
 * reads an unquoted `3:45` as 225. Null when empty, zero or unreadable.
 */
export function readDuration(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
	if (typeof value !== 'string') return null;
	const match = CLOCK.exec(value);
	if (match) {
		const seconds = Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);
		return seconds > 0 ? seconds : null;
	}
	const number = readNumber(value);
	return number !== null && number > 0 ? number : null;
}

/** A duration as `m:ss`, or `h:mm:ss` from an hour. */
export function formatDuration(seconds: number): string {
	const total = Math.round(seconds);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = String(total % 60).padStart(2, '0');
	return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
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
