/**
 * Turns a song pasted from a chord site into the text of a songsheet block, plus the properties
 * found in it (R11). Written against pastes from Ultimate Guitar and Cifra Club.
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import { isChordLine, isChordSymbol, TAB_SIZE } from '../../parser';
import { parseTuning } from '../../parser/tuning';
import { findTabSystems, isTabLine } from './asciiTab';

export interface ImportedSong {
	title: string | null;
	artist: string | null;
	key: string | null;
	capo: number | null;
	tuning: string | null;
	tempo: number | null;
	difficulty: string | null;
	/** Text of the songsheet block. */
	body: string;
}

type Meta = Omit<ImportedSong, 'body'>;

/** Reads a pasted song. */
export function importSong(text: string): ImportedSong {
	const lines = cleanLines(text);
	const meta: Meta = { title: null, artist: null, key: null, capo: null, tuning: null, tempo: null, difficulty: null };
	const { kept, start } = readPreamble(lines, meta);

	let body = [...kept, ...lines.slice(start)];
	body = splitHeaderChords(body);
	body = labelsToHeaders(body);
	body = escapeDirectives(body);
	body = wrapTabs(body);
	body = collapseBlanks(body);
	return { ...meta, body: body.length > 0 ? `${body.join('\n')}\n` : '' };
}

// --- Cleaning -------------------------------------------------------------------------------

/** Zero-width characters: Cifra Club starts most lines with one. */
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
/** Spaces other than the plain one, such as the no-break spaces web pages use. */
const SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;
/** Ultimate Guitar's own markup, kept in some copies: `[ch]Am[/ch]`, `[tab]…[/tab]`. */
const UG_MARKUP = /\[\/?(ch|tab)\]/g;

function cleanLines(text: string): string[] {
	let clean = text.replace(/\r\n?/g, '\n').replace(ZERO_WIDTH, '').replace(SPACES, ' ');
	if (/\[\/(ch|tab)\]/.test(clean)) clean = clean.replace(UG_MARKUP, '');
	return clean.split('\n').map((line) => expandTabs(line).trimEnd());
}

function expandTabs(line: string): string {
	if (!line.includes('\t')) return line;
	let result = '';
	for (const ch of line) {
		result += ch === '\t' ? ' '.repeat(TAB_SIZE - (result.length % TAB_SIZE)) : ch;
	}
	return result;
}

// --- Preamble: title, artist and the song's facts ------------------------------------------------

const BLANK = /^\s*$/;
const HEADER = /^\s*\[[^\]]+\]/;

/** Labels of the song's facts, in English (Ultimate Guitar) and Portuguese (Cifra Club). */
const FACT_LABEL = /(Tuning|Key|Capo|Difficulty|Tempo|BPM|Tom|Afinação|Afinacao)\s*:/g;
const CIFRA_CAPO = /Capotraste\s+(?:na\s+)?(\d+)/i;

/** Page text around the song on Ultimate Guitar: buttons, counters, credits. */
const CHROME = [
	/^\s*\d[\d,.]*\s*views/i,
	/^\s*(Tempo|Transpose|Autoscroll|Font|Chords|Strumming|Print|Edit|Official|Pro)\s*$/i,
	/^\s*Author\b/i,
];

/** `Wonderwall Chords by Oasis`, `Official Wonderwall Chords by Oasis`, `Song Tab by Artist`. */
const UG_TITLE =
	/^\s*(?:Official\s+)?(.+?)\s+(?:Chords|Tabs?|Bass Tabs?|Ukulele Chords|Guitar Pro|Power Tab)\s+by\s+(.+?)\s*$/i;
