import type { Directive, Song } from '../model/song';

const DIRECTIVE = /^%(\w+)\s*(.*)$/;

/**
 * Parses the source of a songsheet block into a song model.
 * The only place that understands the block syntax.
 * Phase 0 stub: splits lines and collects `%` directives.
 */
export function parseSong(source: string): Song {
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const directives: Directive[] = [];

	lines.forEach((text, index) => {
		const match = DIRECTIVE.exec(text.trim());
		if (match) {
			directives.push({
				name: match[1] ?? '',
				args: match[2] ?? '',
				line: index + 1,
			});
		}
	});

	return { lines, directives, errors: [] };
}
