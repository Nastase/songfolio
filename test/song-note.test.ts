import { describe, expect, it } from 'vitest';
import { parseSong } from '../src/parser';
import {
	codeBlock,
	SONG_PROPERTIES,
	songFileName,
	songProperties,
	STARTER_BLOCK,
} from '../src/commands/songNote';

const marker = { name: 'type', value: 'guitar_song' };
const formatDate = (format: string) => `<${format}>`;

describe('songProperties', () => {
	it('writes every song property in order, then the marker', () => {
		const props = songProperties({ title: 'Song' }, marker, null, formatDate);
		expect(Object.keys(props)).toEqual([...SONG_PROPERTIES, 'type']);
		expect(props).toMatchObject({
			title: 'Song',
			artist: null,
			capo: 0,
			tuning: 'E A D G B E',
			time: '4/4',
			status: 'to_start',
			started: null,
			tags: [],
			type: 'guitar_song',
		});
	});

	it('lets the template replace defaults, and given values replace the template', () => {
		const template = { status: 'learning', artist: 'Template artist', capo: 2 };
		const props = songProperties({ title: 'Song', artist: 'Given', capo: null }, marker, template, formatDate);
		expect(props).toMatchObject({ status: 'learning', artist: 'Given', capo: 2 });
	});

	it('adds the template\'s other properties after the marker, in its order', () => {
		const template = { up: ['[[Songs MOC]]'], created: '{{date}} {{time}}', summary: null };
		const props = songProperties({ title: 'Song' }, marker, template, formatDate);
		expect(Object.keys(props).slice(SONG_PROPERTIES.length)).toEqual(['type', 'up', 'created', 'summary']);
		expect(props.created).toBe('<YYYY-MM-DD> <HH:mm>');
	});

	it('fills placeholders in text values and lists, with formats', () => {
		const template = { note: 'About {{title}}', when: ['{{date:YYYY}}', '{{ time : HH }}'] };
		const props = songProperties({ title: 'Song' }, marker, template, formatDate);
		expect(props.note).toBe('About Song');
		expect(props.when).toEqual(['<YYYY>', '<HH>']);
	});

	it('always gives the marker its value', () => {
		const props = songProperties({ title: 'Song' }, marker, { type: 'note' }, formatDate);
		expect(props.type).toBe('guitar_song');
	});

	it('keeps template values that are not text', () => {
		const props = songProperties({ title: 'Song' }, marker, { rating: 3, done: false }, formatDate);
		expect(props).toMatchObject({ rating: 3, done: false });
	});
});

describe('songFileName', () => {
	it('is Artist - Title, or the title alone', () => {
		expect(songFileName('Wonderwall', 'Oasis')).toBe('Oasis - Wonderwall');
		expect(songFileName('Wayfaring Stranger', null)).toBe('Wayfaring Stranger');
	});

	it('removes characters that file names and links cannot hold', () => {
		expect(songFileName('What? Why: [Live] #1 a/b', 'AC/DC')).toBe('AC DC - What Why Live 1 a b');
	});

	it('names an empty title', () => {
		expect(songFileName('???', null)).toBe('Untitled song');
	});
});

describe('codeBlock', () => {
	it('fences the body with the block name', () => {
		expect(codeBlock('songsheet', '[Verse]\n')).toBe('```songsheet\n[Verse]\n```\n');
	});

	it('uses a longer fence when the body holds backticks', () => {
		expect(codeBlock('songsheet', 'a ``` b')).toBe('````songsheet\na ``` b\n````\n');
	});
});

describe('starter block', () => {
	it('parses without errors', () => {
		const song = parseSong(STARTER_BLOCK);
		expect(song.errors).toEqual([]);
		expect(song.sections.map((section) => section.name)).toEqual(['Verse', 'Chorus']);
	});
});
