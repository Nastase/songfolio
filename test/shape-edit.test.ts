import { describe, expect, it } from 'vitest';
import { parseSong } from '../src/parser';
import { setShapeLine } from '../src/parser/shapeEdit';

const C_BARRE = [null, 3, 5, 5, 5, 3];
const lines = (...text: string[]) => text.join('\n');

describe('setting a %shape line', () => {
	it('replaces the chord line in place', () => {
		const source = lines('%pattern A 8: d.du .udu', '%shape C x32010', '', '[Verse]', 'C', 'la');
		expect(setShapeLine(source, 'C', C_BARRE)).toBe(
			lines('%pattern A 8: d.du .udu', '%shape C x 3 5 5 5 3', '', '[Verse]', 'C', 'la'),
		);
	});

	it('keeps the indentation of the line it replaces', () => {
		expect(setShapeLine('  %shape C x32010\nC', 'C', C_BARRE)).toBe('  %shape C x 3 5 5 5 3\nC');
	});

	it('replaces a line wherever it is in the block', () => {
		const source = lines('[Verse]', 'C', 'la', '%shape C x32010');
		expect(setShapeLine(source, 'C', C_BARRE)).toBe(lines('[Verse]', 'C', 'la', '%shape C x 3 5 5 5 3'));
	});

	it('replaces a line with errors, which still counts as the chord line', () => {
		expect(setShapeLine('%shape C x3201\nC', 'C', C_BARRE)).toBe('%shape C x 3 5 5 5 3\nC');
	});

	it('adds a line after the %pattern and %shape lines that open the block', () => {
		const source = lines('%pattern A 8: d.du .udu', '%shape G 320003', '', '[Verse]', 'C G', 'la');
		expect(setShapeLine(source, 'C', C_BARRE)).toBe(
			lines('%pattern A 8: d.du .udu', '%shape G 320003', '%shape C x 3 5 5 5 3', '', '[Verse]', 'C G', 'la'),
		);
	});

	it('adds a line at the top when the block does not open with directives', () => {
		const source = lines('[Verse]', '%pattern A 8: d.du .udu', 'C', 'la');
		expect(setShapeLine(source, 'C', C_BARRE)).toBe(
			lines('%shape C x 3 5 5 5 3', '[Verse]', '%pattern A 8: d.du .udu', 'C', 'la'),
		);
	});

	it('matches the chord exactly, case included', () => {
		const source = lines('%shape Am x02210', '%shape Cm x35543', 'Am AM C');
		expect(setShapeLine(source, 'AM', [null, 0, 2, 2, 2, 0])).toBe(
			lines('%shape Am x02210', '%shape Cm x35543', '%shape AM x 0 2 2 2 0', 'Am AM C'),
		);
	});

	it('removes repeats of the chord line', () => {
		const source = lines('%shape C x32010', '%shape C 8 10 10 9 8 8', 'C');
		expect(setShapeLine(source, 'C', C_BARRE)).toBe(lines('%shape C x 3 5 5 5 3', 'C'));
	});

	it('removes the chord line when going back to the library', () => {
		const source = lines('%shape C x32010', '%shape G 320003', 'C G', '%shape C x 3 5 5 5 3');
		expect(setShapeLine(source, 'C', null)).toBe(lines('%shape G 320003', 'C G'));
	});

	it('changes nothing when going back to the library from no line', () => {
		const source = lines('%shape G 320003', 'C G');
		expect(setShapeLine(source, 'C', null)).toBe(source);
	});

	it('leaves %shape text inside %tab and %ascii alone', () => {
		const source = lines('%ascii', '%shape C x32010', '%endascii', 'C');
		expect(setShapeLine(source, 'C', C_BARRE)).toBe(
			lines('%shape C x 3 5 5 5 3', '%ascii', '%shape C x32010', '%endascii', 'C'),
		);
	});

	it('keeps CRLF line endings and a final newline', () => {
		expect(setShapeLine('%shape C x32010\r\nC\r\n', 'C', C_BARRE)).toBe('%shape C x 3 5 5 5 3\r\nC\r\n');
	});

	it('writes a line the parser reads back as the same shape', () => {
		const result = setShapeLine('[Verse]\nC\nla\n', 'C', [8, 10, 10, 9, 8, null]);
		const song = parseSong(result);
		expect(song.errors).toEqual([]);
		expect(song.shapes).toEqual([{ chord: 'C', frets: [8, 10, 10, 9, 8, null], line: 1 }]);
	});
});
