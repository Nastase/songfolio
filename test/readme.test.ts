import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSong } from '../src/parser';
import { checkStrumming, parseTime } from '../src/parser/strum';

/** Every songsheet example in the README, so the syntax reference stays true to the parser. */
const examples = [...readFileSync('README.md', 'utf8').matchAll(/^```songsheet\n([\s\S]*?)^```$/gm)].map(
	(match) => match[1] ?? '',
);

describe('README examples', () => {
	it('has examples', () => {
		expect(examples.length).toBeGreaterThanOrEqual(2);
	});

	it.each(examples.map((source, index) => [index + 1, source]))('example %i parses without errors', (_, source) => {
		const song = parseSong(source);
		expect([...song.errors, ...checkStrumming(song, parseTime(null))]).toEqual([]);
		expect(song.sections.length).toBeGreaterThan(0);
	});
});