/** Cifra Club's title and artist, run together when copied: `Last KissPearl Jam`. */
const RUN_TOGETHER = /^(.*?[a-zß-ÿ0-9.!?'")\]])([A-ZÀ-Þ].*)$/;

/**
 * Reads the lines before the song: the title, the facts and page text are taken out, anything
 * else is kept. Returns the kept lines and where the song starts.
 */
function readPreamble(lines: readonly string[], meta: Meta): { kept: string[]; start: number } {
	const kept: string[] = [];
	let titleSeen = false;
	let index = 0;
	for (; index < lines.length; index++) {
		const line = lines[index] ?? '';
		if (BLANK.test(line)) continue;
		if (readFacts(line, meta)) continue;
		if (CHROME.some((pattern) => pattern.test(line))) continue;
		if (isSongLine(line)) break;
		if (!titleSeen) {
			titleSeen = true;
			readTitle(line, meta);
			continue;
		}
		kept.push(line);
	}
	return { kept, start: index };
}

function isSongLine(line: string): boolean {
	return HEADER.test(line) || sectionLabel(line) !== null || isTabLine(line) || isChordLine(line);
}

function readTitle(line: string, meta: Meta): void {
	const text = line.replace(/\s*\(ver\.?\s*\d+\)/i, '').trim();
	const ug = UG_TITLE.exec(text);
	if (ug) {
		meta.title = ug[1]?.trim() || null;
		meta.artist = ug[2]?.trim() || null;
		return;
	}
	const joined = RUN_TOGETHER.exec(text);
	meta.title = (joined ? joined[1] : text)?.trim() || null;
	meta.artist = joined?.[2]?.trim() || null;
}

/** Reads the facts on a line, which may hold several: `Tuning: E A D G B EKey: F#mCapo: 2nd fret`. */
function readFacts(line: string, meta: Meta): boolean {
	const capo = CIFRA_CAPO.exec(line);
	if (capo) meta.capo = Number(capo[1]);

	const labels = [...line.matchAll(FACT_LABEL)];
	labels.forEach((label, index) => {
		const from = (label.index ?? 0) + label[0].length;
		const to = labels[index + 1]?.index ?? line.length;
		readFact(label[1] ?? '', line.slice(from, to).trim(), meta);
	});
	return labels.length > 0 || capo !== null;
}

function readFact(label: string, value: string, meta: Meta): void {
	if (value === '') return;
	switch (label.toLowerCase()) {
		case 'key':
		case 'tom':
			meta.key = value.split(/\s+/)[0] ?? null;
			break;
		case 'capo': {
			const fret = /\d+/.exec(value);
			if (fret) meta.capo = Number(fret[0]);
			else if (/\b(no|none|sem)\b/i.test(value)) meta.capo = 0;
			break;
		}
		case 'tuning':
		case 'afinação':
		case 'afinacao':
			meta.tuning = readTuning(value);
			break;
		case 'difficulty':
			meta.difficulty = readDifficulty(value);
			break;
		case 'tempo':
		case 'bpm': {
			const bpm = /\d+(\.\d+)?/.exec(value);
			if (bpm) meta.tempo = Number(bpm[0]);
			break;
		}
	}
}

/** Portuguese tuning names, to the names the `tuning` property reads. */
const PORTUGUESE_TUNINGS: Record<string, string> = {
	'meio tom abaixo': 'half step down',
	'um tom abaixo': 'whole step down',
	padrão: 'standard',
	padrao: 'standard',
	normal: 'standard',
};

/** A tuning as spaced notes, low to high, when it can be read; otherwise as written. */
function readTuning(value: string): string {
	const named = PORTUGUESE_TUNINGS[value.toLowerCase()] ?? value;
	const tuning = parseTuning(named);
	return tuning.valid ? tuning.notes.join(' ') : value;
}

function readDifficulty(value: string): string {
	const word = value.toLowerCase();
	if (/novice|beginner|iniciante/.test(word)) return 'beginner';
	if (/intermediate|intermedi/.test(word)) return 'intermediate';
	if (/advanced|avançado|avancado/.test(word)) return 'advanced';
	return word;
}

// --- Sections ----------------------------------------------------------------------------------

/**
 * `[Intro] Am F Am F` becomes `[Intro]` and the chords: the parser reads the whole line as a chord
 * line. The header is replaced by spaces so the chord lines under it stay aligned, and a group of
 * chord lines on their own loses its common indent.
 */
function splitHeaderChords(lines: readonly string[]): string[] {
	const result: string[] = [];
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index] ?? '';
		const match = /^(\s*)\[([^\]]+)\](.*)$/.exec(line);
		const name = match?.[2]?.trim() ?? '';
		const rest = match?.[3] ?? '';
		if (!match || rest.trim() === '' || isChordSymbol(name) || !isChordLine(rest)) {
			result.push(line);
			continue;
		}

		result.push(`[${name}]`);
		const group = [' '.repeat(line.length - rest.length) + rest];
		let next = index + 1;
		while (next < lines.length && isPlainChordLine(lines[next] ?? '')) group.push(lines[next++] ?? '');
		// Chords over lyrics keep their columns; chords on their own lose the common indent.
		const after = lines[next] ?? '';
		const overLyrics = !BLANK.test(after) && !HEADER.test(after) && !isTabLine(after);
		const indent = overLyrics ? 0 : Math.min(...group.map((text) => /^ */.exec(text)?.[0].length ?? 0));
		result.push(...group.map((text) => text.slice(indent)));
		index = next - 1;
	}
	return result;
}

