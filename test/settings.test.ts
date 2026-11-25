import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, withSetting } from '../src/settings/values';

describe('withSetting', () => {
	const settings = { ...DEFAULT_SETTINGS };

	it('trims text and falls back to the default when a required value is empty', () => {
		expect(withSetting(settings, 'blockName', '  chordsheet ').blockName).toBe('chordsheet');
		expect(withSetting(settings, 'blockName', '   ').blockName).toBe('songsheet');
		expect(withSetting(settings, 'markerProperty', '').markerProperty).toBe('type');
		expect(withSetting(settings, 'markerValue', ' song ').markerValue).toBe('song');
	});

	it('keeps an empty folder or template, which mean none', () => {
		expect(withSetting(settings, 'songFolder', '  ').songFolder).toBe('');
		expect(withSetting(settings, 'templatePath', ' Templates/Song.md ').templatePath).toBe('Templates/Song.md');
	});

	it('reads the autoscroll speed from a number or typed text', () => {
		expect(withSetting(settings, 'autoscrollSpeed', 45).autoscrollSpeed).toBe(45);
		expect(withSetting(settings, 'autoscrollSpeed', '12.5').autoscrollSpeed).toBe(12.5);
		for (const bad of ['', 'fast', '0', '-3', 0, Number.NaN]) {
			expect(withSetting(settings, 'autoscrollSpeed', bad).autoscrollSpeed).toBe(30);
		}
	});

	it('accepts only the known lyrics fonts and a true toggle', () => {
		expect(withSetting(settings, 'lyricsFont', 'text').lyricsFont).toBe('text');
		expect(withSetting(settings, 'lyricsFont', 'serif').lyricsFont).toBe('monospace');
		expect(withSetting(settings, 'lyricSpacing', false).lyricSpacing).toBe(false);
		expect(withSetting(settings, 'lyricSpacing', 'yes').lyricSpacing).toBe(false);
	});

	it('changes only the given setting and leaves the original untouched', () => {
		const changed = withSetting(settings, 'songFolder', 'Music');
		expect(changed).toEqual({ ...DEFAULT_SETTINGS, songFolder: 'Music' });
		expect(settings).toEqual(DEFAULT_SETTINGS);
	});
});
