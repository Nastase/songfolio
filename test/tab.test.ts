import { describe, expect, it } from 'vitest';
import { parseSong } from '../src/parser';
import { readTab } from '../src/parser/tab';

const chordsOf = (source: string) => readTab(source, 1).chords.map((chord) => chord.text);

describe('%tab content', () => {
	it('keeps beats as written', () => {
		const source = ':8 0.5 2.4 2.3 |\n\\ts 3 4\n:4 0.6 3.6 2.5';
		expect(readTab(source, 4)).toEqual({ beats: source, chords: [], errors: [] });
	});

	it('allows bar metadata, voices and chord definitions', () => {
		const source = [
			'\\chord ("Am" 0 1 2 2 0 x)',
			'\\ts 6 8 \\ks G \\tempo 90 \\section "A" \\ro',
			'\\voice',
			':4 0.6',
		].join('\n');
		expect(readTab(source, 1).errors).toEqual([]);
	});

	it('reports score, track and staff metadata and blanks their lines', () => {
		const source = ['\\title "Intro"', '\\track "Guitar"', '\\staff {tabs}', ':8 0.5 2.4', '\\tuning (E4 B3 G3 D3 A2 D2)'].join('\n');
		const tab = readTab(source, 10);
		expect(tab.beats).toBe('\n\n\n:8 0.5 2.4\n');
		expect(tab.errors).toEqual([
			{ line: 11, message: '\\title cannot be used in %tab, which holds beats only. The line is ignored.' },
			{ line: 12, message: '\\track is added by the plugin: %tab holds beats only. The line is ignored.' },
			{ line: 13, message: '\\staff is added by the plugin: %tab holds beats only. The line is ignored.' },
			{ line: 15, message: '\\tuning comes from the tuning property: %tab holds beats only. The line is ignored.' },
		]);
	});

	it('matches metadata tags in any case, once per line', () => {
		const tab = readTab('\\Title "A" \\artist "B"', 1);
		expect(tab.errors).toEqual([
			{ line: 2, message: '\\Title cannot be used in %tab, which holds beats only. The line is ignored.' },
		]);
	});

	it('does not read tags inside comments or strings', () => {
		const source = '// \\track here\n/* \\title\n\\staff */ :4 0.6{ch "\\\\capo"}';
		expect(readTab(source, 1).errors).toEqual([]);
	});

	it('reads chord names from beat effects in order, once each', () => {
		expect(chordsOf(':8 0.5{ch "Am"} 2.4 | 0.4{ch "Dm"} | 0.5{ch "Am"} | (0.6 2.5){ch "E7"}')).toEqual([
			'Am', 'Dm', 'E7',
		]);
	});

	it('reads quoted and unquoted chord names next to other effects', () => {
		expect(chordsOf(":4 3.2{h ch 'G7'} 0.5{ch Asus2 } 2.3{v ch \"F#m\"}")).toEqual(['G7', 'Asus2', 'F#m']);
	});

	it('gives chord symbols with tonic and bass', () => {
		expect(readTab(':4 0.5{ch "G/B"}', 1).chords).toEqual([{ text: 'G/B', tonic: 'G', bass: 'B' }]);
	});

	it('skips names that are not chords, and ch outside effects', () => {
		expect(chordsOf(':4 0.5{ch "Riff"} \\section "ch" ch')).toEqual([]);
	});

	it('skips chords on ignored lines', () => {
		expect(chordsOf('\\track "Guitar" :4 0.5{ch "C"}\n:4 0.5{ch "D"}')).toEqual(['D']);
	});
});

describe('%tab in a song', () => {
	it('reports metadata errors with block line numbers, sorted with the others', () => {
		const song = parseSong('%foo\n[Solo]\n%tab\n\\track "Guitar"\n:8 0.5{ch "Am"}\n%endtab');
		expect(song.errors).toEqual([
			{ line: 1, message: 'Unknown directive %foo.' },
			{ line: 4, message: '\\track is added by the plugin: %tab holds beats only. The line is ignored.' },
		]);
		expect(song.sections[0]?.items[0]).toMatchObject({
			kind: 'tab',
			line: 3,
			beats: '\n:8 0.5{ch "Am"}',
			chords: [{ text: 'Am', tonic: 'A', bass: '' }],
		});
	});
});
