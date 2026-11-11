import { describe, expect, it } from 'vitest';
import { noteProperty, starterBase } from '../src/commands/template/base';

describe('starterBase', () => {
	const base = starterBase({ name: 'type', value: 'guitar_song' });

	it('lists Markdown notes with the song property', () => {
		expect(base.filters).toEqual({ and: ['note.type == "guitar_song"', 'file.ext == "md"'] });
	});

	it('has the starter views', () => {
		expect(base.views.map((view) => view.name)).toEqual(['Learning now', 'To start', 'By artist', 'Learned']);
	});

	it('shows songs being learned or polished in Learning now', () => {
		expect(base.views[0]?.filters).toEqual({
			or: ['note.status == "learning"', 'note.status == "polishing"'],
		});
	});

	it('groups By artist and puts the newest learned song first', () => {
		expect(base.views[2]?.groupBy).toEqual({ property: 'note.artist', direction: 'ASC' });
		expect(base.views[3]?.sort).toEqual([{ property: 'note.learned', direction: 'DESC' }]);
	});

	it('quotes a song property name and value that need it', () => {
		const custom = starterBase({ name: 'song kind', value: 'say "hi"' });
		expect(custom.filters).toEqual({ and: ['note["song kind"] == "say \\"hi\\""', 'file.ext == "md"'] });
	});
});

describe('noteProperty', () => {
	it('uses dot access for plain names', () => {
		expect(noteProperty('status')).toBe('note.status');
		expect(noteProperty('autoscroll-speed')).toBe('note["autoscroll-speed"]');
	});
});
