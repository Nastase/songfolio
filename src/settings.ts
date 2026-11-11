import { AbstractInputSuggest, App, PluginSettingTab, Setting, TFile } from 'obsidian';
import type SongfolioPlugin from './main';

/** Font for chords and lyrics: monospace keeps the spacing as typed, text uses the theme font. */
export type LyricsFont = 'monospace' | 'text';

export interface SongfolioSettings {
	/** Code block language that Songfolio renders. */
	blockName: string;
	lyricsFont: LyricsFont;
	/** Half a line of space after each line with lyrics, so it stands apart from the next chords. */
	lyricSpacing: boolean;
	/** Folder for new and imported songs; empty means Obsidian's default location for new notes. */
	songFolder: string;
	/** Property every new and imported song gets, and that the starter base filters on. */
	markerProperty: string;
	markerValue: string;
	/** Note whose properties are merged into new and imported songs; empty for none. */
	templatePath: string;
}

export const DEFAULT_SETTINGS: SongfolioSettings = {
	blockName: 'songsheet',
	lyricsFont: 'monospace',
	lyricSpacing: true,
	songFolder: 'Songs',
	markerProperty: 'type',
	markerValue: 'guitar_song',
	templatePath: '',
};

export class SongfolioSettingTab extends PluginSettingTab {
	plugin: SongfolioPlugin;

	constructor(app: App, plugin: SongfolioPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Code block name')
			.setDesc(
				'Language name of the code blocks this plugin renders. Reload the plugin after changing it.',
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.blockName)
					.setValue(this.plugin.settings.blockName)
					.onChange(async (value) => {
						this.plugin.settings.blockName =
							value.trim() || DEFAULT_SETTINGS.blockName;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Lyrics font')
			.setDesc('Monospace keeps the spacing as typed. Chords stay over their words with either font.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('monospace', 'Monospace')
					.addOption('text', 'Theme text font')
					.setValue(this.plugin.settings.lyricsFont)
					.onChange(async (value) => {
						this.plugin.settings.lyricsFont = value === 'text' ? 'text' : 'monospace';
						await this.plugin.saveSettings();
						this.plugin.applySettings();
					}),
			);

		new Setting(containerEl)
			.setName('Space after lyric lines')
			.setDesc('Adds half a line after each line with lyrics, so it stands apart from the chords of the next line. Turn off for a compact layout.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.lyricSpacing).onChange(async (value) => {
					this.plugin.settings.lyricSpacing = value;
					await this.plugin.saveSettings();
					this.plugin.applySettings();
				}),
			);

		new Setting(containerEl).setName('New songs').setHeading();

		new Setting(containerEl)
			.setName('Song folder')
			.setDesc(
				'Where new and imported songs and the starter base are created. Leave empty to use the default location for new notes.',
			)
			.addText((text) =>
				text
					.setPlaceholder('Songs')
					.setValue(this.plugin.settings.songFolder)
					.onChange(async (value) => {
						this.plugin.settings.songFolder = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Song property')
			.setDesc(
				'Property name and value every new and imported song gets. The starter base lists the notes that have it. Changing it does not update existing notes or bases.',
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.markerProperty)
					.setValue(this.plugin.settings.markerProperty)
					.onChange(async (value) => {
						this.plugin.settings.markerProperty = value.trim() || DEFAULT_SETTINGS.markerProperty;
						await this.plugin.saveSettings();
					}),
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.markerValue)
					.setValue(this.plugin.settings.markerValue)
					.onChange(async (value) => {
						this.plugin.settings.markerValue = value.trim() || DEFAULT_SETTINGS.markerValue;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Song template')
			.setDesc(
				'Optional note whose properties are added to new and imported songs. Its values replace the defaults; {{title}}, {{date}} and {{time}} are filled in.',
			)
			.addText((text) => {
				new NoteSuggest(this.app, text.inputEl, async (path) => {
					this.plugin.settings.templatePath = path;
					await this.plugin.saveSettings();
				});
				text
					.setPlaceholder('Templates/Song.md')
					.setValue(this.plugin.settings.templatePath)
					.onChange(async (value) => {
						this.plugin.settings.templatePath = value.trim();
						await this.plugin.saveSettings();
					});
			});
	}
}

/** Suggests Markdown notes by path while typing in a text field. */
class NoteSuggest extends AbstractInputSuggest<TFile> {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		private readonly onPick: (path: string) => Promise<void>,
	) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): TFile[] {
		const needle = query.toLowerCase();
		return this.app.vault
			.getMarkdownFiles()
			.filter((file) => file.path.toLowerCase().includes(needle))
			.slice(0, 20);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		this.setValue(file.path);
		void this.onPick(file.path);
		this.close();
	}
}
