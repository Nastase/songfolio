import { describe, expect, it } from 'vitest';
import { parseTuning } from '../src/parser/tuning';
import { suggestAt } from '../src/editor/suggestions';

const standard = parseTuning(null);

/** Suggestions with the cursor at the end of the last line. */
function at(...lines: string[]) {
	const line = lines.length - 1;
	return suggestAt(lines, line, (lines[line] ?? '').length, standard);
}

const labels = (...lines: string[]) => at(...lines)?.suggestions.map((item) => item.label) ?? null;

describe('autocomplete in a songsheet block', () => {
	it('suggests directives after a % at the start of a line', () => {
		expect(labels('%')).toEqual(['%pattern', '%strum', '%shape', '%tab', '%ascii']);
		expect(labels('  %s')).toEqual(['%strum', '%shape']);
		expect(at('  %s')?.from).toBe(2);
		expect(labels('%x')).toBeNull();
	});

	it('inserts the end line of a block, with the cursor between', () => {
		const [tab] = at('%t')?.suggestions ?? [];
		expect(tab?.text).toBe('%tab\n\n%endtab');
		expect(tab?.cursor).toEqual({ line: 1, ch: 0 });
	});

	it('inside an open block suggests only its end line', () => {
		expect(labels('%tab', ':8 0.6', '%')).toEqual(['%endtab']);
		expect(labels('%ascii', 'e|--|', '%e')).toEqual(['%endascii']);
		expect(labels('%tab', '%endtab', '%')).toHaveLength(5);
	});

	it('suggests the line markers at the end of a line', () => {
		expect(labels('Some words %')).toEqual(['%c', '%t']);
		expect(labels('Am  G %c')).toEqual(['%c']);
	});

	it('suggests the block\'s pattern names after %strum, in any case', () => {
		const lines = ['%pattern Main riff 8: d.du .udu', '%pattern Chorus 16: d.du .udu d.du .udu', '%strum ma'];
		expect(labels(...lines)).toEqual(['Main riff']);
		expect(at(...lines)?.from).toBe(7);
		expect(labels('%pattern A 8: d.du .udu', '%strum ')).toEqual(['A']);
	});

	it('suggests +draw once a pattern name is written', () => {
		expect(labels('%pattern A 8: d.du .udu', '%strum A ')).toEqual(['+draw']);
		expect(labels('%pattern A 8: d.du .udu', '%strum A +d')).toEqual(['+draw']);
	});

	it('suggests the song\'s chords without a shape after %shape, with the library fingering', () => {
		const lines = ['%shape C x32010', 'Am  C  Dmadd11', 'la', '%shape '];
		const found = at(...lines);
		expect(found?.suggestions.map((item) => item.text)).toEqual(['Am x 0 2 2 1 0', 'Dmadd11 ']);
		expect(found?.suggestions[1]?.detail).toBe('Not in the library');
	});

	it('suggests nothing elsewhere', () => {
		expect(at('Am  G')).toBeNull();
		expect(at('100%')).toBeNull();
	});
});