function isPlainChordLine(line: string): boolean {
	return !BLANK.test(line) && !HEADER.test(line) && !isTabLine(line) && isChordLine(line);
}

/** First words of section labels such as `Intro:`, `Parte 1:`, `Refrão:`. */
const SECTION_WORDS = [
	'intro',
	'introdução',
	'introducao',
	'verse',
	'verso',
	'estrofe',
	'parte',
	'primeira parte',
	'segunda parte',
	'terceira parte',
	'chorus',
	'refrão',
	'refrao',
	'pré-refrão',
	'pre-refrão',
	'pre-refrao',
	'pre-chorus',
	'prechorus',
	'bridge',
	'ponte',
	'solo',
	'riff',
	'outro',
	'final',
	'interlude',
	'interlúdio',
	'instrumental',
	'coda',
	'hook',
];

/** The name of a section label line (`Refrão:` → `Refrão`), or null. */
function sectionLabel(line: string): string | null {
	const match = /^\s*([^\s:][^:]{0,30}?)\s*:\s*$/.exec(line);
	const name = match?.[1];
	if (!name) return null;
	const lower = name.toLowerCase();
	const known = SECTION_WORDS.some((word) => {
		if (lower === word) return true;
		if (!lower.startsWith(`${word} `)) return false;
		return lower.slice(word.length).trim().split(/\s+/).length <= 2;
	});
	return known ? name : null;
}

/** `Intro:` alone on a line becomes the section `[Intro]`. */
function labelsToHeaders(lines: readonly string[]): string[] {
	return lines.map((line) => {
		const name = sectionLabel(line);
		return name === null ? line : `[${name}]`;
	});
}

// --- Directives and tab --------------------------------------------------------------------------

const DIRECTIVE_LIKE = /^\s*%[a-z]/;

/** A lyric line starting with `%` would read as a directive: `%t` forces it to stay text. */
function escapeDirectives(lines: readonly string[]): string[] {
	return lines.map((line) => (DIRECTIVE_LIKE.test(line) ? `${line} %t` : line));
}

/** Each tab system, with the lines that touch it, becomes an `%ascii` box. */
function wrapTabs(lines: readonly string[]): string[] {
	const systems = findTabSystems(lines);
	const result: string[] = [];
	let index = 0;
	for (const { box } of systems) {
		result.push(...lines.slice(index, box.start), '%ascii', ...lines.slice(box.start, box.end), '%endascii');
		index = box.end;
	}
	result.push(...lines.slice(index));
	return result;
}

/** No blank lines at the start or end, and at most one in a row. */
function collapseBlanks(lines: readonly string[]): string[] {
	const result: string[] = [];
	for (const line of lines) {
		const blank = BLANK.test(line);
		if (blank && (result.length === 0 || BLANK.test(result[result.length - 1] ?? ''))) continue;
		result.push(blank ? '' : line);
	}
	while (result.length > 0 && result[result.length - 1] === '') result.pop();
	return result;
}
