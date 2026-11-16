import { describe, expect, it } from 'vitest';
import { asciiToTex, convertAsciiAt, RHYTHM_COMMENT } from '../src/commands/import/asciiToTex';

/** The beats line of a conversion, without the comment and the :8. */
function beats(...lines: string[]) {
	const result = asciiToTex(lines);
	expect(result.lines[0]).toBe(RHYTHM_COMMENT);
	return (result.lines[1] ?? '').replace(/^:8 /, '');
}

describe('ASCII tab to alphaTex', () => {
	it('reads frets from the top line (string 1, high e) down, notes in a column as a chord', () => {
		expect(
			beats(
				'e|-----0---|',
				'B|---1-----|',
				'G|-2-------|',
				'D|---------|',
				'A|-0-------|',
				'E|---------|',
			),
		).toBe('(2.3 0.5) 1.2 0.1');
	});

	it('reads two-digit frets and keeps the bar lines', () => {
		expect(
			beats(
				'e|-12--|-0--|',
				'B|-----|----|',
				'G|-----|----|',
				'D|-----|----|',
				'A|-----|----|',
				'E|-----|-3--|',
			),
		).toBe('12.1 | (0.1 3.6)');
	});

	it('writes techniques as alphaTex effects and x as a dead note', () => {
		expect(
			beats(
				'e|----------------|',
				'B|----------------|',
				'G|-5h7--7b--5~----|',
				'D|------------x3/5|',
				'A|----------------|',
				'E|----------------|',
			),
		).toBe('5.3{h} 7.3 7.3{b (0 4)} 5.3{v} x.4 3.4{sl} 5.4');
	});

	it('puts chord names from the line above on the nearest beat', () => {
		expect(
			beats(
				'   Am       G',
				'E |-0---------3----|',
				'B |---1-------0----|',
				'G |-----2-----0----|',
				'D |-----------0----|',
				'A |-----------2----|',
				'E |-----------3----|',
			),
		).toBe('0.1{ch "Am"} 1.2 2.3 (3.1 0.2 0.3 0.4 2.5 3.6){ch "G"}');
	});

	it('ignores repeat marks after the last bar, and systems without tab', () => {
		const result = asciiToTex([
			'e|--0--| (2x)',
			'B|-----|',
			'G|-----|',
			'D|-----|2x',
			'A|-----|',
			'E|-----|',
			'',
			'E|',
			'B|',
			'G|',
			'D|2x',
			'A|',
			'E|',
		]);
		expect(result.lines[1]).toBe(':8 0.1');
		expect(result.systems).toBe(1);
		expect(result.skipped).toBe(0);
	});

	it('joins systems with a bar line and counts what it cannot read', () => {
		const system = (fret: string) => [`e|-${fret}-T-|`, 'B|-----|', 'G|-----|', 'D|-----|', 'A|-----|', 'E|-----|'];
		const result = asciiToTex([...system('1'), '', ...system('2')]);
		expect(result.lines[1]).toBe(':8 1.1 |\n2.1');
		expect(result.skipped).toBe(2);
	});

	it('leaves out systems that do not have 6 strings', () => {
		const result = asciiToTex(['G|--2--|', 'D|--2--|', 'A|--0--|', 'E|-----|']);
		expect(result.lines).toEqual([]);
		expect(result.notSixStrings).toBe(1);
	});
});

describe('converting the ASCII tab at a line of a block', () => {
	const tab = ['e|--0--|', 'B|-----|', 'G|-----|', 'D|-----|', 'A|-----|', 'E|-----|'];

	it('inserts %tab after an %ascii block, from any of its lines', () => {
		const source = ['[Riff]', '%ascii', ...tab, '%endascii', 'C'].join('\n');
		for (const line of [1, 3, 8]) {
			const insertion = convertAsciiAt(source, line);
			expect(insertion?.after).toBe(8);
			expect(insertion?.lines).toEqual(['%tab', RHYTHM_COMMENT, ':8 0.1', '%endtab']);
		}
		expect(convertAsciiAt(source, 9)).toBeNull();
		expect(convertAsciiAt(source, 0)).toBeNull();
	});

	it('converts raw tab lines too', () => {
		const insertion = convertAsciiAt(['[Riff]', ...tab, 'C'].join('\n'), 2);
		expect(insertion?.after).toBe(6);
	});
});
