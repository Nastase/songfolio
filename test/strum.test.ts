import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { StrumSlot } from '../src/model/song';
import { parseSong } from '../src/parser';
import { checkStrumming, parsePattern, parseStrum, parseTime } from '../src/parser/strum';

const fixture = (name: string) =>
	readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

/** Slots as short strings: direction, then m for muted and > for accented. */
const slotText = (slot: StrumSlot) =>
	(slot.stroke ?? '.') + (slot.muted ? 'm' : '') + (slot.accent ? '>' : '');

const slotsOf = (args: string) => parsePattern(args, 1).pattern?.slots.map(slotText);

describe('%pattern', () => {
	it('reads the name, grid and slots, ignoring spaces', () => {
		const { pattern, errors } = parsePattern('A 8: d.d. dudu', 3);
		expect(errors).toEqual([]);
		expect(pattern).toMatchObject({ name: 'A', key: 'a', grid: 8, line: 3, barLines: [] });
		expect(pattern?.slots.map(slotText)).toEqual(['down', '.', 'down', '.', 'down', 'up', 'down', 'up']);
	});

	it('reads a 16th grid', () => {
		expect(parsePattern('B 16: D.du .udu x.du .udu', 1).pattern?.grid).toBe(16);
		expect(slotsOf('B 16: D.du .udu x.du .udu')).toHaveLength(16);
	});

	it('reads accents and muted strokes, with the muted direction from the slot', () => {
		expect(slotsOf('M 8: Dx Ux XX xu')).toEqual([
			'down>', 'upm', 'up>', 'upm', 'downm>', 'upm>', 'downm', 'up',
		]);
	});

	it('honours an explicit direction on any slot', () => {
		expect(slotsOf('P 8: uudd')).toEqual(['up', 'up', 'down', 'down']);
	});

	it('takes - as no stroke, like .', () => {
		expect(slotsOf('A 8: d-du -udu')).toEqual(slotsOf('A 8: d.du .udu'));
	});

	it('records | bar lines by slot index and ignores them as slots', () => {
		const { pattern } = parsePattern('L 8: |d.du .udu | d.du .udu|', 1);
		expect(pattern?.slots).toHaveLength(16);
		expect(pattern?.barLines).toEqual([0, 8, 16]);
	});

	it('allows spaces in names and collapses them', () => {
		expect(parsePattern('Verse   riff 16: d.du .udu d.du .udu', 1).pattern).toMatchObject({
			name: 'Verse riff',
			key: 'verse riff',
		});
	});

	it('reports a line without a grid or colon', () => {
		for (const args of ['A d.du .udu', 'A 8 d.du', '', '8: d.du']) {
			expect(parsePattern(args, 4)).toEqual({
				pattern: null,
				name: null,
				errors: [{ line: 4, message: 'Write the pattern as %pattern <name> <8 or 16>: <slots>.' }],
			});
		}
	});

	it('reports a grid other than 8 or 16, keeping the name', () => {
		expect(parsePattern('A 12: d.du .udu', 2)).toEqual({
			pattern: null,
			name: 'A',
			errors: [{ line: 2, message: 'Pattern A: the grid must be 8 or 16, not 12.' }],
		});
	});

	it('reports symbols that are not strokes', () => {
		expect(parsePattern('A 8: d.dy .zdy', 1).errors).toEqual([
			{ line: 1, message: 'Pattern A: "y", "z" are not strokes; use d, u, x, D, U, X, . or -.' },
		]);
		expect(parsePattern('A 8: d.d> dudu', 1).errors[0]?.message).toContain('">" is not a stroke');
	});

	it('reports a pattern without slots', () => {
		expect(parsePattern('A 8:', 1).errors).toEqual([{ line: 1, message: 'Pattern A has no slots.' }]);
	});

	it('reports a + in the name', () => {
		expect(parsePattern('A+B 8: dudu', 1).errors).toEqual([
			{ line: 1, message: 'Pattern names cannot contain +: A+B.' },
		]);
	});
});

describe('%strum', () => {
	it('reads the name and the +draw option', () => {
		expect(parseStrum('Verse  riff +draw', 5)).toEqual({
			ref: { name: 'Verse riff', pattern: null, draw: true, line: 5 },
			errors: [],
		});
		expect(parseStrum('A', 1).ref?.draw).toBe(false);
		expect(parseStrum('A +DRAW', 1).ref?.draw).toBe(true);
	});

	it('reports unknown options and keeps the name', () => {
		expect(parseStrum('A +big', 2)).toEqual({
			ref: { name: 'A', pattern: null, draw: false, line: 2 },
			errors: [{ line: 2, message: 'Unknown %strum option +big; the only option is +draw.' }],
		});
	});

	it('reports a missing name', () => {
		expect(parseStrum('', 3)).toEqual({
			ref: null,
			errors: [{ line: 3, message: '%strum needs a pattern name.' }],
		});
		expect(parseStrum('+draw', 3).ref).toBeNull();
	});
});

