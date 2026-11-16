import { describe, expect, it } from 'vitest';
import { songsheetMode, STYLE, type Stream } from '../src/editor/mode';

/** A minimal CodeMirror StringStream. */
class TestStream implements Stream {
	pos = 0;
	start = 0;
	constructor(readonly string: string) {}
	sol() {
		return this.pos === 0;
	}
	eol() {
		return this.pos >= this.string.length;
	}
	match(pattern: RegExp, consume = true) {
		const match = this.string.slice(this.pos).match(pattern);
		if (!match || match.index !== 0) return null;
		if (consume) this.pos += match[0].length;
		return match;
	}
	skipToEnd() {
		this.pos = this.string.length;
	}
	next() {
		return this.eol() ? undefined : this.string[this.pos++];
	}
}

/** Each line as [text, style] pieces, without unstyled ones. */
function highlight(...lines: string[]): [string, string][][] {
	const mode = songsheetMode();
	const state = mode.startState();
	return lines.map((line) => {
		const stream = new TestStream(line);
		const pieces: [string, string][] = [];
		while (!stream.eol()) {
			stream.start = stream.pos;
			const style = mode.token(stream, state);
			expect(stream.pos).toBeGreaterThan(stream.start);
			if (style) pieces.push([line.slice(stream.start, stream.pos), style]);
		}
		return pieces;
	});
}

describe('source-mode highlighting', () => {
	it('marks directives, options, headers and their notes', () => {
		expect(highlight('%pattern A 8: d.du .udu', '%strum A +draw', '[Verse]', '[Intro] (Piano)')).toEqual([
			[['%pattern', STYLE.directive]],
			[['%strum', STYLE.directive], ['+draw', STYLE.mark]],
			[['[Verse]', STYLE.header]],
			[['[Intro]', STYLE.header], [' (Piano)', STYLE.note]],
		]);
	});

	it('marks chords on chord lines and inline chords, not words that look like chords in lyrics', () => {
		expect(highlight('G     D/F#  | N.C.', 'A man walks [Am]by', 'Am G  x2  %c')).toEqual([
			[['G', STYLE.chord], ['D/F#', STYLE.chord], ['|', STYLE.mark], ['N.C.', STYLE.mark]],
			[['[Am]', STYLE.chord]],
			[['Am', STYLE.chord], ['G', STYLE.chord], ['%c', STYLE.mark]],
		]);
	});

	it('marks tab blocks and raw tab lines as tab, chords inside them not as chords', () => {
		expect(highlight('%tab', ':8 0.6{ch "G"} C', '%endtab', 'e|--3--|', 'G')).toEqual([
			[['%tab', STYLE.directive]],
			[[':8 0.6{ch "G"} C', STYLE.tab]],
			[['%endtab', STYLE.directive]],
			[['e|--3--|', STYLE.tab]],
			[['G', STYLE.chord]],
		]);
	});

	it('runs an unclosed block to the end, as the parser does', () => {
		expect(highlight('%ascii', '[Verse]', 'Am')).toEqual([
			[['%ascii', STYLE.directive]],
			[['[Verse]', STYLE.tab]],
			[['Am', STYLE.tab]],
		]);
	});

	it('marks a lyric line marker', () => {
		expect(highlight('Am I wrong %t')).toEqual([[[' %t', STYLE.mark]]]);
	});
});
