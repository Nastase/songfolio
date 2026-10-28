import { App, PluginSettingTab, Setting } from 'obsidian';
import type SongfolioPlugin from './main';

export interface SongfolioSettings {
	/** Code block language that Songfolio renders. */
	blockName: string;
}

export const DEFAULT_SETTINGS: SongfolioSettings = {
	blockName: 'songsheet',
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
	}
}
