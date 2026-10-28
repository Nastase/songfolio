import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSong } from '../src/parser';

const fixture = (name: string) =>
	readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('parseSong', () => {
	it('collects % directives with their line numbers', () => {
		const song = parseSong(fixture('syntax-example.songsheet'));
		const names = song.directives.map((d) => d.name);

		expect(names).toEqual([
			'pattern',
			'pattern',
			'shape',
			'strum',
			'strum',
			'tab',
			'endtab',
			'ascii',
			'endascii',
		]);
		expect(song.directives[0]).toEqual({
			name: 'pattern',
			args: 'A 8: d.d. dudu',
			line: 1,
		});
		expect(song.errors).toEqual([]);
	});

	it('accepts a plain Chord Sheets song', () => {
		const song = parseSong(fixture('chord-sheets-legacy.songsheet'));
		expect(song.lines.length).toBeGreaterThan(0);
		expect(song.errors).toEqual([]);
	});

	it('normalises Windows line endings', () => {
		expect(parseSong('C G\r\nlyric\r\n').lines).toEqual(['C G', 'lyric', '']);
	});
});
