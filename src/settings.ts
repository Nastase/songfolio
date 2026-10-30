import { App, PluginSettingTab, Setting } from 'obsidian';
import type SongfolioPlugin from './main';

/** Font for chords and lyrics: monospace keeps the spacing as typed, text uses the theme font. */
export type LyricsFont = 'monospace' | 'text';

export interface SongfolioSettings {
	/** Code block language that Songfolio renders. */
	blockName: string;
	lyricsFont: LyricsFont;
}

export const DEFAULT_SETTINGS: SongfolioSettings = {
	blockName: 'songsheet',
	lyricsFont: 'monospace',
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
	}
}
