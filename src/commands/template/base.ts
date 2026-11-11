/**
 * The starter `Songs.base` (R12): the song library as a Bases file.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested. The shape follows Obsidian's
 * `BasesConfigFile`, plus the view `sort` key Obsidian writes (read from Obsidian 1.15).
 */

import type { Marker } from '../songNote';

export const BASE_FILE_NAME = 'Songs';

type Filter = string | { and: Filter[] } | { or: Filter[] };

interface View {
	type: 'table';
	name: string;
	filters?: Filter;
	groupBy?: { property: string; direction: 'ASC' | 'DESC' };
	order: string[];
	sort?: { property: string; direction: 'ASC' | 'DESC' }[];
}

export interface StarterBase {
	filters: Filter;
	properties: Record<string, { displayName: string }>;
	views: View[];
}

/** A property in a Bases formula: `note.status`, or `note["my property"]` for other names. */
export function noteProperty(name: string): string {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? `note.${name}` : `note[${JSON.stringify(name)}]`;
}

const is = (name: string, value: string) => `${noteProperty(name)} == ${JSON.stringify(value)}`;

/** Every song note, by its marker property; the views split them by status and artist. */
export function starterBase(marker: Marker): StarterBase {
	return {
		filters: { and: [is(marker.name, marker.value), 'file.ext == "md"'] },
		properties: { 'file.name': { displayName: 'Song' } },
		views: [
			{
				type: 'table',
				name: 'Learning now',
				filters: { or: [is('status', 'learning'), is('status', 'polishing')] },
				order: ['file.name', 'note.artist', 'note.key', 'note.capo', 'note.tuning', 'note.difficulty', 'note.status', 'note.started'],
				sort: [{ property: 'note.started', direction: 'ASC' }],
			},
			{
				type: 'table',
				name: 'To start',
				filters: is('status', 'to_start'),
				order: ['file.name', 'note.artist', 'note.key', 'note.difficulty', 'note.source'],
				sort: [{ property: 'file.name', direction: 'ASC' }],
			},
			{
				type: 'table',
				name: 'By artist',
				groupBy: { property: 'note.artist', direction: 'ASC' },
				order: ['file.name', 'note.key', 'note.capo', 'note.tuning', 'note.difficulty', 'note.status'],
				sort: [{ property: 'note.title', direction: 'ASC' }],
			},
			{
				type: 'table',
				name: 'Learned',
				filters: is('status', 'learned'),
				order: ['file.name', 'note.artist', 'note.key', 'note.difficulty', 'note.learned'],
				sort: [{ property: 'note.learned', direction: 'DESC' }],
			},
		],
	};
}
