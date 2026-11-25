/** Songfolio's settings, their defaults, labels and how a new value is cleaned. No Obsidian. */

/** Font for chords and lyrics: monospace keeps the spacing as typed, text uses the theme font. */
export type LyricsFont = 'monospace' | 'text';

export interface SongfolioSettings {
	/** Code block language that Songfolio renders. */
	blockName: string;
	lyricsFont: LyricsFont;
	/** Half a line of space after each line with lyrics, so it stands apart from the next chords. */
	lyricSpacing: boolean;
	/** Autoscroll speed in text lines per minute, for songs without a `duration` property. */
	autoscrollSpeed: number;
	/** Folder for new and imported songs; empty means Obsidian's default location for new notes. */
	songFolder: string;
	/** Property every new and imported song gets, and that the starter base filters on. */
	markerProperty: string;
	markerValue: string;
	/** Note whose properties are merged into new and imported songs; empty for none. */
	templatePath: string;
}

export type SettingKey = keyof SongfolioSettings;

export const DEFAULT_SETTINGS: SongfolioSettings = {
	blockName: 'songsheet',
	lyricsFont: 'monospace',
	lyricSpacing: true,
	autoscrollSpeed: 30,
	songFolder: 'Songs',
	markerProperty: 'type',
	markerValue: 'guitar_song',
	templatePath: '',
};

/** Settings that change how songs on screen look: open songs are restyled when they change. */
export const RESTYLING: ReadonlySet<SettingKey> = new Set(['lyricsFont', 'lyricSpacing']);

/** Name and description of each setting row, shared by both ways of drawing the settings. */
export const LABELS = {
	blockName: {
		name: 'Code block name',
		desc: 'Language name of the code blocks this plugin renders. Reload the plugin after changing it.',
	},
	lyricsFont: {
		name: 'Lyrics font',
		desc: 'Monospace keeps the spacing as typed. Chords stay over their words with either font.',
	},
	lyricSpacing: {
		name: 'Space after lyric lines',
		desc: 'Adds half a line after each line with lyrics, so it stands apart from the chords of the next line. Turn off for a compact layout.',
	},
	autoscrollSpeed: {
		name: 'Autoscroll speed',
		desc: 'Lines per minute, for songs without a duration property. A song with a duration, such as 3:45, scrolls to its end in that time.',
	},
	songFolder: {
		name: 'Song folder',
		desc: 'Where new and imported songs and the starter base are created. Leave empty to use the default location for new notes.',
	},
	songProperty: {
		name: 'Song property',
		desc: 'Property name and value every new and imported song gets. The starter base lists the notes that have it. Changing it does not update existing notes or bases.',
	},
	templatePath: {
		name: 'Song template',
		desc: 'Optional note whose properties are added to new and imported songs. Its values replace the defaults; {{title}}, {{date}} and {{time}} are filled in.',
	},
} as const;

export const LYRICS_FONTS: Record<LyricsFont, string> = {
	monospace: 'Monospace',
	text: 'Theme text font',
};

export const NEW_SONGS_HEADING = 'New songs';

/** The settings with one value changed, cleaned as typed: trimmed, and the default when empty. */
export function withSetting(settings: SongfolioSettings, key: SettingKey, value: unknown): SongfolioSettings {
	const text = typeof value === 'string' ? value.trim() : '';
	switch (key) {
		case 'blockName':
		case 'markerProperty':
		case 'markerValue':
			return { ...settings, [key]: text || DEFAULT_SETTINGS[key] };
		case 'songFolder':
		case 'templatePath':
			return { ...settings, [key]: text };
		case 'lyricsFont':
			return { ...settings, lyricsFont: value === 'text' ? 'text' : 'monospace' };
		case 'lyricSpacing':
			return { ...settings, lyricSpacing: value === true };
		case 'autoscrollSpeed': {
			const speed = typeof value === 'number' ? value : Number(text || NaN);
			return {
				...settings,
				autoscrollSpeed: Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_SETTINGS.autoscrollSpeed,
			};
		}
	}
}
