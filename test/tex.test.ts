import { readdirSync, readFileSync } from 'node:fs';
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import type { TabBlock } from '../src/model/song';
import { parseSong } from '../src/parser';
import { checkTabTime, parseMeter } from '../src/parser/tab';
import { parseTuning } from '../src/parser/tuning';
import { blockLine, buildTex, timeTex, tuningTex } from '../src/render/tab/tex';

const standard = parseTuning(null);

/** Reads alphaTex as alphaTab does; returns the score and every diagnostic. */
function load(tex: string) {
	const importer = new alphaTab.importer.AlphaTexImporter();
	importer.logErrors = false;
	importer.initFromString(tex, new alphaTab.Settings());
	let score: alphaTab.model.Score | null = null;
	try {
		score = importer.readScore();
	} catch {
		score = null;
	}
	const diagnostics = [
		...importer.lexerDiagnostics.items,
		...importer.parserDiagnostics.items,
		...importer.semanticDiagnostics.items,
	];
	return { score, diagnostics };
}

describe('tab tuning', () => {
	it('writes standard tuning high to low with octaves', () => {
		expect(tuningTex(standard)).toBe('\\tuning (E4 B3 G3 D3 A2 E2)');
	});

	it('moves each string by its offset', () => {
		expect(tuningTex(parseTuning('D A D G B E'))).toBe('\\tuning (E4 B3 G3 D3 A2 D2)');
		expect(tuningTex(parseTuning('Eb Ab Db Gb Bb Eb'))).toBe('\\tuning (D#4 A#3 F#3 C#3 G#2 D#2)');
		expect(tuningTex(parseTuning('Open G'))).toBe('\\tuning (D4 B3 G3 D3 G2 D2)');
	});

	it('uses standard tuning when the property cannot be read', () => {
		expect(tuningTex(parseTuning('E A D'))).toBe('\\tuning (E4 B3 G3 D3 A2 E2)');
	});
});

describe('tab time signature', () => {
	it('reads any n/d, with 4/4 for an empty property', () => {
		expect(parseMeter(null)).toEqual({ beats: 4, value: 4 });
		expect(parseMeter(' 3 / 4 ')).toEqual({ beats: 3, value: 4 });
		expect(parseMeter('6/8')).toEqual({ beats: 6, value: 8 });
		expect(parseMeter('12/8')).toEqual({ beats: 12, value: 8 });
	});

	it('rejects what is not a time signature', () => {
		for (const text of ['fast', '3/5', '0/4', '4', '33/4']) expect(parseMeter(text)).toBeNull();
	});

	it('writes \\ts with parentheses, 4/4 when unreadable', () => {
		expect(timeTex({ beats: 6, value: 8 })).toBe('\\ts (6 8)');
		expect(timeTex(null)).toBe('\\ts (4 4)');
	});

	it('reports an unreadable time only when the song has tabs', () => {
		const withTab = parseSong('%tab\n:4 0.6\n%endtab');
		expect(checkTabTime(withTab, 'fast')).toEqual([
			{ line: null, message: 'Time fast is not a time signature such as 3/4 or 6/8; tabs use 4/4.' },
		]);
		expect(checkTabTime(withTab, '6/8')).toEqual([]);
		expect(checkTabTime(parseSong('C G'), 'fast')).toEqual([]);
	});
});

describe('alphaTex for a tab block', () => {
	it('adds the track, tab staff, tuning and time before the beats', () => {
		expect(buildTex(':4 0.6', standard, parseMeter('3/4'))).toEqual({
			tex: '\\track "Guitar"\n\\staff {tabs}\n\\tuning (E4 B3 G3 D3 A2 E2)\n\\ts (3 4)\n:4 0.6',
			preludeLines: 4,
		});
	});

	it('maps alphaTex lines back to block lines', () => {
		// %tab on block line 10: its first beat line is alphaTex line 5.
		expect(blockLine(10, 5, 4)).toBe(11);
		expect(blockLine(10, 7, 4)).toBe(13);
		expect(blockLine(10, 2, 4)).toBe(10);
	});

	it('gives alphaTab a tab-only staff in the tuning and time', () => {
		const { score, diagnostics } = load(buildTex(':4 0.5 2.4 2.3 | 0.6 0.5 0.4', parseTuning('Drop D'), parseMeter('3/4')).tex);
		expect(diagnostics).toEqual([]);
		const staff = score?.tracks[0]?.staves[0];
		expect(staff?.showTablature).toBe(true);
		expect(staff?.showStandardNotation).toBe(false);
		expect(staff?.tuning).toEqual([64, 59, 55, 50, 45, 38]);
		expect(score?.masterBars.map((bar) => `${bar.timeSignatureNumerator}/${bar.timeSignatureDenominator}`)).toEqual(['3/4', '3/4']);
	});

	it('lets a \\ts in the beats win over the property', () => {
		const { score, diagnostics } = load(buildTex('\\ts (6 8)\n:8 0.5 2.4 2.3 0.6 0.5 0.4', standard, null).tex);
		expect(diagnostics).toEqual([]);
		expect(score?.masterBars[0]?.timeSignatureNumerator).toBe(6);
	});

	it('reports alphaTex errors at the block line', () => {
		const tab = parseSong('[Solo]\n%tab\n:8 0.5 2.4\n:8 0.5.3 99.9\n%endtab').sections[0]?.items[0] as TabBlock;
		const built = buildTex(tab.beats, standard, null);
		const lines = load(built.tex).diagnostics.map((d) => blockLine(tab.line, d.start?.line ?? 0, built.preludeLines));
		expect(lines).toEqual([4, 4]);
	});

	it('reads every %tab in the fixtures and dev-vault songs without errors', () => {
		const songs = [
			...readdirSync(new URL('./fixtures/', import.meta.url)).map((name) => new URL(`./fixtures/${name}`, import.meta.url)),
			...readdirSync(new URL('../dev-vault/Songs/', import.meta.url))
				.filter((name) => name !== 'Syntax errors.md')
				.map((name) => new URL(`../dev-vault/Songs/${encodeURIComponent(name)}`, import.meta.url)),
		];
		const tabs = songs.flatMap((url) => {
			const text = readFileSync(url, 'utf8');
			const block = /```songsheet\n([\s\S]*?)```/.exec(text)?.[1] ?? text;
			return parseSong(block)
				.sections.flatMap((section) => section.items)
				.filter((item): item is TabBlock => item.kind === 'tab')
				.map((tab) => ({ url: url.pathname, tab }));
		});
		expect(tabs.length).toBeGreaterThan(0);
		for (const { url, tab } of tabs) {
			const messages = load(buildTex(tab.beats, standard, null).tex).diagnostics.map((d) => d.message);
			expect(messages, `${url}, %tab on line ${tab.line}`).toEqual([]);
		}
	});
});
