import {
	AbstractInputSuggest,
	App,
	PluginSettingTab,
	Setting,
	TFile,
	type SettingDefinitionItem,
} from 'obsidian';
import type SongfolioPlugin from '../main';
import {
	DEFAULT_SETTINGS,
	LABELS,
	LYRICS_FONTS,
	NEW_SONGS_HEADING,
	RESTYLING,
	withSetting,
	type SettingKey,
} from './values';

export { DEFAULT_SETTINGS, type LyricsFont, type SongfolioSettings } from './values';

/**
 * Obsidian 1.13 and later draw the settings from `getSettingDefinitions()`, which also puts them
 * in Obsidian's settings search; older versions call `display()`. Both share the labels and
 * `store`, so a value is cleaned and saved the same way.
 */
export class SongfolioSettingTab extends PluginSettingTab {
	plugin: SongfolioPlugin;

	constructor(app: App, plugin: SongfolioPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				items: [
					{
						...LABELS.blockName,
						control: { type: 'text', key: 'blockName', placeholder: DEFAULT_SETTINGS.blockName },
					},
					{
						...LABELS.lyricsFont,
						control: { type: 'dropdown', key: 'lyricsFont', options: LYRICS_FONTS },
					},
					{ ...LABELS.lyricSpacing, control: { type: 'toggle', key: 'lyricSpacing' } },
					{
						...LABELS.autoscrollSpeed,
						control: {
							type: 'number',
							key: 'autoscrollSpeed',
							min: 1,
							placeholder: String(DEFAULT_SETTINGS.autoscrollSpeed),
							defaultValue: DEFAULT_SETTINGS.autoscrollSpeed,
						},
					},
				],
			},
			{
				type: 'group',
				heading: NEW_SONGS_HEADING,
				items: [
					{
						...LABELS.songFolder,
						control: { type: 'folder', key: 'songFolder', placeholder: DEFAULT_SETTINGS.songFolder },
					},
					{ ...LABELS.songProperty, render: (setting) => this.addSongProperty(setting) },
					{
						...LABELS.templatePath,
						control: {
							type: 'file',
							key: 'templatePath',
							placeholder: 'Templates/Song.md',
							filter: (file) => file.extension === 'md',
						},
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as SettingKey];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		await this.store(key as SettingKey, value);
	}

	/** Cleans and saves one setting, and restyles the songs on screen when it changes their look. */
	private async store(key: SettingKey, value: unknown): Promise<void> {
		this.plugin.settings = withSetting(this.plugin.settings, key, value);
		await this.plugin.saveSettings();
		if (RESTYLING.has(key)) this.plugin.applySettings();
	}

	/** The song property row: its name and its value, in two fields. */
	private addSongProperty(setting: Setting): void {
		const { settings } = this.plugin;
		setting
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.markerProperty)
					.setValue(settings.markerProperty)
					.onChange((value) => this.store('markerProperty', value)),
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.markerValue)
					.setValue(settings.markerValue)
					.onChange((value) => this.store('markerValue', value)),
			);
	}

	/** Obsidian before 1.13: the same settings, drawn by hand. */
	display(): void {
		const { containerEl } = this;
		const { settings } = this.plugin;
		containerEl.empty();
		const row = (label: { name: string; desc: string }) =>
			new Setting(containerEl).setName(label.name).setDesc(label.desc);

		row(LABELS.blockName).addText((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.blockName)
				.setValue(settings.blockName)
				.onChange((value) => this.store('blockName', value)),
		);

		row(LABELS.lyricsFont).addDropdown((dropdown) =>
			dropdown
				.addOptions(LYRICS_FONTS)
				.setValue(settings.lyricsFont)
				.onChange((value) => this.store('lyricsFont', value)),
		);

		row(LABELS.lyricSpacing).addToggle((toggle) =>
			toggle.setValue(settings.lyricSpacing).onChange((value) => this.store('lyricSpacing', value)),
		);

		row(LABELS.autoscrollSpeed).addText((text) => {
			text.inputEl.type = 'number';
			text.inputEl.min = '1';
			text
				.setPlaceholder(String(DEFAULT_SETTINGS.autoscrollSpeed))
				.setValue(String(settings.autoscrollSpeed))
				.onChange((value) => this.store('autoscrollSpeed', value));
		});

		new Setting(containerEl).setName(NEW_SONGS_HEADING).setHeading();

		row(LABELS.songFolder).addText((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.songFolder)
				.setValue(settings.songFolder)
				.onChange((value) => this.store('songFolder', value)),
		);

		this.addSongProperty(row(LABELS.songProperty));

		row(LABELS.templatePath).addText((text) => {
			new NoteSuggest(this.app, text.inputEl, (path) => this.store('templatePath', path));
			text
				.setPlaceholder('Templates/Song.md')
				.setValue(settings.templatePath)
				.onChange((value) => this.store('templatePath', value));
		});
	}
}

/** Suggests Markdown notes by path while typing in a text field (Obsidian before 1.13). */
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
