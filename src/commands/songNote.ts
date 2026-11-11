/**
 * What a new song note holds: its properties, in order, and its file name. Used by the new song
 * command and the importer.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

/** The spec's song properties, in the order they are written. */
export const SONG_PROPERTIES = [
	'title',
	'artist',
	'key',
	'capo',
	'tuning',
	'tempo',
	'time',
	'difficulty',
	'status',
	'started',
	'learned',
	'source',
	'tags',
] as const;

export type SongProperty = (typeof SONG_PROPERTIES)[number];

/** Obsidian property types ("widgets") of the song properties, so Bases sorts and filters them right. */
export const PROPERTY_TYPES: Record<SongProperty, 'text' | 'number' | 'date' | 'tags'> = {
	title: 'text',
	artist: 'text',
	key: 'text',
	capo: 'number',
	tuning: 'text',
	tempo: 'number',
	time: 'text',
	difficulty: 'text',
	status: 'text',
	started: 'date',
	learned: 'date',
	source: 'text',
	tags: 'tags',
};

/** Status values, from not started to learned. */
export const STATUSES = ['to_start', 'learning', 'polishing', 'learned'] as const;

/** Values of a new song. Null or missing means unknown: the template or the default is kept. */
export type SongValues = { title: string } & Partial<Record<Exclude<SongProperty, 'title'>, unknown>>;

const DEFAULTS: Record<SongProperty, unknown> = {
	title: null,
	artist: null,
	key: null,
	capo: 0,
	tuning: 'E A D G B E',
	tempo: null,
	time: '4/4',
	difficulty: null,
	status: 'to_start',
	started: null,
	learned: null,
	source: null,
	tags: [],
};

export interface Marker {
	name: string;
	value: string;
}

/** Fills `{{title}}`, `{{date}}`, `{{time}}`, and `{{date:FORMAT}}` / `{{time:FORMAT}}`. */
export type FormatDate = (format: string) => string;

/**
 * The properties of a new song, in order: the song properties, then the marker, then the
 * template's other properties. Values given win over the template, which wins over the defaults;
 * the marker always has its value.
 */
export function songProperties(
	values: SongValues,
	marker: Marker,
	template: Record<string, unknown> | null,
	formatDate: FormatDate,
): Record<string, unknown> {
	const filled = template ? fillPlaceholders(template, values.title, formatDate) : {};
	const result: Record<string, unknown> = {};
	for (const name of SONG_PROPERTIES) {
		const given = (values as Record<string, unknown>)[name];
		if (given !== null && given !== undefined && given !== '') result[name] = given;
		else if (name in filled) result[name] = filled[name];
		else result[name] = DEFAULTS[name];
	}
	result[marker.name] = marker.value;
	for (const [name, value] of Object.entries(filled)) {
		if (!(name in result)) result[name] = value;
	}
	return result;
}

const PLACEHOLDER = /\{\{\s*(title|date|time)\s*(?::([^}]*))?\}\}/gi;

function fillPlaceholders(
	template: Record<string, unknown>,
	title: string,
	formatDate: FormatDate,
): Record<string, unknown> {
	const fill = (value: unknown): unknown => {
		if (typeof value === 'string') {
			return value.replace(PLACEHOLDER, (_match, word: string, format: string | undefined) => {
				const name = word.toLowerCase();
				if (name === 'title') return title;
				const fallback = name === 'date' ? 'YYYY-MM-DD' : 'HH:mm';
				return formatDate(format?.trim() || fallback);
			});
		}
		if (Array.isArray(value)) return value.map(fill);
		return value;
	};
	return Object.fromEntries(Object.entries(template).map(([name, value]) => [name, fill(value)]));
}

/** Characters a file name cannot hold, or that break links to it. */
const UNSAFE = /[\\/:*?"<>|#^[\]]/g;

/** `Artist - Title`, or `Title` without an artist, cleaned so Obsidian can use it. */
export function songFileName(title: string, artist: string | null): string {
	const clean = (text: string) =>
		text.replace(UNSAFE, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '').trim();
	const name = clean(title) || 'Untitled song';
	const by = artist ? clean(artist) : '';
	return (by ? `${by} - ${name}` : name).slice(0, 200).trim();
}

/** A fenced code block, with a fence longer than any backtick run inside it. */
export function codeBlock(language: string, body: string): string {
	const longest = Math.max(0, ...[...body.matchAll(/`{3,}/g)].map((match) => match[0].length));
	const fence = '`'.repeat(Math.max(3, longest + 1));
	const text = body.replace(/\n+$/, '');
	return `${fence}${language}\n${text}\n${fence}\n`;
}

/** The block of a new song: empty sections to fill in. */
export const STARTER_BLOCK = '[Verse]\n\n[Chorus]\n';