describe('patterns in a song', () => {
	const song = parseSong(fixture('strumming.songsheet'));

	it('collects every pattern in source order', () => {
		expect(song.errors).toEqual([]);
		expect(song.patterns.map((p) => [p.name, p.grid, p.slots.length])).toEqual([
			['A', 8, 8],
			['Two bar', 8, 16],
			['Saints', 16, 16],
			['Intro groove', 8, 8],
		]);
	});

	it('puts a %strum before the first line beside the title, in any case', () => {
		const verse = song.sections.find((s) => s.name === 'Verse');
		expect(verse?.strum).toMatchObject({ name: 'a', draw: true, line: 10 });
		expect(verse?.strum?.pattern?.name).toBe('A');
		// Blank lines before the %strum do not count as the section's first line.
		const chorus = song.sections.find((s) => s.name === 'Chorus');
		expect(chorus?.strum?.pattern?.name).toBe('Saints');
	});

	it('switches the pattern at a later %strum', () => {
		const verse = song.sections.find((s) => s.name === 'Verse');
		expect(verse?.items.map((i) => i.kind)).toEqual(['chords', 'lyrics', 'strum', 'chords', 'lyrics', 'blank']);
		const change = verse?.items[2];
		expect(change).toMatchObject({ kind: 'strum', name: 'TWO BAR', draw: false, line: 13 });
		expect(change?.kind === 'strum' && change.pattern?.name).toBe('Two bar');
	});

	it('resolves a pattern defined after its use and keeps the untitled opening part', () => {
		const opening = song.sections[0];
		expect(opening?.name).toBeNull();
		expect(opening?.strum?.pattern?.name).toBe('Intro groove');
	});

	it('keeps an untitled opening part that only holds a %strum', () => {
		const only = parseSong('%pattern A 8: dudu dudu\n%strum A\n\n[Verse]\nla');
		expect(only.sections.map((s) => s.name)).toEqual([null, 'Verse']);
	});

	it('reports an unknown pattern name', () => {
		const result = parseSong('[Verse]\n%strum Nope\nla');
		expect(result.errors).toEqual([{ line: 2, message: 'Unknown pattern Nope.' }]);
		expect(result.sections[0]?.strum).toMatchObject({ name: 'Nope', pattern: null });
	});

	it('does not call a pattern unknown when its own line has errors', () => {
		const result = parseSong('%pattern A 12: dudu\n[Verse]\n%strum A\nla');
		expect(result.errors).toEqual([{ line: 1, message: 'Pattern A: the grid must be 8 or 16, not 12.' }]);
		expect(result.patterns).toEqual([]);
	});

	it('reports a repeated name in any case and keeps the first', () => {
		const result = parseSong('%pattern A 8: dudu dudu\n%pattern a 8: d.d. d.d.\n[Verse]\n%strum A\nla');
		expect(result.errors).toEqual([{ line: 2, message: 'Pattern a is already defined on line 1.' }]);
		expect(result.patterns).toHaveLength(1);
		expect(result.sections[0]?.strum?.pattern?.line).toBe(1);
	});

	it('sorts errors by line', () => {
		const result = parseSong('[Verse]\n%strum Nope\n%foo\n%pattern A 12: d');
		expect(result.errors.map((e) => e.line)).toEqual([2, 3, 4]);
	});
});

describe('time signature', () => {
	it('reads n/4, and 4/4 when empty', () => {
		expect(parseTime(null)).toEqual({ supported: true, beats: 4, text: '4/4' });
		expect(parseTime('  ')).toEqual({ supported: true, beats: 4, text: '4/4' });
		expect(parseTime('3/4')).toEqual({ supported: true, beats: 3, text: '3/4' });
		expect(parseTime(' 5 / 4 ')).toEqual({ supported: true, beats: 5, text: '5/4' });
	});

	it('does not support other time signatures', () => {
		for (const text of ['6/8', '12/8', '2/2', '0/4', 'C', 'waltz']) {
			expect(parseTime(text)).toEqual({ supported: false, text });
		}
	});
});

describe('slot counts', () => {
	const check = (source: string, time: string | null = null) =>
		checkStrumming(parseSong(source), parseTime(time));

	it('accepts one bar of an 8th or 16th grid in 4/4', () => {
		expect(check('%pattern A 8: d.du .udu\n%pattern B 16: D.du .udu X.du .udu')).toEqual([]);
	});

	it('accepts any whole number of bars', () => {
		expect(check('%pattern L 8: d.du .udu d.du .udu d.du .udu')).toEqual([]);
	});

	it('checks against the time signature', () => {
		expect(check('%pattern W 8: d.du du', '3/4')).toEqual([]);
		expect(check('%pattern W 8: d.du du')).toEqual([
			{ line: 1, message: 'Pattern W has 6 slots; an 8th-note pattern in 4/4 needs 8 per bar.' },
		]);
	});

	it('reports a wrong slot count (R7)', () => {
		expect(check('%pattern Good 8: d.du .udu\n%pattern Bad 8: d.du .ud')).toEqual([
			{ line: 2, message: 'Pattern Bad has 7 slots; an 8th-note pattern in 4/4 needs 8 per bar.' },
		]);
		expect(check('%pattern S 16: D.du .udu X.du')).toEqual([
			{ line: 1, message: 'Pattern S has 12 slots; a 16th-note pattern in 4/4 needs 16 per bar.' },
		]);
	});

	it('reports a | that is not at the end of a bar', () => {
		expect(check('%pattern L 8: d.du .udu | d.du .udu |')).toEqual([]);
		expect(check('%pattern L 8: d.du | .udu d.du .udu')).toEqual([
			{ line: 1, message: 'Pattern L: a | is not at the end of a bar (a bar has 8 slots).' },
		]);
	});

	it('reports an unsupported time once, without a line, only when there are patterns', () => {
		expect(check('%pattern A 8: d.du .udu\n%pattern B 8: d.du du', '6/8')).toEqual([
			{ line: null, message: 'Time 6/8 is not supported yet; strum slot counts are not checked.' },
		]);
		expect(check('[Verse]\nla', '6/8')).toEqual([]);
	});
});
